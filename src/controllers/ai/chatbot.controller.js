const db = require('../../config/db'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const consultCustomer = async (req, res) => {
    try {
        const { message, userId } = req.body; 

        // 1. Lấy danh sách sản phẩm từ bảng 'products' (đổi tên cột AS cho khớp logic cũ)
        const [products] = await db.promise().query(
            'SELECT name AS ten_san_pham, price AS gia FROM products ORDER BY id DESC LIMIT 20'
        );
        
        // Tui bỏ chữ 'Loại' đi vì nhìn trong db của ông category_id là số, ném cho AI nó không hiểu
        const inventory = products.map(p => `- ${p.ten_san_pham} (Giá: ${p.gia} VNĐ)`).join('\n');

        // 2. Thu thập "profile" khách hàng
        let customerProfile = "Đây là khách hàng mới (vãng lai). Hãy chào mừng nồng nhiệt.";
        
        if (userId) {
            // Sửa lại thành bảng 'users'. Giả định cột tên của ông là 'name' (Nếu database dùng fullname hay ho_ten thì ông tự đổi chữ 'name' nhé)
            const [user] = await db.promise().query('SELECT name AS ho_ten FROM users WHERE id = ?', [userId]);
            
            // Sửa lại thành bảng 'orders' và 'order_items'
            const [orders] = await db.promise().query(
                `SELECT p.name AS ten_san_pham 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 JOIN orders o ON oi.order_id = o.id 
                 WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 1`, [userId]
            );
            
            // Sửa lại thành bảng 'carts'
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

        // 3. Xây dựng Prompt cho Chatbot
        const systemPrompt = `Bạn là chuyên viên tư vấn bán hàng của "linhlinhstore". 
        Thông tin khách hàng: ${customerProfile}
        Kho hàng của shop: \n${inventory}

        QUY TẮC TƯ VẤN:
        - Khách quen thì chào tên. Khách mới thì chào mừng.
        - Hỏi MỤC ĐÍCH sử dụng và NGÂN SÁCH trước -> Gợi ý 1-2 sản phẩm khớp nhất từ KHO HÀNG.
        - Giọng văn: Thân thiện, xưng "em" gọi "anh/chị", siêu ngắn gọn (dưới 80 chữ).
        - Luôn kết thúc bằng một câu hỏi dẫn dắt.`;

        // 4. Gọi Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(`${systemPrompt}\nKhách hàng: ${message}`);
        
        res.status(200).json({ reply: result.response.text() });

    } catch (error) {
        console.error("Lỗi Chatbot AI:", error);
        res.status(500).json({ reply: "Dạ hệ thống bên em đang quá tải một chút, anh/chị nhắn lại sau vài giây nhé!" });
    }
};

module.exports = { consultCustomer };