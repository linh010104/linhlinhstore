const db = require('../config/db');

// 1. Lấy danh sách địa chỉ của user
exports.getMyAddresses = (req, res) => {
    const userId = req.user.id; 
    const sql = "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC";
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Lỗi Server", error: err });
        res.json({ success: true, data: results });
    });
};

// 2. Thêm địa chỉ mới (Tối giản)
exports.addAddress = (req, res) => {
    const userId = req.user.id;
    // Đã bóc receiver_name và phone ra khỏi req.body
    const { province, district, ward, address_detail, address_type, is_default } = req.body;

    // Nếu khách chọn làm Mặc định, phải set các địa chỉ cũ về 0 trước
    if (is_default == 1) {
        db.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId], (err) => {
            if (err) return res.status(500).json(err);
            insertNew();
        });
    } else {
        insertNew();
    }

    function insertNew() {
        const sql = `
            INSERT INTO user_addresses 
            (user_id, province, district, ward, address_detail, address_type, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(sql, [userId, province, district, ward, address_detail, address_type, is_default || 0], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi thêm địa chỉ", error: err });
            res.json({ success: true, message: "Thêm địa chỉ thành công!" });
        });
    }
};

// 3. Xóa địa chỉ
exports.deleteAddress = (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.id;

    const sql = "DELETE FROM user_addresses WHERE id = ? AND user_id = ?";
    db.query(sql, [addressId, userId], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err });
        res.json({ success: true, message: "Đã xóa địa chỉ" });
    });
};