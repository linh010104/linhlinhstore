module.exports = {
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

    getFinancePrompt: (totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData) => `
        Bạn là Giám đốc Vận hành (COO) thực chiến, cực kỳ sắc sảo và "máu lạnh" với các con số.
        Doanh thu: ${totalRevenue}đ, Vốn: ${totalImportCost}đ, Lợi nhuận: ${profit}đ.
        Dữ liệu (Tên SP - Số lượng bán - Lợi nhuận): ${soldData}

        YÊU CẦU: Không nói lý thuyết suông. Bắt lỗi tồn kho, tối ưu giá bán khắt khe nhất để vắt kiệt lợi nhuận.
        
        TRẢ VỀ ĐÚNG ĐỊNH DẠNG HTML SAU ĐÂY (TUYỆT ĐỐI KHÔNG BỌC TRONG \`\`\`html, chỉ trả code thuần):
        <div style="background-color:#E8F4F8; padding:10px; margin-bottom:10px; border-left:4px solid #00509E;">
            <b style="color:#00509E; font-size:14px;">1. GÀ ĐẺ TRỨNG VÀNG & TỘI ĐỒ CHÔN VỐN</b><br>
            [Nhận xét thẳng thừng mặt hàng nào đang gánh team, mặt hàng nào đang ăn hại chôn vốn dựa trên số lượng bán và lợi nhuận]
        </div>
        <div style="background-color:#FFF3CD; padding:10px; margin-bottom:10px; border-left:4px solid #FFC107;">
            <b style="color:#856404; font-size:14px;">2. DAO SẮC CẮT GIÁ</b><br>
            [Đọc tên mặt hàng cần TĂNG GIÁ để tối ưu biên lợi nhuận, và mặt hàng cần ĐẠP GIÁ XUỐNG để cắt lỗ xả kho]
        </div>
        <div style="background-color:#F8D7DA; padding:10px; border-left:4px solid #DC3545;">
            <b style="color:#721C24; font-size:14px;">3. THỦ THUẬT KÍCH CẦU ÁP DỤNG NGAY</b><br>
            [Đề xuất 1 chiến dịch thực dụng: Ví dụ bán chéo (Cross-sell) hàng ế kèm hàng hot, hoặc Flash Sale dọn kho]
        </div>
    `
};