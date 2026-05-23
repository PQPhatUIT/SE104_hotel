// controllers/paymentController.js — MySQL (XAMPP)
const db = require('../config/db');

const processPayment = async (req, res) => {
  const { booking_id, extra_charges = 0 } = req.body;
  if (!booking_id) return res.status(400).json({ message: 'Vui lòng cung cấp booking_id.' });

  const t = await db.beginTransaction();
  try {
    const bookings = await t.query(
      `SELECT b.booking_id, b.room_id, b.customer_id,
              b.check_in_date, b.check_out_date, b.deposit_amount,
              b.status AS booking_status,
              rt.base_price AS price_per_night, r.room_number
       FROM Bookings b
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.booking_id = ?`,
      [parseInt(booking_id, 10)]
    );

    if (!bookings.length) {
      await t.rollback();
      return res.status(404).json({ message: `Không tìm thấy booking ID: ${booking_id}` });
    }
    const booking = bookings[0];

    if (!['confirmed', 'checked_in'].includes(booking.booking_status)) {
      await t.rollback();
      return res.status(400).json({ message: `Không thể thanh toán. Trạng thái: "${booking.booking_status}".` });
    }

    const nights       = Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / 86400000);
    const roomCharge   = nights * parseFloat(booking.price_per_night);
    const extraCharges = parseFloat(extra_charges) || 0;
    const deposit      = parseFloat(booking.deposit_amount) || 0;
    const totalAmount  = Math.max(roomCharge + extraCharges - deposit, 0);

    // MySQL: INSERT thường rồi lấy insertId
    const invoiceResult = await t.query(
      `INSERT INTO Invoices
         (booking_id, payment_method, room_charge, service_charge,
          total_amount, amount_paid, change_amount)
       VALUES (?, 'cash', ?, ?, ?, ?, 0)`,
      [parseInt(booking_id,10), roomCharge, extraCharges, totalAmount, totalAmount]
    );

    await t.query(
      `UPDATE Bookings SET status = 'checked_out', updated_at = NOW() WHERE booking_id = ?`,
      [parseInt(booking_id, 10)]
    );
    await t.query(
      `UPDATE Rooms SET status = 'available', updated_at = NOW() WHERE room_id = ?`,
      [parseInt(booking.room_id, 10)]
    );

    await t.commit();
    res.status(201).json({
      message: 'Thanh toán thành công!',
      invoice: {
        invoice_id:      invoiceResult.insertId,
        booking_id:      booking.booking_id,
        room_number:     booking.room_number,
        nights,
        price_per_night: booking.price_per_night,
        room_charge:     roomCharge,
        extra_charges:   extraCharges,
        deposit,
        total_amount:    totalAmount,
      }
    });
  } catch (err) {
    await t.rollback();
    console.error('[paymentController.processPayment]', err);
    res.status(500).json({ message: 'Lỗi server khi xử lý thanh toán.' });
  }
};

const getInvoiceByBookingId = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT i.*, b.check_in_date, b.check_out_date,
              r.room_number, rt.type_name AS room_type,
              c.full_name AS customer_name
       FROM Invoices i
       JOIN Bookings   b  ON i.booking_id   = b.booking_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       JOIN Customers  c  ON b.customer_id  = c.customer_id
       WHERE i.booking_id = ?`,
      [parseInt(req.params.booking_id, 10)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[paymentController.getInvoiceByBookingId]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { processPayment, getInvoiceByBookingId };
