const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');

// ĐÃ SỬA LẠI ĐƯỜNG DẪN CHUẨN THEO MÁY CỦA LINH:
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// === 1. LUỒNG CHO KHÁCH HÀNG ===
router.get('/mine', authMiddleware, orderController.getMyOrders);      
router.get('/:id', authMiddleware, orderController.getDetail);         
router.put('/:id/user-status', authMiddleware, orderController.updateUserStatus); 
router.put('/:id/request-return', authMiddleware, orderController.requestReturn); 

// === 2. LUỒNG CHO ADMIN ===
router.get('/admin/all', authMiddleware, isAdmin, orderController.getAllOrders); 
router.put('/:id/admin-status', authMiddleware, isAdmin, orderController.updateAdminStatus); 
router.put('/:id/process-return', authMiddleware, isAdmin, orderController.processReturnRequest); 

module.exports = router;