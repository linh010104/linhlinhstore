const db = require('../config/db');

exports.getAll = (filters, callback) => {
  if (typeof filters === 'function') {
    callback = filters;
    filters = {}; 
  }
  
  // Dùng Window Function lấy ảnh siêu tốc thay vì Subquery lồng nhau
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
        SELECT product_id, image_url,
               ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY id DESC) as rn
        FROM product_images
    ) pi ON p.id = pi.product_id AND pi.rn = 1
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
    data.import_price || 0,       
    data.stock_quantity || 0,     
    data.description,
    data.specifications || '',    
    data.warranty_month,
    data.category_id,
    data.brand_id,
    data.status ?? 1
  ], callback);
};

exports.update = (id, data, callback) => {
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
    data.import_price,      
    data.stock_quantity,    
    data.description,
    data.specifications,    
    data.warranty_month,
    data.category_id,
    data.brand_id,
    data.status,
    id
  ], callback);
};

exports.delete = (id, callback) => {
  const sqlDeleteImages = "DELETE FROM product_images WHERE product_id = ?";
  
  db.query(sqlDeleteImages, [id], (err) => {
    if (err) {
      return callback(err);
    }
    const sqlDeleteProduct = "DELETE FROM products WHERE id = ?";
    db.query(sqlDeleteProduct, [id], callback);
  });
};
exports.getById = (id, callback) => {
  // 1. Lấy thông tin cơ bản của sản phẩm
  const sqlProduct = `
    SELECT 
      p.*, 
      c.name AS category_name, 
      b.name AS brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = ?
  `;
 const sqlImages = `SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY id DESC`;
const sqlVariants = `SELECT id, variant_group, variant_name, additional_price, image_url, stock_quantity FROM product_variants WHERE product_id = ?`;

  // Bắt đầu truy vấn lồng nhau
  db.query(sqlProduct, [id], (err, productResults) => {
    if (err) return callback(err);
    if (productResults.length === 0) return callback(null, []); // Không tìm thấy

    let productDetail = productResults[0];

    // Chọc tiếp vào bảng Ảnh
    db.query(sqlImages, [id], (errImg, imageResults) => {
      if (errImg) return callback(errImg);
      
      // Gắn mảng hình ảnh vào object sản phẩm
      productDetail.images = imageResults;
      
      // Lấy cái ảnh đầu tiên làm ảnh đại diện (Ảnh chính)
      if (imageResults.length > 0) {
          productDetail.image_url = imageResults[0].image_url;
      } else {
          productDetail.image_url = null;
      }

      db.query(sqlVariants, [id], (errVar, variantResults) => {
          if (errVar) return callback(errVar);
          productDetail.variants = variantResults;
          callback(null, [productDetail]); 
      });
    });
  });
};
exports.getRecommended = (categoryIds, callback) => {
    let sql = `
        SELECT p.*, c.name AS category_name, pi.image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN (
            SELECT product_id, image_url, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY id DESC) as rn
            FROM product_images
        ) pi ON p.id = pi.product_id AND pi.rn = 1
        WHERE p.status = 1
    `;
    let params = [];

    // Lọc theo mảng ID danh mục (nếu có)
    if (categoryIds && categoryIds.length > 0) {
        sql += ` AND p.category_id IN (?)`;
        params.push(categoryIds);
    }

    // Sắp xếp ngẫu nhiên để khách luôn thấy mới mẻ, lấy 8 cái
    sql += ` ORDER BY RAND() LIMIT 8`; 

    db.query(sql, params.length ? params : null, callback);
};