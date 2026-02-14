const db = require('../config/db');

exports.uploadImage = (req, res) => {
  const productId = req.params.productId;

  if (!req.file) {
    return res.status(400).json({ message: 'Chưa chọn file ảnh' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  const sql = `
    INSERT INTO product_images (product_id, image_url)
    VALUES (?, ?)
  `;

  db.query(sql, [productId, imageUrl], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: 'Upload ảnh thành công',
      image_url: imageUrl
    });
  });
};
