const mysql = require('mysql2');

// 1. Tạo Pool kết nối tiêu chuẩn (Dành cho 7 file Models chạy Callback)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dientu_store',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

const promisePool = pool.promise();
pool.promise = () => promisePool;
module.exports = pool;

// const mysql = require('mysql2');

// const db = mysql.createPool({
//  host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASS || '',
//     database: process.env.DB_NAME || 'dientu_store',
// });

// module.exports = db;
