const Cart = require('../models/CartModel');

exports.addToCart = (req, res) => {
    const userId = req.user.id; 
    const { productId, quantity, variant_info } = req.body;

    const qty = quantity ? parseInt(quantity) : 1;

    Cart.addToCart(userId, productId, variant_info, qty, (err, result) => {
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