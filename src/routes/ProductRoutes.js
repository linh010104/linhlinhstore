const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const ProductImageController = require('../controllers/ProductImageController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

const { uploadProduct } = require('../config/cloudinary');

const { validateProduct, handleValidationErrors } = require('../middlewares/validateMiddleware');


router.get('/', productController.getAll);

// xóa ảnh 
router.delete('/images/:imageId', authMiddleware, isAdmin, ProductImageController.deleteImage);
router.post('/:id/images', authMiddleware, isAdmin, uploadProduct.array('images', 10), productController.uploadImage);

// Thêm Xóa phiên bản
router.post('/:id/variants', authMiddleware, isAdmin, productController.addVariant);
router.delete('/:id/variants/:variantId', authMiddleware, isAdmin, productController.deleteVariant);
router.patch('/:id/discount', productController.updateDiscount);
router.post('/recommendations', productController.getRecommendations);
router.get('/:id', productController.getDetail);

router.post('/', authMiddleware, isAdmin, validateProduct, handleValidationErrors, productController.create);
router.put('/:id', authMiddleware, isAdmin, validateProduct, handleValidationErrors, productController.update);

router.delete('/:id', authMiddleware, isAdmin, productController.delete);

module.exports = router;