const db = require('../config/db');

exports.getAll = (filters, callback) => {
  if (typeof filters === 'function') {
    callback = filters;
    filters = {}; 
  }

  // 🚀 TỐI ƯU TỐC ĐỘ: Dùng LEFT JOIN kết hợp Sub-query ở FROM thay vì SELECT lồng nhau
  let sql = `
    SELECT 
      p.*,
      c.name AS category_name,
      b.name AS brand_name,
      pi.image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN (
        SELECT product_id, image_url 
        FROM product_images 
        WHERE id IN (SELECT MAX(id) FROM product_images GROUP BY product_id)
    ) pi ON p.id = pi.product_id
    WHERE p.status = 1
  `;
  
  const params = [];

  if (filters && filters.keyword) {
    sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }

  if (filters && filters.categoryId) {
    sql += " AND p.category_id = ?";
    params.push(filters.categoryId);
  }

  sql += " ORDER BY p.created_at DESC";

  db.query(sql, params, callback);
};

exports.create = (data, callback) => {
  // Thêm import_price, stock_quantity và specifications vào câu lệnh INSERT
  const sql = `
    INSERT INTO products
    (name, sku, price, import_price, stock_quantity, description, specifications, warranty_month, category_id, brand_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    data.name,
    data.sku,
    data.price,
    data.import_price || 0,       // Thêm giá nhập (mặc định là 0 nếu client không gửi)
    data.stock_quantity || 0,     // Thêm số lượng tồn (thay cho bảng inventory cũ)
    data.description,
    data.specifications || '',    // Thêm thông số kỹ thuật
    data.warranty_month,
    data.category_id,
    data.brand_id,
    data.status ?? 1
  ], callback);
};

exports.update = (id, data, callback) => {
  // Bổ sung các trường mới vào câu lệnh UPDATE
  const sql = `
    UPDATE products
    SET name=?, sku=?, price=?, import_price=?, stock_quantity=?, description=?, specifications=?, warranty_month=?,
        category_id=?, brand_id=?, status=?
    WHERE id=?
  `;
  db.query(sql, [
    data.name,
    data.sku,
    data.price,
    data.import_price,      // Cập nhật giá nhập
    data.stock_quantity,    // Cập nhật số lượng tồn
    data.description,
    data.specifications,    // Cập nhật thông số
    data.warranty_month,
    data.category_id,
    data.brand_id,
    data.status,
    id
  ], callback);
};

exports.delete = (id, callback) => {
  // BƯỚC 1: Xóa dữ liệu trong bảng ảnh (product_images) trước
  const sqlDeleteImages = "DELETE FROM product_images WHERE product_id = ?";
  
  db.query(sqlDeleteImages, [id], (err) => {
    if (err) {
      // Nếu lỗi khi xóa ảnh thì dừng lại, báo lỗi ra ngoài
      return callback(err);
    }
    const sqlDeleteProduct = "DELETE FROM products WHERE id = ?";
    db.query(sqlDeleteProduct, [id], callback);
  });
};
exports.getById = (id, callback) => {
  const sql = `
    SELECT 
      p.*, 
      c.name AS category_name, 
      b.name AS brand_name,
      pi.image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN (
        SELECT product_id, image_url 
        FROM product_images 
        WHERE id IN (SELECT MAX(id) FROM product_images GROUP BY product_id)
    ) pi ON p.id = pi.product_id
    WHERE p.id = ?
  `;
  db.query(sql, [id], callback);
};