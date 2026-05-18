const mysql = require('mysql2');

// Tạo Pool để chống sập khi chạy trên Render (rất quan trọng)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dientu_store',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 150, // Giới hạn kết nối để gói Free không bị ngộp
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
