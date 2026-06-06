const Vendor = require('../models/VendorModel');

exports.getAllVendors = (req, res) => {
    Vendor.getAll((err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(results);
    });
};

exports.createVendor = (req, res) => {
    if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác nhà cung cấp!" });
    Vendor.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Thêm nhà cung cấp thành công!", id: result.insertId });
    });
};

exports.updateVendor = (req, res) => {
    if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác nhà cung cấp!" });
    Vendor.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Cập nhật thành công!" });
    });
};

exports.deleteVendor = (req, res) => {
    if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác nhà cung cấp!" });
    Vendor.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Xóa thành công!" });
    });
};