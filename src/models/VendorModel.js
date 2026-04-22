const db = require('../config/db');

const Vendor = {
    // Lấy tất cả NCC
    getAll: (callback) => {
        const sql = "SELECT * FROM vendors ORDER BY id DESC";
        db.query(sql, callback);
    },

    // Thêm mới NCC
    create: (data, callback) => {
        const sql = "INSERT INTO vendors (name, phone, address) VALUES (?, ?, ?)";
        db.query(sql, [data.name, data.phone, data.address], callback);
    },

    // Cập nhật NCC
    update: (id, data, callback) => {
        const sql = "UPDATE vendors SET name = ?, phone = ?, address = ? WHERE id = ?";
        db.query(sql, [data.name, data.phone, data.address, id], callback);
    },

    // Xóa NCC
    delete: (id, callback) => {
        const sql = "DELETE FROM vendors WHERE id = ?";
        db.query(sql, [id], callback);
    }
};

module.exports = Vendor;