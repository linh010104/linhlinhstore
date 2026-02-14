/* File: models/OrderModel.js */
const db = require('../config/db');

// 1. MUA TỪ GIỎ HÀNG
exports.createOrder = (userId, data, callback) => {
    const sqlGetCart = "SELECT * FROM carts WHERE user_id = ?";
    db.query(sqlGetCart, [userId], (err, cartItems) => {
        if (err) return callback(err);
        if (cartItems.length === 0) return callback("Giỏ hàng trống");

        const sqlGetPrice = `SELECT c.*, p.price FROM carts c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`;
        db.query(sqlGetPrice, [userId], (err, itemsWithPrice) => {
            if (err) return callback(err);
            
            let totalAmount = 0;
            itemsWithPrice.forEach(item => totalAmount += item.price * item.quantity);

            const sqlInsertOrder = `
                INSERT INTO orders (user_id, total_amount, payment_method, status, receiver_name, phone, address, note)
                VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?)
            `;
            db.query(sqlInsertOrder, [userId, totalAmount, data.payment_method, data.name, data.phone, data.address, data.note], (err, resOrder) => {
                if (err) return callback(err);
                const orderId = resOrder.insertId;

                const orderItemsValues = itemsWithPrice.map(item => [orderId, item.product_id, item.quantity, item.price]);
                const sqlInsertItems = "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?";
                
                db.query(sqlInsertItems, [orderItemsValues], (err) => {
                    if (err) return callback(err);
                    const sqlClearCart = "DELETE FROM carts WHERE user_id = ?";
                    db.query(sqlClearCart, [userId], (err) => callback(null, orderId));
                });
            });
        });
    });
};

// 2. MUA NGAY
exports.createDirectOrder = (userId, data, callback) => {
    const sqlGetPrice = "SELECT price FROM products WHERE id = ?";
    db.query(sqlGetPrice, [data.productId], (err, result) => {
        if (err || result.length === 0) return callback("Sản phẩm không tồn tại");
        
        const price = result[0].price;
        const totalAmount = price * data.quantity;

        const sqlInsertOrder = `
            INSERT INTO orders (user_id, total_amount, payment_method, status, receiver_name, phone, address, note)
            VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?)
        `;

        db.query(sqlInsertOrder, [
            userId, totalAmount, data.payment_method, 
            data.name, data.phone, data.address, data.note
        ], (err, resOrder) => {
            if (err) return callback(err);
            const orderId = resOrder.insertId;

            const sqlInsertItem = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
            db.query(sqlInsertItem, [orderId, data.productId, data.quantity, price], (err) => {
                if (err) return callback(err);
                callback(null, orderId);
            });
        });
    });
};


exports.getOrderDetail = (orderId, callback) => {

    const sqlOrder = "SELECT * FROM orders WHERE id = ?";
    const sqlItems = `
        SELECT 
            oi.*, 
            p.name, 
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `;

    db.query(sqlOrder, [orderId], (err, orders) => {
        if (err || orders.length === 0) return callback(err || "Không tìm thấy đơn hàng");
        
        db.query(sqlItems, [orderId], (err, items) => {
            if (err) return callback(err);
            const orderData = orders[0];
            orderData.items = items; 
            callback(null, orderData);
        });
    });
};

exports.getAll = (callback) => {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.query(sql, callback);
};

exports.updateStatus = (id, status, callback) => {
    const sql = "UPDATE orders SET status = ? WHERE id = ?";
    db.query(sql, [status, id], callback);
};

exports.getByUserId = (userId, callback) => {
    const sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], callback);
};

exports.updateOrderInfo = (orderId, data, callback) => {
    const sql = "UPDATE orders SET receiver_name=?, phone=?, address=?, note=? WHERE id=? AND status='NEW'";
    db.query(sql, [data.name, data.phone, data.address, data.note, orderId], callback);
};

exports.userUpdateStatus = (orderId, status, callback) => {
    let sql = "";
    if (status === 'CANCELLED') {
        sql = "UPDATE orders SET status='CANCELLED' WHERE id=? AND status='NEW'";
    } else if (status === 'DONE') {
        sql = "UPDATE orders SET status='DONE' WHERE id=? AND status='SHIPPING'";
    } else {
        return callback("Trạng thái không hợp lệ");
    }
    
    db.query(sql, [orderId], callback);
};