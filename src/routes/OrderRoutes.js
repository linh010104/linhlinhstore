/* File: routes/OrderRoutes.js */
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// 1. Khách mua hàng
router.post('/', authMiddleware, orderController.createOrder);        // Mua từ giỏ
router.post('/direct', authMiddleware, orderController.createDirectOrder); // Mua ngay

// 2. Khách xem lịch sử (QUAN TRỌNG)
router.get('/mine', authMiddleware, orderController.getMine);
router.get('/:id', authMiddleware, orderController.getDetail); // Xem chi tiết
router.put('/:id/info', authMiddleware, orderController.updateInfo); // Sửa thông tin
router.put('/:id/user-status', authMiddleware, orderController.userChangeStatus); // Hủy/Đã nhận

// 3. Admin quản lý
router.get('/', authMiddleware, isAdmin, orderController.getAll);
router.put('/:id/status', authMiddleware, isAdmin, orderController.updateStatus);

module.exports = router;