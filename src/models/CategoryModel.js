const db = require('../config/db');

const Category = {
  getAll: (cb) => {
    // JOIN chính nó để lấy tên danh mục cha (parent_name)
    const sql = `
      SELECT c1.*, c2.name as parent_name 
      FROM categories c1 
      LEFT JOIN categories c2 ON c1.parent_id = c2.id
    `;
    db.query(sql, cb);
  },

  create: (data, cb) => {
    db.query(
      'INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)',
      [data.name, data.description, data.parent_id || null],
      cb
    );
  },

  update: (id, data, cb) => {
    db.query(
      'UPDATE categories SET name=?, description=?, parent_id=? WHERE id=?',
      [data.name, data.description, data.parent_id || null, id],
      cb
    );
  },

  delete: (id, cb) => {
    db.query('DELETE FROM categories WHERE id=?', [id], cb);
  }
};

module.exports = Category;