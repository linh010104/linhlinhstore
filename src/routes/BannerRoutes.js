const express = require('express');
const router = express.express; // Fix typo from snippet if any, wait, it's express.Router()
const router = express.Router();

const bannerController = require('../controllers/bannerController');
const { uploadBanner } = require('../config/cloudinary');

router.get('/:type', bannerController.getBannersByType);
router.post('/', uploadBanner.single('image'), bannerController.createBanner);

// Xóa banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;