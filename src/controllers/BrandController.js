const Brand = require('../models/BrandModel');

exports.getAll = (req, res) => {
  Brand.getAll((err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy dữ liệu hãng", error: err });
    res.json(result);
  });
};
exports.getMapping = (req, res) => {
    Brand.getBrandCategoryMapping((err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};