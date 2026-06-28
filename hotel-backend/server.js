require('dotenv').config();
const express = require('express');
const cors    = require('cors');
require('./config/db');

const { login, getMe }                                               = require('./controllers/authController');
const { register, updateProfile, getAccounts,
        createAccount, updateRole, updateStatus, resetPassword }    = require('./controllers/accountController');
const { processPayment, getInvoiceByBookingId, getInvoices }        = require('./controllers/paymentController');
const { getMyBookings, getMyInvoices }                              = require('./controllers/customerController');
const { getCustomers, getCustomerById,
        createCustomer, updateCustomer, deleteCustomer }            = require('./controllers/staffCustomerController');
const { getRooms, getAvailableRooms, getRoomById,
        updateRoomStatus, updateRoom, createRoom, deleteRoom,
        getRoomTypes, createRoomType, updateRoomType, deleteRoomType } = require('./controllers/roomController');
const { getBookings, createBooking, updateBookingDates,
        checkIn, cancelBooking, getBookingById }                    = require('./controllers/bookingController');
const { getServices, getServiceById,
        createService, updateService, addStock, deleteService }     = require('./controllers/serviceController');
const { getRevenueReport,
        getRoomUsageReport, getServiceReport }                      = require('./controllers/reportController');

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

// ── AUTHENTICATED (mọi role đã login) ────────────────────────────────────────
app.get  ('/api/auth/me',                  verifyToken, getMe);
app.patch('/api/auth/profile',             verifyToken, updateProfile);
app.get  ('/api/customer/my-bookings',     verifyToken, getMyBookings);
app.get  ('/api/customer/my-invoices',     verifyToken, getMyInvoices);

// Khách hàng được tự đặt phòng
app.post ('/api/customer/bookings',        verifyToken, requireRole('Khách hàng'), createBooking);
// Khách hàng đổi ngày
app.patch('/api/customer/bookings/:id/dates', verifyToken, requireRole('Khách hàng'), updateBookingDates);
// Khách hàng xem danh sách dịch vụ (để order) — FIX: route riêng cho khách, không dùng chung isStaff
app.get  ('/api/customer/services',        verifyToken, requireRole('Khách hàng'), getServices);
// Khách hàng order dịch vụ (chỉ khi checked_in)
app.post ('/api/customer/services/order',  verifyToken, requireRole('Khách hàng'), orderService);

// ── MIDDLEWARE SHORTCUTS ───────────────────────────────────────────────────────
const isMgr   = requireRole('Quản lý');
const isStaff = requireRole('Quản lý', 'Lễ tân');

// ── ROOMS ─────────────────────────────────────────────────────────────────────
app.patch('/api/rooms/:id/status',         verifyToken, isMgr,   updateRoomStatus);
app.patch('/api/rooms/:id',                verifyToken, isMgr,   updateRoom);
app.post ('/api/room-types',               verifyToken, isMgr,   createRoomType);
app.patch('/api/room-types/:id',           verifyToken, isMgr,   updateRoomType);
app.delete('/api/room-types/:id',          verifyToken, isMgr,   deleteRoomType);
app.post ('/api/rooms',                    verifyToken, isMgr,   createRoom);
app.delete('/api/rooms/:id',               verifyToken, isMgr,   deleteRoom);

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
app.get  ('/api/bookings',                 verifyToken, isStaff, getBookings);
app.post ('/api/bookings',                 verifyToken, isStaff, createBooking);
app.get  ('/api/bookings/:id',             verifyToken, isStaff, getBookingById);
app.patch('/api/bookings/:id/checkin',     verifyToken, isStaff, checkIn);
app.patch('/api/bookings/:id/cancel',      verifyToken, isStaff, cancelBooking);
app.patch('/api/bookings/:id/dates',       verifyToken, isStaff, updateBookingDates);

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
app.post('/api/payments',                  verifyToken, isStaff, processPayment);
app.get ('/api/payments/:booking_id',      verifyToken, isStaff, getInvoiceByBookingId);
app.get ('/api/invoices',                  verifyToken, isMgr,   getInvoices);

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
app.get   ('/api/customers',               verifyToken, isStaff, getCustomers);
app.get   ('/api/customers/:id',           verifyToken, isStaff, getCustomerById);
app.post  ('/api/customers',               verifyToken, isStaff, createCustomer);
app.patch ('/api/customers/:id',           verifyToken, isStaff, updateCustomer);
app.delete('/api/customers/:id',           verifyToken, isMgr,   deleteCustomer);

