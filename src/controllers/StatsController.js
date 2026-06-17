const db = require('../config/db');

exports.getRevenue = (req, res) => {
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
            -- Tính riêng Tổng vốn nhập của mặt hàng này
            SUM(oi.quantity * p.import_price) as total_cost,
            -- Tính riêng Tiền thuế VAT (10% của vốn)
            SUM(oi.quantity * p.import_price * 0.1) as total_vat,
            -- Lợi nhuận = Doanh Thu - (Vốn + Thuế VAT)
            SUM(oi.quantity * p.price) - SUM(oi.quantity * p.import_price * 1.1) as total_profit
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

        // let totalRev = 0;
        // let totalProf = 0;
        // productStats.forEach(p => {
        //     totalRev += parseFloat(p.total_revenue);
        //     totalProf += parseFloat(p.total_profit);
        // });

        // Lấy chi phí nhập kho từ MySQL
        let totalRev = 0;
        let totalProf = 0;
        let totalImportCost = 0; // Thêm cái này
        let totalVatPaid = 0;    // Thêm cái này

        productStats.forEach(p => {
            totalRev += parseFloat(p.total_revenue);
            totalProf += parseFloat(p.total_profit);
            totalImportCost += parseFloat(p.total_cost); // Cộng dồn tiền vốn
            totalVatPaid += parseFloat(p.total_vat);     // Cộng dồn tiền VAT
        });

        // XÓA cái khối try...catch lấy totalImportCost từ purchase_orders đi (vì mình đã tính chính xác theo lượng bán ra ở trên rồi).
        
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