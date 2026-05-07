const express = require('express');
const router = express.Router();

const bannerController = require('../controllers/bannerController');
const uploadBanner = require('../middlewares/uploadBanner');

// Lấy danh sách banner theo loại
router.get('/:type', bannerController.getBannersByType);

// Thêm banner mới (Đi qua middleware upload ảnh trước, rồi mới vào logic tạo DB)
router.post('/', uploadBanner.single('image'), bannerController.createBanner);

// Xóa banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;