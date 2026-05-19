const db = require('../../config/db'); 

const createImportInvoice = async (req, res) => {
    // Nhận thêm invoice_image_url và raw_ai_data từ Java gửi lên
    const { supplier_name, total_amount, tax_percent, total_tax_amount, items, invoice_image_url, raw_ai_data } = req.body;
    const userId = 1; // ID Admin

    try {
        let [vendorRows] = await db.promise().query("SELECT id FROM vendors WHERE name = ?", [supplier_name]);
        let vendorId;
        if (vendorRows.length > 0) {
            vendorId = vendorRows[0].id;
        } else {
            const [newVendor] = await db.promise().query("INSERT INTO vendors (name) VALUES (?)", [supplier_name]);
            vendorId = newVendor.insertId;
        }

        // TẠO PHIẾU NHẬP (Lưu kèm link ảnh và JSON AI)
        const [orderResult] = await db.promise().query(
            "INSERT INTO purchase_orders (vendor_id, user_id, total_amount, invoice_image_url, raw_ai_data, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
            [vendorId, userId, total_amount, invoice_image_url, JSON.stringify(raw_ai_data || {})]
        );
        const purchaseOrderId = orderResult.insertId;

        for (const hang of items) {
            const tenSP = hang.product_name;
            const soLuongNhap = hang.quantity;
            const giaNhap = hang.import_price;

            const keywords = tenSP.split(' ').filter(k => k.trim() !== '');
            let queryStr = "SELECT id, name FROM products WHERE 1=1";
            let queryParams = [];
            for (const word of keywords) {
                queryStr += " AND name LIKE ?";
                queryParams.push(`%${word}%`);
            }

            const [productRows] = await db.promise().query(queryStr, queryParams);

            if (productRows.length > 0) {
                const productId = productRows[0].id;

                await db.promise().query(
                    "UPDATE products SET stock_quantity = stock_quantity + ?, import_price = ? WHERE id = ?",
                    [soLuongNhap, giaNhap, productId]
                );

                await db.promise().query(
                    "INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, import_price) VALUES (?, ?, ?, ?)",
                    [purchaseOrderId, productId, soLuongNhap, giaNhap]
                );

                await db.promise().query(
                    "INSERT INTO inventory_logs (product_id, change_qty, reason, created_at) VALUES (?, ?, ?, NOW())",
                    [productId, soLuongNhap, "Nhập hàng tự động bằng AI"]
                );
            }
        }

        res.status(200).json({ success: true, message: "✅ Đã lưu hóa đơn, hình ảnh và cập nhật kho MySQL thành công!" });

    } catch (error) {
        console.error("❌ Lỗi nghiệp vụ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi xử lý đơn nhập" });
    }
};

module.exports = { createImportInvoice };