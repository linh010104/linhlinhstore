const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const auth = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');

// public
router.get('/', categoryController.getAll);

// admin
router.post('/', auth, isAdmin, categoryController.create);
router.put('/:id', auth, isAdmin, categoryController.update);
router.delete('/:id', auth, isAdmin, categoryController.delete);

module.exports = router;
