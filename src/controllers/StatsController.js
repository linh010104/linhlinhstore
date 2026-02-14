/* File: src/controllers/StatsController.js */
const db = require('../config/db');

exports.getRevenue = (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Vui lòng chọn đầy đủ ngày!" });
    }

    // SQL MỚI: Join 3 bảng để lấy cả tên sản phẩm và số lượng
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

    db.query(sql, [start, end], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Lỗi server" });
        }

        // --- XỬ LÝ GOM NHÓM DỮ LIỆU ---
        // Vì Join bảng nên 1 đơn hàng sẽ bị tách thành nhiều dòng (mỗi dòng 1 sp)
        // Ta cần gom chúng lại.
        const ordersMap = new Map();

        result.forEach(row => {
            if (!ordersMap.has(row.id)) {
                // Nếu đơn này chưa có trong map, tạo mới
                ordersMap.set(row.id, {
                    id: row.id,
                    receiver_name: row.receiver_name,
                    created_at: row.created_at,
                    total_amount: parseFloat(row.total_amount),
                    payment_method: row.payment_method,
                    products: [] // Mảng chứa tên các sp
                });
            }
            // Thêm sản phẩm vào danh sách của đơn đó
            // Ví dụ: "Laptop Dell (x1)"
            const productStr = `${row.product_name} (x${row.quantity})`;
            ordersMap.get(row.id).products.push(productStr);
        });

        // Chuyển Map thành Mảng để trả về
        const finalOrders = Array.from(ordersMap.values()).map(order => ({
            ...order,
            // Nối mảng sản phẩm thành chuỗi: "Sp A (x1), Sp B (x2)"
            product_list: order.products.join(', ') 
        }));

        // Tính tổng doanh thu
        let totalRevenue = 0;
        finalOrders.forEach(o => totalRevenue += o.total_amount);

        res.json({
            success: true,
            summary: {
                totalRevenue: totalRevenue,
                totalOrders: finalOrders.length
            },
            orders: finalOrders
        });
    });
};