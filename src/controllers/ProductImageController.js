const db = require('../config/db');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadImage = async (req, res) => {
  const productId = req.params.productId;

  if (!req.file) return res.status(400).json({ message: 'Chưa chọn file ảnh' });

  try {
      const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'linhlinhstore_products'
      });

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      const imageUrl = result.secure_url;
      const sql = `INSERT INTO product_images (product_id, image_url) VALUES (?, ?)`;

      db.query(sql, [productId, imageUrl], (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Upload ảnh lên mây thành công', image_url: imageUrl });
      });
  } catch (error) {
      res.status(500).json({ message: 'Lỗi upload ảnh lên Cloudinary' });
  }
};