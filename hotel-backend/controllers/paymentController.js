// controllers/paymentController.js
// ✅ Chuyển từ mysql2 → mssql
// Thay đổi chính:
//   1. db.getConnection() + conn.beginTransaction() → db.beginTransaction()
//   2. const [rows] = ... → const rows = ...
//   3. invoiceResult.insertId → dùng OUTPUT INSERTED.invoice_id trong T-SQL
//   4. NOW() → GETDATE()
//   5. Tên cột khớp với schema SQL đã tạo (deposit_amount, not deposit)

const db = require('../config/db');

// ── POST /api/payments ────────────────────────────────────────────────────
const processPayment = async (req, res) => {
  const { booking_id, extra_charges = 0 } = req.body;

  if (!booking_id) {
    return res.status(400).json({ message: 'Vui lòng cung cấp booking_id.' });
  }

  // ✅ mssql: dùng beginTransaction() wrapper thay vì getConnection()
  const t = await db.beginTransaction();

  try {
    // Bước 1: Lấy thông tin booking
    const bookings = await t.query(
      `SELECT
         b.booking_id,
         b.room_id,
         b.customer_id,
         b.check_in_date,
         b.check_out_date,
         b.deposit_amount,      -- ✅ đúng tên cột trong schema
         b.status               AS booking_status,
         rt.base_price          AS price_per_night,  -- ✅ lấy từ Room_Types
         r.room_number
       FROM Bookings b
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.booking_id = ?`,
      [parseInt(booking_id, 10)]
    );

    if (!bookings || bookings.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: `Không tìm thấy booking với ID: ${booking_id}` });
    }

    const booking = bookings[0];

    if (!['confirmed', 'checked_in'].includes(booking.booking_status)) {
      await t.rollback();
      return res.status(400).json({
        message: `Không thể thanh toán. Trạng thái hiện tại: "${booking.booking_status}".`
      });
    }

    // Bước 2: Tính tiền
    const checkIn  = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights   = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Ngày check-out phải sau ngày check-in.' });
    }

    const roomCharge   = nights * parseFloat(booking.price_per_night);
    const extraCharges = parseFloat(extra_charges) || 0;
    const deposit      = parseFloat(booking.deposit_amount) || 0;
    const totalAmount  = Math.max(roomCharge + extraCharges - deposit, 0);

    // Bước 3: Insert Invoice — dùng OUTPUT INSERTED để lấy ID mới
    // ✅ T-SQL: không có INSERT ... RETURNING, phải dùng OUTPUT INSERTED.col
    const invoiceRows = await t.query(
      `INSERT INTO Invoices
         (booking_id, payment_method, room_charge, service_charge,
          total_amount, amount_paid, change_amount)
       OUTPUT INSERTED.invoice_id
       VALUES (?, 'cash', ?, ?, ?, ?, ?)`,
      [
        parseInt(booking_id, 10),
        roomCharge,
        extraCharges,
        totalAmount,
        totalAmount,   // amount_paid = total (thanh toán đủ)
        0,             // change_amount
      ]
    );

    const newInvoiceId = invoiceRows?.[0]?.invoice_id;

    // Bước 4: Cập nhật Booking → checked_out
    await t.query(
      `UPDATE Bookings
       SET status = 'checked_out', updated_at = GETDATE()
       WHERE booking_id = ?`,
      [parseInt(booking_id, 10)]
    );

    // Bước 5: Cập nhật Phòng → available
    await t.query(
      `UPDATE Rooms
       SET status = 'available', updated_at = GETDATE()
       WHERE room_id = ?`,
      [parseInt(booking.room_id, 10)]
    );

    await t.commit();

    res.status(201).json({
      message: 'Thanh toán thành công!',
      invoice: {
        invoice_id:      newInvoiceId,
        booking_id:      booking.booking_id,
        room_number:     booking.room_number,
        check_in_date:   booking.check_in_date,
        check_out_date:  booking.check_out_date,
        nights,
        price_per_night: booking.price_per_night,
        room_charge:     roomCharge,
        extra_charges:   extraCharges,
        deposit,
        total_amount:    totalAmount,
        payment_status:  'paid',
        payment_date:    new Date().toISOString(),
      }
    });

  } catch (err) {
    await t.rollback();
    console.error('[paymentController.processPayment]', err);
    res.status(500).json({ message: 'Lỗi server khi xử lý thanh toán.' });
  }
};

// ── GET /api/payments/:booking_id ─────────────────────────────────────────
const getInvoiceByBookingId = async (req, res) => {
  const { booking_id } = req.params;

  try {
    const rows = await db.query(
      `SELECT
         i.*,
         b.check_in_date,
         b.check_out_date,
         r.room_number,
         rt.type_name       AS room_type,
         c.full_name        AS customer_name
       FROM Invoices i
       JOIN Bookings   b  ON i.booking_id   = b.booking_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       JOIN Customers  c  ON b.customer_id  = c.customer_id
       WHERE i.booking_id = ?`,
      [parseInt(booking_id, 10)]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn cho booking này.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[paymentController.getInvoiceByBookingId]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { processPayment, getInvoiceByBookingId };