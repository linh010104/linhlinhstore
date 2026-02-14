const express = require('express');
const router = express.Router();
const auth = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login-admin', auth.loginAdmin); // JAVA
router.post('/login-web', auth.loginWeb);     // WEB
router.post('/register', auth.register);
router.get('/profile',authMiddleware, auth.getProfile);   // Xem
router.put('/profile',authMiddleware, auth.updateProfile);

module.exports = router;
