const db = require('../config/db'); 

exports.getBannersByType = (req, res) => {
    const type = req.params.type;
    const sql = "SELECT * FROM banners WHERE status = 1 AND banner_type = ? ORDER BY sort_order ASC";
    db.query(sql, [type], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.createBanner = (req, res) => {
    if (!req.body) req.body = {};
    if (!req.file) return res.status(400).json({ message: "Vui lòng chọn file ảnh!" });
    
    const { title, link_url, banner_type, sort_order } = req.body;
    const image_url = req.file.path; 
    
    const sql = "INSERT INTO banners (title, image_url, link_url, banner_type, sort_order, status) VALUES (?, ?, ?, ?, ?, 1)";
    
    db.query(sql, [title, image_url, link_url, banner_type, sort_order || 0], (err, dbResult) => { 
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Thêm banner lên mây thành công!", id: dbResult.insertId });
    });
};

exports.deleteBanner = (req, res) => {
    const id = req.params.id;
    // Ảnh trên mây cứ kệ nó, chỉ cần xóa dữ liệu trong DB là banner biến mất khỏi web
    db.query("DELETE FROM banners WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã xóa banner thành công!" });
    });
};