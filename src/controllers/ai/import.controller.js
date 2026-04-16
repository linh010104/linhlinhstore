/* File: import.controller.js */
const mongoose = require('mongoose');
const db = require('../../config/db'); 

const createImportInvoice = async (req, res) => {
    const { supplier_name, total_amount, tax_percent, total_tax_amount, items } = req.body;
    const userId = "admin_01"; 

    try {
        // ==========================================
        // PHẦN 1: LƯU HÓA ĐƠN THUẾ VÀO MONGODB
        // ==========================================
        const mongoDb = mongoose.connection.db; 
        const danhSachHangHoa = items.map(item => ({
            ten_san_pham: item.product_name,
            so_luong: item.quantity,
            don_gia_nhap: item.import_price
        }));

        const hoaDonTiengViet = {
            nha_cung_cap: supplier_name,
            nguoi_nhap_kho: userId,
            tong_thanh_toan: total_amount,      
            thue_suat_vat: tax_percent,        
            tien_thue_vat: total_tax_amount, 
            danh_sach_hang_hoa: danhSachHangHoa, 
            trang_thai: 'DA_HOAN_THANH',
            ngay_nhap: new Date()
        };

        await mongoDb.collection('hoa_don_nhap').insertOne(hoaDonTiengViet);

        // ==========================================
        // PHẦN 2: CẬP NHẬT KHO BÊN MYSQL (TÌM KIẾM THÔNG MINH + BẢO MẬT)
        // ==========================================
        for (const hang of items) {
            const tenSP = hang.product_name;
            const soLuongNhap = hang.quantity;

            // 1. Tách tên sản phẩm thành các từ khóa nhỏ để tìm kiếm linh hoạt hơn
            const keywords = tenSP.split(' ').filter(k => k.trim() !== '');

            let queryStr = "SELECT id, name FROM products WHERE 1=1";
            let queryParams = [];

            // 2. Chống SQL Injection và nối chuỗi tìm kiếm cho từng từ khóa
            for (const word of keywords) {
                const safeWord = word.replace(/[%_]/g, '\\$&'); // Vá lỗ hổng Wildcard Injection
                queryStr += " AND name LIKE ?";
                queryParams.push(`%${safeWord}%`);
            }

            // 3. Thực thi tìm kiếm
            const [productRows] = await db.promise().query(queryStr, queryParams);

            if (productRows.length > 0) {
                const productId = productRows[0].id;
                const dbProductName = productRows[0].name;

                // Log ra Terminal để ông dễ theo dõi xem nó match với sp nào
                console.log(`✅ [THÀNH CÔNG] AI quét: "${tenSP}" -> Khớp với DB: "${dbProductName}" (ID: ${productId})`);

                // Kiểm tra xem đã có trong bảng inventory chưa
                const [invRows] = await db.promise().query(
                    "SELECT id FROM inventory WHERE product_id = ?", [productId]
                );

                if (invRows.length > 0) {
                    await db.promise().query(
                        "UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE product_id = ?",
                        [soLuongNhap, productId]
                    );
                } else {
                    await db.promise().query(
                        "INSERT INTO inventory (product_id, quantity, updated_at) VALUES (?, ?, NOW())",
                        [productId, soLuongNhap]
                    );
                }

                // Ghi log lịch sử nhập hàng
                await db.promise().query(
                    "INSERT INTO inventory_logs (product_id, change_qty, reason, created_at) VALUES (?, ?, ?, NOW())",
                    [productId, soLuongNhap, "Nhập hàng tự động bằng AI"]
                );
            } else {
                console.log(`⚠️ [THẤT BẠI] Bỏ qua: Không tìm thấy sản phẩm nào chứa các chữ "${tenSP}" trong MySQL.`);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: "✅ Đỉnh cao: Đã lưu Hóa đơn Thuế vào MongoDB và Cập nhật Tồn kho vào MySQL an toàn!" 
        });

    } catch (error) {
        console.error("❌ Lỗi Polyglot:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi lưu Đa cơ sở dữ liệu" });
    }
};

module.exports = { createImportInvoice };