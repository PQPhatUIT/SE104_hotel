// controllers/bookingController.js — MySQL (XAMPP)
const db = require('../config/db');

const getBookings = async (req, res) => {
  try {
    const { status, room_id, customer_id, date } = req.query;
    const conditions = [];
    const params     = [];

    if (status)      { conditions.push('b.status = ?');      params.push(status); }
    if (room_id)     { conditions.push('b.room_id = ?');     params.push(Number(room_id)); }
    if (customer_id) { conditions.push('b.customer_id = ?'); params.push(Number(customer_id)); }
    if (date) {
      conditions.push('? BETWEEN b.check_in_date AND b.check_out_date');
      params.push(date);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(
      `SELECT
         b.booking_id, b.check_in_date, b.check_out_date,
         b.actual_guests, b.deposit_amount, b.status, b.created_at,
         DATEDIFF(b.check_out_date, b.check_in_date) AS nights,
         c.customer_id, c.full_name AS customer_name, c.phone AS customer_phone,
         c.id_card,
         r.room_id, r.room_number,
         rt.type_name AS room_type, rt.base_price AS price_per_night,
         a.username AS created_by_username
       FROM Bookings b
       JOIN Customers  c  ON b.customer_id  = c.customer_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
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

const createBooking = async (req, res) => {
  const { customer_id, room_id, check_in_date, check_out_date,
          actual_guests = 1, deposit_amount = 0 } = req.body;

  if (!customer_id || !room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
  }
  if (new Date(check_out_date) <= new Date(check_in_date)) {
    return res.status(400).json({ message: 'check_out_date phải sau check_in_date.' });
  }

  const t = await db.beginTransaction();
  try {
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
      return res.status(409).json({ message: `Phòng đang ở trạng thái "${room.status}".` });
    }
    if (actual_guests > room.max_occupancy) {
      await t.rollback();
      return res.status(400).json({ message: `Số khách vượt sức chứa tối đa (${room.max_occupancy}).` });
    }

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

    // MySQL: dùng INSERT thường, lấy insertId từ pool.query kết quả
    // db.beginTransaction().query trả về rows — với INSERT, rows là ResultSetHeader
    const insertResult = await t.query(
      `INSERT INTO Bookings
         (customer_id, room_id, created_by, check_in_date, check_out_date,
          actual_guests, deposit_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [parseInt(customer_id,10), parseInt(room_id,10), req.user?.id ? parseInt(req.user.id, 10) : null,
       check_in_date, check_out_date, parseInt(actual_guests,10), parseFloat(deposit_amount)]
    );

    await t.query(
      `UPDATE Rooms SET status = 'occupied', updated_at = NOW() WHERE room_id = ?`,
      [parseInt(room_id, 10)]
    );

    await t.commit();
    res.status(201).json({
      message:     'Tạo phiếu đặt phòng thành công.',
      booking_id:  insertResult.insertId,
      room_number: room.room_number,
    });
  } catch (err) {
    await t.rollback();
    console.error('[bookingController.createBooking]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

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
      return res.status(400).json({ message: `Không thể check-in. Trạng thái: "${booking.status}".` });
    }

    await t.query(
      `UPDATE Bookings SET status = 'checked_in', updated_at = NOW() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    await t.query(
      `UPDATE Rooms SET status = 'occupied', updated_at = NOW() WHERE room_id = ?`,
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
      `UPDATE Bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = ?`,
      [booking.booking_id]
    );
    await t.query(
      `UPDATE Rooms SET status = 'available', updated_at = NOW() WHERE room_id = ?`,
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

const getBookingById = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT b.*,
              c.full_name AS customer_name, c.phone AS customer_phone, c.id_card,
              r.room_number, rt.type_name AS room_type, rt.base_price AS price_per_night,
              DATEDIFF(b.check_out_date, b.check_in_date) AS nights
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

const updateBookingDates = async (req, res) => {
  const { check_out_date } = req.body;
  const bookingId = parseInt(req.params.id, 10);

  if (!check_out_date) return res.status(400).json({ message: 'Vui lòng cung cấp check_out_date mới.' });

  const today = new Date(); today.setHours(0,0,0,0);
  const newCheckout = new Date(check_out_date);
  if (newCheckout <= today) return res.status(400).json({ message: 'Ngày trả phòng mới phải lớn hơn ngày hiện tại.' });

  const t = await db.beginTransaction();
  try {
    const rows = await t.query(
      `SELECT b.booking_id, b.room_id, b.customer_id, b.check_in_date, b.check_out_date,
              b.status, c.customer_id AS cust_id
       FROM Bookings b
       JOIN Customers c ON b.customer_id = c.customer_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    const booking = rows[0];
    if (!booking) { await t.rollback(); return res.status(404).json({ message: 'Không tìm thấy booking.' }); }

    // Nếu là khách hàng, chỉ được sửa booking của mình
    if (req.user.role === 'Khách hàng') {
      const cusRows = await t.query('SELECT customer_id FROM Customers WHERE customer_id = ?', [req.user.customer_id]);
      if (!cusRows.length || cusRows[0].customer_id !== booking.customer_id) {
        await t.rollback();
        return res.status(403).json({ message: 'Bạn không có quyền sửa booking này.' });
      }
    }

    if (!['confirmed', 'checked_in'].includes(booking.status)) {
      await t.rollback();
      return res.status(400).json({ message: `Không thể sửa booking ở trạng thái "${booking.status}".` });
    }

    const newCheckoutStr = check_out_date;
    if (new Date(newCheckoutStr) <= new Date(booking.check_in_date)) {
      await t.rollback();
      return res.status(400).json({ message: 'Ngày trả phòng phải sau ngày nhận phòng.' });
    }

    // Kiểm tra conflict với booking khác của cùng phòng
    const conflict = await t.query(
      `SELECT COUNT(*) AS cnt FROM Bookings
       WHERE room_id = ? AND booking_id != ? AND status IN ('confirmed','checked_in')
         AND NOT (check_out_date <= ? OR check_in_date >= ?)`,
      [booking.room_id, bookingId, booking.check_in_date, newCheckoutStr]
    );
    if (conflict[0]?.cnt > 0) {
      await t.rollback();
      return res.status(409).json({ message: 'Phòng đã có booking khác trong khoảng thời gian mới.' });
    }

    await t.query(
      'UPDATE Bookings SET check_out_date = ?, updated_at = NOW() WHERE booking_id = ?',
      [newCheckoutStr, bookingId]
    );
    await t.commit();
    res.json({ message: 'Cập nhật ngày đặt phòng thành công.', booking_id: bookingId, check_out_date: newCheckoutStr });
  } catch (err) {
    await t.rollback();
    console.error('[updateBookingDates]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getBookings, createBooking, checkIn, cancelBooking, getBookingById, updateBookingDates };