const db = require('../config/db');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * 🎯 LOGIN GỘP CHUNG (CHO CẢ JAVA VÀ WEB)
 */
exports.login = (req, res) => {
  // Nhận thêm biến clientType ('JAVA' hoặc 'WEB') từ frontend gửi lên
  const { username, password, clientType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu' });
  }

  User.findByUsername(username, async (err, result) => {
    if (err) {
      console.error("Lỗi Database (Login):", err); // Log lỗi ẩn ở Server
      return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' }); // Trả về lỗi chung chung
    }

    if (result.length === 0) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const user = result[0];

    // 🔒 KIỂM TRA QUYỀN DỰA TRÊN NỀN TẢNG (CLIENT TYPE)
    if (clientType === 'JAVA' && user.role_id !== 1) {
      return res.status(403).json({ message: 'Chỉ ADMIN mới được đăng nhập trên ứng dụng Java' });
    }
    if (clientType === 'WEB' && user.role_id === 1) {
      return res.status(403).json({ message: 'Admin không được đăng nhập trên hệ thống Web' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    // Tạo Token
    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role_name
      }
    });
  });
};

/**
 * REGISTER (CHỈ KHÁCH)
 */
exports.register = async (req, res) => {
  const { username, password, full_name, email, phone } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    User.create(
      {
        username,
        password: hashedPassword,
        full_name,
        email,
        phone,
        role_id: 3 // CUSTOMER
      },
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Username hoặc email đã tồn tại' });
          }
          console.error("Lỗi Database (Register):", err);
          return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
        }

        res.json({ message: 'Đăng ký thành công' });
      }
    );
  } catch (error) {
    console.error("Lỗi Server (Register):", error);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

exports.getProfile = (req, res) => {
    const userId = req.user.id;
    // Không lấy password trả về nhé, lộ chết!
    const sql = "SELECT id, username, full_name, email, phone, created_at FROM users WHERE id = ?";
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
          console.error("Lỗi Database (getProfile):", err);
          return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
        }
        if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json(result[0]);
    });
};

// Cập nhật thông tin (Tên, Email, SĐT)
exports.updateProfile = (req, res) => {
    const userId = req.user.id;
    const { full_name, email, phone } = req.body;

    const sql = "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?";
    
    db.query(sql, [full_name, email, phone, userId], (err, result) => {
        if (err) {
          console.error("Lỗi Database (updateProfile):", err);
          return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
        }
        res.json({ message: "Cập nhật thông tin thành công!" });
    });
};
exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới!" });
    }

    // 1. Tìm user để lấy mật khẩu cũ đã mã hóa
    const sqlSelect = "SELECT password FROM users WHERE id = ?";
    
    db.query(sqlSelect, [userId], async (err, result) => {
        if (err) {
            console.error("Lỗi Database (changePassword):", err);
            return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
        }
        if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });

        const hashedPassword = result[0].password;

        // 2. Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, hashedPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không chính xác!" });
        }

        // 3. Mã hóa mật khẩu mới
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Lưu vào Database
        const sqlUpdate = "UPDATE users SET password = ? WHERE id = ?";
        db.query(sqlUpdate, [newHashedPassword, userId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error("Lỗi Database (updatePassword):", updateErr);
                return res.status(500).json({ message: 'Lỗi cập nhật mật khẩu' });
            }
            res.json({ success: true, message: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
        });
    });
};
exports.forgotPassword = async (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Vui lòng nhập email!" });

        // KHAI BÁO THƯ VIỆN GỬI MAIL (Nếu đầu file chưa có)
        const nodemailer = require('nodemailer');

        try {
            // 1. Kiểm tra email có trong Database không
            const [users] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: "Email không tồn tại trong hệ thống!" });
            }

            // 2. Tạo mật khẩu mới ngẫu nhiên (6 ký tự)
            const newPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // 3. BĂM MẬT KHẨU TRƯỚC KHI LƯU VÀO DB (Quét sạch lỗi "Sai pass" khi đăng nhập lại)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // 4. Cập nhật mật khẩu mới (ĐÃ BĂM) vào DB
            await db.promise().query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

            // 5. Cấu hình gửi Email (Đọc từ file .env)
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD // Đã điền pass ứng dụng trong .env
                }
            });

            const mailOptions = {
                from: `"LinhLinh Store" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '🔒 Khôi phục mật khẩu - LinhLinh Store',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
                        <h2 style="color: #d70018; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">LinhLinh Store</h2>
                        <p>Xin chào bạn,</p>
                        <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email này.</p>
                        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                            <p style="margin: 0; color: #721c24; font-weight: bold;">Mật khẩu mới của bạn là:</p>
                            <p style="font-size: 24px; font-weight: 900; letter-spacing: 4px; margin: 10px 0 0 0; color: #d70018;">${newPassword}</p>
                        </div>
                        <p><i>Vui lòng đăng nhập bằng mật khẩu này và tiến hành đổi lại mật khẩu ngay lập tức trong mục Hồ sơ để đảm bảo an toàn.</i></p>
                    </div>`
            };

            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: "Mật khẩu mới đã được gửi vào Email của bạn!" });

        } catch (error) {
            console.error("Lỗi gửi email quên mật khẩu:", error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi gửi email." });
        }
    };