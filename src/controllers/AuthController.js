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