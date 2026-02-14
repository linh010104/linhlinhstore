/* File: controllers/CartController.js */
const Cart = require('../models/CartModel');

exports.addToCart = (req, res) => {
    // Lấy ID người dùng từ Token (do authMiddleware giải mã)
    const userId = req.user.id; 
    const { productId, quantity } = req.body;

    // Mặc định số lượng là 1 nếu không truyền
    const qty = quantity ? parseInt(quantity) : 1;

    Cart.addToCart(userId, productId, qty, (err, result) => {
        if (err) return res.status(500).json({ message: 'Lỗi server', error: err });
        res.json({ message: 'Đã thêm vào giỏ hàng thành công!' });
    });
};
exports.getCart = (req, res) => {
    const userId = req.user.id;

    Cart.getCart(userId, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
};

exports.remove = (req, res) => {
    const userId = req.user.id;
    const cartId = req.params.id;
    Cart.remove(cartId, userId, (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Đã xóa sản phẩm khỏi giỏ" });
    });
};