const mysql = require('mysql2');

const db = mysql.createPool({
    // Lấy thông tin từ mây (nếu có), không thì tự dùng localhost của máy tính
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dientu_store',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Xuất ra dạng promise để API dùng được async/await
module.exports = db.promise();

// const mysql = require('mysql2');

// const db = mysql.createPool({
//  host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASS || '',
//     database: process.env.DB_NAME || 'dientu_store',
// });

// module.exports = db;
