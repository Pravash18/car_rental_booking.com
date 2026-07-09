require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚗 DriveElite India API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    razorpay: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder' ? 'configured' : 'demo'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'DriveElite India API',
    version: '2.0.0',
    currency: 'INR',
    endpoints: {
      auth: '/api/auth (POST /register, POST /login, POST /verify-email, POST /resend-otp, POST /forgot-password, POST /reset-password, GET /profile)',
      cars: '/api/cars (GET /, GET /:id, POST /, PUT /:id, DELETE /:id)',
      bookings: '/api/bookings (GET /, POST /, GET /:id, PATCH /:id/cancel)',
      payments: '/api/payments (POST /create-order, POST /verify, GET /:bookingId)'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log('\n🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   DriveElite India API Server v2.0`);
      console.log(`   Running on: http://localhost:${PORT}`);
      console.log(`   Health:     http://localhost:${PORT}/api/health`);
      console.log(`   Currency:   ₹ INR (Indian Rupees)`);
      console.log(`   Razorpay:   ${process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder' ? 'LIVE' : 'DEMO MODE'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
