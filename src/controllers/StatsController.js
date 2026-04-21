/* File: src/controllers/StatsController.js - CẬP NHẬT THỐNG KÊ THEO SẢN PHẨM */
const db = require('../config/db');
const mongoose = require('mongoose'); 

exports.getRevenue = (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: "Vui lòng chọn ngày!" });

    const start = startDate + " 00:00:00";
    const end = endDate + " 23:59:59";

    // Truy vấn MySQL: Nhóm theo sản phẩm để lấy số lượng, doanh thu và lợi nhuận
    const sql = `
        SELECT 
            p.id, p.name, p.specifications,
            c.name as category_name, 
            b.name as brand_name,
            SUM(oi.quantity) as sold_quantity,
            SUM(oi.quantity * p.price) as total_revenue,
            SUM(oi.quantity * (p.price - p.import_price)) as total_profit
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE o.status = 'DONE' 
        AND o.created_at BETWEEN ? AND ?
        GROUP BY p.id
        ORDER BY total_profit DESC
    `;

    db.query(sql, [start, end], async (err, productStats) => {
        if (err) return res.status(500).json({ error: err.message });

        let totalRev = 0;
        let totalProf = 0;
        productStats.forEach(p => {
            totalRev += parseFloat(p.total_revenue);
            totalProf += parseFloat(p.total_profit);
        });

        // Lấy dữ liệu chi phí nhập hàng từ MongoDB để tính Tổng vốn
        let totalImportCost = 0;
        let totalVatPaid = 0;
        try {
            const mongoDb = mongoose.connection.db;
            const invoices = await mongoDb.collection('hoa_don_nhap').find({
                ngay_nhap: { $gte: new Date(start), $lte: new Date(end) }
            }).toArray();

            invoices.forEach(inv => {
                totalImportCost += inv.tong_thanh_toan || 0;
                totalVatPaid += inv.tien_thue_vat || 0;
            });
        } catch (mErr) { console.error(mErr); }

        res.json({
            success: true,
            summary: {
                totalRevenue: totalRev,
                totalProfit: totalProf,
                totalImportCost: totalImportCost,
                totalVatPaid: totalVatPaid,
                totalProducts: productStats.length
            },
            product_stats: productStats
        });
    });
};