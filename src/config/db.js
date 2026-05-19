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
    
    // 3 DÒNG QUAN TRỌNG NHẤT ĐỂ TRỊ LỖI CLEVER CLOUD
    connectionLimit: 4,      // Ép Node.js chỉ mở tối đa 4 kết nối (chừa 1 cái cho ông dùng phpMyAdmin/HeidiSQL)
    waitForConnections: true,// Nếu có yêu cầu thứ 5, bắt nó đứng xếp hàng chờ thay vì báo lỗi văng game
    queueLimit: 0            // Hàng đợi không giới hạn
});

// Bắt lỗi nếu Pool có vấn đề
pool.on('connection', function (connection) {
    console.log('🔗 Đã mở một kết nối DB an toàn.');
});

pool.on('error', function(err) {
    console.error('🔥 Lỗi Database:', err);
});

module.exports = pool;