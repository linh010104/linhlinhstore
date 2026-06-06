const db = require('../config/db');

exports.getRevenue = (req, res) => {
    // 🚨 BƯỚC KIỂM TRA QUYỀN LỰC: CHỈ ADMIN MỚI ĐƯỢC XEM DOANH THU 🚨
    if (!req.user || req.user.role_id !== 1) {
        return res.status(403).json({ 
            success: false, 
            message: "Cảnh báo bảo mật: Chỉ Admin mới có quyền truy cập dữ liệu thống kê!" 
        });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: "Vui lòng chọn ngày!" });

    const start = startDate + " 00:00:00";
    const end = endDate + " 23:59:59";

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

        // Lấy chi phí nhập kho từ MySQL
        let totalImportCost = 0;
        let totalVatPaid = 0; 
        
        try {
            const importSql = "SELECT SUM(total_amount) as total_import FROM purchase_orders WHERE created_at BETWEEN ? AND ?";
            const [importResult] = await db.promise().query(importSql, [start, end]);
            totalImportCost = importResult[0].total_import || 0;
        } catch (mErr) { 
            console.error("Lỗi tính tổng vốn từ MySQL:", mErr); 
        }

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
    // 🚨 BƯỚC KIỂM TRA QUYỀN LỰC: BẢO VỆ LUÔN CÁI DASHBOARD TỔNG QUAN 🚨
    if (!req.user || req.user.role_id !== 1) {
        return res.status(403).json({ 
            success: false, 
            message: "Cảnh báo bảo mật: Chỉ Admin mới có quyền truy cập Dashboard!" 
        });
    }

    try {
        const revenueSql = `
            SELECT SUM(oi.quantity * p.price) as total_revenue 
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.status = 'DONE' AND DATE(o.created_at) = CURDATE()
        `;
        const revenueResult = await new Promise((resolve, reject) => db.query(revenueSql, (err, result) => err ? reject(err) : resolve(result)));
        const revenueToday = revenueResult[0].total_revenue || 0;

        const ordersSql = "SELECT COUNT(*) AS new_orders FROM orders WHERE status = 'NEW'";
        const ordersResult = await new Promise((resolve, reject) => db.query(ordersSql, (err, result) => err ? reject(err) : resolve(result)));
        const newOrders = ordersResult[0].new_orders || 0;

        const stockSql = "SELECT COUNT(*) AS low_stock FROM products WHERE stock_quantity < 10";
        const stockResult = await new Promise((resolve, reject) => db.query(stockSql, (err, result) => err ? reject(err) : resolve(result)));
        const lowStock = stockResult[0].low_stock || 0;

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

        const chartLabels = [];
        const chartData = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            let d = new Date(today);
            d.setDate(today.getDate() - i);
            let day = d.getDate().toString().padStart(2, '0');
            let month = (d.getMonth() + 1).toString().padStart(2, '0');
            chartLabels.push(`${day}/${month}`); 

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
        const recentOrdersSql = `
            SELECT id, receiver_name as customer, total_amount, status 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        const recentOrdersResult = await new Promise((resolve, reject) => db.query(recentOrdersSql, (err, result) => err ? reject(err) : resolve(result)));

        res.status(200).json({
            success: true,
            data: {
                revenueToday: revenueToday,
                newOrders: newOrders,
                lowStock: lowStock,
                chartLabels: chartLabels, 
                chartData: chartData,      
                recentOrders: recentOrdersResult
            }
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu Dashboard:", error);
        res.status(500).json({ success: false, message: "Lỗi server khi lấy thống kê" });
    }
};