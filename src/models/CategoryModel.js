const db = require('../config/db');

const Category = {
  getAll: (cb) => {
    db.query(
      'SELECT * FROM categories',
      cb
    );
  },

  create: (data, cb) => {
    db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [data.name, data.description],
      cb
    );
  },

  update: (id, data, cb) => {
    db.query(
      'UPDATE categories SET name=?, description=? WHERE id=?',
      [data.name, data.description, id],
      cb
    );
  },

  delete: (id, cb) => {
    db.query(
      'DELETE FROM categories WHERE id=?',
      [id],
      cb
    );
  }
};

module.exports = Category;
