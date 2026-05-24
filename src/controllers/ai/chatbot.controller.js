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
        const systemPrompt = `Bạn là nhân viên Sale xuất sắc nhất của "LinhLinh Store". Cực kỳ lanh lợi, dẻo miệng và biết cách giữ chân khách.

        Thông tin khách hàng: ${customerProfile}
        Kho hàng ĐANG CÓ SẴN (chỉ tư vấn trong danh sách này): \n${inventory}

        NHIỆM VỤ TỐI THƯỢNG (TUYỆT ĐỐI TUÂN THỦ):
        1. VÀO VIỆC LUÔN: Nếu khách hỏi sản phẩm (VD: "điện thoại giá rẻ", "laptop gaming"), PHẢI TÌM NGAY 1-2 sản phẩm khớp nhất trong "Kho hàng" để báo giá luôn. KHÔNG ĐƯỢC chỉ chào hỏi suông rồi im lặng!
        2. XỬ LÝ TỪ CHỐI/HẾT HÀNG: Nếu khách hỏi món rẻ mà kho toàn đồ đắt, hãy khéo léo giới thiệu món rẻ nhất đang có (VD: "Dạ hiện bên em dòng rẻ nhất đang có mã này siêu ngon..."). 
        3. GIỌNG VĂN CHỐT SALE: Dùng từ ngữ hấp dẫn (VD: "Deal hời", "Cực mượt", "Siêu phẩm"), kèm emoji (🔥, 📱, 👇). Xưng "em", gọi "anh/chị".
        4. THỰC TẾ & NGẮN GỌN: Chỉ báo giá những món CÓ TRONG KHO HÀNG ở trên. Tuyệt đối không bịa sản phẩm. Trả lời dưới 80 chữ.
        5. CÂU HỎI MỞ: Cuối câu trả lời LUÔN LUÔN phải có 1 câu hỏi để ép khách tương tác lại (VD: "Anh chị ưng mẫu này không để em lên đơn ạ?", "Ngân sách mình định đầu tư khoảng bao nhiêu ạ?").`;

        // 4. Giữ nguyên cấu hình Gemini này (Temperature 0.8 là chuẩn rồi)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.8, 
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