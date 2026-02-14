const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');

exports.getAll = (req, res) => {
  User.getAll((err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.create = async (req, res) => {
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
  const id = req.params.id;
  const { full_name, email, phone, role_id } = req.body;

  User.update(id, { full_name, email, phone, role_id }, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Cập nhật user thành công' });
  });
};

exports.changeStatus = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  User.changeStatus(id, status, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Đổi trạng thái thành công' });
  });
};