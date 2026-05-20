const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
// 🔥 Nhớ import thêm cái Controller ảnh vào đây
const ProductImageController = require('../controllers/ProductImageController'); 
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// 🔥 Hút đường ống uploadProduct từ file cấu hình Cloudinary mới
const { uploadProduct } = require('../config/cloudinary');

// ==========================================
// PUBLIC
// ==========================================
router.get('/', productController.getAll);

// ==========================================
// ADMIN ONLY - CÁC ROUTE DÀI/ĐẶC THÙ PHẢI ĐỂ LÊN TRÊN
// ==========================================

// Xóa 1 ảnh bất kỳ
router.delete('/images/:imageId', authMiddleware, isAdmin, ProductImageController.deleteImage);

// Up nhiều ảnh cho sản phẩm (tối đa 10 ảnh)
router.post('/:id/images', authMiddleware, isAdmin, uploadProduct.array('images', 10), productController.uploadImage);

// Thêm / Xóa phiên bản
router.post('/:id/variants', authMiddleware, isAdmin, productController.addVariant);
router.delete('/variants/:variantId', authMiddleware, isAdmin, productController.deleteVariant);


// ==========================================
// CÁC ROUTE NGẮN CÓ CHỨA /:id PHẢI ĐỂ XUỐNG DƯỚI CÙNG
// ==========================================

router.get('/:id', productController.getDetail);
router.post('/', authMiddleware, isAdmin, productController.create);
router.put('/:id', authMiddleware, isAdmin, productController.update);
router.delete('/:id', authMiddleware, isAdmin, productController.delete);

module.exports = router;