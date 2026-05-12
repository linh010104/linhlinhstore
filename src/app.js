require('dotenv').config();  // ⭐ PHẢI GỌILE ĐẦU TIÊN
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// --- 1. KẾT NỐI MONGODB ---
const mongoUri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/dientu_store_ai';
mongoose.connect(mongoUri)
  .then(() => console.log("✅ MongoDB: Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// --- 2. IMPORT ROUTES ---
const categoryRoutes = require('./routes/CategoryRoutes');
const productRoutes = require('./routes/ProductRoutes');
const authRoutes = require('./routes/AuthRoutes.js');
const userRoutes = require('./routes/UserRoutes');
const productImageRoutes = require('./routes/ProductImageRoutes');
const cartRoutes = require('./routes/CartRoutes');
const orderRoutes = require('./routes/OrderRoutes'); 
const statsRoutes = require('./routes/StatsRoutes');
const inventoryRoutes = require('./routes/InventoryRoutes'); 
const aiRoutes = require('./routes/ai/ai.route');
const importRoutes = require('./routes/ai/import.route'); 
const chatbotRoutes = require('./routes/ai/chatbot.route');
const vendorRoutes = require('./routes/VendorRoutes');
const brandRoutes = require('./routes/BrandRoutes');
const bannerRouter = require('./routes/BannerRoutes');

const app = express();

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PHỤC VỤ WEB-CLIENT
app.use('/uploads', express.static(path.join(__dirname, '..', 'web-client/uploads')));
app.use(express.static(path.join(__dirname, '..', 'web-client')));

// --- 4. API ROUTES ---
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/product-images', productImageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/banners', bannerRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/import', importRoutes); 
app.use('/api/chatbot', chatbotRoutes);

// --- 5. ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.stack || err);
    res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});