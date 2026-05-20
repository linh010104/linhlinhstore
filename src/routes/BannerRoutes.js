const express = require('express');
const router = express.Router();

const bannerController = require('../controllers/bannerController');
// 🔥 Hút đường ống uploadBanner từ file cấu hình Cloudinary mới
const { uploadBanner } = require('../config/cloudinary');

// Lấy danh sách banner theo loại
router.get('/:type', bannerController.getBannersByType);

// Thêm banner mới (Đi qua middleware upload ảnh của Cloudinary trước, rồi mới vào logic tạo DB)
router.post('/', uploadBanner.single('image'), bannerController.createBanner);

// Xóa banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;