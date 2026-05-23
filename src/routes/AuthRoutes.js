const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');
const passport = require('passport');
const { validateLogin, validateRegister, handleValidationErrors } = require('../middlewares/validateMiddleware');

// ✅ LOGIN & REGISTER (YÊU CẦU VALIDATION)
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/register', validateRegister, handleValidationErrors, authController.register);

// ✅ PROFILE (YÊU CẦU ĐĂNG NHẬP)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

// ✅ GOOGLE OAUTH
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    const token = require('jsonwebtoken').sign(
        { id: req.user.id, role_id: req.user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
    res.redirect(`/index.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
});

module.exports = router;