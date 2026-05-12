/* File: controllers/OrderController.js */
const db = require('../config/db');
const nodemailer = require('nodemailer');
const Order = require('../models/OrderModel'); 

// --- CẤU HÌNH GỬI EMAIL TỰ ĐỘNG TỪ BIẾN MÔI TRƯỜNG ---
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ==========================================
// 1. LUỒNG ĐẶT HÀNG (MỚI)
// ==========================================

// Đặt hàng từ Giỏ hàng
exports.checkout = (req, res) => {
    const userId = req.user.id;
    const data = req.body; 

    Order.createOrder(userId, data, (err, orderId) => {
        if (err) return res.status(500).json({ message: typeof err === 'string' ? err : 'Lỗi server khi đặt hàng', error: err });
        res.json({ message: 'Đặt hàng thành công!', orderId: orderId });
    });
};

// Mua ngay (Không qua giỏ hàng)
exports.directBuy = (req, res) => {
    const userId = req.user.id;
    const data = req.body; 

    Order.createDirectOrder(userId, data, (err, orderId) => {
        if (err) return res.status(500).json({ message: typeof err === 'string' ? err : 'Lỗi server khi đặt hàng', error: err });
        res.json({ message: 'Đặt hàng thành công!', orderId: orderId });
    });
};

// ==========================================
// 2. LUỒNG XỬ LÝ TRẢ HÀNG
// ==========================================

exports.requestReturn = (req, res) => {
    const orderId = req.params.id;
    const { reason } = req.body;
    const sql = "UPDATE orders SET status = 'RETURN_REQUESTED', return_reason = ? WHERE id = ? AND user_id = ? AND status = 'DONE'";
    
    db.query(sql, [`[Khách yêu cầu]: ${reason}`, orderId, req.user.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Không thể gửi yêu cầu (Đơn phải ở trạng thái Hoàn tất)." });
        res.json({ message: "Đã gửi yêu cầu trả hàng thành công! Đang chờ Shop duyệt." });
    });
};

exports.processReturnRequest = (req, res) => {
    const orderId = req.params.id;
    const { action, adminNote, condition } = req.body; 

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json(err);
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return res.status(500).json(err); }

            try {
                const [order] = await new Promise((resolve, reject) => {
                    conn.query("SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?", [orderId], (e, r) => e ? reject(e) : resolve(r));
                });

                let newStatus = action === 'ACCEPT' ? 'RETURNED' : 'DONE';
                let finalNote = action === 'ACCEPT' ? `[Đã duyệt]: ${adminNote}` : `[Từ chối]: ${adminNote}`;

                await new Promise((resolve, reject) => {
                    conn.query("UPDATE orders SET status = ?, return_reason = ? WHERE id = ?", [newStatus, finalNote, orderId], (e) => e ? reject(e) : resolve());
                });

                if (action === 'ACCEPT') {
                    const items = await new Promise((resolve, reject) => {
                        conn.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId], (e, r) => e ? reject(e) : resolve(r));
                    });

                    for (let item of items) {
                        if (condition === 'GOOD') {
                            await new Promise((resolve, reject) => {
                                conn.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [item.quantity, item.product_id], (e) => e ? reject(e) : resolve());
                            });
                            await new Promise((resolve, reject) => {
                                conn.query("INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)", 
                                [item.product_id, item.quantity, `Nhập lại kho từ đơn #${orderId}`], (e) => e ? reject(e) : resolve());
                            });
                        } else {
                            await new Promise((resolve, reject) => {
                                conn.query("UPDATE products SET error_qty = error_qty + ? WHERE id = ?", [item.quantity, item.product_id], (e) => e ? reject(e) : resolve());
                            });
                            await new Promise((resolve, reject) => {
                                conn.query("INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, 0, ?)", 
                                [item.product_id, `Ghi nhận hàng lỗi (Hoàn trả đơn #${orderId})`], (e) => e ? reject(e) : resolve());
                            });
                        }
                    }
                }

                conn.commit(async (err) => {
                    if (err) throw err;

                    const mailOptions = {
                        from: `"LinhLinhStore" <${process.env.EMAIL_USER}>`,  // ⭐ DÙNG BIẾN MÔI TRƯỜNG
                        to: order.email,
                        subject: action === 'ACCEPT' ? 'Yêu cầu trả hàng của bạn đã được Duyệt' : 'Kết quả xử lý yêu cầu trả hàng',
                        html: `<h3>Xin chào ${order.receiver_name},</h3>
                               <p>Đơn hàng <b>#${orderId}</b> của bạn đã được xử lý hoàn trả.</p>
                               <p><b>Kết quả:</b> ${action === 'ACCEPT' ? 'CHẤP NHẬN' : 'TỪ CHỐI'}</p>
                               <p><b>Ghi chú từ cửa hàng:</b> ${adminNote}</p>
                               <p>Cảm ơn bạn đã tin tưởng LinhLinhStore!</p>`
                    };
                    
                    transporter.sendMail(mailOptions).catch(e => console.error("Lỗi gửi mail:", e));

                    res.json({ message: "Xử lý thành công và đã gửi thông báo cho khách!" });
                    conn.release();
                });

            } catch (error) {
                conn.rollback(() => { res.status(500).json(error); conn.release(); });
            }
        });
    });
};

// ==========================================
// 3. LUỒNG LẤY & CẬP NHẬT ĐƠN HÀNG (USER + ADMIN)
// ==========================================

exports.getMyOrders = (req, res) => {
    db.query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, resu) => {
        if (err) return res.status(500).json(err);
        res.json(resu);
    });
};

exports.getDetail = (req, res) => {
    const sqlOrder = "SELECT * FROM orders WHERE id = ?";
    db.query(sqlOrder, [req.params.id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        
        const order = results[0];
        const sqlItems = `
            SELECT oi.*, p.name, 
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;
        db.query(sqlItems, [req.params.id], (err, items) => {
            if (err) return res.status(500).json(err);
            order.items = items;
            res.json(order);
        });
    });
};

// Khách hàng đổi trạng thái (Hủy đơn hoặc Đã nhận hàng)
exports.updateUserStatus = (req, res) => {
    // Gọi qua Model để chạy Transaction hoàn lại kho nếu là CANCELLED
    Order.userUpdateStatus(req.params.id, req.body.status, (err, result) => {
        if (err) return res.status(500).json({ message: typeof err === 'string' ? err : "Lỗi server" });
        res.json(result);
    });
};

// Khách hàng sửa thông tin (Tên, SĐT, Địa chỉ) lúc đơn còn NEW
exports.updateOrderInfo = (req, res) => {
    Order.updateOrderInfo(req.params.id, req.body, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Chỉ được sửa khi đơn ở trạng thái MỚI!" });
        res.json({ message: "Cập nhật thông tin thành công!" });
    });
};

// Admin lấy tất cả đơn
exports.getAllOrders = (req, res) => {
    db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};

// Admin đổi trạng thái đơn
exports.updateAdminStatus = (req, res) => {
    const { status } = req.body;
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Cập nhật trạng thái thành công!" });
    });
};