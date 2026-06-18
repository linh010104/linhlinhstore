module.exports = {
    SCAN_INVOICE_PROMPT: `
        Bạn là nhân viên kiểm kho xuất sắc. Hãy đọc bức ảnh hóa đơn này.
        QUAN TRỌNG: Bạn BẮT BUỘC phải tách thông tin sản phẩm ra làm 2 phần:
        1. "product_name" (Tên gốc): CHỈ GIỮ LẠI tên máy, dòng máy, và kích thước màn hình (VD: 11-inch, 14.2 inch, 16 inch). TUYỆT ĐỐI KHÔNG ĐƯỢC TÁCH kích thước màn hình ra khỏi tên.
        2. "variant_name" (Thuộc tính): Tách các thông tin về DUNG LƯỢNG (RAM, SSD, GB, TB), MÀU SẮC, LOẠI SWITCH, VÀ TÊN CHIP/CPU (VD: Core i5, Core i7, Core i9, M1, M2...) ra đây. Nếu không có thì để rỗng "".
        
        Ví dụ 1: "iPad Pro M4 11-inch (256GB WiFi - Đen Không Gian)" -> product_name: "iPad Pro M4 11-inch", variant_name: "256GB WiFi - Đen Không Gian".
        Ví dụ 2: "Samsung Galaxy S24 Ultra (12GB 256GB - Xanh Sky Blue)" -> product_name: "Samsung Galaxy S24 Ultra", variant_name: "12GB 256GB - Xanh Sky Blue".
        Ví dụ 3: "Laptop Dell XPS 13 (Core i9 - 64GB RAM - 2TB SSD)" -> product_name: "Laptop Dell XPS 13", variant_name: "Core i9 - 64GB RAM - 2TB SSD".

        CHỈ TRẢ VỀ ĐÚNG CHUỖI JSON DƯỚI ĐÂY, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC (Tuyệt đối không dùng markdown block):
        {
            "supplier_name": "Tên nhà cung cấp / Công ty bán hàng",
            "items": [
                { 
                    "product_name": "Tên gốc", 
                    "variant_name": "Thuộc tính (nếu có)",
                    "quantity": số_lượng, 
                    "import_price": đơn_giá 
                }
            ]
        }
    `,

    getFinancePrompt: (totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData) => `
        Bạn là Giám đốc Vận hành (COO) thực chiến, cực kỳ sắc sảo và "máu lạnh" với các con số tại LinhLinh Store.
        Đây là bức tranh tài chính thực tế (đã trừ gốc và thuế):
        - Tổng doanh thu: ${totalRevenue}đ
        - Tổng vốn nhập: ${totalImportCost}đ
        - Thuế VAT đã đóng: ${totalVatPaid}đ
        - Lợi nhuận ròng: ${profit}đ.
        Dữ liệu chi tiết (Tên SP - Số lượng bán - Lợi nhuận đem lại): ${soldData}

        YÊU CẦU: Không nói lý thuyết suông. Bắt lỗi tồn kho, tối ưu giá bán khắt khe nhất để vắt kiệt lợi nhuận. Đánh giá dựa trên lợi nhuận ròng thực tế.
        
        TRẢ VỀ ĐÚNG ĐỊNH DẠNG HTML SAU ĐÂY (TUYỆT ĐỐI KHÔNG BỌC TRONG \`\`\`html, chỉ trả code thuần):
        <div style="background-color:#E8F4F8; padding:10px; margin-bottom:10px; border-left:4px solid #7cfb8f;">
            <b style="color:#00509E; font-size:14px;">1. GÀ ĐẺ TRỨNG VÀNG & TỘI ĐỒ CHÔN VỐN</b><br>
            [Nhận xét thẳng thừng mặt hàng nào đang gánh team, mặt hàng nào đang ăn hại chôn vốn dựa trên số lượng bán và lợi nhuận]
        </div>
        <div style="background-color:#FFF3CD; padding:10px; margin-bottom:10px; border-left:4px solid #f0d88e;">
            <b style="color:#856404; font-size:14px;">2. DAO SẮC CẮT GIÁ</b><br>
            [Đọc tên mặt hàng cần TĂNG GIÁ để tối ưu biên lợi nhuận, và mặt hàng cần ĐẠP GIÁ XUỐNG để cắt lỗ xả kho]
        </div>
        <div style="background-color:#F8D7DA; padding:10px; border-left:4px solid #f38691;">
            <b style="color:#721C24; font-size:14px;">3. THỦ THUẬT KÍCH CẦU ÁP DỤNG NGAY</b><br>
            [Đề xuất 1 chiến dịch thực dụng: Ví dụ bán chéo (Cross-sell) hàng ế kèm hàng hot, hoặc Flash Sale dọn kho]
        </div>
    `
};