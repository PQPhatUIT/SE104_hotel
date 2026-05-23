// controllers/bookingController.js — ĐÃ SỬA HOÀN CHỈNH
//
// LỖI ĐÃ SỬA:
//   ✅ const [rows] = ...                → const rows = ...
//   ✅ const [[row]] = ...               → const rows = ...; const row = rows[0]
//   ✅ db.getConnection() (mysql2)       → db.beginTransaction() (mssql)
//   ✅ conn.beginTransaction/commit/rollback → t.commit/rollback
//   ✅ conn.release()                    → không cần (mssql pool tự quản lý)
//   ✅ DATEDIFF(col2,col1) MySQL         → DATEDIFF(DAY, col1, col2) T-SQL
//   ✅ LIMIT 200 MySQL                   → TOP 200 T-SQL
//   ✅ NOW()                             → GETDATE()
//   ✅ result.insertId                   → OUTPUT INSERTED.booking_id
//   ✅ rt.id                             → rt.room_type_id

const db = require('../config/db');

// ── GET /api/bookings ─────────────────────────────────────────
const getBookings = async (req, res) => {
  try {
    const { status, room_id, customer_id, date } = req.query;
    const conditions = [];
    const params     = [];

    if (status)      { conditions.push('b.status = ?');       params.push(status); }
    if (room_id)     { conditions.push('b.room_id = ?');      params.push(Number(room_id)); }
    if (customer_id) { conditions.push('b.customer_id = ?');  params.push(Number(customer_id)); }
    if (date) {
      conditions.push('? BETWEEN b.check_in_date AND b.check_out_date');
      params.push(date);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // ✅ SỬA: TOP 200 T-SQL, DATEDIFF(DAY,...), bỏ []
    const rows = await db.query(
      `SELECT TOP 200
         b.booking_id, b.check_in_date, b.check_out_date,
         b.actual_guests, b.deposit_amount, b.status, b.created_at,
         DATEDIFF(DAY, b.check_in_date, b.check_out_date) AS nights,
         c.customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
         c.id_card,
         r.room_id, r.room_number,
         rt.type_name AS room_type, rt.base_price AS price_per_night,
         a.username AS created_by_username
       FROM Bookings b
       JOIN Customers  c  ON b.customer_id = c.customer_id
       JOIN Rooms      r  ON b.room_id     = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       LEFT JOIN Accounts a ON b.created_at = a.account_id
       ${where}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[bookingController.getBookings]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── POST /api/bookings ────────────────────────────────────────
const createBooking = async (req, res) => {
  const {
    customer_id, room_id, check_in_date, check_out_date,
    actual_guests = 1, deposit_amount = 0
  } = req.body;

  if (!customer_id || !room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: customer_id, room_id, check_in_date, check_out_date.' });
  }
  if (new Date(check_out_date) <= new Date(check_in_date)) {
    return res.status(400).json({ message: 'check_out_date phải sau check_in_date.' });
  }

  // ✅ SỬA: dùng beginTransaction() wrapper của mssql thay vì getConnection()
  const t = await db.beginTransaction();
  try {
    // 1. Kiểm tra phòng
    const roomRows = await t.query(
      `SELECT r.room_id, r.room_number, r.status, rt.max_occupancy
       FROM Rooms r JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE r.room_id = ?`,
      [parseInt(room_id, 10)]
    );
    const room = roomRows[0];
    if (!room) { await t.rollback(); return res.status(404).json({ message: 'Không tìm thấy phòng.' }); }
    if (room.status !== 'available') {
      await t.rollback();
      return res.status(409).json({ message: `Phòng đang ở trạng thái "${room.status}", không thể đặt.` });
    }

    // 2. Kiểm tra sức chứa
    if (actual_guests > room.max_occupancy) {
      await t.rollback();
      return res.status(400).json({ message: `Số khách (${actual_guests}) vượt sức chứa tối đa (${room.max_occupancy}).` });
    }

    // 3. Kiểm tra Overbooking
    const conflictRows = await t.query(
      `SELECT COUNT(*) AS conflict FROM Bookings
       WHERE room_id = ? AND status IN ('confirmed','checked_in')
         AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
      [parseInt(room_id, 10), check_in_date, check_out_date]
    );
    if (conflictRows[0]?.conflict > 0) {
      await t.rollback();
      return res.status(409).json({ message: 'Phòng đã có booking trong khoảng thời gian này.' });
    }

    // 4. Tạo booking — dùng OUTPUT INSERTED để lấy ID
    const bookingRows = await t.query(
      `INSERT INTO Bookings
         (customer_id, room_id, check_in_date, check_out_date, actual_guests, deposit_amount, status)
       OUTPUT INSERTED.booking_id
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        parseInt(customer_id, 10), parseInt(room_id, 10),
        check_in_date, check_out_date,
        parseInt(actual_guests, 10), parseFloat(deposit_amount)
      ]
    );

    // 5. Cập nhật trạng thái phòng → occupied
    await t.query(
      `UPDATE Rooms SET status = 'occupied', updated_at = GETDATE() WHERE room_id = ?`,
      [parseInt(room_id, 10)]
    );

    await t.commit();
    res.status(201).json({
      message:     'Tạo phiếu đặt phòng thành công.',
      booking_id:  bookingRows[0]?.booking_id,
      room_number: room.room_number,
    });
  } catch (err) {
    await t.rollback();
    console.error('[bookingController.createBooking]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/bookings/:id/checkin ──────────────────────────
const checkIn = async (req, res) => {
  const t = await db.beginTransaction();
  try {
    const rows = await t.query(
      'SELECT booking_id, room_id, status FROM Bookings WHERE booking_id = ?',
      [parseInt(req.params.id, 10)]
    );
    const booking = rows[0];
    if (!booking) { await t.rollback(); return res.status(404).json({ message: 'Không tìm thấy booking.' }); }
    if (booking.status !== 'confirmed') {
      await t.rollback();
      return res.status(400).json({ message: `Không thể check-in. Trạng thái hiện tại: "${booking.status}".` });
    }

    await t.query(
      `UPDATE Bookings SET status = 'checked_in', updated_at = GETDATE() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    await t.query(
      `UPDATE Rooms SET status = 'occupied', updated_at = GETDATE() WHERE room_id = ?`,
      [booking.room_id]
    );

    await t.commit();
    res.json({ message: 'Check-in thành công.', booking_id: booking.booking_id });
  } catch (err) {
    await t.rollback();
    console.error('[bookingController.checkIn]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/bookings/:id/cancel ───────────────────────────
const cancelBooking = async (req, res) => {
  const t = await db.beginTransaction();
  try {
    const rows = await t.query(
      'SELECT booking_id, room_id, status FROM Bookings WHERE booking_id = ?',
      [parseInt(req.params.id, 10)]
    );
    const booking = rows[0];
    if (!booking) { await t.rollback(); return res.status(404).json({ message: 'Không tìm thấy booking.' }); }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      await t.rollback();
      return res.status(400).json({ message: `Không thể huỷ booking ở trạng thái "${booking.status}".` });
    }

    await t.query(
      `UPDATE Bookings SET status = 'cancelled', updated_at = GETDATE() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    await t.query(
      `UPDATE Rooms SET status = 'available', updated_at = GETDATE() WHERE room_id = ?`,
      [booking.room_id]
    );

    await t.commit();
    res.json({ message: 'Huỷ booking thành công.', booking_id: booking.booking_id });
  } catch (err) {
    await t.rollback();
    console.error('[bookingController.cancelBooking]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── GET /api/bookings/:id ─────────────────────────────────────
const getBookingById = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT b.*,
              c.full_name AS customer_name, c.phone AS customer_phone, c.id_card,
              r.room_number, rt.type_name AS room_type, rt.base_price AS price_per_night,
              DATEDIFF(DAY, b.check_in_date, b.check_out_date) AS nights
       FROM Bookings b
       JOIN Customers  c  ON b.customer_id  = c.customer_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.booking_id = ?`,
      [parseInt(req.params.id, 10)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy booking.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[bookingController.getBookingById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getBookings, createBooking, checkIn, cancelBooking, getBookingById };