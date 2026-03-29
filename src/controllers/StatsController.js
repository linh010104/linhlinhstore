/* File: src/controllers/StatsController.js */
const db = require('../config/db');
const mongoose = require('mongoose'); 

exports.getRevenue = (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Vui lòng chọn đầy đủ ngày!" });
    }

    const sql = `
        SELECT 
            o.id, o.receiver_name, o.created_at, o.total_amount, o.payment_method,
            p.name as product_name, oi.quantity
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.status = 'DONE' 
        AND o.created_at BETWEEN ? AND ?
        ORDER BY o.created_at DESC
    `;

    const start = startDate + " 00:00:00";
    const end = endDate + " 23:59:59";

    db.query(sql, [start, end], async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Lỗi server MySQL" });
        }

        // --- A. XỬ LÝ DOANH THU TỪ MYSQL ---
        const ordersMap = new Map();

        result.forEach(row => {
            if (!ordersMap.has(row.id)) {
                ordersMap.set(row.id, {
                    id: row.id,
                    receiver_name: row.receiver_name,
                    created_at: row.created_at,
                    total_amount: parseFloat(row.total_amount),
                    payment_method: row.payment_method,
                    products: [] 
                });
            }
            const productStr = `${row.product_name} (x${row.quantity})`;
            ordersMap.get(row.id).products.push(productStr);
        });

        const finalOrders = Array.from(ordersMap.values()).map(order => ({
            ...order,
            product_list: order.products.join(', ') 
        }));

        let totalRevenue = 0;
        finalOrders.forEach(o => totalRevenue += o.total_amount);

        // --- B. XỬ LÝ CHI PHÍ & THUẾ TỪ MONGODB ---
        let totalImportCost = 0;
        let totalVatPaid = 0;
        let danhSachHoaDon = []; // <--- ĐÃ FIX: Khai báo mảng rỗng ở ngoài để ai cũng thấy

        try {
            const mongoDb = mongoose.connection.db;
            const queryStart = new Date(start);
            const queryEnd = new Date(end);

            // Tìm và gán vào biến ở ngoài
            danhSachHoaDon = await mongoDb.collection('hoa_don_nhap').find({
                ngay_nhap: {
                    $gte: queryStart,
                    $lte: queryEnd
                }
            }).toArray();

            danhSachHoaDon.forEach(inv => {
                totalImportCost += inv.tong_thanh_toan || 0;
                totalVatPaid += inv.tien_thue_vat || 0;
            });
            
        } catch (mongoErr) {
            console.error("Lỗi khi truy vấn MongoDB:", mongoErr);
        }

        // --- C. ĐÓNG GÓI TOÀN BỘ KẾT QUẢ GỬI CHO JAVA ---
        res.json({
            success: true,
            summary: {
                totalRevenue: totalRevenue,
                totalOrders: finalOrders.length,
                totalImportCost: totalImportCost, 
                totalVatPaid: totalVatPaid        
            },
            orders: finalOrders,
            invoices: danhSachHoaDon // <--- Gửi thẳng mảng này về cho Java làm Excel
        });
    });
};