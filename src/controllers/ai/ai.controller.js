const { GoogleGenerativeAI } = require("@google/generative-ai");

// Lấy chìa khóa từ file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. TÍNH NĂNG CŨ: QUÉT HÓA ĐƠN ---
const scanInvoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Thiếu file ảnh hóa đơn!' });
        }

        console.log("Đã nhận ảnh từ Client, đang gửi cho Google Gemini đọc...");

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            },
        };

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Bạn là một nhân viên nhập liệu. Hãy đọc bức ảnh hóa đơn này.
        Trích xuất thông tin CƠ BẢN và CHỈ TRẢ VỀ CHUỖI JSON DƯỚI ĐÂY, không tính toán gì thêm:
        {
            "supplier_name": "Tên nhà cung cấp / Công ty bán hàng",
            "items": [
                { "product_name": "Tên hàng hóa", "quantity": số lượng, "import_price": đơn giá }
            ]
        }
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        const cleanJsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiData = JSON.parse(cleanJsonString);

        console.log("AI ĐỌC XONG, CHUẨN BỊ GIAO CHO JAVA TÍNH TOÁN:", aiData);

        return res.status(200).json({
            success: true,
            message: "AI đã trích xuất thành công!",
            data: aiData
        });

    } catch (error) {
        console.error("Lỗi Controller AI:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống hoặc AI không nhận diện được hóa đơn." });
    }
};

// --- 2. TÍNH NĂNG MỚI: AI CỐ VẤN TÀI CHÍNH ---
const analyzeFinance = async (req, res) => {
    // Nhận thêm 2 biến danh sách hàng hóa từ Java gửi lên
    const { totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Câu lệnh "Sát thủ": Ép AI soi giá từng mặt hàng
        const prompt = `Bạn là Chuyên gia Phân tích Dữ liệu và Cố vấn Tài chính cho một cửa hàng đồ công nghệ.
        1. Chỉ số tổng quan: Doanh thu: ${totalRevenue}đ, Chi phí nhập: ${totalImportCost}đ, Thuế VAT đầu vào: ${totalVatPaid}đ, Lợi nhuận: ${profit}đ.
        2. Dữ liệu bán ra: ${soldData || "Không có dữ liệu bán ra"}
        3. Dữ liệu nhập vào: ${importData || "Không có dữ liệu nhập vào"}

        Nhiệm vụ của bạn là đối chiếu chéo giữa giá nhập và giá bán, xem xét số lượng bán ra, từ đó chỉ ra những điểm CHƯA ỔN ĐỊNH.
        Trả lời thẳng vào vấn đề bằng 3 gạch đầu dòng, TUYỆT ĐỐI KHÔNG DÙNG TỪ CHÀO HỎI (Kính gửi, xin chào...):
        - Đánh giá Tổng quan: Nhận xét nhanh về mức lợi nhuận và thuế VAT của tháng này.
        - Soi Lỗi Định Giá & Tồn Kho: Chỉ đích danh tên mặt hàng nào nhập giá quá cao so với giá bán (biên lợi nhuận mỏng/lỗ), hoặc mặt hàng nào nhập nhiều nhưng bán được quá ít.
        - Hành động khắc phục: Lời khuyên cụ thể (Ví dụ: Cần tăng giá bán mặt hàng X lên bao nhiêu %, hoặc ngừng nhập mặt hàng Y).`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ success: true, advice: text });

    } catch (error) {
        console.error("Lỗi AI phân tích tài chính:", error);
        res.status(500).json({ success: false, message: "Hệ thống AI đang bận, vui lòng thử lại sau!" });
    }
};

// ĐỪNG QUÊN XUẤT CẢ 2 HÀM RA NHÉ
module.exports = { scanInvoice, analyzeFinance };