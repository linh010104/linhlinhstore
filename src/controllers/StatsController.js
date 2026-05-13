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
exports.getDashboardOverview = async (req, res) => {
    try {
        // 1. Lấy tổng doanh thu trong ngày (Chỉ tính đơn 'DONE')
        const revenueSql = `
            SELECT SUM(oi.quantity * p.price) as total_revenue 
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status = 'DONE' AND DATE(o.created_at) = CURDATE()
        `;
        const revenueResult = await new Promise((resolve, reject) => db.query(revenueSql, (err, result) => err ? reject(err) : resolve(result)));
        const revenueToday = revenueResult[0].total_revenue || 0;

        // 2. Đếm số đơn hàng mới (status = 'NEW')
        const ordersSql = "SELECT COUNT(*) AS new_orders FROM orders WHERE status = 'NEW'";
        const ordersResult = await new Promise((resolve, reject) => db.query(ordersSql, (err, result) => err ? reject(err) : resolve(result)));
        const newOrders = ordersResult[0].new_orders || 0;

        // 3. Đếm số lượng sản phẩm sắp hết hàng (< 10)
        const stockSql = "SELECT COUNT(*) AS low_stock FROM products WHERE stock_quantity < 10";
        const stockResult = await new Promise((resolve, reject) => db.query(stockSql, (err, result) => err ? reject(err) : resolve(result)));
        const lowStock = stockResult[0].low_stock || 0;

        // --- MỚI: 4. LẤY DOANH THU 7 NGÀY QUA (DÙNG CHO BIỂU ĐỒ) ---
        const chartSql = `
            SELECT DATE(o.created_at) as order_date, SUM(oi.quantity * p.price) as daily_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status = 'DONE' AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(o.created_at)
            ORDER BY DATE(o.created_at) ASC
        `;
        const chartResult = await new Promise((resolve, reject) => db.query(chartSql, (err, result) => err ? reject(err) : resolve(result)));

        // Xử lý tạo mảng đúng 7 ngày (kể cả ngày không có doanh thu)
        const chartLabels = [];
        const chartData = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            let d = new Date(today);
            d.setDate(today.getDate() - i);
            let day = d.getDate().toString().padStart(2, '0');
            let month = (d.getMonth() + 1).toString().padStart(2, '0');
            chartLabels.push(`${day}/${month}`); // In ra chữ: 07/05, 08/05...

            let matchDateStr = `${d.getFullYear()}-${month}-${day}`;
            let dailyRev = 0;
            let found = chartResult.find(r => {
                let rDate = new Date(r.order_date);
                let rMonth = (rDate.getMonth() + 1).toString().padStart(2, '0');
                let rDay = rDate.getDate().toString().padStart(2, '0');
                return `${rDate.getFullYear()}-${rMonth}-${rDay}` === matchDateStr;
            });
            if (found) dailyRev = found.daily_revenue;
            chartData.push(dailyRev);
        }

        // --- MỚI: 5. LẤY 5 ĐƠN HÀNG MỚI NHẤT ---
        const recentOrdersSql = `
            SELECT id, receiver_name as customer, total_amount, status 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        const recentOrdersResult = await new Promise((resolve, reject) => db.query(recentOrdersSql, (err, result) => err ? reject(err) : resolve(result)));

        // Trả kết quả về
        res.status(200).json({
            success: true,
            data: {
                revenueToday: revenueToday,
                newOrders: newOrders,
                lowStock: lowStock,
                chartLabels: chartLabels,   // Trả mảng chữ (VD: ['07/05', '08/05'...])
                chartData: chartData,       // Trả mảng số (VD: [0, 1500000, 0...])
                recentOrders: recentOrdersResult
            }
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu Dashboard:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi lấy thống kê" });
    }
};