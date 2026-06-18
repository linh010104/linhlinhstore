const db = require('../../config/db'); 

const createImportInvoice = async (req, res) => {
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

        const [orderResult] = await db.promise().query(
            "INSERT INTO purchase_orders (vendor_id, user_id, total_amount, invoice_image_url, raw_ai_data, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
            [vendorId, userId, total_amount, invoice_image_url, JSON.stringify(raw_ai_data || {})]
        );
        const purchaseOrderId = orderResult.insertId;

        for (const hang of items) {
            const tenSP = hang.product_name;
            const mauMa = hang.variant_name || ""; 
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

                // 1. Cập nhật tồn kho tổng bảng products
                await db.promise().query(
                    "UPDATE products SET stock_quantity = stock_quantity + ?, import_price = ? WHERE id = ?",
                    [soLuongNhap, giaNhap, productId]
                );

                // 2. LOGIC TỰ ĐỘNG THÊM/CẬP NHẬT BẢNG product_variants (MẪU MÃ)
                if (mauMa !== "") {
                    const [variantRows] = await db.promise().query(
                        "SELECT id FROM product_variants WHERE product_id = ? AND variant_name = ?", 
                        [productId, mauMa]
                    );

                    if (variantRows.length > 0) {
                        // Đã có mẫu mã này -> Chỉ cộng dồn tồn kho
                        await db.promise().query(
                            "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?",
                            [soLuongNhap, variantRows[0].id]
                        );
                    } else {
                        // Chưa có mẫu mã này -> Tự động tạo mới!
                        await db.promise().query(
                            "INSERT INTO product_variants (product_id, variant_group, variant_name, additional_price, stock_quantity) VALUES (?, 'Phân loại', ?, 0, ?)",
                            [productId, mauMa, soLuongNhap]
                        );
                    }
                }

                // 3. Ghi chi tiết phiếu nhập (có variant_info)
                await db.promise().query(
                    "INSERT INTO purchase_order_items (purchase_order_id, product_id, variant_info, quantity, import_price) VALUES (?, ?, ?, ?, ?)",
                    [purchaseOrderId, productId, mauMa, soLuongNhap, giaNhap]
                );

                // 4. Ghi log lịch sử kho (có variant_info)
                await db.promise().query(
                    "INSERT INTO inventory_logs (product_id, variant_info, change_qty, reason, created_at) VALUES (?, ?, ?, ?, NOW())",
                    [productId, mauMa, soLuongNhap, "Nhập hàng tự động bằng AI"]
                );
            }
        }

        res.status(200).json({ success: true, message: "✅ Đã lưu hóa đơn, tự động xử lý mẫu mã và cập nhật kho MySQL thành công!" });

    } catch (error) {
        console.error("❌ Lỗi nghiệp vụ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi xử lý đơn nhập" });
    }
};

module.exports = { createImportInvoice };