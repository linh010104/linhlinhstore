const db = require('../config/db'); 
const fs = require('fs');
const path = require('path');

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
    if (!req.file) {
        return res.status(400).json({ message: "Vui lòng chọn file ảnh! (Hoặc form gửi từ Java bị lỗi)" });
    }
    const { title, link_url, banner_type, sort_order } = req.body;
    
    const image_url = '/uploads/banners/' + req.file.filename;
    const sql = "INSERT INTO banners (title, image_url, link_url, banner_type, sort_order, status) VALUES (?, ?, ?, ?, ?, 1)";
    
db.query(sql, [title, image_url, link_url, banner_type, sort_order || 0], (err, result) => { 
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Thêm banner thành công!", id: result.insertId });
    });
};

exports.deleteBanner = (req, res) => {
    const id = req.params.id;
    
    // Tìm đường dẫn file trước khi xóa DB
    db.query("SELECT image_url FROM banners WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            // Cắt lấy tên file và tìm đường dẫn vật lý để xóa ảnh trong ổ cứng
            const filename = path.basename(results[0].image_url);
            const filePath = path.join(__dirname, '../../web-client/uploads/banners', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            // Xóa bản ghi trong DB
            db.query("DELETE FROM banners WHERE id = ?", [id], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: "Đã xóa banner thành công!" });
            });
        } else {
            res.status(404).json({ message: "Không tìm thấy banner này" });
        }
    });
};