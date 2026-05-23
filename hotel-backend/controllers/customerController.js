// controllers/customerController.js
// ✅ Chuyển từ mysql2 → mssql
// Thay đổi chính:
//   1. const [rows] = await db.query(...)  →  const rows = await db.query(...)
//   2. DATEDIFF cú pháp MySQL: DATEDIFF(end, start)
//      → T-SQL:                DATEDIFF(DAY, start, end)
//   3. LIMIT/OFFSET (MySQL) → OFFSET/FETCH NEXT (T-SQL)
//   4. COUNT query: const [[{ total }]] = ... → const rows = ...; total = rows[0].total
//   5. JOIN Room_Types dùng rt.room_type_id (PK đúng theo schema SQL)

const db = require('../config/db');

// ── GET /api/customer/my-bookings ─────────────────────────────────────────
const getMyBookings = async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    console.warn('[getMyBookings] customer_id undefined trong JWT. req.user =', req.user);
    return res.json([]);
  }

  try {
    // ✅ T-SQL fixes:
    //   - DATEDIFF(DAY, start_col, end_col)  ← thứ tự đảo so với MySQL
    //   - JOIN Room_Types rt ON rt.room_type_id  ← đúng tên PK
    //   - Không cần LIMIT/OFFSET cho query này
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
           DATEDIFF(DAY, b.check_in_date, b.check_out_date) * rt.base_price - b.deposit_amount
         ) AS total_amount
       FROM Bookings b
       JOIN Rooms      r   ON b.room_id      = r.room_id
       JOIN Room_Types rt  ON r.room_type_id = rt.room_type_id
       LEFT JOIN Invoices inv ON b.booking_id = inv.booking_id
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [parseInt(customerId, 10)]
    );

    res.json(rows ?? []);

  } catch (err) {
    console.error('[customerController.getMyBookings]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đặt phòng.' });
  }
};

// ── GET /api/customer/my-invoices ─────────────────────────────────────────
const getMyInvoices = async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    console.warn('[getMyInvoices] customer_id undefined. req.user =', req.user);
    return res.json({ invoices: [], total: 0 });
  }

  const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
  const limit  = Math.min(50, parseInt(String(req.query.limit ?? '10'), 10) || 10);
  const offset = (page - 1) * limit;

  try {
    // ✅ mssql: const [[{ total }]] không dùng được → lấy rows[0].total
    const countRows = await db.query(
      `SELECT COUNT(*) AS total
       FROM Invoices i
       JOIN Bookings b ON i.booking_id = b.booking_id
       WHERE b.customer_id = ?`,
      [parseInt(customerId, 10)]
    );
    const total = countRows?.[0]?.total ?? 0;

    // ✅ T-SQL phân trang: OFFSET x ROWS FETCH NEXT y ROWS ONLY
    //    (thay cho LIMIT y OFFSET x của MySQL)
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
         i.created_at         AS payment_date,
         b.check_in_date,
         b.check_out_date,
         b.status             AS booking_status,
         r.room_number,
         rt.type_name         AS room_type
       FROM Invoices i
       JOIN Bookings   b  ON i.booking_id   = b.booking_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.customer_id = ?
       ORDER BY i.created_at DESC
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [parseInt(customerId, 10), offset, limit]
    );

    res.json({
      invoices: rows ?? [],
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