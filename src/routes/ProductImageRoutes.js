const express = require('express');
const router = express.Router();

const { uploadProduct } = require('../config/cloudinary');
const ProductImageController = require('../controllers/ProductImageController');

router.post(
  '/:productId',
  uploadProduct.single('image'),
  ProductImageController.uploadImage
);

router.delete('/:imageId', ProductImageController.deleteImage);
module.exports = router;