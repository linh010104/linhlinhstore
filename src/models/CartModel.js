/* File: models/CartModel.js */
const db = require('../config/db');

exports.addToCart = (userId, productId, quantity, callback) => {
    // 1. Kiểm tra xem sản phẩm này đã có trong giỏ của user chưa
    const sqlCheck = "SELECT * FROM carts WHERE user_id = ? AND product_id = ?";
    
    db.query(sqlCheck, [userId, productId], (err, result) => {
        if (err) return callback(err);

        if (result.length > 0) {
            // 2a. Nếu có rồi -> Cộng dồn số lượng
            const newQuantity = result[0].quantity + quantity;
            const sqlUpdate = "UPDATE carts SET quantity = ? WHERE id = ?";
            db.query(sqlUpdate, [newQuantity, result[0].id], callback);
        } else {
            // 2b. Nếu chưa có -> Thêm mới vào bảng carts
            const sqlInsert = "INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)";
            db.query(sqlInsert, [userId, productId, quantity], callback);
        }
    });
};
exports.getCart = (userId, callback) => {
    // Join bảng carts với products để lấy thông tin chi tiết
    const sql = `
        SELECT 
            c.id as cart_id, 
            c.quantity,
            p.name, 
            p.price, 
            p.sku,
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image_url
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;
    
    // In ra câu lệnh để debug nếu cần
    // console.log("Running SQL:", sql);
    
    db.query(sql, [userId], callback);
};

exports.remove = (cartId, userId, callback) => {
    const sql = "DELETE FROM carts WHERE id = ? AND user_id = ?";
    db.query(sql, [cartId, userId], callback);
};