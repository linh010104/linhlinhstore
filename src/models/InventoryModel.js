/* File: src/models/InventoryModel.js */
const db = require('../config/db');

const Inventory = {
    // 1. Lấy tất cả tồn kho
    getAll: (callback) => {
        const sql = `
            SELECT 
                p.id, p.name, p.sku, 
                COALESCE(i.quantity, 0) as quantity, 
                i.updated_at 
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            ORDER BY p.id DESC
        `;
        db.query(sql, callback);
    },

    // 2. Tìm trong kho theo ProductID
    findByProductId: (productId, callback) => {
        const sql = "SELECT * FROM inventory WHERE product_id = ?";
        db.query(sql, [productId], callback);
    },

    // 3. Tạo mới (nếu chưa có)
    create: (productId, quantity, callback) => {
        const sql = "INSERT INTO inventory (product_id, quantity) VALUES (?, ?)";
        db.query(sql, [productId, quantity], callback);
    },

    // 4. Cập nhật cộng dồn (nếu đã có)
    updateStock: (productId, quantity, callback) => {
        const sql = "UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE product_id = ?";
        db.query(sql, [quantity, productId], callback);
    },

    // 5. Ghi log lịch sử
    log: (productId, changeQty, reason) => {
        const sql = "INSERT INTO inventory_logs (product_id, change_qty, reason) VALUES (?, ?, ?)";
        db.query(sql, [productId, changeQty, reason], (err) => {
            if (err) console.error("Lỗi ghi log kho:", err);
        });
    }
};

module.exports = Inventory;