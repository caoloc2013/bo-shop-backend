require('dotenv').config();
// const dns = require('dns');
// // Force Google DNS để resolve SRV record MongoDB Atlas (fix lỗi mạng nội bộ)
// dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://caoloc2020cc_db_user:12345678910@cluster0.gadh4pl.mongodb.net/bo-shop?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:',MONGODB_URI, err));

// Routes
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const cloudinaryRoutes = require('./routes/cloudinary');
const shippingRoutes = require('./routes/shipping');
const carriersRoutes = require('./routes/carriers');

app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/carriers', carriersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bo Shop API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
