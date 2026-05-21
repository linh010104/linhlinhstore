const express = require('express');
const router = express.Router();
const passport = require('passport'); // Thêm passport xử lý Google Auth
const jwt = require('jsonwebtoken');   // Thêm jwt để tạo token
const auth = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login', auth.login);    

router.post('/register', auth.register);
router.get('/profile', authMiddleware, auth.getProfile);
router.put('/profile', authMiddleware, auth.updateProfile);
router.put('/change-password', authMiddleware, auth.changePassword);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html?error=true', session: true }),
  function(req, res) {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role_id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    // Mã hóa thông tin user thành chuỗi an toàn để truyền đi trên URL
    const userStr = encodeURIComponent(JSON.stringify(req.user));
    
    // Điều hướng đưa khách quay trở lại giao diện index.html kèm theo Token + dữ liệu User
    res.redirect(`${process.env.FRONTEND_BASE_URL}/index.html?token=${token}&user=${userStr}`);
  }
);

module.exports = router;