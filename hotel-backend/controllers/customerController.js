// controllers/customerController.js — ĐÃ SỬA LỖI
//
// LỖI ĐÃ SỬA:
//   ✅ DATEDIFF(DAY, col1, col2) — cú pháp T-SQL → DATEDIFF(col2, col1) cú pháp MySQL
//   ✅ LIMIT ? OFFSET ? — thứ tự params [offset, limit] sai → sửa thành [limit, offset]
//      MySQL: LIMIT {số lượng} OFFSET {bỏ qua} → params phải là [limit, offset]

const db = require('../config/db');

// GET /api/customer/my-bookings
const getMyBookings = async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.json({ bookings: [] });
  }

  try {
    const rows = await db.query(
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
         COALESCE(
           inv.total_amount,
           GREATEST(0, DATEDIFF(b.check_out_date, b.check_in_date) * rt.base_price - b.deposit_amount)
         ) AS total_amount
       FROM Bookings b
       JOIN Rooms      r   ON b.room_id      = r.room_id
       JOIN Room_Types rt  ON r.room_type_id = rt.room_type_id
       LEFT JOIN Invoices inv ON b.booking_id = inv.booking_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [parseInt(customerId, 10)]
    );

    res.json(rows);

  } catch (err) {
    console.error('[customerController.getMyBookings]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đặt phòng.' });
  }
};

// GET /api/customer/my-invoices
const getMyInvoices = async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.json({ invoices: [], total: 0 });
  }

  const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit  = Math.min(50, parseInt(String(req.query.limit ?? '10'), 10) || 10);
  const offset = (page - 1) * limit;

  try {
    const countRows = await db.query(
      `SELECT COUNT(*) AS total
       FROM Invoices i
       JOIN Bookings b ON i.booking_id = b.booking_id
       WHERE b.customer_id = ?`,
      [parseInt(customerId, 10)]
    );
    const total = countRows[0]?.total ?? 0;

    // ✅ SỬA: MySQL LIMIT {limit} OFFSET {offset} → params thứ tự [customerId, limit, offset]
    const rows = await db.query(
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
       JOIN Bookings   b  ON i.booking_id   = b.booking_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.customer_id = ?
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(customerId, 10), limit, offset]
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