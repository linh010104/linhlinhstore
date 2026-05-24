const db = require('../../config/db'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const consultCustomer = async (req, res) => {
    try {
        const { message, userId } = req.body; 

        // 1. Kiểm tra nhanh API Key để tránh lỗi sập server
        if (!process.env.GEMINI_API_KEY) {
            console.error("🔥 LỖI CHÍ MẠNG: Thiếu biến môi trường GEMINI_API_KEY");
            return res.status(500).json({ reply: "Dạ hệ thống AI đang được bảo trì, anh/chị vui lòng quay lại sau nhé!" });
        }

        // 2. Tối ưu truy vấn Database (Gom chung các truy vấn nhỏ)
        const [products] = await db.promise().query(
            'SELECT name AS ten_san_pham, price AS gia FROM products WHERE status = 1 ORDER BY id DESC LIMIT 20'
        );
        const inventory = products.map(p => `- ${p.ten_san_pham} (Giá: ${p.gia} VNĐ)`).join('\n');

        let customerProfile = "Đây là khách hàng mới (vãng lai). Hãy chào mừng nồng nhiệt.";
        
        if (userId) {
            const [user] = await db.promise().query('SELECT full_name AS ho_ten FROM users WHERE id = ?', [userId]);
            
            // Tối ưu: Lấy trực tiếp tên sản phẩm mua gần nhất mà không cần JOIN phức tạp nếu không cần thiết
            const [orders] = await db.promise().query(
                `SELECT p.name AS ten_san_pham 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 JOIN orders o ON oi.order_id = o.id 
                 WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 1`, [userId]
            );
            
            const [cart] = await db.promise().query(
                `SELECT p.name AS ten_san_pham 
                 FROM carts c 
                 JOIN products p ON c.product_id = p.id 
                 WHERE c.user_id = ?`, [userId]
            );

            if (user.length > 0) {
                customerProfile = `Khách hàng tên: ${user[0].ho_ten}. 
                ${orders.length > 0 ? `Sản phẩm mua gần nhất: ${orders[0].ten_san_pham}.` : 'Chưa mua hàng lần nào.'}
                ${cart.length > 0 ? `Trong giỏ hàng đang có: ${cart.map(c => c.ten_san_pham).join(', ')}.` : 'Giỏ hàng trống.'}`;
            }
        }

        // 3. Tối ưu Prompt để AI "nhập vai" mượt mà hơn
        const systemPrompt = `Bạn là chuyên viên tư vấn bán hàng CỰC KỲ NHIỆT TÌNH, NĂNG ĐỘNG và CHUYÊN NGHIỆP của "LinhLinh Store" - cửa hàng đồ công nghệ siêu uy tín. 

        Thông tin khách hàng: ${customerProfile}
        Kho hàng của shop hiện có: \n${inventory}

        QUY TẮC TƯ VẤN (TUYỆT ĐỐI TUÂN THỦ):
        1. THÁI ĐỘ: Lúc nào cũng vui vẻ, dùng emoji phù hợp (như 😊, 🚀, 💻, 🔥). Xưng "em" và gọi khách là "anh/chị". 
        2. MỞ BÀI: Nếu khách chỉ chào hỏi ngắn gọn, hãy chào lại thật nhiệt tình, giới thiệu nhẹ shop đang bán Laptop, điện thoại, phụ kiện ngon bổ rẻ.
        3. TƯ VẤN: LUÔN hỏi MỤC ĐÍCH sử dụng hoặc NGÂN SÁCH trước khi tư vấn lan man. Gợi ý TỐI ĐA 2 sản phẩm có sẵn trong kho.
        4. HÀNH VĂN: Trả lời tự nhiên như người thật đang chat, súc tích (dưới 80 chữ). KHÔNG format in đậm (**).
        5. CHỐT SALE (QUAN TRỌNG NHẤT): LUÔN LUÔN kết thúc câu trả lời bằng MỘT CÂU HỎI MỞ để kéo dài câu chuyện. (VD: "Anh/chị đang tìm máy để chơi game hay làm việc ạ?", "Ngân sách của mình tầm khoảng bao nhiêu để em lựa cho chuẩn ạ?").`;

        // 4. Khởi tạo Gemini với phiên bản mạnh mẽ nhất
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.8, // 🔥 Bơm muối lên 0.8 để AI nói chuyện duyên dáng, sáng tạo và tự nhiên hơn
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 256,
            }
        });

        // 5. Gửi request và đo thời gian
        console.log(`Đang gửi câu hỏi lên Gemini cho khách hàng ${userId || 'vãng lai'}...`);
        const result = await model.generateContent(`${systemPrompt}\n\nKhách hàng hỏi: ${message}`);
        
        console.log("✅ Gemini đã trả lời thành công!");
        res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        // Bắt lỗi cực kỳ chi tiết để sau này có lỗi là biết ngay do đâu
        console.error("🔥 LỖI CHATBOT AI:", error);
        
        // Phân tích mã lỗi của Google
        let errorMessage = "Dạ hệ thống bên em đang quá tải một chút, anh/chị nhắn lại sau vài giây nhé!";
        if (error.status === 429) {
             console.error("-> Nguyên nhân: Hết quota (Rate Limit) của gói API Free.");
             errorMessage = "Dạ hôm nay khách đông quá nên em hơi nghẽn, anh/chị nán lại 1 phút rồi nhắn lại em nha!";
        } else if (error.message && error.message.includes("API key not valid")) {
             console.error("-> Nguyên nhân: API Key bị sai hoặc đã hết hạn.");
        }

        res.status(500).json({ reply: errorMessage });
    }
};

module.exports = { consultCustomer };