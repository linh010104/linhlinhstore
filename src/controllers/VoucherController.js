const db = require('../config/db'); 

const VoucherController = {
    getAllVouchers: (req, res) => {
        const sql = `SELECT * FROM vouchers ORDER BY id DESC`;
        db.query(sql, (err, results) => {
            if (err) {
                console.error("Lỗi khi lấy danh sách voucher:", err);
                return res.status(500).json({ success: false, message: "Lỗi Server!" });
            }
            res.json(results);
        });
    },
    
    generateVoucher: (req, res) => {
        const discountAmount = req.body.discount_amount || 50000;
        const minOrderValue = req.body.min_order_value || 0;
        const prefix = req.body.prefix || 'SALE'; 

        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const finalCode = `${prefix}-${randomPart}`; 

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

    checkVoucher: (req, res) => {
        const { code, order_total } = req.body;
        
        if (!code) return res.status(400).json({ success: false, message: "Vui lòng nhập mã!" });
        // Kiểm tra xem Frontend có gửi giá trị đơn hàng lên không, nếu không mặc định là 0
        const currentTotal = order_total ? Number(order_total) : 0;

        const sql = `SELECT * FROM vouchers WHERE code = ? AND is_used = 0`;
        db.query(sql, [code], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi Server!" });
            
            if (results.length === 0) {
                return res.json({ success: false, message: "Mã không hợp lệ hoặc đã được sử dụng!" });
            }

            const voucher = results[0];

            // 🛑 CHẶN LỖI PHÁ SẢN: Kiểm tra xem đơn hàng có đủ điều kiện giá trị tối thiểu không
            if (currentTotal < voucher.min_order_value) {
                return res.json({ 
                    success: false, 
                    message: `Đơn hàng phải từ ${new Intl.NumberFormat('vi-VN').format(voucher.min_order_value)}đ mới được áp dụng mã này!` 
                });
            }

            // ✅ TRẢ VỀ ĐÚNG CHUẨN FRONTEND YÊU CẦU ĐỂ HẾT LỖI NaN
            res.json({ 
                success: true, 
                message: "Áp dụng mã thành công!",
                discount_amount: Number(voucher.discount_amount) // Ép kiểu Số Nguyên, đẩy ra ngoài không bọc trong data
            });
        });
    },
    claimVoucher: (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập!" });

        const uniqueCode = `ALIN150K-U${userId}`;
        const discountAmount = 150000; 
        const minOrder = 2000000; 

        const checkSql = `SELECT id FROM vouchers WHERE code = ?`;
        db.query(checkSql, [uniqueCode], (err, exist) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi kiểm tra Database!" });

            if (exist.length > 0) {
                return res.json({ success: true, code: uniqueCode, message: "Bạn đã lưu mã này rồi!" });
            }

            const insertSql = `INSERT INTO vouchers (code, discount_amount, min_order_value, user_id, is_used) VALUES (?, ?, ?, ?, 0)`;
            db.query(insertSql, [uniqueCode, discountAmount, minOrder, userId], (err2, result) => {
                if (err2) return res.status(500).json({ success: false, message: "Lỗi khi lưu mã vào kho!" });

                res.json({ success: true, code: uniqueCode, message: "Lưu mã thành công vào kho!" });
            });
        });
    },

    getMyVouchers: (req, res) => {
        const userId = req.params.userId;
        if (!userId) return res.status(400).json({ success: false, message: "Thiếu thông vị người dùng!" });

        const sql = `SELECT * FROM vouchers WHERE user_id = ? AND is_used = 0 ORDER BY id DESC`;
        db.query(sql, [userId], (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi lấy dữ liệu kho mã!" });
            
            res.json({ success: true, data: results });
        });
    },

    // ========================================================
    // 🔥 CÁC API CHO LUỒNG VÒNG QUAY MAY MẮN 🔥
    // ========================================================
    
    getWheelPrizes: (req, res) => {
        const sql = `SELECT id, code, discount_amount, min_order_value FROM vouchers WHERE user_id IS NULL ORDER BY id DESC LIMIT 4`;
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ success: false, message: "Lỗi Server" });
            res.json({ success: true, data: results });
        });
    },

    spinWheel: (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để quay số!" });

        const sql = `SELECT id, discount_amount, min_order_value FROM vouchers WHERE user_id IS NULL ORDER BY id DESC LIMIT 4`;
        db.query(sql, (err, prizes) => {
            if (err || prizes.length === 0) return res.status(500).json({ success: false, message: "Hệ thống chưa cài đặt giải thưởng!" });

            const rand = Math.random() * 100; 
            let finalIndex = 1; // Mặc định là rơi ô Xám
            let isWin = false;
            let wonPrize = null;

            if (rand <= 0.5) {
                finalIndex = 0; isWin = true; wonPrize = prizes[0] || prizes[prizes.length-1];
            } else if (rand <= 3.0) {
                finalIndex = 2; isWin = true; wonPrize = prizes[1] || prizes[prizes.length-1];
            } else if (rand <= 8.0) {
                finalIndex = 4; isWin = true; wonPrize = prizes[2] || prizes[prizes.length-1];
            } else if (rand <= 20.0) {
                finalIndex = 6; isWin = true; wonPrize = prizes[3] || prizes[prizes.length-1];
            } else {
                // Rơi vào 1 trong 4 ô xám (Trượt)
                const missIndexes = [1, 3, 5, 7];
                finalIndex = missIndexes[Math.floor(Math.random() * missIndexes.length)];
                isWin = false;
            }

            if (!isWin) {
                // Trượt thì không thèm ghi vào Database, trả kết quả về bắt nó quay lại
                return res.json({ success: true, isWin: false, prizeIndex: finalIndex });
            }

            // Nếu hên lắm mới trúng thì lưu vào DB
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const uniqueCode = `SPIN-U${userId}-${randomPart}`;

            const insertSql = `INSERT INTO vouchers (code, discount_amount, min_order_value, user_id, is_used) VALUES (?, ?, ?, ?, 0)`;
            db.query(insertSql, [uniqueCode, wonPrize.discount_amount, wonPrize.min_order_value, userId], (err2, result) => {
                if (err2) return res.status(500).json({ success: false, message: "Lỗi trao giải!" });
                
                res.json({
                    success: true, isWin: true, prizeIndex: finalIndex, prizeAmount: wonPrize.discount_amount, code: uniqueCode
                });
            });
        });
    }
};

module.exports = VoucherController;