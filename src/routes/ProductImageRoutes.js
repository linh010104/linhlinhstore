const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const ProductImageController = require('../controllers/ProductImageController');

router.post(
  '/:productId',
  upload.single('image'),
  ProductImageController.uploadImage
);

module.exports = router;
