const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Khai báo chìa khóa vào nhà Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'linhlinhstore/banners', // Ảnh banner sẽ chui vào thư mục này
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  },
});
const uploadBanner = multer({ storage: bannerStorage });

const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'linhlinhstore/products', // Ảnh sản phẩm sẽ chui vào thư mục này
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  },
});
const uploadProduct = multer({ storage: productStorage });

// Xuất cả 2 đường ống ra để bên Route xài
module.exports = {
    uploadBanner,
    uploadProduct
};