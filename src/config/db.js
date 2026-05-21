// const mysql = require('mysql2');

// // Tạo Pool để chống sập khi chạy trên Render (rất quan trọng)
// const pool = mysql.createPool({
//     host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASS || '',
//     database: process.env.DB_NAME || 'dientu_store',
//     port: process.env.DB_PORT || 3306,
//     waitForConnections: true,
//     connectionLimit: 150, // Giới hạn kết nối để gói Free không bị ngộp
//     queueLimit: 0
// });

// const promisePool = pool.promise();
// pool.promise = () => promisePool;

// module.exports = pool;

const mysql = require('mysql2');
require('dotenv').config();

// Sử dụng createPool thay vì createConnection để quản lý số lượng đường ống
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dientu_store',
    port: process.env.DB_PORT || 3306,

    connectionLimit: 4, 
    waitForConnections: true,
    queueLimit: 0
    
    // connectionLimit: 5,    
    // queueLimit: 50,         
    // enableKeepAlive: true,  
    // keepAliveInitialDelay: 0      
});

pool.on('connection', function (connection) {
    console.log('🔗 Đã mở một kết nối DB an toàn.');
});

pool.on('error', function(err) {
    console.error('🔥 Lỗi Database:', err);
});

module.exports = pool;