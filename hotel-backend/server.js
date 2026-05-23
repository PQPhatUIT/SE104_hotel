// server.js — HOÀN CHỈNH: toàn bộ route đã được mount
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

require('./config/db');

const { login, getMe }                                              = require('./controllers/authController');
const { register, updateProfile, getAccounts,
        createAccount, updateRole, updateStatus, resetPassword }   = require('./controllers/accountController');
const { processPayment, getInvoiceByBookingId }                    = require('./controllers/paymentController');
const { getMyBookings, getMyInvoices }                             = require('./controllers/customerController');
const { getCustomers, getCustomerById,
        createCustomer, updateCustomer, deleteCustomer }           = require('./controllers/staffCustomerController');
const { getRooms, getAvailableRooms, getRoomById,
        updateRoomStatus, createRoom, getRoomTypes }               = require('./controllers/roomController');
const { getBookings, createBooking,
        checkIn, cancelBooking, getBookingById }                   = require('./controllers/bookingController');
const { getServices, getServiceById,
        createService, updateService, addStock }                   = require('./controllers/serviceController');

const { verifyToken, requireRole } = require('./middleware/authMiddleware');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── PUBLIC ────────────────────────────────────────────────────────────────────
app.get ('/api/health',            (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.post('/api/auth/login',        login);
app.post('/api/auth/register',     register);
app.get ('/api/rooms',             getRooms);
app.get ('/api/rooms/available',   getAvailableRooms);
app.get ('/api/rooms/:id',         getRoomById);
app.get ('/api/room-types',        getRoomTypes);

// ── AUTHENTICATED (any logged-in user) ───────────────────────────────────────
app.get  ('/api/auth/me',              verifyToken, getMe);
app.patch('/api/auth/profile',         verifyToken, updateProfile);
app.get  ('/api/customer/my-bookings', verifyToken, getMyBookings);
app.get  ('/api/customer/my-invoices', verifyToken, getMyInvoices);

// ── STAFF (Lễ tân / Quản lý / Admin) ─────────────────────────────────────────
const isStaff    = requireRole('Admin', 'Quản lý', 'Lễ tân');
const isAdminMgr = requireRole('Admin', 'Quản lý');
const isAdmin    = requireRole('Admin');
const isWarehouse= requireRole('Admin', 'Quản lý', 'Thủ kho');

app.patch('/api/rooms/:id/status',          verifyToken, isStaff,    updateRoomStatus);
app.post ('/api/rooms',                     verifyToken, isAdminMgr, createRoom);

app.get  ('/api/bookings',                  verifyToken, isStaff,    getBookings);
app.post ('/api/bookings',                  verifyToken, isStaff,    createBooking);
app.get  ('/api/bookings/:id',              verifyToken, isStaff,    getBookingById);
app.patch('/api/bookings/:id/checkin',      verifyToken, isStaff,    checkIn);
app.patch('/api/bookings/:id/cancel',       verifyToken, isStaff,    cancelBooking);

app.post ('/api/payments',                  verifyToken, isStaff,    processPayment);
app.get  ('/api/payments/:booking_id',      verifyToken, isStaff,    getInvoiceByBookingId);

app.get   ('/api/customers',                verifyToken, isStaff,    getCustomers);
app.get   ('/api/customers/:id',            verifyToken, isStaff,    getCustomerById);
app.post  ('/api/customers',                verifyToken, isStaff,    createCustomer);
app.patch ('/api/customers/:id',            verifyToken, isStaff,    updateCustomer);
app.delete('/api/customers/:id',            verifyToken, isAdmin,    deleteCustomer);

// ── WAREHOUSE ─────────────────────────────────────────────────────────────────
app.get  ('/api/services',                  verifyToken, isWarehouse, getServices);
app.get  ('/api/services/:id',              verifyToken, isWarehouse, getServiceById);
app.post ('/api/services',                  verifyToken, isWarehouse, createService);
app.patch('/api/services/:id',              verifyToken, isWarehouse, updateService);
app.patch('/api/services/:id/stock',        verifyToken, isWarehouse, addStock);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get  ('/api/accounts',                  verifyToken, isAdminMgr, getAccounts);
app.post ('/api/accounts',                  verifyToken, isAdmin,    createAccount);
app.patch('/api/accounts/:id/role',         verifyToken, isAdmin,    updateRole);
app.patch('/api/accounts/:id/status',       verifyToken, isAdminMgr, updateStatus);
app.patch('/api/accounts/:id/password',     verifyToken, isAdmin,    resetPassword);

// ── FALLBACK ──────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route không tồn tại.' }));
app.use((err, _req, res, _next) => {
  console.error('[GlobalError]', err);
  res.status(500).json({ message: 'Lỗi server không xác định.' });
});

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
