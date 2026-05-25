require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');    // Gọi thư viện Session
const passport = require('./config/passport'); // Gọi cấu hình Passport ông đã tạo

const app = express();

app.use(cors({
    origin: ['https://linhlinhstore.shop', 'https://www.linhlinhstore.shop', 'http://localhost:3000'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KÍCH HOẠT BỘ NHỚ SESSION VÀ PASSPORT (Phải nằm trước các Route API) ---
app.use(session({
    secret: process.env.JWT_SECRET || 'linhlinhstore_secret_session', 
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// ------------------------------------------------------------------------

// PHỤC VỤ WEB-CLIENT
app.use('/uploads', express.static(path.join(__dirname, '..', 'web-client/uploads')));
app.use(express.static(path.join(__dirname, '..', 'web-client')));

// --- 1. CÁC ROUTE API CỐT LÕI (THUẦN MYSQL) ---
app.use('/api/categories', require('./routes/CategoryRoutes'));
app.use('/api/products', require('./routes/ProductRoutes'));
app.use('/api/auth', require('./routes/AuthRoutes.js'));
app.use('/api/users', require('./routes/UserRoutes'));
app.use('/api/product-images', require('./routes/ProductImageRoutes'));
app.use('/api/cart', require('./routes/CartRoutes'));
app.use('/api/orders', require('./routes/OrderRoutes')); 
app.use('/api/stats', require('./routes/StatsRoutes'));
app.use('/api/inventory', require('./routes/InventoryRoutes')); 
app.use('/api/vendors', require('./routes/VendorRoutes'));
app.use('/api/brands', require('./routes/BrandRoutes'));
app.use('/api/banners', require('./routes/BannerRoutes'));

app.use('/api/ai', require('./routes/ai/ai.route'));
app.use('/api/import', require('./routes/ai/import.route')); 
app.use('/api/chatbot', require('./routes/ai/chatbot.route'));

// --- 3. ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.stack || err);
    res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at port ${PORT} (Pure MySQL & AI Mode)`);
});