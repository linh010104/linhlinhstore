const mongoose = require('mongoose');
// Gọi kết nối MySQL (Sửa lại đường dẫn này nếu file config db của ông tên khác)
const db = require('../../config/db'); 

const createImportInvoice = async (req, res) => {
    const { supplier_name, total_amount, tax_percent, total_tax_amount, items } = req.body;
    const userId = "admin_01"; 

    try {
        // ==========================================
        // PHẦN 1: LƯU HÓA ĐƠN THUẾ VÀO MONGODB (TIẾNG VIỆT)
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
        // PHẦN 2: CẬP NHẬT KHO BÊN MYSQL
        // ==========================================
        for (const hang of items) {
            const tenSP = hang.product_name;
            const soLuongNhap = hang.quantity;

            // 1. Tìm product_id trong bảng products (Tìm gần đúng bằng chữ đầu)
            const [productRows] = await db.promise().query(
                "SELECT id FROM products WHERE name LIKE ?", [`%${tenSP}%`]
            );

            if (productRows.length > 0) {
                const productId = productRows[0].id;

                // 2. Kiểm tra xem đã có trong bảng inventory chưa
                const [invRows] = await db.promise().query(
                    "SELECT id FROM inventory WHERE product_id = ?", [productId]
                );

                if (invRows.length > 0) {
                    // Đã có -> Cộng dồn số lượng
                    await db.promise().query(
                        "UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE product_id = ?",
                        [soLuongNhap, productId]
                    );
                } else {
                    // Chưa có -> Tạo mới dòng trong kho
                    await db.promise().query(
                        "INSERT INTO inventory (product_id, quantity, updated_at) VALUES (?, ?, NOW())",
                        [productId, soLuongNhap]
                    );
                }

                // 3. Ghi log lịch sử nhập hàng vào inventory_logs
                await db.promise().query(
                    "INSERT INTO inventory_logs (product_id, change_qty, reason, created_at) VALUES (?, ?, ?, NOW())",
                    [productId, soLuongNhap, "Nhập hàng tự động bằng AI"]
                );
            } else {
                console.log(`⚠️ Bỏ qua: Không tìm thấy SP '${tenSP}' trong MySQL để cập nhật kho.`);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: "✅ Đỉnh cao: Đã lưu Hóa đơn Thuế vào MongoDB và Cập nhật Tồn kho vào MySQL!" 
        });

    } catch (error) {
        console.error("❌ Lỗi Polyglot:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống khi lưu Đa cơ sở dữ liệu" });
    }
};

module.exports = { createImportInvoice };