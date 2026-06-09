const db = require('../config/db');
const nodemailer = require('nodemailer');
const Order = require('../models/OrderModel');
const vnpayConfig = require('../config/vnpay');

// ✅ CẤU HÌNH EMAIL
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ==========================================
// 1. LUỒNG THANH TOÁN VNPay
// ==========================================
exports.checkout = (req, res) => {
    const userId = req.user.id;
    const data = req.body;
    
    Order.createOrder(userId, data, (err, orderId, totalAmount) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message || err });
        
        try {
            if (data.payment_method === 'VNPAY') {
                const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
                
                // 🔥 SỬA MÃ ĐỘC NHẤT ĐỂ TRÁNH LỖI TRÙNG ĐƠN
                const uniqueTxnRef = `${orderId}_${Date.now()}`;
                
                const paymentUrl = vnpayConfig.createPaymentUrl({
                    orderId: uniqueTxnRef, 
                    amount: totalAmount,
                    orderInfo: `Thanh toan don hang ${orderId}`, // 🔥 VIẾT KHÔNG DẤU ĐỂ TRÁNH LỖI CHỮ KÝ
                    ipAddr: clientIp
                });
                
                return res.json({ success: true, message: 'Đang chuyển hướng...', paymentUrl: paymentUrl });
            } else {
                return res.json({ success: true, message: 'Đặt hàng thành công!', orderId: orderId });
            }
        } catch (error) { res.status(500).json({ success: false, message: 'Lỗi tạo liên kết', error: error.message }); }
    });
};
/**
 * ✅ BƯỚC 2: VNPay Callback - SAU KHI THANH TOÁN XONG
 */
exports.vnpayCallback = (req, res) => {
    try {
        const vnp_Params = req.query; // LUÔN LÀ req.query VÌ LÀ GET REQUEST
        
        if (!vnpayConfig.verifyPaymentHash(vnp_Params)) {
            return res.status(400).json({ success: false, message: 'Chữ ký không hợp lệ' });
        }
        
        const vnp_ResponseCode = vnp_Params['vnp_ResponseCode'];
        const vnp_TxnRef = vnp_Params['vnp_TxnRef']; // Ví dụ: "15_1701234567"
        const vnp_TransactionNo = vnp_Params['vnp_TransactionNo'];
        const vnp_Amount = vnp_Params['vnp_Amount'] / 100;
        
        // 🔥 TÁCH LẤY LẠI ĐÚNG ID ĐƠN HÀNG TRONG DATABASE (Bỏ phần _170123...)
        const realOrderId = vnp_TxnRef.split('_')[0];
        
        if (vnp_ResponseCode === '00') {
            Order.updatePaymentStatus(realOrderId, 'PAID', vnp_TransactionNo, (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Lỗi server DB' });
                
                db.query("UPDATE orders SET status = 'CONFIRMED' WHERE id = ?", [realOrderId], (updateErr) => {
                    db.query("DELETE FROM carts WHERE user_id = (SELECT user_id FROM orders WHERE id = ?)", [realOrderId]);
                    sendOrderConfirmationEmail(realOrderId);
                    
                    // 🔥 SỬA Ở ĐÂY: Đá khách hàng về lại trang Danh sách đơn hàng trên Web
                    res.redirect('/orders.html?payment=success'); 
                });
            });
        } else {
            Order.updatePaymentStatus(realOrderId, 'FAILED', null, (err) => {
                db.query("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [realOrderId]);
                
                // 🔥 SỬA Ở ĐÂY: Đá khách hàng về trang Web kèm cờ báo lỗi
                res.redirect('/orders.html?payment=failed');
            });
        }
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server', error: error.message }); }
};

exports.checkPaymentStatus = (req, res) => {
    const { orderId, transactionDate } = req.query;
    if (!orderId || !transactionDate) {
        return res.status(400).json({ message: 'Vui lòng cung cấp orderId và transactionDate' });
    }
    vnpayConfig.queryTransaction(orderId, transactionDate)
        .then(result => {
            res.json({
                success: result.vnp_ResponseCode === '00',
                data: result
            });
        })
        .catch(error => {
            res.status(500).json({
                success: false,
                message: 'Lỗi kiểm tra giao dịch',
                error: error.message
            });
        });
};

// ==========================================
// 2. DIRECT BUY (GIỮ NGUYÊN LOGIC THANH TOÁN)
// ==========================================

exports.directBuy = (req, res) => {
    const userId = req.user.id;
    const data = req.body;
    
    Order.createDirectOrder(userId, data, (err, orderId, totalAmount) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message || err });
        try {
            if (data.payment_method === 'VNPAY') {
                const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
                
                // 🔥 SỬA MÃ ĐỘC NHẤT
                const uniqueTxnRef = `${orderId}_${Date.now()}`;
                
                const paymentUrl = vnpayConfig.createPaymentUrl({
                    orderId: uniqueTxnRef,
                    amount: totalAmount,
                    orderInfo: `Thanh toan don hang ${orderId}`, // KHÔNG DẤU
                    ipAddr: clientIp
                });
                return res.json({ success: true, message: 'Đang chuyển hướng...', paymentUrl: paymentUrl });
            } else {
                 return res.json({ success: true, message: 'Đặt hàng thành công!' });
            }
        } catch (error) { res.status(500).json({ success: false, message: 'Lỗi tạo liên kết', error: error.message }); }
    });
};

