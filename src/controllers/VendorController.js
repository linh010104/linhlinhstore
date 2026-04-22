const Vendor = require('../models/VendorModel');

exports.getAllVendors = (req, res) => {
    Vendor.getAll((err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(results);
    });
};

exports.createVendor = (req, res) => {
    Vendor.create(req.body, (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Thêm nhà cung cấp thành công!", id: result.insertId });
    });
};

exports.updateVendor = (req, res) => {
    Vendor.update(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Cập nhật thành công!" });
    });
};

exports.deleteVendor = (req, res) => {
    Vendor.delete(req.params.id, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Xóa thành công!" });
    });
};