require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');


const categoryRoutes = require('./routes/CategoryRoutes');
const productRoutes = require('./routes/ProductRoutes');
const authRoutes = require('./routes/AuthRoutes.js');
const userRoutes = require('./routes/UserRoutes');
const productImageRoutes = require('./routes/ProductImageRoutes');
const cartRoutes = require('./routes/CartRoutes');
const statsRoutes = require('./routes/StatsRoutes');
const inventoryRoutes = require('./routes/InventoryRoutes'); 



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

app.use(express.static('web-client'));
app.listen(process.env.PORT, () => {
  console.log(`API running at http://localhost:${process.env.PORT}`);
});
