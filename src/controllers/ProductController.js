// const Product = require('../models/ProductModel');
// const db = require('../config/db'); // Đã bổ sung db để gọi thẳng truy vấn sql

// exports.getAll = (req, res) => {
//   const filters = {
//     keyword: req.query.keyword,
//     categoryId: req.query.category_id
//   };

//   Product.getAll(filters, (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json(result);
//   });
// };

// exports.create = (req, res) => {
//   Product.create(req.body, (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json({
//       message: 'Product created successfully',
//       id: result.insertId
//     });
//   });
// };

// exports.update = (req, res) => {
//   const id = req.params.id;
//   const data = req.body;

//   Product.update(id, data, (err) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: 'Update product success' });
//   });
// };

// /**
//  * DELETE PRODUCT (ADMIN)
//  */
// exports.delete = (req, res) => {
//   const id = req.params.id;

//   Product.delete(id, (err) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: 'Delete product success' });
//   });
// };

// exports.uploadImage = (req, res) => {
//  const productId = req.params.id;

//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ message: 'Chưa chọn file ảnh nào' });
//   }
//   const values = req.files.map(file => [
//     productId, 
//     `/uploads/${file.filename}`
//   ]);

//   const sql = `INSERT INTO product_images (product_id, image_url) VALUES ?`;

//   db.query(sql, [values], (err, result) => {
//     if (err) {
//       console.error("Lỗi insert DB:", err);
//       return res.status(500).json(err);
//     }
//     res.json({ 
//       message: `Đã up thành công ${req.files.length} ảnh`, 
//       insertedRows: result.affectedRows 
//     });
//   });
// };

// exports.getDetail = (req, res) => {
//   Product.getById(req.params.id, (err, result) => {
//     if (err) return res.status(500).json(err);
    
//     if (result.length === 0) {
//       return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
//     }
    
//     // Trả về object đầu tiên (vì ID là duy nhất)
//     res.json(result[0]);
//   });
// };

// exports.checkExistence = (req, res) => {
//     const { names } = req.body; // Mảng tên sản phẩm từ AI
//     const sql = "SELECT name FROM products WHERE name IN (?)";
//     db.query(sql, [names], (err, results) => {
//         if (err) return res.status(500).json(err);
//         const existingNames = results.map(r => r.name);
//         res.json({ existingNames });
//     });
// };

// exports.addVariant = (req, res) => {
//   const productId = req.params.id;
//   const { variant_group, variant_name, additional_price, stock_quantity } = req.body;
  
//   const sql = `
//     INSERT INTO product_variants 
//     (product_id, variant_group, variant_name, additional_price, stock_quantity) 
//     VALUES (?, ?, ?, ?, ?)
//   `;
  
//   db.query(sql, [productId, variant_group, variant_name, additional_price || 0, stock_quantity || 0], (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: 'Thêm phiên bản thành công', id: result.insertId });
//   });
// };

// // Xóa một phiên bản
// exports.deleteVariant = (req, res) => {
//   const variantId = req.params.variantId;
//   const sql = "DELETE FROM product_variants WHERE id = ?";
  
//   db.query(sql, [variantId], (err) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: 'Xóa phiên bản thành công' });
//   });
// };

const Product = require('../models/ProductModel');
const db = require('../config/db');

exports.getAll = (req, res) => {
  const filters = {
    keyword: req.query.keyword,
    categoryId: req.query.category_id
  };

  Product.getAll(filters, (err, result) => {
    if (err) return res.status(500).json(err);
    
    // Đảm bảo trả về mảng danh sách sản phẩm sạch cho Frontend
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

exports.uploadImage = (req, res) => {
  const productId = req.params.id;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Chưa chọn file ảnh nào' });
  }
  const values = req.files.map(file => [
    productId, 
    `/uploads/${file.filename}`
  ]);

  const sql = `INSERT INTO product_images (product_id, image_url) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Lỗi insert DB:", err);
      return res.status(500).json(err);
    }
    res.json({ 
      message: `Đã up thành công ${req.files.length} ảnh`, 
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