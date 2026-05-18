// controllers/paymentController.js
// Tính năng 1: Xử lý thanh toán hóa đơn — tự động tính tiền từ Booking, cập nhật trạng thái DB

const db = require('../config/db');

/**
 * POST /api/payments
 * Body: { booking_id, extra_charges? }
 * Yêu cầu: verifyToken (req.user phải có id và role)
 *
 * Luồng xử lý:
 * 1. Lấy thông tin Booking (check_in, check_out, room_price, deposit, trạng thái)
 * 2. Tự động tính: total = số_đêm * giá_phòng + extra_charges - deposit
 * 3. INSERT vào bảng Invoices
 * 4. UPDATE Bookings.status = 'checked_out'
 * 5. UPDATE Rooms.status = 'available'
 * Tất cả trong 1 transaction để đảm bảo toàn vẹn dữ liệu
 */
const processPayment = async (req, res) => {
  const { booking_id, extra_charges = 0 } = req.body;

  if (!booking_id) {
    return res.status(400).json({ message: 'Vui lòng cung cấp booking_id.' });
  }

  // Lấy connection riêng để dùng transaction
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // --- Bước 1: Lấy thông tin booking ---
    const [bookings] = await conn.query(
      `SELECT 
         b.booking_id,
         b.room_id,
         b.customer_id,
         b.check_in_date,
         b.check_out_date,
         b.deposit,
         b.status        AS booking_status,
         r.price_per_night,
         r.room_number
       FROM Bookings b
       JOIN Rooms r ON b.room_id = r.room_id
       WHERE b.booking_id = ?`,
      [booking_id]
    );

    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: `Không tìm thấy booking với ID: ${booking_id}` });
    }

    const booking = bookings[0];

    // Chỉ cho phép thanh toán nếu booking đang ở trạng thái 'confirmed' hoặc 'checked_in'
    if (!['confirmed', 'checked_in'].includes(booking.booking_status)) {
      await conn.rollback();
      return res.status(400).json({
        message: `Không thể thanh toán. Trạng thái hiện tại của booking là: "${booking.booking_status}".`
      });
    }

    // --- Bước 2: Tính số đêm và tổng tiền ---
    const checkIn  = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);

    // Tính số đêm: làm tròn lên để tránh thiếu (trường hợp check-out muộn)
    const msPerDay   = 1000 * 60 * 60 * 24;
    const nights     = Math.ceil((checkOut - checkIn) / msPerDay);

    if (nights <= 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Ngày check-out phải sau ngày check-in.' });
    }

    const roomCharge    = nights * parseFloat(booking.price_per_night);
    const extraCharges  = parseFloat(extra_charges) || 0;
    const deposit       = parseFloat(booking.deposit) || 0;
    const totalAmount   = roomCharge + extraCharges - deposit;

    // Tổng tiền không được âm (trường hợp cọc nhiều hơn thực tế)
    const finalAmount = Math.max(totalAmount, 0);

    // --- Bước 3: Tạo hóa đơn trong bảng Invoices ---
    const [invoiceResult] = await conn.query(
      `INSERT INTO Invoices 
         (booking_id, customer_id, room_charge, extra_charges, deposit, total_amount, payment_status, payment_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', NOW(), ?)`,
      [
        booking.booking_id,
        booking.customer_id,
        roomCharge,
        extraCharges,
        deposit,
        finalAmount,
        req.user.id, // ID nhân viên thực hiện thanh toán (từ JWT)
      ]
    );

    const newInvoiceId = invoiceResult.insertId;

    // --- Bước 4: Cập nhật trạng thái Booking → 'checked_out' ---
    await conn.query(
      `UPDATE Bookings SET status = 'checked_out', updated_at = NOW() WHERE booking_id = ?`,
      [booking.booking_id]
    );

    // --- Bước 5: Cập nhật trạng thái Phòng → 'available' ---
    await conn.query(
      `UPDATE Rooms SET status = 'available', updated_at = NOW() WHERE room_id = ?`,
      [booking.room_id]
    );

    // Tất cả thành công → commit transaction
    await conn.commit();

    res.status(201).json({
      message: 'Thanh toán thành công!',
      invoice: {
        invoice_id:     newInvoiceId,
        booking_id:     booking.booking_id,
        room_number:    booking.room_number,
        check_in_date:  booking.check_in_date,
        check_out_date: booking.check_out_date,
        nights,
        price_per_night: booking.price_per_night,
        room_charge:    roomCharge,
        extra_charges:  extraCharges,
        deposit,
        total_amount:   finalAmount,
        payment_status: 'paid',
        payment_date:   new Date().toISOString(),
      }
    });

  } catch (err) {
    await conn.rollback(); // Hoàn tác toàn bộ nếu có bất kỳ lỗi nào
    console.error('[paymentController.processPayment]', err);
    res.status(500).json({ message: 'Lỗi server khi xử lý thanh toán.' });
  } finally {
    conn.release(); // Luôn trả connection về pool dù thành công hay thất bại
  }
};


/**
 * GET /api/payments/:booking_id
 * Xem chi tiết hóa đơn theo booking_id
 * Yêu cầu: verifyToken
 */
const getInvoiceByBookingId = async (req, res) => {
  const { booking_id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         i.*,
         b.check_in_date,
         b.check_out_date,
         r.room_number,
         r.room_type,
         CONCAT(c.first_name, ' ', c.last_name) AS customer_name
       FROM Invoices i
       JOIN Bookings b ON i.booking_id = b.booking_id
       JOIN Rooms r    ON b.room_id    = r.room_id
       JOIN Customers c ON i.customer_id = c.customer_id
       WHERE i.booking_id = ?`,
      [booking_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn cho booking này.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[paymentController.getInvoiceByBookingId]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { processPayment, getInvoiceByBookingId };