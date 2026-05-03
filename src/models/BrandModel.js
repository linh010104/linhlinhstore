const db = require('../config/db');

exports.getAll = (callback) => {
  const sql = "SELECT * FROM brands ORDER BY name ASC";
  db.query(sql, callback);
};
exports.getBrandCategoryMapping = (callback) => {
    // Lấy danh sách hãng dựa trên sản phẩm thực tế đang có, gộp danh mục con vào danh mục cha
    const sql = `
        SELECT DISTINCT 
            COALESCE(c.parent_id, c.id) AS main_category_id, 
            b.id AS brand_id, 
            b.name AS brand_name
        FROM products p
        JOIN brands b ON p.brand_id = b.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.status = 1
    `;
    db.query(sql, callback);
};