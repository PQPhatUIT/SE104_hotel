// controllers/staffCustomerController.js
// Dành cho Lễ tân / Quản lý: CRUD khách hàng, tìm kiếm theo SĐT/CMND/tên
const db = require('../config/db');

// GET /api/customers?keyword=&phone=&identity_card=&page=1&limit=20
const getCustomers = async (req, res) => {
  try {
    const { keyword, phone, identity_card, page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params     = [];

    if (phone)         { conditions.push('c.phone = ?');                     params.push(phone); }
    else if (identity_card) { conditions.push('c.identity_card = ?');        params.push(identity_card); }
    else if (keyword)  {
      conditions.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.identity_card LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM Customers c ${where}`, params
    );

    const [rows] = await db.query(
      `SELECT c.customer_id, c.full_name, c.first_name, c.last_name,
              c.phone, c.identity_card, c.email, c.address, c.created_at,
              -- Đếm tổng số lần đặt phòng để hiển thị trên UI
              COUNT(b.booking_id) AS total_bookings
       FROM Customers c
       LEFT JOIN Bookings b ON c.customer_id = b.customer_id
       ${where}
       GROUP BY c.customer_id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({
      customers: rows,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('[staffCustomerController.getCustomers]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
              COUNT(b.booking_id)                         AS total_bookings,
              SUM(CASE WHEN b.status='checked_out' THEN 1 ELSE 0 END) AS completed_bookings
       FROM Customers c
       LEFT JOIN Bookings b ON c.customer_id = b.customer_id
       WHERE c.customer_id = ?
       GROUP BY c.customer_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[staffCustomerController.getCustomerById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/customers
// Body: { full_name, phone, identity_card, email?, address? }
const createCustomer = async (req, res) => {
  const { full_name, phone, identity_card, email, address } = req.body;

  if (!full_name || !phone || !identity_card) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: full_name, phone, identity_card.' });
  }

  // Tách first_name / last_name từ full_name
  const parts      = full_name.trim().split(' ');
  const last_name  = parts[parts.length - 1];
  const first_name = parts.slice(0, -1).join(' ') || last_name;

  try {
    const [result] = await db.query(
      `INSERT INTO Customers (full_name, first_name, last_name, phone, identity_card, email, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name.trim(), first_name, last_name, phone, identity_card, email || null, address || null]
    );
    res.status(201).json({ message: 'Tạo hồ sơ khách hàng thành công.', customer_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.message.includes('phone') ? 'Số điện thoại' : 'Số CMND/CCCD';
      return res.status(409).json({ message: `${field} đã tồn tại trong hệ thống.` });
    }
    console.error('[staffCustomerController.createCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/customers/:id
// Chỉ cập nhật các trường không nhạy cảm (email, address); phone/identity_card cần quyền cao hơn
const updateCustomer = async (req, res) => {
  const { full_name, phone, identity_card, email, address } = req.body;

  try {
    const fields = [];
    const params = [];

    if (full_name) {
      const parts     = full_name.trim().split(' ');
      const last_name  = parts[parts.length - 1];
      const first_name = parts.slice(0, -1).join(' ') || last_name;
      fields.push('full_name = ?', 'first_name = ?', 'last_name = ?');
      params.push(full_name.trim(), first_name, last_name);
    }
    if (phone)         { fields.push('phone = ?');         params.push(phone); }
    if (identity_card) { fields.push('identity_card = ?'); params.push(identity_card); }
    if (email !== undefined) { fields.push('email = ?');   params.push(email || null); }
    if (address !== undefined) { fields.push('address = ?'); params.push(address || null); }

    if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

    params.push(req.params.id);
    const [result] = await db.query(
      `UPDATE Customers SET ${fields.join(', ')}, updated_at = NOW() WHERE customer_id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json({ message: 'Cập nhật thông tin khách hàng thành công.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Số điện thoại hoặc CMND/CCCD đã được dùng bởi khách hàng khác.' });
    }
    console.error('[staffCustomerController.updateCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// DELETE /api/customers/:id  (chỉ Admin — có booking thì không cho xóa do RESTRICT FK)
const deleteCustomer = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Customers WHERE customer_id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    res.json({ message: 'Xoá khách hàng thành công.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Không thể xoá: khách hàng này còn lịch sử đặt phòng.' });
    }
    console.error('[staffCustomerController.deleteCustomer]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
