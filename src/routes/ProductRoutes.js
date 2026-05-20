const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// 🔥 Hút đường ống uploadProduct từ file cấu hình Cloudinary mới
const { uploadProduct } = require('../config/cloudinary');

// PUBLIC
router.get('/', productController.getAll);
router.get('/:id', productController.getDetail);

// ADMIN ONLY
router.post('/', authMiddleware, isAdmin, productController.create);
router.put('/:id', authMiddleware, isAdmin, productController.update);
router.delete('/:id', authMiddleware, isAdmin, productController.delete);

// 🔥 Gắn đường ống uploadProduct vào đây (up tối đa 10 ảnh)
router.post(
  '/:id/images',
  authMiddleware,
  isAdmin,
  uploadProduct.array('images', 10),
  productController.uploadImage
);
router.post('/:id/variants', authMiddleware, isAdmin, productController.addVariant);
router.delete('/variants/:variantId', authMiddleware, isAdmin, productController.deleteVariant);

module.exports = router;