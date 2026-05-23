// controllers/bookingController.js
const db = require('../config/db');

// GET /api/bookings?status=&room_id=&customer_id=&date=
// Lễ tân / Quản lý xem danh sách booking
const getBookings = async (req, res) => {
  try {
    const { status, room_id, customer_id, date } = req.query;
    const conditions = [];
    const params     = [];

    if (status)      { conditions.push('b.status = ?');        params.push(status); }
    if (room_id)     { conditions.push('b.room_id = ?');       params.push(Number(room_id)); }
    if (customer_id) { conditions.push('b.customer_id = ?');   params.push(Number(customer_id)); }
    // Lọc booking giao với ngày cụ thể (ví dụ: xem phòng đang có khách hôm nay)
    if (date) {
      conditions.push('? BETWEEN b.check_in_date AND b.check_out_date');
      params.push(date);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT
         b.booking_id, b.check_in_date, b.check_out_date,
         b.actual_guests, b.deposit, b.status, b.note, b.created_at,
         DATEDIFF(b.check_out_date, b.check_in_date) AS nights,
         c.customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
         c.identity_card,
         r.room_id, r.room_number, r.room_type, r.price_per_night,
         a.username AS created_by_username
       FROM Bookings b
       JOIN Customers c  ON b.customer_id = c.customer_id
       JOIN Rooms r      ON b.room_id     = r.room_id
       LEFT JOIN Accounts a ON b.created_by = a.account_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[bookingController.getBookings]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/bookings
// Body: { customer_id, room_id, check_in_date, check_out_date, actual_guests, deposit?, note? }
// Thuật toán 2.2.3: kiểm tra Overbooking trước khi tạo
const createBooking = async (req, res) => {
  const { customer_id, room_id, check_in_date, check_out_date, actual_guests = 1, deposit = 0, note } = req.body;

  if (!customer_id || !room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: customer_id, room_id, check_in_date, check_out_date.' });
  }
  if (new Date(check_out_date) <= new Date(check_in_date)) {
    return res.status(400).json({ message: 'check_out_date phải sau check_in_date.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Kiểm tra phòng tồn tại và đang 'available'
    const [[room]] = await conn.query(
      `SELECT r.room_id, r.room_number, r.status, r.capacity, rt.capacity AS type_capacity
       FROM Rooms r JOIN Room_Types rt ON r.room_type_id = rt.id
       WHERE r.room_id = ?`,
      [room_id]
    );
    if (!room) { await conn.rollback(); return res.status(404).json({ message: 'Không tìm thấy phòng.' }); }
    if (room.status !== 'available') {
      await conn.rollback();
      return res.status(409).json({ message: `Phòng hiện đang ở trạng thái "${room.status}", không thể đặt.` });
    }

    // 2. Kiểm tra số khách không vượt capacity
    if (actual_guests > room.type_capacity) {
      await conn.rollback();
      return res.status(400).json({ message: `Số khách (${actual_guests}) vượt quá sức chứa tối đa của hạng phòng (${room.type_capacity}).` });
    }

    // 3. Kiểm tra Overbooking: không có booking active nào giao thời gian
    const [[{ conflict }]] = await conn.query(
      `SELECT COUNT(*) AS conflict FROM Bookings
       WHERE room_id = ? AND status IN ('confirmed','checked_in')
         AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
      [room_id, check_in_date, check_out_date]
    );
    if (conflict > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Phòng đã có booking trong khoảng thời gian này (Overbooking).' });
    }

    // 4. Tạo booking
    const [result] = await conn.query(
      `INSERT INTO Bookings (customer_id, room_id, created_by, actual_guests, check_in_date, check_out_date, deposit, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [customer_id, room_id, req.user.id, actual_guests, check_in_date, check_out_date, deposit, note || null]
    );

    // 5. Cập nhật trạng thái phòng → 'booked'
    await conn.query(
      `UPDATE Rooms SET status = 'booked', updated_at = NOW() WHERE room_id = ?`,
      [room_id]
    );

    await conn.commit();
    res.status(201).json({
      message: 'Tạo phiếu đặt phòng thành công.',
      booking_id: result.insertId,
      room_number: room.room_number,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[bookingController.createBooking]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  } finally {
    conn.release();
  }
};

// PATCH /api/bookings/:id/checkin
// Lễ tân xác nhận khách đến nhận phòng
const checkIn = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[booking]] = await conn.query(
      'SELECT booking_id, room_id, status FROM Bookings WHERE booking_id = ?',
      [req.params.id]
    );
    if (!booking) { await conn.rollback(); return res.status(404).json({ message: 'Không tìm thấy booking.' }); }
    if (booking.status !== 'confirmed') {
      await conn.rollback();
      return res.status(400).json({ message: `Không thể check-in. Trạng thái hiện tại: "${booking.status}".` });
    }

    await conn.query(
      `UPDATE Bookings SET status = 'checked_in', updated_at = NOW() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    await conn.query(
      `UPDATE Rooms SET status = 'checked_in', updated_at = NOW() WHERE room_id = ?`,
      [booking.room_id]
    );

    await conn.commit();
    res.json({ message: 'Check-in thành công.', booking_id: booking.booking_id });
  } catch (err) {
    await conn.rollback();
    console.error('[bookingController.checkIn]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  } finally {
    conn.release();
  }
};

// PATCH /api/bookings/:id/cancel
// Huỷ booking (chỉ khi pending hoặc confirmed)
const cancelBooking = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[booking]] = await conn.query(
      'SELECT booking_id, room_id, status FROM Bookings WHERE booking_id = ?',
      [req.params.id]
    );
    if (!booking) { await conn.rollback(); return res.status(404).json({ message: 'Không tìm thấy booking.' }); }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      await conn.rollback();
      return res.status(400).json({ message: `Không thể huỷ booking ở trạng thái "${booking.status}".` });
    }

    await conn.query(
      `UPDATE Bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    // Trả phòng về available
    await conn.query(
      `UPDATE Rooms SET status = 'available', updated_at = NOW() WHERE room_id = ?`,
      [booking.room_id]
    );

    await conn.commit();
    res.json({ message: 'Huỷ booking thành công.', booking_id: booking.booking_id });
  } catch (err) {
    await conn.rollback();
    console.error('[bookingController.cancelBooking]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  } finally {
    conn.release();
  }
};

// GET /api/bookings/:id  — chi tiết 1 booking
const getBookingById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.full_name AS customer_name, c.phone AS customer_phone, c.identity_card,
              r.room_number, r.room_type, r.price_per_night,
              DATEDIFF(b.check_out_date, b.check_in_date) AS nights
       FROM Bookings b
       JOIN Customers c ON b.customer_id = c.customer_id
       JOIN Rooms r     ON b.room_id     = r.room_id
       WHERE b.booking_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy booking.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[bookingController.getBookingById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getBookings, createBooking, checkIn, cancelBooking, getBookingById };
