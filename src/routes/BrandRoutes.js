const express = require('express');
const router = express.Router();
const brandController = require('../controllers/BrandController');

// Khai báo API GET lấy danh sách hãng
router.get('/', brandController.getAll);
router.get('/mapping', brandController.getMapping);

module.exports = router;