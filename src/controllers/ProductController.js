const Product = require('../models/ProductModel');

exports.getAll = (req, res) => {
  const filters = {
    keyword: req.query.keyword,
    categoryId: req.query.category_id
  };

  Product.getAll(filters, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.create = (req, res) => {
  Product.create(req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({
      message: 'Product created successfully',
      id: result.insertId
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

/**
 * DELETE PRODUCT (ADMIN)
 */
exports.delete = (req, res) => {
  const id = req.params.id;

  Product.delete(id, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Delete product success' });
  });
};

exports.uploadImage = (req, res) => {
  const productId = req.params.id;
  const imageUrl = `/uploads/${req.file.filename}`;

  const sql = `
    INSERT INTO product_images (product_id, image_url)
    VALUES (?, ?)
  `;

  db.query(sql, [productId, imageUrl], err => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Upload ảnh thành công', image_url: imageUrl });
  });
};
exports.getDetail = (req, res) => {
  Product.getById(req.params.id, (err, result) => {
    if (err) return res.status(500).json(err);
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    
    // Trả về object đầu tiên (vì ID là duy nhất)
    res.json(result[0]);
  });
};