/* File: routes/CartRoutes.js */
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/CartController');
const authMiddleware = require('../middlewares/authMiddleware');

// Chỉ user đã đăng nhập (có Token) mới gọi được API này
router.post('/add', authMiddleware, cartController.addToCart);

router.get('/', authMiddleware, cartController.getCart);      // Lấy giỏ hàng
router.delete('/:id', authMiddleware, cartController.remove);
module.exports = router;