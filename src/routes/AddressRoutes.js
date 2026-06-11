const express = require('express');
const router = express.Router();
const addressController = require('../controllers/AddressController');
const authMiddleware = require('../middlewares/authMiddleware'); // Bắt buộc đăng nhập

// Lấy danh sách địa chỉ của mình
router.get('/my', authMiddleware, addressController.getMyAddresses);

// Thêm địa chỉ mới
router.post('/', authMiddleware, addressController.addAddress);

// Xóa địa chỉ
router.delete('/:id', authMiddleware, addressController.deleteAddress);

module.exports = router;