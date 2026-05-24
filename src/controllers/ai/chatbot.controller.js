const db = require('../../config/db'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const consultCustomer = async (req, res) => {
    try {
        const { message, userId } = req.body; 

        // 1. Kiểm tra API Key để tránh lỗi sập server
        if (!process.env.GEMINI_API_KEY) {
            console.error("🔥 LỖI CHÍ MẠNG: Thiếu biến môi trường GEMINI_API_KEY");
            return res.status(500).json({ reply: "Dạ hệ thống AI đang được bảo trì, anh/chị vui lòng quay lại sau nhé!" });
        }

        // 2. Lấy TOÀN BỘ kho hàng đang kinh doanh (Bỏ LIMIT để AI quét được hết)
        const [products] = await db.promise().query(
            'SELECT name AS ten_san_pham, price AS gia FROM products WHERE status = 1 ORDER BY id DESC'
        );
        const inventory = products.map(p => `- ${p.ten_san_pham} (Giá: ${p.gia} VNĐ)`).join('\n');

        // 3. PHÂN LOẠI KHÁCH HÀNG & LẤY TÊN GỌI TỰ NHIÊN
        let customerContext = "";
        
        if (userId) {
            const [user] = await db.promise().query('SELECT full_name AS ho_ten FROM users WHERE id = ?', [userId]);
            
            // Lấy từ cuối cùng trong chuỗi họ tên để xưng hô cho thân mật
            const fullName = user[0].ho_ten;
            const shortName = fullName.split(' ').pop(); 

            customerContext = `TÌNH TRẠNG: Khách VIP ĐÃ ĐĂNG NHẬP. Tên thật: ${fullName}. 
            HÀNH ĐỘNG: Xưng "em" và gọi khách là "anh/chị ${shortName}". 
            TUYỆT ĐỐI KHÔNG gọi đầy đủ cả họ và tên. KHÔNG chào hỏi lại dông dài nếu khách đang hỏi sản phẩm.`;
        } else {
            customerContext = `TÌNH TRẠNG: Khách vãng lai (CHƯA ĐĂNG NHẬP). 
            HÀNH ĐỘNG: Xưng "em", gọi "anh/chị". BẮT BUỘC trả lời thẳng vào câu hỏi. Tư vấn xong nhớ nhắc nhẹ: "Đăng nhập ngay để nhận voucher giảm 500K nhé ạ".`;
        }

        // 4. PROMPT "LUẬT THÉP VỀ KHO HÀNG - VÀO VIỆC LUÔN"
        const systemPrompt = `Bạn là Top 1 Sale của LinhLinh Store - cửa hàng bán lẻ đồ công nghệ uy tín.
        DANH SÁCH SẢN PHẨM ĐANG BÁN: \n${inventory}
        
        ${customerContext}

        LUẬT TƯ VẤN (TUYỆT ĐỐI TUÂN THỦ):
        1. QUÉT KHO HÀNG LÀ SỐ 1: Khi khách hỏi về bất kỳ đồ công nghệ nào (điện thoại, laptop, chuột...), BẮT BUỘC phải tìm trong "DANH SÁCH SẢN PHẨM ĐANG BÁN" ở trên.
        2. NẾU CÓ HÀNG: Kể tên ĐẦY ĐỦ các mã khớp nhu cầu và BÁO GIÁ luôn. (VD: "Dạ anh/chị ơi, em đang sẵn mã Laptop Asus TUF giá 20.490.000..."). KHÔNG chào hỏi suông rồi im lặng!
        3. NẾU KHÔNG CÓ HÀNG: BẮT BUỘC phải nói lời xin lỗi, báo rõ là shop không kinh doanh món đó. SAU ĐÓ KHÉO LÉO GỢI Ý sang 1 món khác CÓ TRONG KHO. Tuyệt đối KHÔNG BỊA ra sản phẩm!
        4. CẤM LAN MAN: Trả lời dứt khoát, trọn vẹn câu (khoảng 3-4 câu). Dùng emoji (🔥, 💻, 📱) cho sinh động, KHÔNG dùng dấu sao (**) để in đậm.
        5. CHỐT SALE: Cuối tin nhắn LUÔN có 1 câu hỏi khơi gợi (VD: "Anh/chị ưng mã nào để em lên đơn ạ?", "Ngân sách mình tầm bao nhiêu ạ?").

        Tin nhắn của khách: "${message}"`;

        // 5. Khởi tạo Gemini với cấu hình tối ưu
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.7, // Nhiệt độ vừa đủ để tư vấn tự nhiên mà không bị "ngáo"
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 500, // Đảm bảo AI nói hết câu, không bị cụt lủn
            }
        });

        // 6. Gửi request và trả kết quả
        console.log(`[Chatbot] Đang xử lý tin nhắn của user ${userId || 'vãng lai'}...`);
        const result = await model.generateContent(systemPrompt);
        
        console.log("[Chatbot] Đã trả lời thành công!");
        res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        console.error("🔥 LỖI CHATBOT AI:", error);
        
        let errorMessage = "Dạ hệ thống bên em đang quá tải một chút, anh/chị nhắn lại sau vài giây nhé!";
        if (error.status === 429) {
             errorMessage = "Dạ hôm nay khách đông quá nên em hơi nghẽn, anh/chị nán lại xíu rồi nhắn lại em nha!";
        }
        res.status(500).json({ reply: errorMessage });
    }
};

module.exports = { consultCustomer };