// ── SERVICES ──────────────────────────────────────────────────────────────────
app.get   ('/api/services',                verifyToken, isStaff, getServices);
app.get   ('/api/services/:id',            verifyToken, isStaff, getServiceById);
app.post  ('/api/services',               verifyToken, isMgr,   createService);
app.patch ('/api/services/:id',            verifyToken, isMgr,   updateService);
app.patch ('/api/services/:id/stock',      verifyToken, isStaff, addStock);
app.delete('/api/services/:id',            verifyToken, isMgr,   deleteService);
app.post  ('/api/staff/services/order',    verifyToken, isStaff, staffOrderService);

// ── REPORTS ───────────────────────────────────────────────────────────────────
app.get('/api/reports/revenue',            verifyToken, isMgr,   getRevenueReport);
app.get('/api/reports/room-usage',         verifyToken, isMgr,   getRoomUsageReport);
app.get('/api/reports/services',           verifyToken, isStaff, getServiceReport);

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
app.get  ('/api/accounts',                 verifyToken, isMgr,   getAccounts);
app.post ('/api/accounts',                 verifyToken, isMgr,   createAccount);
app.patch('/api/accounts/:id/role',        verifyToken, isMgr,   updateRole);
app.patch('/api/accounts/:id/status',      verifyToken, isMgr,   updateStatus);
app.patch('/api/accounts/:id/password',    verifyToken, isMgr,   resetPassword);

