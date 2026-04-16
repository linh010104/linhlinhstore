
const Order = require('../models/OrderModel');
const db = require('../config/db');

exports.createOrder = (req, res) => {
    Order.createOrder(req.user.id, req.body, (err, orderId) => {
        if (err) return res.status(500).json({ message: 'Lỗi', error: err });
        res.json({ message: 'Đặt hàng thành công!', orderId });
    });
};

exports.createDirectOrder = (req, res) => {
    Order.createDirectOrder(req.user.id, req.body, (err, orderId) => {
        if (err) return res.status(500).json({ message: 'Lỗi', error: err });
        res.json({ message: 'Đặt hàng MUA NGAY thành công!', orderId });
    });
};

exports.getAll = (req, res) => {
    Order.getAll((err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
};

exports.updateStatus = (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; // status mới (CONFIRMED, SHIPPING...)

    console.log(`[Order] Đang đổi trạng thái đơn #${orderId} sang ${status}`);

    // 1. Cập nhật trạng thái đơn hàng
    Order.updateStatus(orderId, status, (err) => {
        if (err) {
            console.error("Lỗi update trạng thái:", err);
            return res.status(500).json(err);
        }

        // 2. LOGIC TỰ ĐỘNG TRỪ KHO
        // Nếu chuyển sang SHIPPING -> Trừ kho
        if (status === 'SHIPPING') {
            console.log("-> Phát hiện trạng thái SHIPPING, tiến hành trừ kho...");
            deductInventory(orderId);
        }

        res.json({ message: 'Cập nhật trạng thái thành công' });
    });
};

// --- HÀM NÀY CHO KHÁCH XEM LỊCH SỬ ---
exports.getMine = (req, res) => {
    Order.getByUserId(req.user.id, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
};
exports.getDetail = (req, res) => {
    Order.getOrderDetail(req.params.id, (err, data) => {
        if (err) return res.status(500).json(err);
        // Kiểm tra bảo mật: User chỉ xem được đơn của chính mình
        if (data.user_id !== req.user.id) return res.status(403).json({ message: "Không có quyền" });
        
        res.json(data);
    });
};

// User cập nhật thông tin (SĐT, Địa chỉ)
exports.updateInfo = (req, res) => {
    Order.updateOrderInfo(req.params.id, req.body, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Không thể sửa đơn này (Đã duyệt hoặc không tồn tại)" });
        res.json({ message: "Cập nhật thành công!" });
    });
};

// User đổi trạng thái (Hủy / Đã nhận)
exports.userChangeStatus = (req, res) => {
    const status = req.body.status; // 'CANCELLED' hoặc 'DONE'
    Order.userUpdateStatus(req.params.id, status, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Thao tác thất bại (Trạng thái đơn không phù hợp)" });
        res.json({ message: "Thành công!" });
    });
};
function deductInventory(orderId) {
    // Phải xin một kết nối riêng biệt (connection) từ db pool để làm Transaction
    db.getConnection((err, connection) => {
        if (err) return console.error("Lỗi lấy connection từ MySQL:", err);

        // BẮT ĐẦU KÍCH HOẠT LÁ CHẮN TRANSACTION
        connection.beginTransaction(async (err) => {
            if (err) {
                connection.release();
                return console.error("Lỗi khởi tạo Transaction:", err);
            }
            try {
                // B1: Lấy danh sách sản phẩm trong đơn (Dùng Promise để tránh callback hell)
                const sqlGetItems = "SELECT product_id, quantity FROM order_items WHERE order_id = ?";
                
                const getItems = () => new Promise((resolve, reject) => {
                    connection.query(sqlGetItems, [orderId], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });

                const items = await getItems();

                if (items.length === 0) {
                    console.log(`-> Đơn hàng #${orderId} không có sản phẩm để trừ.`);
                    connection.rollback(() => connection.release());
                    return;
                }

                // B2: Cập nhật tồn kho và ghi log (Chạy song song tất cả các lệnh trong Transaction)
                const updatePromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        const sqlDeduct = `
                            UPDATE inventory 
                            SET quantity = quantity - ?, updated_at = NOW() 
                            WHERE product_id = ?
                        `;
                        connection.query(sqlDeduct, [item.quantity, item.product_id], (err) => {
                            if (err) return reject(err);
                            
                            // Nếu trừ kho thành công, ghi luôn log xuất hàng
                            const sqlLog = "INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)";
                            connection.query(sqlLog, [item.product_id, -item.quantity, `Xuất bán đơn hàng #${orderId}`], (errLog) => {
                                if (errLog) reject(errLog);
                                else resolve();
                            });
                        });
                    });
                });

                // Chờ tất cả các lệnh UPDATE và INSERT chạy xong
                await Promise.all(updatePromises);

                // B3: CHỐT GIAO DỊCH (Lưu vĩnh viễn vào Database)
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error("Lỗi lúc Commit, ĐÃ HỦY TOÀN BỘ:", err);
                            connection.release();
                        });
                    }
                    console.log(`-> [SUCCESS] Đã trừ kho & ghi log thành công cho đơn #${orderId}`);
                    connection.release(); // Trả connection lại cho pool
                });

            } catch (error) {
                // NẾU CÓ BẤT KỲ LỖI NÀO XẢY RA (ví dụ: mất mạng, sai cú pháp SQL) 
                // -> QUAY XE (Rollback) LẠI TRẠNG THÁI BAN ĐẦU!
                connection.rollback(() => {
                    console.error("Cảnh báo: Có lỗi xảy ra, ĐÃ ROLLBACK toàn bộ thao tác trừ kho!", error);
                    connection.release();
                });
            }
        });
    });
}
