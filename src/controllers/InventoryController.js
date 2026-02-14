/* File: src/controllers/InventoryController.js */
const Inventory = require('../models/InventoryModel'); // <--- Gọi Model

exports.getInventory = (req, res) => {
    Inventory.getAll((err, result) => {
        if (err) return res.status(500).json({ error: "Lỗi Server" });
        res.json(result);
    });
};

exports.importGoods = (req, res) => {
    const { productId, amount } = req.body;
    const qty = parseInt(amount);

    if (!productId || qty <= 0) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Kiểm tra xem đã có trong kho chưa
    Inventory.findByProductId(productId, (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length === 0) {
            // Chưa có -> Tạo mới
            Inventory.create(productId, qty, (err) => {
                if (err) return res.status(500).json(err);
                Inventory.log(productId, qty, "Nhập hàng lần đầu");
                res.json({ message: "Tạo kho và nhập hàng thành công" });
            });
        } else {
            // Đã có -> Cộng dồn
            Inventory.updateStock(productId, qty, (err) => {
                if (err) return res.status(500).json(err);
                Inventory.log(productId, qty, "Nhập thêm hàng");
                res.json({ message: "Cập nhật số lượng thành công" });
            });
        }
    });
};