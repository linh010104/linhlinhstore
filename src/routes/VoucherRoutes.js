const express = require('express');
const router = express.Router();
const VoucherController = require('../controllers/VoucherController');

router.post('/generate', VoucherController.generateVoucher); 
router.get('/', VoucherController.getAllVouchers);// Admin dùng
router.post('/check', VoucherController.checkVoucher);       // Khách dùng

module.exports = router;