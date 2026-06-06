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
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
  Product.create(req.body, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({
      message: 'Product created successfully',
      id: result ? result.insertId : null
    });
  });
};

exports.update = (req, res) => {
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
  const id = req.params.id;
  const data = req.body;

  Product.update(id, data, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Update product success' });
  });
};

exports.delete = (req, res) => {
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
  const id = req.params.id;

  Product.delete(id, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Delete product success' });
  });
};

// 🔥 ĐÃ DỌN DẸP GỌN GÀNG NHỜ CLOUDINARY MIDDLEWARE
exports.uploadImage = (req, res) => {
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
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
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
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
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
  const variantId = req.params.variantId;
  const sql = "DELETE FROM product_variants WHERE id = ?";
  
  db.query(sql, [variantId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Xóa phiên bản thành công' });
  });
};
exports.getRecommendations = (req, res) => {
    // 1. Nhận mảng danh mục khách đã xem (từ Trình duyệt gửi lên)
    let { viewedCategories, userId } = req.body;
    let finalCategories = Array.isArray(viewedCategories) ? viewedCategories : [];

    // 2. Nếu khách đã ĐĂNG NHẬP -> Chọc Database xem lịch sử đã mua cái gì
    if (userId) {
        const sqlHistory = `
            SELECT DISTINCT p.category_id 
            FROM orders o
            JOIN orders_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
        `;
        
        db.query(sqlHistory, [userId], (err, results) => {
            if (!err && results) {
                // Rút trích mảng các danh mục khách đã từng mua
                const historyCats = results.map(r => r.category_id);
                // Trộn chung "Gu xem" và "Gu mua" lại với nhau, loại bỏ các ID trùng lặp
                finalCategories = [...new Set([...finalCategories, ...historyCats])];
            }
            // Đi bốc sản phẩm gợi ý
            fetchAndReturnProducts(finalCategories, res);
        });
    } else {
        // 3. Khách VÃNG LAI (Chưa đăng nhập) -> Chỉ dùng dữ liệu từ Trình duyệt
        fetchAndReturnProducts(finalCategories, res);
    }
};

// Hàm phụ trợ cho code nó gọn
function fetchAndReturnProducts(categoryIds, res) {
    Product.getRecommended(categoryIds, (err, products) => {
        if (err) return res.status(500).json(err);
        res.json(Array.isArray(products) ? products : []);
    });
}
exports.updateDiscount = (req, res) => {
  if (req.user.role_id !== 1) return res.status(403).json({ message: "Chỉ Admin mới có quyền thao tác sản phẩm!" });
        const productId = req.params.id;
        const discountPercent = req.body.discount_percent;

        // Lưu ý: Đảm bảo bảng products dưới MySQL của sếp ĐÃ CÓ cột discount_percent nhé
        const sql = "UPDATE products SET discount_percent = ? WHERE id = ?";
        
        db.query(sql, [discountPercent, productId], (err, result) => {
            if (err) {
                console.error("Lỗi cập nhật % giảm giá:", err);
                return res.status(500).json({ success: false, message: "Lỗi Server!" });
            }
            res.json({ success: true, message: "Cập nhật giảm giá thành công!" });
        });
    };