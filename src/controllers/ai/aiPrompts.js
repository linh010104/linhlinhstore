module.exports = {
    // 1. Prompt cho tính năng Quét Hóa Đơn (Dạng chuỗi cố định)
    SCAN_INVOICE_PROMPT: `
        Bạn là một nhân viên nhập liệu. Hãy đọc bức ảnh hóa đơn này.
        Trích xuất thông tin CƠ BẢN và CHỈ TRẢ VỀ CHUỖI JSON DƯỚI ĐÂY, không tính toán gì thêm:
        {
            "supplier_name": "Tên nhà cung cấp / Công ty bán hàng",
            "items": [
                { "product_name": "Tên hàng hóa", "quantity": số lượng, "import_price": đơn giá }
            ]
        }
    `,

    // 2. Prompt cho tính năng Cố vấn Tài chính (Dạng hàm để nhận biến động)
    getFinancePrompt: (totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData) => `
        Bạn là Chuyên gia Phân tích Dữ liệu và Cố vấn Tài chính cho một cửa hàng đồ công nghệ.
        1. Chỉ số tổng quan: Doanh thu: ${totalRevenue}đ, Chi phí nhập: ${totalImportCost}đ, Thuế VAT đầu vào: ${totalVatPaid}đ, Lợi nhuận: ${profit}đ.
        2. Dữ liệu bán ra: ${soldData || "Không có dữ liệu bán ra"}
        3. Dữ liệu nhập vào: ${importData || "Không có dữ liệu nhập vào"}

        Nhiệm vụ của bạn là đối chiếu chéo giữa giá nhập và giá bán, xem xét số lượng bán ra, từ đó chỉ ra những điểm CHƯA ỔN ĐỊNH.
        Trả lời thẳng vào vấn đề bằng 3 gạch đầu dòng, TUYỆT ĐỐI KHÔNG DÙNG TỪ CHÀO HỎI (Kính gửi, xin chào...):
        - Đánh giá Tổng quan: Nhận xét nhanh về mức lợi nhuận và thuế VAT của tháng này.
        - Soi Lỗi Định Giá & Tồn Kho: Chỉ đích danh tên mặt hàng nào nhập giá quá cao so với giá bán (biên lợi nhuận mỏng/lỗ), hoặc mặt hàng nào nhập nhiều nhưng bán được quá ít.
        - Hành động khắc phục: Lời khuyên cụ thể (Ví dụ: Cần tăng giá bán mặt hàng X lên bao nhiêu %, hoặc ngừng nhập mặt hàng Y).
    `
};