// ── GET /api/invoices/:id/details — chi tiết dịch vụ trong hóa đơn ───────────
app.get('/api/invoices/:id/details', verifyToken, async (req, res) => {
  const db = require('./config/db');
  try {
    const rows = await db.query(
      `SELECT id.detail_id, id.quantity, id.unit_price, id.subtotal,
              s.service_name, s.unit
       FROM invoice_details id
       JOIN Services s ON id.service_id = s.service_id
       WHERE id.invoice_id = ?`,
      [parseInt(req.params.id, 10)]
    );
    // Nếu là khách hàng: kiểm tra hóa đơn có thuộc về họ không
    if (req.user.role === 'Khách hàng') {
      const check = await db.query(
        `SELECT i.invoice_id FROM Invoices i
         JOIN Bookings b ON i.booking_id = b.booking_id
         JOIN Customers c ON b.customer_id = c.customer_id
         JOIN Accounts a ON c.customer_id = a.customer_id
         WHERE i.invoice_id = ? AND a.account_id = ?`,
        [parseInt(req.params.id, 10), req.user.id]
      );
      if (!check.length) return res.status(403).json({ message: 'Không có quyền xem hóa đơn này.' });
    }
    res.json(rows);
  } catch (err) {
    console.error('[invoiceDetails]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ── FALLBACK ──────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route không tồn tại.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ message: 'Lỗi server.' }); });

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));

// ── orderService — Khách hàng tự order dịch vụ (chỉ khi checked_in) ──────────
async function orderService(req, res) {
  const db = require('./config/db');
  const { service_id, quantity = 1 } = req.body;
  const customerId = req.user.customer_id;

  if (!service_id || !customerId) return res.status(400).json({ message: 'Thiếu thông tin.' });
  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1) return res.status(400).json({ message: 'Số lượng phải >= 1.' });

  const t = await db.beginTransaction();
  try {
    // 1. Kiểm tra khách đang checked_in
    const bookings = await t.query(
      `SELECT b.booking_id FROM Bookings b
       JOIN Customers c ON b.customer_id = c.customer_id
       WHERE c.customer_id = ? AND b.status = 'checked_in' LIMIT 1`,
      [customerId]
    );
    if (!bookings.length) {
      await t.rollback();
      return res.status(403).json({ message: 'Chỉ order được khi đang ở trong phòng (checked_in).' });
    }
    const bookingId = bookings[0].booking_id;

    // 2. Kiểm tra dịch vụ và tồn kho
    const svcs = await t.query('SELECT * FROM Services WHERE service_id = ? AND is_available = 1', [service_id]);
    if (!svcs.length) { await t.rollback(); return res.status(404).json({ message: 'Dịch vụ không tồn tại.' }); }
    const svc = svcs[0];
    if (svc.unit !== 'Lượt' && svc.stock_quantity < qty) {
      await t.rollback();
      return res.status(400).json({ message: `Không đủ hàng (còn ${svc.stock_quantity} ${svc.unit}, bạn chọn ${qty}).` });
    }

    const subtotal = parseFloat(svc.price) * qty;

    // 3. Trừ tồn kho (chỉ với hàng hóa, dịch vụ Lượt không trừ)
    if (svc.unit !== 'Lượt') {
      await t.query('UPDATE Services SET stock_quantity = stock_quantity - ? WHERE service_id = ?', [qty, service_id]);
    }

    // 4. Kiểm tra đã có hóa đơn cho booking này chưa
    const invRows = await t.query('SELECT invoice_id FROM Invoices WHERE booking_id = ?', [bookingId]);

    if (invRows.length) {
      // Đã có hóa đơn → thêm dòng detail và cộng vào service_charge
      const invoiceId = invRows[0].invoice_id;
      await t.query(
        `INSERT INTO invoice_details (invoice_id, service_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, service_id, qty, svc.price, subtotal]
      );
      await t.query(
        `UPDATE Invoices SET service_charge = service_charge + ?,
                             total_amount   = total_amount   + ?
         WHERE invoice_id = ?`,
        [subtotal, subtotal, invoiceId]
      );
    } else {
      // Chưa có hóa đơn → tạo hóa đơn tạm, sẽ cập nhật đầy đủ khi checkout
      const newInv = await t.query(
        `INSERT INTO Invoices (booking_id, payment_method, room_charge, service_charge, total_amount, amount_paid, change_amount)
         VALUES (?, 'cash', 0, ?, ?, 0, 0)`,
        [bookingId, subtotal, subtotal]
      );
      await t.query(
        `INSERT INTO invoice_details (invoice_id, service_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [newInv.insertId, service_id, qty, svc.price, subtotal]
      );
    }

    await t.commit();
    res.json({
      message:      `Đặt "${svc.service_name}" x${qty} thành công!`,
      booking_id:   bookingId,
      service_name: svc.service_name,
      quantity:     qty,
      unit_price:   svc.price,
      subtotal,
    });
  } catch (err) {
    await t.rollback();
    console.error('[orderService]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

// ── staffOrderService — Nhân viên order dịch vụ thay cho khách ───────────────
async function staffOrderService(req, res) {
  const db = require('./config/db');
  const { booking_id, service_id, quantity = 1 } = req.body;

  if (!booking_id || !service_id) return res.status(400).json({ message: 'Thiếu booking_id hoặc service_id.' });

  const qty = Math.max(1, parseInt(quantity, 10));
  const t   = await db.beginTransaction();
  try {
    // 1. Kiểm tra booking tồn tại & đang checked_in
    const bookings = await t.query('SELECT * FROM Bookings WHERE booking_id = ?', [booking_id]);
    if (!bookings.length) return res.status(404).json({ message: 'Không tìm thấy phiếu đặt phòng.' });
    const booking = bookings[0];
    if (booking.status !== 'checked_in') {
      await t.rollback();
      return res.status(403).json({ message: 'Chỉ order được khi khách đang ở trong phòng (checked_in).' });
    }

    // 2. Kiểm tra dịch vụ/vật tư
    const svcs = await t.query('SELECT * FROM Services WHERE service_id = ? AND is_available = 1', [service_id]);
    if (!svcs.length) { await t.rollback(); return res.status(404).json({ message: 'Dịch vụ không tồn tại hoặc đã ngừng.' }); }
    const svc = svcs[0];

    // 3. Kiểm tra tồn kho
    if (svc.unit !== 'Lượt' && svc.stock_quantity < qty) {
      await t.rollback();
      return res.status(409).json({ message: `Tồn kho không đủ. Hiện có: ${svc.stock_quantity} ${svc.unit}.` });
    }

    const subtotal = Number(svc.price) * qty;

    // 4. Trừ tồn kho
    if (svc.unit !== 'Lượt') {
      await t.query('UPDATE Services SET stock_quantity = stock_quantity - ? WHERE service_id = ?', [qty, service_id]);
    }

    // 5. Ghi vào hóa đơn
    const invRows = await t.query('SELECT invoice_id FROM Invoices WHERE booking_id = ?', [booking_id]);
    if (invRows.length) {
      const invoiceId = invRows[0].invoice_id;
      await t.query(
        'INSERT INTO invoice_details (invoice_id, service_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, service_id, qty, svc.price, subtotal]
      );
      await t.query(
        'UPDATE Invoices SET service_charge = service_charge + ?, total_amount = total_amount + ? WHERE invoice_id = ?',
        [subtotal, subtotal, invoiceId]
      );
    } else {
      const newInv = await t.query(
        "INSERT INTO Invoices (booking_id, payment_method, room_charge, service_charge, total_amount, amount_paid, change_amount) VALUES (?, 'cash', 0, ?, ?, 0, 0)",
        [booking_id, subtotal, subtotal]
      );
      await t.query(
        'INSERT INTO invoice_details (invoice_id, service_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [newInv.insertId, service_id, qty, svc.price, subtotal]
      );
    }

    await t.commit();
    res.json({
      message:      `Đặt "${svc.service_name}" x${qty} thành công!`,
      booking_id,
      service_name: svc.service_name,
      quantity:     qty,
      unit_price:   svc.price,
      subtotal,
    });
  } catch (err) {
    await t.rollback();
    console.error('[staffOrderService]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}