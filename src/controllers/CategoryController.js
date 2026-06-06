const Category = require('../models/CategoryModel');

exports.getAll = (req, res) => {
  Category.getAll((err, data) => {
    if (err) return res.status(500).json(err);
    
    // Ép kiểu mảng an toàn tuyệt đối tránh lỗi .filter() ở Frontend
    const safeData = Array.isArray(data) ? data : [];
    res.json(safeData);
  });
};

exports.create = (req, res) => {
  if (req.user && req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền!" });
  Category.create(req.body, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Created' });
  });
};

exports.update = (req, res) => {
  if (req.user && req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền!" });
  Category.update(req.params.id, req.body, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Updated' });
  });
};

exports.delete = (req, res) => {
  if (req.user && req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền!" });
  
  Category.delete(req.params.id, (err) => {
    if (err) {
        // 🔥 CHỐT CHẶN BẮT LỖI KHÓA NGOẠI MYSQL
        if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: "Không thể xóa! Đang có sản phẩm thuộc danh mục này." 
            });
        }
        return res.status(500).json(err);
    }
    res.json({ success: true, message: 'Deleted' });
  });
};