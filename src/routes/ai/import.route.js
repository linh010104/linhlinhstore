const express = require('express');
const router = express.Router();

// Lùi ra 2 bước để gọi file controller
const importController = require('../../controllers/ai/import.controller');

// Mở đường dẫn API nhận Request POST (chứa cục JSON hóa đơn & thuế) từ Java
router.post('/create', importController.createImportInvoice);

module.exports = router;