const db = require('../config/db');

exports.uploadImage = (req, res) => {
  const productId = req.params.productId;

  if (!req.file) return res.status(400).json({ message: 'Chưa chọn file ảnh' });

  // 🔥 Đã upload lên Cloudinary từ bước Route, giờ chỉ lấy link lưu DB
  const imageUrl = req.file.path;
  const sql = `INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`;

  db.query(sql, [productId, imageUrl], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Upload ảnh lên mây thành công', image_url: imageUrl });
  });
};
exports.deleteImage = (req, res) => {
  const imageId = req.params.imageId;
  
  const sql = "DELETE FROM product_images WHERE id = ?";
  
  db.query(sql, [imageId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Không tìm thấy ảnh này trong hệ thống' });
      }
      
      res.json({ message: 'Đã xóa ảnh thành công!' });
  });
};