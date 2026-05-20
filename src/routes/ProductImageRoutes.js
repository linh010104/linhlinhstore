const express = require('express');
const router = express.Router();

// 🔥 Hút đường ống uploadProduct từ file cấu hình Cloudinary mới
const { uploadProduct } = require('../config/cloudinary');
const ProductImageController = require('../controllers/ProductImageController');

// 🔥 Gắn đường ống vào đây
router.post(
  '/:productId',
  uploadProduct.single('image'),
  ProductImageController.uploadImage
);

module.exports = router;