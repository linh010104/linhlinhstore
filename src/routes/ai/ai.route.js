const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../../controllers/ai/ai.controller');

// Cấu hình Multer lưu ảnh tạm vào RAM
const upload = multer({ storage: multer.memoryStorage() });

// Đường dẫn nhận ảnh, biến tên là 'invoice_image'
router.post('/scan-invoice', upload.single('invoice_image'), aiController.scanInvoice);

// --- ĐƯỜNG DẪN MỚI CHO AI CỐ VẤN ---
router.post('/analyze-finance', aiController.analyzeFinance);

module.exports = router;