exports.getMyOrders = (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Lỗi getMyOrders:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        res.json(result);
    });
};

exports.getDetail = (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role_id === 1; // ✅ CHECK ADMIN

    // ✅ CRITICAL FIX: AUTHORIZATION CHECK
    const sql = isAdmin 
        ? "SELECT * FROM orders WHERE id = ?" 
        : "SELECT * FROM orders WHERE id = ? AND user_id = ?"; 

    const params = isAdmin ? [orderId] : [orderId, userId];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Lỗi getDetail:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng hoặc không có quyền truy cập" });
        }
        
        const order = results[0];
        const sqlItems = `
            SELECT oi.*, p.name, 
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;
        db.query(sqlItems, [orderId], (err, items) => {
            if (err) {
                console.error("Lỗi getDetail items:", err);
                return res.status(500).json({ success: false, message: 'Lỗi server' });
            }
            order.items = items;
            res.json(order);
        });
    });
};

exports.updateUserStatus = (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;
    
    // ✅ CRITICAL FIX: CHECK USER OWN ORDER
    db.query("SELECT id, user_id FROM orders WHERE id = ? AND user_id = ?", [orderId, userId], (checkErr, checkResult) => {
        if (checkErr || checkResult.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền cập nhật đơn hàng này' });
        }
        Order.userUpdateStatus(orderId, status, (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: typeof err === 'string' ? err : 'Lỗi server',
                    error: err.message || err
                });
            }
            res.json(result);
        });
    });
};

exports.updateOrderInfo = (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    
    // ✅ CRITICAL FIX: CHECK USER OWN ORDER + STATUS = NEW
    db.query("SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'NEW'", [orderId, userId], (checkErr, checkResult) => {
        if (checkErr || checkResult.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ được sửa khi đơn ở trạng thái NEW hoặc không phải của bạn!'
            });
        }
        Order.updateOrderInfo(orderId, req.body, (err, result) => {
            if (err) {
                console.error("Lỗi updateOrderInfo:", err);
                return res.status(500).json({ success: false, message: 'Lỗi server' });
            }
            res.json({ success: true, message: "Cập nhật thông tin thành công!" });
        });
    });
};

// ==========================================
// 4. LUỒNG TRẢ HÀNG
// ==========================================

exports.requestReturn = (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    // ✅ CRITICAL FIX: CHECK USER OWN ORDER
    const sql = "UPDATE orders SET status = 'RETURN_REQUESTED', return_reason = ? WHERE id = ? AND user_id = ? AND status = 'DONE'";
    db.query(sql, [`[Khách yêu cầu]: ${reason}`, orderId, userId], (err, result) => {
        if (err) {
            console.error("Lỗi requestReturn:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Không thể gửi yêu cầu (Đơn phải ở trạng thái Hoàn tất và thuộc về bạn)."
            });
        }
        res.json({ success: true, message: "Đã gửi yêu cầu trả hàng thành công! Đang chờ Shop duyệt." });
    });
};

exports.processReturnRequest = (req, res) => {
    const orderId = req.params.id;
    const { action, adminNote, condition } = req.body;
    
    if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền' });
    }
    
    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ success: false, error: err });
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return res.status(500).json({ success: false, error: err }); }
            try {
                const [order] = await new Promise((resolve, reject) => {
                    conn.query("SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?", [orderId], (e, r) => e ? reject(e) : resolve(r));
                });
                if (!order) throw "Đơn hàng không tồn tại";
                
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
                        from: `"LinhLinhStore" <${process.env.EMAIL_USER}>`,
                        to: order.email,
                        subject: action === 'ACCEPT' ? 'Yêu cầu trả hàng của bạn đã được Duyệt' : 'Kết quả xử lý yêu cầu trả hàng',
                        html: `<h3>Xin chào ${order.receiver_name},</h3><p>Đơn hàng <b>#${orderId}</b> của bạn đã được xử lý.</p>`
                    };
                    transporter.sendMail(mailOptions).catch(e => console.error("Lỗi gửi mail:", e));
                    res.json({ success: true, message: "Xử lý thành công!" });
                    conn.release();
                });
            } catch (error) {
                conn.rollback(() => {
                    res.status(500).json({ success: false, error: error.message || error });
                    conn.release();
                });
            }
        });
    });
};

