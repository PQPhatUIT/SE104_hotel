// controllers/customerController.js
// API cho khách hàng: tra cứu booking và hóa đơn của CHÍNH MÌNH
// Yêu cầu: verifyToken middleware trước tất cả route trong file này

const db = require('../config/db');

/**
 * GET /api/customer/my-bookings
 * Trả về danh sách booking của khách hàng đang đăng nhập.
 * Lọc theo customer_id từ JWT — tuyệt đối không lộ dữ liệu người khác.
 *
 * Response trả về đúng shape normalizeBooking() trong BookingContext.tsx:
 *   booking_id, room_number, type_name (as room_type), check_in_date,
 *   check_out_date, actual_guests, deposit_amount, total_amount, status, created_at
 */
const getMyBookings = async (req, res) => {
  // customer_id lấy từ JWT payload (đã set trong authController.login)
  const customerId = req.user?.customer_id;

  if (!customerId) {
    // Tài khoản nhân viên không có customer_id → không có booking
    return res.json({ bookings: [] });
  }

  try {
    const [rows] = await db.query(
      `SELECT
         b.booking_id,
         b.check_in_date,
         b.check_out_date,
         b.actual_guests,
         b.deposit_amount,
         b.status,
         b.created_at,
         r.room_number,
         rt.type_name,
         rt.base_price,
         -- Tính total_amount: ưu tiên lấy từ Invoices nếu đã có, còn không ước tính
         COALESCE(
           inv.total_amount,
           DATEDIFF(b.check_out_date, b.check_in_date) * rt.base_price - b.deposit_amount
         ) AS total_amount
       FROM Bookings b
       JOIN Rooms      r   ON b.room_id      = r.room_id
       JOIN Room_Types rt  ON r.room_type_id = rt.id
       LEFT JOIN Invoices inv ON b.booking_id = inv.booking_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [customerId]
    );

    // Trả về mảng trực tiếp (BookingContext.tsx xử lý được cả array và {bookings:[...]})
    res.json(rows);

  } catch (err) {
    console.error('[customerController.getMyBookings]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đặt phòng.' });
  }
};

/**
 * GET /api/customer/my-invoices
 * Trả về danh sách hóa đơn của khách hàng đang đăng nhập.
 * Phân trang: ?page=1&limit=10
 */
const getMyInvoices = async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.json({ invoices: [], total: 0 });
  }

  // Phân trang an toàn — parseInt với fallback
  const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit = Math.min(50, parseInt(String(req.query.limit ?? '10'), 10) || 10);
  const offset = (page - 1) * limit;

  try {
    // Đếm tổng để trả về pagination info
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM Invoices i
       JOIN Bookings b ON i.booking_id = b.booking_id
       WHERE b.customer_id = ?`,
      [customerId]
    );

    const [rows] = await db.query(
      `SELECT
         i.invoice_id,
         i.booking_id,
         i.payment_method,
         i.room_charge,
         i.service_charge,
         i.total_amount,
         i.amount_paid,
         i.change_amount,
         i.created_at       AS payment_date,
         b.check_in_date,
         b.check_out_date,
         b.status           AS booking_status,
         r.room_number,
         rt.type_name       AS room_type
       FROM Invoices i
       JOIN Bookings   b  ON i.booking_id     = b.booking_id
       JOIN Rooms      r  ON b.room_id        = r.room_id
       JOIN Room_Types rt ON r.room_type_id   = rt.id
       WHERE b.customer_id = ?
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [customerId, limit, offset]
    );

    res.json({
      invoices: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    console.error('[customerController.getMyInvoices]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách hóa đơn.' });
  }
};

module.exports = { getMyBookings, getMyInvoices };
