const db = require('../config/db');

exports.addToCart = (userId, productId, variantInfo, quantity, callback) => {
    // 1. Phải check CẢ product_id VÀ variant_info (để S24 Đen và Trắng nằm 2 dòng khác nhau)
    const sqlCheck = "SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND IFNULL(variant_info, '') = ?";
    const safeVariantInfo = variantInfo || ''; // Tránh lỗi null
    
    db.query(sqlCheck, [userId, productId, safeVariantInfo], (err, result) => {
        if (err) return callback(err);

        if (result.length > 0) {
            // Đã có đúng phiên bản này -> Cộng dồn số lượng
            const newQuantity = result[0].quantity + quantity;
            const sqlUpdate = "UPDATE carts SET quantity = ? WHERE id = ?";
            db.query(sqlUpdate, [newQuantity, result[0].id], callback);
        } else {
            // Chưa có -> Thêm dòng mới, có lưu kèm variant_info
            const sqlInsert = "INSERT INTO carts (user_id, product_id, variant_info, quantity) VALUES (?, ?, ?, ?)";
            db.query(sqlInsert, [userId, productId, variantInfo, quantity], callback);
        }
    });
};

exports.getCart = (userId, callback) => {
    const sql = `
        SELECT 
            c.id as cart_id, 
            c.quantity,
            c.variant_info, 
            p.id as product_id,
            p.name, 
            p.price, 
            p.sku,
            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image_url
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;
    db.query(sql, [userId], callback);
};

exports.remove = (cartId, userId, callback) => {
    const sql = "DELETE FROM carts WHERE id = ? AND user_id = ?";
    db.query(sql, [cartId, userId], callback);
};