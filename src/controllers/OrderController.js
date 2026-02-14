
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
    // B1: Lấy danh sách sản phẩm trong đơn
    const sqlGetItems = "SELECT product_id, quantity FROM order_items WHERE order_id = ?";
    
    db.query(sqlGetItems, [orderId], (err, items) => {
        if (err) return console.error("Lỗi lấy sp để trừ kho:", err);
        
        if (items.length === 0) {
            console.log("-> Đơn hàng không có sản phẩm nào để trừ kho.");
            return;
        }

        // B2: Duyệt từng món để trừ
        items.forEach(item => {
            console.log(`-> Trừ kho: SP ${item.product_id} giảm ${item.quantity}`);
            
            const sqlDeduct = `
                UPDATE inventory 
                SET quantity = quantity - ?, updated_at = NOW() 
                WHERE product_id = ?
            `;
            
            db.query(sqlDeduct, [item.quantity, item.product_id], (err) => {
                if (err) console.error(`Lỗi SQL trừ kho SP ${item.product_id}:`, err);
                else {
                    // Ghi log
                    const sqlLog = "INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)";
                    db.query(sqlLog, [item.product_id, -item.quantity, `Xuất bán đơn hàng #${orderId}`]);
                }
            });
        });
    });
}