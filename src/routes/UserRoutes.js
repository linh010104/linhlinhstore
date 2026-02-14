const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, isAdmin, userController.getAll);
router.post('/', authMiddleware, isAdmin, userController.create);
router.put('/:id', authMiddleware, isAdmin, userController.update);
router.put('/:id/status', authMiddleware, isAdmin, userController.changeStatus);

module.exports = router;