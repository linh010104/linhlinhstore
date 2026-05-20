const Product = require('../models/ProductModel');
const db = require('../config/db');

exports.getAll = (req, res) => {
  const filters = {
    keyword: req.query.keyword,
    categoryId: req.query.category_id
  };

  Product.getAll(filters, (err, result) => {
    if (err) return res.status(500).json(err);
    const safeResult = Array.isArray(result) ? result : [];
    res.json(safeResult);
  });
};

exports.create = (req, res) => {
  Product.create(req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({
      message: 'Product created successfully',
      id: result ? result.insertId : null
    });
  });
};

exports.update = (req, res) => {
  const id = req.params.id;
  const data = req.body;

  Product.update(id, data, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Update product success' });
  });
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Product.delete(id, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Delete product success' });
  });
};

// 🔥 ĐÃ DỌN DẸP GỌN GÀNG NHỜ CLOUDINARY MIDDLEWARE
exports.uploadImage = (req, res) => {
  const productId = req.params.id;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Chưa chọn file ảnh nào' });
  }

  // Quét qua mảng req.files, bóc lấy cái link mây (file.path) để tạo data insert vào DB
  const values = req.files.map(file => [productId, file.path]);
  const sql = `INSERT INTO product_images (product_id, image_url) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ 
      message: `Đã upload vĩnh viễn thành công ${req.files.length} ảnh lên mây!`, 
      insertedRows: result ? result.affectedRows : 0 
    });
  });
};

exports.getDetail = (req, res) => {
  Product.getById(req.params.id, (err, result) => {
    if (err) return res.status(500).json(err);
    
    const safeResult = Array.isArray(result) ? result : [];
    if (safeResult.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    res.json(safeResult[0]);
  });
};

exports.checkExistence = (req, res) => {
    const { names } = req.body;
    const sql = "SELECT name FROM products WHERE name IN (?)";
    db.query(sql, [names], (err, results) => {
        if (err) return res.status(500).json(err);
        const safeResults = Array.isArray(results) ? results : [];
        const existingNames = safeResults.map(r => r.name);
        res.json({ existingNames });
    });
};

exports.addVariant = (req, res) => {
  const productId = req.params.id;
  const { variant_group, variant_name, additional_price, stock_quantity } = req.body;
  
  const sql = `
    INSERT INTO product_variants 
    (product_id, variant_group, variant_name, additional_price, stock_quantity) 
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [productId, variant_group, variant_name, additional_price || 0, stock_quantity || 0], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Thêm phiên bản thành công', id: result ? result.insertId : null });
  });
};

exports.deleteVariant = (req, res) => {
  const variantId = req.params.variantId;
  const sql = "DELETE FROM product_variants WHERE id = ?";
  
  db.query(sql, [variantId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Xóa phiên bản thành công' });
  });
};