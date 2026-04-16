const express = require('express');
const router = express.Router();
const auth = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

// 🎯 Đã gộp 2 API thành 1 API duy nhất chuẩn RESTful
router.post('/login', auth.login);    

router.post('/register', auth.register);
router.get('/profile', authMiddleware, auth.getProfile);
router.put('/profile', authMiddleware, auth.updateProfile);

module.exports = router;