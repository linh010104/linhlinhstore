const express = require('express');
const router = express.Router();

const { uploadProduct } = require('../config/cloudinary');
const ProductImageController = require('../controllers/ProductImageController');

// 🔥 Gắn đường ống vào đây
router.post(
  '/:productId',
  uploadProduct.single('image'),
  ProductImageController.uploadImage
);

module.exports = router;