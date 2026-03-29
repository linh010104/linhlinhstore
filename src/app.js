require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// --- 1. GỌI MÔNG (MONGODB) RA CHÀO SÂN ---
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/dientu_store_ai')
  .then(() => console.log("✅ Đã thông chốt thành công với MongoDB!"))
  .catch((err) => console.error("❌ Lỗi cắm cờ MongoDB:", err));

const categoryRoutes = require('./routes/CategoryRoutes');
const productRoutes = require('./routes/ProductRoutes');
const authRoutes = require('./routes/AuthRoutes.js');
const userRoutes = require('./routes/UserRoutes');
const productImageRoutes = require('./routes/ProductImageRoutes');
const cartRoutes = require('./routes/CartRoutes');
const statsRoutes = require('./routes/StatsRoutes');
const inventoryRoutes = require('./routes/InventoryRoutes'); 
const aiRoutes = require('./routes/ai/ai.route');
const importRoutes = require('./routes/ai/import.route'); 

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/product-images', productImageRoutes);
app.use('/uploads', express.static('web-client/uploads'));
app.use('/api/cart', cartRoutes);
app.use('/api/orders', require('./routes/OrderRoutes'));
app.use('/api/stats', statsRoutes);
app.use('/api/inventory', inventoryRoutes);

app.use('/api/ai', aiRoutes);
app.use('/api/import', importRoutes); 

app.use(express.static('web-client'));
app.listen(process.env.PORT, () => {
  console.log(`API running at http://localhost:${process.env.PORT}`);
});