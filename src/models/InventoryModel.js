const db = require('../config/db');

const Inventory = {
    // 1. Lấy tồn kho trực tiếp từ bảng products
    getAll: (callback) => {
        const sql = `
            SELECT 
                id, name, sku, 
                stock_quantity as quantity, 
                created_at as updated_at 
            FROM products 
            ORDER BY id DESC
        `;
        db.query(sql, callback);
    },

    // 2. Cập nhật cộng dồn số lượng thẳng vào bảng products
    updateStock: (productId, quantity, callback) => {
        const sql = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?";
        db.query(sql, [quantity, productId], callback);
    },

    // 3. Ghi log lịch sử (Giữ nguyên)
    log: (productId, changeQty, reason) => {
        const sql = "INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)";
        db.query(sql, [productId, changeQty, reason], (err) => {
            if (err) console.error("Lỗi ghi log kho:", err);
        });
    }
};

module.exports = Inventory;