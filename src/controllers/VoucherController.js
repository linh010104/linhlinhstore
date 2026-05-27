const db = require('../config/db'); 

const VoucherController = {
    getAllVouchers: (req, res) => {
        const sql = `SELECT * FROM vouchers ORDER BY id DESC`;
        db.query(sql, (err, results) => {
            if (err) {
                console.error("Lỗi khi lấy danh sách voucher:", err);
                return res.status(500).json({ success: false, message: "Lỗi Server!" });
            }
            // Trả về trực tiếp mảng dữ liệu để Java dễ bóc tách
            res.json(results);
        });
    },
    
    generateVoucher: (req, res) => {
        const discountAmount = req.body.discount_amount || 50000;
        const minOrderValue = req.body.min_order_value || 0;
        const prefix = req.body.prefix || 'SALE'; 

        // Thuật toán đẻ 6 ký tự ngẫu nhiên (chữ + số)
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const finalCode = `${prefix}-${randomPart}`; 

        // Lưu vào MySQL
        const sql = `INSERT INTO vouchers (code, discount_amount, min_order_value) VALUES (?, ?, ?)`;
        
        db.query(sql, [finalCode, discountAmount, minOrderValue], (err, result) => {
            if (err) {
                console.error("Lỗi khi lưu voucher:", err);
                return res.status(500).json({ success: false, message: "Lỗi Server!" });
            }
            res.status(201).json({
                success: true,
                message: "Tạo mã thành công!",
                data: { id: result.insertId, code: finalCode, discount_amount: discountAmount }
            });
        });
    },

    // API kiểm tra mã cho Khách hàng lúc thanh toán
    checkVoucher: (req, res) => {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: "Vui lòng nhập mã!" });

        const sql = `SELECT * FROM vouchers WHERE code = ? AND is_used = 0`;
        db.query(sql, [code], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi Server!" });
            
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Mã không hợp lệ hoặc đã được sử dụng!" });
            }

            res.json({ success: true, message: "Áp dụng mã thành công!", data: results[0] });
        });
    }
};

module.exports = VoucherController;