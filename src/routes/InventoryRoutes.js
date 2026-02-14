/* File: src/routes/InventoryRoutes.js */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/InventoryController');

router.get('/', controller.getInventory);       // Xem kho
router.post('/import', controller.importGoods); // Nhập hàng

module.exports = router;