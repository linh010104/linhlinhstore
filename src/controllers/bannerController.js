const db = require('../config/db'); 
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getBannersByType = (req, res) => {
    const type = req.params.type;
    const sql = "SELECT * FROM banners WHERE status = 1 AND banner_type = ? ORDER BY sort_order ASC";
    db.query(sql, [type], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.createBanner = async (req, res) => {
    if (!req.body) req.body = {};
    if (!req.file) return res.status(400).json({ message: "Vui lòng chọn file ảnh!" });
    
    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'linhlinhstore_banners'
        });

        // Xóa file tạm dưới máy
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        const { title, link_url, banner_type, sort_order } = req.body;
        const image_url = result.secure_url; // Link Cloudinary
        
        const sql = "INSERT INTO banners (title, image_url, link_url, banner_type, sort_order, status) VALUES (?, ?, ?, ?, ?, 1)";
        
        db.query(sql, [title, image_url, link_url, banner_type, sort_order || 0], (err, dbResult) => { 
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Thêm banner lên mây thành công!", id: dbResult.insertId });
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi upload ảnh banner lên Cloudinary" });
    }
};

exports.deleteBanner = (req, res) => {
    const id = req.params.id;
    // Ảnh trên mây cứ kệ nó (gói Free dư sức chứa), chỉ cần xóa dữ liệu trong DB là banner biến mất khỏi web
    db.query("DELETE FROM banners WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã xóa banner thành công!" });
    });
};