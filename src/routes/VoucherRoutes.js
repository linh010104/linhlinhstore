const express = require('express');
const router = express.Router();
const VoucherController = require('../controllers/VoucherController');

router.post('/generate', VoucherController.generateVoucher); 
router.get('/', VoucherController.getAllVouchers); // Admin dùng
router.post('/check', VoucherController.checkVoucher); // Khách dùng lúc thanh toán

router.post('/claim', VoucherController.claimVoucher); // Khách bấm lấy mã
router.get('/my-vouchers/:userId', VoucherController.getMyVouchers); // Lấy kho mã của khách

router.get('/wheel-prizes', VoucherController.getWheelPrizes);
router.post('/spin', VoucherController.spinWheel);

module.exports = router;