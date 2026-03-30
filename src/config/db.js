const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, // Sửa từ DB_PASSWORD thành DB_PASS
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 16267, // Thêm dòng này để nhận cổng 16267
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db.promise();
