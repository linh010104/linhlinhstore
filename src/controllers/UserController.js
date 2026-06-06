const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');

exports.getAll = (req, res) => {
  // 🚨 CHỐT CHẶN: CHỈ ADMIN MỚI ĐƯỢC XEM DANH SÁCH USER
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền quản lý người dùng!" });

  User.getAll((err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.create = async (req, res) => {
  // 🚨 CHỐT CHẶN: NGĂN HACKER TỰ TẠO TÀI KHOẢN ADMIN
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền quản lý người dùng!" });

  const { username, password, full_name, email, phone, role_id } = req.body;
  const hash = await bcrypt.hash(password, 10);

  User.create(
    { username, password: hash, full_name, email, phone, role_id },
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Tạo user thành công' });
    }
  );
};

exports.update = (req, res) => {
  // 🚨 CHỐT CHẶN: NGĂN HACKER TỰ THĂNG CẤP QUYỀN (ROLE)
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền quản lý người dùng!" });

  const id = req.params.id;
  const { full_name, email, phone, role_id } = req.body;

  User.update(id, { full_name, email, phone, role_id }, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Cập nhật user thành công' });
  });
};

exports.changeStatus = (req, res) => {
  // 🚨 CHỐT CHẶN: NGĂN HACKER KHÓA TÀI KHOẢN NGƯỜI KHÁC
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền quản lý người dùng!" });

  const id = req.params.id;
  const { status } = req.body;

  User.changeStatus(id, status, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Đổi trạng thái thành công' });
  });
};