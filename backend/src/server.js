require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const meetingRoutes = require('./routes/meeting.routes');
const adminRoutes = require('./routes/admin.routes');
const boothRoutes = require('./routes/booth.routes');
const questionRoutes = require('./routes/question.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const path = require('path');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://virtual-meeting.foodsecuritysummitx.com'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '✅ Virtual Event Platform API is running', timestamp: new Date() });
});

// Bind Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/booths', boothRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
});
