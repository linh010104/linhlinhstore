/* File: import.controller.js */
const mongoose = require('mongoose');
const db = require('../../config/db'); 

const createImportInvoice = async (req, res) => {
    const { supplier_name, total_amount, tax_percent, total_tax_amount, items } = req.body;
    const userId = 1; // Đổi thành ID số của Admin (thường là 1) để khớp với MySQL

    try {
        const mongoDb = mongoose.connection.db; 
        const danhSachHangHoa = items.map(item => ({
            ten_san_pham: item.product_name,
            so_luong: item.quantity,
            don_gia_nhap: item.import_price
        }));

        const hoaDonMongo = {
            nha_cung_cap: supplier_name,
            nguoi_nhap_kho: userId,
            tong_thanh_toan: total_amount,      
            thue_suat_vat: tax_percent,        
            tien_thue_vat: total_tax_amount, 
            danh_sach_hang_hoa: danhSachHangHoa, 
            trang_thai: 'DA_HOAN_THANH',
            ngay_nhap: new Date()
        };
        await mongoDb.collection('hoa_don_nhap').insertOne(hoaDonMongo);

        // ==========================================
        // PHẦN 2: XỬ LÝ NGHIỆP VỤ BÊN MYSQL (BẢN CẬP NHẬT)
        // ==========================================
        
        // 1. Tìm hoặc tạo Nhà cung cấp (Vendor)
        let [vendorRows] = await db.promise().query("SELECT id FROM vendors WHERE name = ?", [supplier_name]);
        let vendorId;
        if (vendorRows.length > 0) {
            vendorId = vendorRows[0].id;
        } else {
            const [newVendor] = await db.promise().query("INSERT INTO vendors (name) VALUES (?)", [supplier_name]);
            vendorId = newVendor.insertId;
        }

        // 2. Tạo Phiếu nhập hàng (Purchase Order)
        const [orderResult] = await db.promise().query(
            "INSERT INTO purchase_orders (vendor_id, user_id, total_amount, created_at) VALUES (?, ?, ?, NOW())",
            [vendorId, userId, total_amount]
        );
        const purchaseOrderId = orderResult.insertId;

        // 3. Duyệt danh sách hàng để cập nhật kho và lưu chi tiết
        for (const hang of items) {
            const tenSP = hang.product_name;
            const soLuongNhap = hang.quantity;
            const giaNhap = hang.import_price;

            // Tìm sản phẩm bằng tên (Search thông minh như cũ)
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

                // A. Cập nhật tồn kho trực tiếp vào bảng products (Thay thế cho bảng inventory đã xóa)
                await db.promise().query(
                    "UPDATE products SET stock_quantity = stock_quantity + ?, import_price = ? WHERE id = ?",
                    [soLuongNhap, giaNhap, productId]
                );

                // B. Lưu vào chi tiết đơn nhập hàng (purchase_order_items)
                await db.promise().query(
                    "INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, import_price) VALUES (?, ?, ?, ?)",
                    [purchaseOrderId, productId, soLuongNhap, giaNhap]
                );

                // C. Ghi log lịch sử (Giữ nguyên bảng log)
                await db.promise().query(
                    "INSERT INTO inventory_logs (product_id, change_qty, reason, created_at) VALUES (?, ?, ?, NOW())",
                    [productId, soLuongNhap, "Nhập hàng tự động bằng AI"]
                );

                console.log(`✅ Khớp: "${tenSP}" -> Đã cập nhật kho ID: ${productId}`);
            } else {
                console.log(`⚠️ Bỏ qua: Không tìm thấy sản phẩm "${tenSP}"`);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: "✅ Thành công: Lưu MongoDB và cập nhật hệ thống quản lý kho mới (MySQL)!" 
        });

    } catch (error) {
        console.error("❌ Lỗi nghiệp vụ:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi xử lý đơn nhập" });
    }
};

module.exports = { createImportInvoice };