// ==========================================
// 5. ADMIN ENDPOINTS
// ==========================================

exports.getAllOrders = (req, res) => {
    if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền' });
    }
    db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error("Lỗi getAllOrders:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        res.json(results);
    });
};

exports.updateAdminStatus = (req, res) => {
    if (req.user.role_id !== 1) {
        return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền' });
    }
    const { status } = req.body;
    db.query("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", [status, req.params.id], (err) => {
        if (err) {
            console.error("Lỗi updateAdminStatus:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        res.json({ success: true, message: "Cập nhật trạng thái thành công!" });
    });
};

exports.getMyStats = (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT 
            COUNT(id) as total_orders, 
            COALESCE(SUM(total_amount), 0) as total_spent
        FROM orders 
        WHERE user_id = ? AND status = 'DONE'
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Lỗi getMyStats:", err);
            return res.status(500).json({ success: false, message: 'Lỗi server' });
        }
        res.json(results[0]);
    });
};

// ==========================================
// 6. HELPER FUNCTIONS
// ==========================================
function sendOrderConfirmationEmail(orderId) {
    const sql = `
        SELECT o.id, o.receiver_name, o.total_amount, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;
    db.query(sql, [orderId], (err, results) => {
        if (err || results.length === 0) return;
        const order = results[0];
        
        const mailOptions = {
            from: `"LinhLinhStore" <${process.env.EMAIL_USER}>`,
            to: order.email,
            subject: `Xác nhận đơn hàng #${orderId}`,
            html: `
                <h3>Xin chào ${order.receiver_name},</h3>
                <p>Cảm ơn bạn đã đặt hàng! Đơn hàng <b>#${orderId}</b> của bạn đã được thanh toán thành công.</p>
                <p><strong>Tổng tiền:</strong> ${order.total_amount.toLocaleString('vi-VN')} VND</p>
                <p>Chúng tôi sẽ chuẩn bị hàng và gửi cho bạn sớm nhất.</p>
                <p>Cảm ơn,<br/>LinhLinhStore Team</p>
            `
        };
        transporter.sendMail(mailOptions, (mailErr) => {
            if (mailErr) console.error("Lỗi gửi email xác nhận:", mailErr);
            else console.log("✅ Email xác nhận đã gửi tới:", order.email);
        });
    });
}
const notifiedTimeoutOrders = new Set();

setInterval(() => {
    // Chỉ quét các đơn quá 30 phút, không cần check cột is_timeout_notified nữa
    const sql = `
        SELECT o.*, u.email as user_email 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.payment_method = 'VNPAY' 
          AND o.payment_status = 'PENDING' 
          AND o.status = 'NEW'
          AND o.created_at <= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `;

    db.query(sql, (err, stuckOrders) => {
        if (err || !stuckOrders || stuckOrders.length === 0) return;

        stuckOrders.forEach(order => {
            if (notifiedTimeoutOrders.has(order.id)) return;

            // Tiến hành gửi Email
            const mailOptions = {
                from: `"Hệ thống LinhLinhStore" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, // Tạm thời gửi về email của hệ thống (coi như Admin)
                subject: `[CẢNH BÁO] Đơn hàng #${order.id} treo thanh toán VNPay!`,
                html: `
                    <h2 style="color: red;">Cảnh báo đơn hàng treo thanh toán</h2>
                    <p>Hệ thống phát hiện đơn hàng <b>#${order.id}</b> đã tạo hơn 30 phút nhưng khách hàng chưa thanh toán xong.</p>
                    <ul>
                        <li><b>Tên khách hàng:</b> ${order.receiver_name}</li>
                        <li><b>Số điện thoại:</b> ${order.phone}</li>
                        <li><b>Tổng tiền:</b> ${order.total_amount.toLocaleString('vi-VN')} đ</li>
                        <li><b>Thời gian tạo:</b> ${new Date(order.created_at).toLocaleString('vi-VN')}</li>
                    </ul>
                    <p>Vui lòng vào App Quản lý để kiểm tra và liên hệ hỗ trợ khách hàng!</p>
                `
            };

            transporter.sendMail(mailOptions, (mailErr) => {
                if (!mailErr) {
                    console.log(`[Cảnh báo] Đã gửi email báo đơn treo #${order.id} cho Admin`);
                    // Lưu ID đơn này vào bộ nhớ tạm để lần sau quét trúng thì bỏ qua
                    notifiedTimeoutOrders.add(order.id);
                } else {
                    console.error("Lỗi gửi mail cảnh báo:", mailErr);
                }
            });
        });
    });
}, 5 * 60 * 1000); 