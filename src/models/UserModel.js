const db = require('../config/db');

exports.findByUsername = (username, callback) => {
  const sql = `
    SELECT u.*, r.name AS role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ? AND u.status = 1
  `;
  db.query(sql, [username], callback);
};

exports.create = (data, callback) => {
const ROLE_CUSTOMER = 3;
  const STATUS_ACTIVE = 1;

  const sql = `
    INSERT INTO users
    (username, password, full_name, email, phone, role_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [
    data.username,
    data.password,
    data.full_name,
    data.email,
    data.phone,
    ROLE_CUSTOMER, // Luôn luôn là 3
    STATUS_ACTIVE  // Luôn luôn là 1
  ], callback);
};
exports.getAll = (callback) => {
  const sql = `
    SELECT u.id, u.username, u.full_name, u.email, u.phone,
           u.role_id, r.name AS role_name, u.status
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
  `;
  db.query(sql, callback);
};

// UPDATE USER
exports.update = (id, data, callback) => {
  const sql = `
    UPDATE users
    SET full_name = ?, email = ?, phone = ?, role_id = ?
    WHERE id = ?
  `;
  db.query(sql, [
    data.full_name,
    data.email,
    data.phone,
    data.role_id,
    id
  ], callback);
};

// LOCK / UNLOCK USER
exports.changeStatus = (id, status, callback) => {
  const sql = `UPDATE users SET status = ? WHERE id = ?`;
  db.query(sql, [status, id], callback);
};