// controllers/staffCustomerController.js — ĐÃ SỬA HOÀN CHỈNH
//
// LỖI ĐÃ SỬA:
//   ✅ const [rows] = ...          → const rows = ...
//   ✅ const [[{ total }]] = ...   → const countRows = ...; const total = countRows[0].total
//   ✅ LIMIT ? OFFSET ? MySQL      → OFFSET ? ROWS FETCH NEXT ? ROWS ONLY T-SQL
//   ✅ NOW()                       → GETDATE()
//   ✅ result.affectedRows         → OUTPUT INSERTED / rows.length
//   ✅ err.code ER_DUP_ENTRY       → err.number 2627 / 2601
//   ✅ LIKE ? MySQL                → LIKE ? T-SQL (tương thích, giữ nguyên)
//   ✅ identity_card               → id_card (đúng theo schema check.sql)

const db = require('../config/db');

// ── GET /api/customers ────────────────────────────────────────
const getCustomers = async (req, res) => {
  try {
    const { keyword, phone, id_card, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params     = [];

    if (phone)        { conditions.push('c.phone = ?');                          params.push(phone); }
    else if (id_card) { conditions.push('c.id_card = ?');                        params.push(id_card); }
    else if (keyword) {
      conditions.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.id_card LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    // ✅ SỬA: bỏ [[{ total }]]
    const countRows = await db.query(
      `SELECT COUNT(*) AS total FROM Customers c ${where}`, params
    );
    const total = countRows[0]?.total ?? 0;

    // ✅ SỬA: OFFSET...FETCH T-SQL + bỏ []
    const rows = await db.query(
      `SELECT c.customer_id, c.full_name,
              c.phone, c.id_card, c.email, c.address, c.created_at,
              COUNT(b.booking_id) AS total_bookings
       FROM Customers c
       LEFT JOIN Bookings b ON c.customer_id = b.customer_id
       ${where}
       GROUP BY c.customer_id, c.full_name, c.phone, c.id_card, c.email, c.address, c.created_at
       ORDER BY c.created_at DESC
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...params, offset, Number(limit)]
    );

    res.json({
      customers:  rows,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[staffCustomerController.getCustomers]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── GET /api/customers/:id ────────────────────────────────────
const getCustomerById = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT c.customer_id, c.full_name, c.phone, c.id_card, c.email, c.address, c.created_at,
              COUNT(b.booking_id) AS total_bookings,
              SUM(CASE WHEN b.status = 'checked_out' THEN 1 ELSE 0 END) AS completed_bookings
       FROM Customers c
       LEFT JOIN Bookings b ON c.customer_id = b.customer_id
       WHERE c.customer_id = ?
       GROUP BY c.customer_id, c.full_name, c.phone, c.id_card, c.email, c.address, c.created_at`,
      [parseInt(req.params.id, 10)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[staffCustomerController.getCustomerById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── POST /api/customers ───────────────────────────────────────
const createCustomer = async (req, res) => {
  const { full_name, phone, id_card, email, address } = req.body;

  if (!full_name || !phone || !id_card) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: full_name, phone, id_card.' });
  }

  try {
    const rows = await db.query(
      `INSERT INTO Customers (full_name, phone, id_card, email, address)
       OUTPUT INSERTED.customer_id
       VALUES (?, ?, ?, ?, ?)`,
      [full_name.trim(), phone, id_card, email || null, address || null]
    );
    res.status(201).json({ message: 'Tạo hồ sơ khách hàng thành công.', customer_id: rows[0]?.customer_id });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ message: 'Số điện thoại hoặc CMND/CCCD đã tồn tại trong hệ thống.' });
    }
    console.error('[staffCustomerController.createCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/customers/:id ──────────────────────────────────
const updateCustomer = async (req, res) => {
  const { full_name, phone, id_card, email, address } = req.body;
  const fields = [];
  const params = [];

  if (full_name)           { fields.push('full_name = ?'); params.push(full_name.trim()); }
  if (phone)               { fields.push('phone = ?');     params.push(phone); }
  if (id_card)             { fields.push('id_card = ?');   params.push(id_card); }
  if (email !== undefined) { fields.push('email = ?');     params.push(email || null); }
  if (address !== undefined) { fields.push('address = ?'); params.push(address || null); }

  if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

  params.push(parseInt(req.params.id, 10));

  try {
    const rows = await db.query(
      `UPDATE Customers SET ${fields.join(', ')}
       OUTPUT INSERTED.customer_id
       WHERE customer_id = ?`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json({ message: 'Cập nhật thông tin khách hàng thành công.' });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ message: 'Số điện thoại hoặc CMND/CCCD đã được dùng bởi khách hàng khác.' });
    }
    console.error('[staffCustomerController.updateCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── DELETE /api/customers/:id ─────────────────────────────────
const deleteCustomer = async (req, res) => {
  try {
    const rows = await db.query(
      'DELETE FROM Customers OUTPUT DELETED.customer_id WHERE customer_id = ?',
      [parseInt(req.params.id, 10)]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json({ message: 'Xoá khách hàng thành công.' });
  } catch (err) {
    // FK violation: err.number 547
    if (err.number === 547) {
      return res.status(409).json({ message: 'Không thể xoá: khách hàng này còn lịch sử đặt phòng.' });
    }
    console.error('[staffCustomerController.deleteCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };