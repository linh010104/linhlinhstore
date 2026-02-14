const db = require('../config/db');

exports.getAll = (filters, callback) => {
  
  // Xử lý trường hợp nếu gọi hàm mà quên truyền filters (để tránh lỗi)
  if (typeof filters === 'function') {
    callback = filters;
    filters = {}; // Gán filters là rỗng nếu không có
  }

  let sql = `
    SELECT 
      p.*,
      c.name AS category_name,
      b.name AS brand_name,
      -- SỬA Ở ĐÂY: Thêm ORDER BY id DESC để lấy ảnh mới thêm vào sau cùng
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id DESC LIMIT 1) AS image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.status = 1
  `;
  
  const params = [];

  // 1. Nếu có từ khóa tìm kiếm (keyword)
  if (filters && filters.keyword) {
    sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }

  // 2. Nếu có lọc theo danh mục (categoryId)
  if (filters && filters.categoryId) {
    sql += " AND p.category_id = ?";
    params.push(filters.categoryId);
  }

  // Sắp xếp mới nhất lên đầu
  sql += " ORDER BY p.created_at DESC";

  db.query(sql, params, callback);
};

exports.create = (data, callback) => {
  const sql = `
    INSERT INTO products
    (name, sku, price, description, warranty_month, category_id, brand_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    data.name,
    data.sku,
    data.price,
    data.description,
    data.warranty_month,
    data.category_id,
    data.brand_id,
    data.status ?? 1
  ], callback);
};
exports.update = (id, data, callback) => {
  const sql = `
    UPDATE products
    SET name=?, sku=?, price=?, description=?, warranty_month=?,
        category_id=?, brand_id=?, status=?
    WHERE id=?
  `;
  db.query(sql, [
    data.name,
    data.sku,
    data.price,
    data.description,
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
      -- SỬA CẢ Ở ĐÂY NỮA:
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY id DESC LIMIT 1) AS image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ?
  `;
  db.query(sql, [id], callback);
};