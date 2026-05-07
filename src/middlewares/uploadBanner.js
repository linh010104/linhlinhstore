const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình nơi lưu trữ và tên file cho Banner
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Trỏ đường dẫn ra ngoài thư mục web-client/uploads/banners của ông
        const dir = path.join(__dirname, '../../web-client/uploads/banners');
        
        // Nếu chưa có thư mục banners thì tự động tạo
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Đổi tên file thành: banner_123456789.jpg
        cb(null, 'banner_' + Date.now() + path.extname(file.originalname));
    }
});

// Chấp nhận các loại file ảnh phổ biến
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP!'), false);
    }
};

module.exports = multer({ storage: storage, fileFilter: fileFilter });