const Inventory = require('../models/InventoryModel');

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

    // Cộng dồn thẳng vào bảng products
    Inventory.updateStock(productId, qty, (err) => {
        if (err) return res.status(500).json(err);
        
        // Ghi log
        Inventory.log(productId, qty, "Nhập kho thủ công");
        res.json({ message: "Nhập kho thành công!" });
    });
};