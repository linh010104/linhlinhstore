/* File: ai.controller.js */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const prompts = require('./aiPrompts'); // Gọi "Kịch bản" từ file mới tạo vào đây

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. TÍNH NĂNG QUÉT HÓA ĐƠN ---
const scanInvoice = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Thiếu file ảnh hóa đơn!' });

        console.log("Đã nhận ảnh từ Client, đang gửi cho Google Gemini đọc...");
        const imagePart = {
            inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype },
        };

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Gọi hằng số SCAN_INVOICE_PROMPT cực kỳ gọn
        const result = await model.generateContent([prompts.SCAN_INVOICE_PROMPT, imagePart]);
        const responseText = result.response.text();

        const cleanJsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiData = JSON.parse(cleanJsonString);

        console.log("AI ĐỌC XONG, CHUẨN BỊ GIAO CHO JAVA TÍNH TOÁN:", aiData);
        return res.status(200).json({ success: true, message: "AI đã trích xuất thành công!", data: aiData });

    } catch (error) {
        console.error("Lỗi Controller AI:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống hoặc AI không nhận diện được hóa đơn." });
    }
};

// --- 2. TÍNH NĂNG AI CỐ VẤN TÀI CHÍNH ---
const analyzeFinance = async (req, res) => {
    const { totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Truyền tham số vào hàm getFinancePrompt cực kỳ mượt
        const prompt = prompts.getFinancePrompt(totalRevenue, totalImportCost, totalVatPaid, profit, soldData, importData);

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        res.status(200).json({ success: true, advice: text });

    } catch (error) {
        console.error("Lỗi AI phân tích tài chính:", error);
        res.status(500).json({ success: false, message: "Hệ thống AI đang bận, vui lòng thử lại sau!" });
    }
};

module.exports = { scanInvoice, analyzeFinance };