const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const authMiddleware = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/upload');
// PUBLIC
router.get('/', productController.getAll);
router.get('/:id', productController.getDetail);
// ADMIN ONLY
router.post('/', authMiddleware, isAdmin, productController.create);
router.put('/:id', authMiddleware, isAdmin, productController.update);
router.delete('/:id', authMiddleware, isAdmin, productController.delete);

router.post(
  '/:id/images',
  authMiddleware,
  isAdmin,
  upload.single('image'),
  productController.uploadImage
);
module.exports = router;
