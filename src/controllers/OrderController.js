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
        if (status === 'SHIPPING') {
            console.log("-> Phát hiện trạng thái SHIPPING, tiến hành trừ kho...");
            deductInventory(orderId);
        }

        res.json({ message: 'Cập nhật trạng thái thành công' });
    });
};
exports.getMine = (req, res) => {
    Order.getByUserId(req.user.id, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
};
exports.getDetail = (req, res) => {
    Order.getOrderDetail(req.params.id, (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.user_id !== req.user.id) return res.status(403).json({ message: "Không có quyền" });
        res.json(data);
    });
};
exports.updateInfo = (req, res) => {
    Order.updateOrderInfo(req.params.id, req.body, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Không thể sửa đơn này (Đã duyệt hoặc không tồn tại)" });
        res.json({ message: "Cập nhật thành công!" });
    });
};

exports.userChangeStatus = (req, res) => {
    const status = req.body.status; // 'CANCELLED' hoặc 'DONE'
    Order.userUpdateStatus(req.params.id, status, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Thao tác thất bại (Trạng thái đơn không phù hợp)" });
        res.json({ message: "Thành công!" });
    });
};
function deductInventory(orderId) {
    db.getConnection((err, connection) => {
        if (err) return console.error("Lỗi lấy connection từ MySQL:", err);
        
        connection.beginTransaction(async (err) => {
            if (err) {
                connection.release();
                return console.error("Lỗi khởi tạo Transaction:", err);
            }
            try {
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
                
                const updatePromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        const sqlDeduct = `
                            UPDATE products 
                            SET stock_quantity = stock_quantity - ? 
                            WHERE id = ?
                        `;
                        connection.query(sqlDeduct, [item.quantity, item.product_id], (err) => {
                            if (err) return reject(err);
                            
                            const sqlLog = "INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)";
                            connection.query(sqlLog, [item.product_id, -item.quantity, `Xuất bán đơn hàng #${orderId}`], (errLog) => {
                                if (errLog) reject(errLog);
                                else resolve();
                            });
                        });
                    });
                });
                
                await Promise.all(updatePromises);
                
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error("Lỗi lúc Commit, ĐÃ HỦY TOÀN BỘ:", err);
                            connection.release();
                        });
                    }
                    console.log(`-> [SUCCESS] Đã trừ kho & ghi log thành công cho đơn #${orderId}`);
                    connection.release(); 
                });

            } catch (error) {
                connection.rollback(() => {
                    console.error("Cảnh báo: Có lỗi xảy ra, ĐÃ ROLLBACK toàn bộ thao tác trừ kho!", error);
                    connection.release();
                });
            }
        });
    });
}
exports.returnOrderAdmin = (req, res) => {
    const orderId = req.params.id;
    const { reason, condition } = req.body; // condition: 'GOOD' hoặc 'BAD'

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json(err);

        connection.beginTransaction(async (err) => {
            if (err) { connection.release(); return res.status(500).json(err); }
            try {
                // B1: Đổi trạng thái đơn và lưu Lý do
                const fullReason = condition === 'GOOD' ? `${reason} (Tình trạng: Tốt, Đã nhập kho)` : `${reason} (Tình trạng: Lỗi, Lưu kho chờ xử lý)`;
                const sqlUpdateOrder = "UPDATE orders SET status = 'RETURNED', return_reason = ? WHERE id = ?";
                await new Promise((resolve, reject) => {
                    connection.query(sqlUpdateOrder, [fullReason, orderId], (err) => err ? reject(err) : resolve());
                });

                // B2: Lấy danh sách sản phẩm trong đơn
                const items = await new Promise((resolve, reject) => {
                    connection.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId], (err, results) => err ? reject(err) : resolve(results));
                });

                // B3: Cập nhật kho và Ghi Log
                const updatePromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        if (condition === 'GOOD') {
                            // Hàng tốt -> Cộng lại số lượng vào bảng products (Chuẩn database của Linh)
                            connection.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id], (err) => {
                                if (err) return reject(err);
                                // Ghi log nhập lại
                                connection.query("INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)",
                                    [item.product_id, item.quantity, `Nhập kho (Hoàn trả đơn #${orderId})`], (err) => err ? reject(err) : resolve());
                            });
                        } else {
                            // Hàng lỗi -> KHÔNG CỘNG KHO, chỉ ghi log để theo dõi
                            connection.query("INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, 0, ?)",
                                [item.product_id, `Hàng lỗi (Hoàn trả đơn #${orderId}) - Không bán lại`], (err) => err ? reject(err) : resolve());
                        }
                    });
                });

                await Promise.all(updatePromises);

                connection.commit((err) => {
                    if (err) throw err;
                    res.json({ message: "Xử lý hoàn trả thành công!" });
                    connection.release();
                });
            } catch (error) {
                connection.rollback(() => {
                    console.error("Lỗi hoàn trả:", error);
                    res.status(500).json({ message: "Lỗi xử lý hoàn trả" });
                    connection.release();
                });
            }
        });
    });
};
exports.requestReturn = (req, res) => {
    const orderId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: "Vui lòng nhập lý do trả hàng!" });
    }

    // 1. Kiểm tra đơn hàng có tồn tại và đúng là của user này không, trạng thái phải là DONE
    db.query("SELECT status FROM orders WHERE id = ? AND user_id = ?", [orderId, userId], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(403).json({ message: "Không tìm thấy đơn hàng hoặc không có quyền." });
        if (results[0].status !== 'DONE') {
            return res.status(400).json({ message: "Chỉ đơn hàng đã hoàn tất mới được yêu cầu trả hàng." });
        }

        // 2. Cập nhật trạng thái sang RETURN_REQUESTED (Đang chờ duyệt)
        const sqlUpdate = "UPDATE orders SET status = 'RETURN_REQUESTED', return_reason = ? WHERE id = ?";
        // Thêm chữ [Yêu cầu của khách] để Admin trên Java dễ nhận biết
        const formattedReason = `[Yêu cầu từ Web]: ${reason}`; 

        db.query(sqlUpdate, [formattedReason, orderId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Gửi yêu cầu trả hàng thành công! Vui lòng chờ Shop liên hệ xử lý." });
        });
    });
};