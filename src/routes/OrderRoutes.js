const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// ==========================================
// 1. LUỒNG THANH TOÁN VNPay (MỚI)
// ==========================================
router.post('/checkout', authMiddleware, orderController.checkout);
router.post('/direct-buy', authMiddleware, orderController.directBuy);
router.get('/vnpay-callback', orderController.vnpayCallback); // ✅ VNPay redirect trở lại
router.post('/vnpay-callback', orderController.vnpayCallback); // ✅ VNPay POST callback
router.get('/payment-status', authMiddleware, orderController.checkPaymentStatus); // ✅ Check status

// ==========================================
// 2. LUỒNG CHO KHÁCH HÀNG
// ==========================================
router.get('/mine', authMiddleware, orderController.getMyOrders);
router.get('/:id', authMiddleware, orderController.getDetail);
router.put('/:id/user-status', authMiddleware, orderController.updateUserStatus);
router.put('/:id/update-info', authMiddleware, orderController.updateOrderInfo);
router.put('/:id/request-return', authMiddleware, orderController.requestReturn);
router.get('/my/stats', authMiddleware, orderController.getMyStats);

// ==========================================
// 3. LUỒNG CHO ADMIN
// ==========================================
router.get('/admin/all', authMiddleware, isAdmin, orderController.getAllOrders);
router.put('/:id/admin-status', authMiddleware, isAdmin, orderController.updateAdminStatus);
router.put('/:id/process-return', authMiddleware, isAdmin, orderController.processReturnRequest);

module.exports = router;