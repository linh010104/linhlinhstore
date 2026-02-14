const db = require('../config/db');
const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.loginAdmin = (req, res) => {
  const { username, password } = req.body;

  User.findByUsername(username, async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    }

    const user = result[0];

    // ❌ KHÔNG PHẢI ADMIN → CẤM
    if (user.role_id !== 1) {
      return res.status(403).json({
        message: 'Chỉ ADMIN mới được đăng nhập Java'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Admin login success',
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
 * LOGIN WEB (STAFF + CUSTOMER)
 */
exports.loginWeb = (req, res) => {
  const { username, password } = req.body;

  User.findByUsername(username, async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const user = result[0];

    // ❌ ADMIN KHÔNG ĐƯỢC LOGIN WEB
    if (user.role_id === 1) {
      return res.status(403).json({
        message: 'Admin không được đăng nhập web'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login web success',
      token,
      user: {
        id: user.id,
        username: user.username,
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
        return res.status(500).json(err);
      }

      res.json({ message: 'Register success' });
    }
  );
};
exports.getProfile = (req, res) => {
    const userId = req.user.id;
    // Không lấy password trả về nhé, lộ chết!
    const sql = "SELECT id, username, full_name, email, phone, created_at FROM users WHERE id = ?";
    
    db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json(result[0]);
    });
};

// 2. Cập nhật thông tin (Tên, Email, SĐT)
exports.updateProfile = (req, res) => {
    const userId = req.user.id;
    const { full_name, email, phone } = req.body;

    const sql = "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?";
    
    db.query(sql, [full_name, email, phone, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Cập nhật thông tin thành công!" });
    });
};
