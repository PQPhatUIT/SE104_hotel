// server.js — Entry point hoàn chỉnh
// SỬA LỖI: Mount đúng tất cả route, bao gồm /api/customer/* với verifyToken

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// ── DB: chỉ import để trigger kiểm tra kết nối khi khởi động ──
require('./config/db');

// ── Controllers ──
const { login, getMe }                    = require('./controllers/authController');
const { processPayment, getInvoiceByBookingId } = require('./controllers/paymentController');
const { getMyBookings, getMyInvoices }    = require('./controllers/customerController');

// ── Middleware ──
const { verifyToken, requireRole } = require('./middleware/authMiddleware');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth routes ───────────────────────────────────────────────────────────
app.post('/api/auth/login',    login);
app.get( '/api/auth/me',       verifyToken, getMe);

// ── Customer self-service routes (phải có token) ──────────────────────────
// Lấy booking của CHÍNH MÌNH (dùng customer_id từ JWT)
app.get('/api/customer/my-bookings', verifyToken, getMyBookings);
// Lấy hóa đơn của CHÍNH MÌNH
app.get('/api/customer/my-invoices', verifyToken, getMyInvoices);

// ── Payment routes (lễ tân / admin) ──────────────────────────────────────
app.post('/api/payments',               verifyToken, requireRole('Admin', 'Lễ tân', 'Quản lý'), processPayment);
app.get( '/api/payments/:booking_id',   verifyToken, getInvoiceByBookingId);

// ── 404 fallback ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route không tồn tại.' });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[GlobalErrorHandler]', err);
  res.status(500).json({ message: 'Lỗi server không xác định.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
