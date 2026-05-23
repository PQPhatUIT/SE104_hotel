// controllers/accountController.js
// Admin / Quản lý: quản lý tài khoản nhân viên
const db     = require('../config/db');
const bcrypt = require('bcryptjs');

// Map role DB ↔ FE (tái sử dụng từ authController)
const ROLE_DB_TO_FE = {
  admin: 'Admin', manager: 'Quản lý', receptionist: 'Lễ tân',
  warehouse: 'Thủ kho', customer: 'Khách hàng',
};
const ROLE_FE_TO_DB = Object.fromEntries(Object.entries(ROLE_DB_TO_FE).map(([k, v]) => [v, k]));

// GET /api/accounts?role=&status=
const getAccounts = async (req, res) => {
  try {
    const { role, status } = req.query;
    const conditions = [];
    const params     = [];

    if (role) {
      // Chấp nhận cả role FE ('Lễ tân') lẫn role DB ('receptionist')
      const dbRole = ROLE_FE_TO_DB[role] || role;
      conditions.push('a.role = ?');
      params.push(dbRole);
    }
    if (status === 'active')   { conditions.push('a.is_active = 1'); }
    if (status === 'inactive') { conditions.push('a.is_active = 0'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT account_id AS id, username, full_name AS fullName,
              phone, email, role, is_active,
              created_at AS createdAt
       FROM Accounts a
       ${where}
       ORDER BY FIELD(role,'admin','manager','receptionist','warehouse','customer'), created_at`,
      params
    );

    // Normalize role sang tiếng Việt và is_active → status cho FE
    const normalized = rows.map(r => ({
      ...r,
      role:   ROLE_DB_TO_FE[r.role] || r.role,
      status: r.is_active ? 'active' : 'inactive',
    }));

    res.json(normalized);
  } catch (err) {
    console.error('[accountController.getAccounts]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/accounts  — Admin tạo tài khoản nhân viên mới
// Body: { username, password, full_name, phone, email, role }
const createAccount = async (req, res) => {
  const { username, password, full_name, phone, email, role } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: username, password, full_name, role.' });
  }

  const dbRole = ROLE_FE_TO_DB[role] || role;
  const VALID_ROLES = ['admin', 'manager', 'receptionist', 'warehouse', 'customer'];
  if (!VALID_ROLES.includes(dbRole)) {
    return res.status(400).json({ message: `role không hợp lệ. Phải là: ${Object.keys(ROLE_FE_TO_DB).join(', ')}` });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, full_name, phone || null, email || null, dbRole]
    );
    res.status(201).json({ message: 'Tạo tài khoản thành công.', account_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.message.includes('email') ? 'Email' : 'Tên đăng nhập';
      return res.status(409).json({ message: `${field} đã tồn tại.` });
    }
    console.error('[accountController.createAccount]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/accounts/:id/role
// Body: { role: 'Lễ tân' | 'Quản lý' | ... }
const updateRole = async (req, res) => {
  const { role } = req.body;
  const dbRole   = ROLE_FE_TO_DB[role] || role;

  if (!Object.values(ROLE_FE_TO_DB).includes(dbRole) && !Object.keys(ROLE_FE_TO_DB).includes(dbRole)) {
    return res.status(400).json({ message: 'Role không hợp lệ.' });
  }
  // Không cho tự đổi role của chính mình
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ message: 'Không thể tự thay đổi role của chính mình.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE Accounts SET role = ?, updated_at = NOW() WHERE account_id = ?',
      [dbRole, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Cập nhật role thành công.', new_role: ROLE_DB_TO_FE[dbRole] || dbRole });
  } catch (err) {
    console.error('[accountController.updateRole]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/accounts/:id/status
// Body: { is_active: true | false }  — Khoá / Mở tài khoản
const updateStatus = async (req, res) => {
  const { is_active } = req.body;
  if (is_active === undefined) {
    return res.status(400).json({ message: 'Thiếu trường is_active (true/false).' });
  }
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ message: 'Không thể tự khoá tài khoản của chính mình.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE Accounts SET is_active = ?, updated_at = NOW() WHERE account_id = ?',
      [is_active ? 1 : 0, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: `Tài khoản đã ${is_active ? 'mở khoá' : 'bị khoá'}.`, is_active: !!is_active });
  } catch (err) {
    console.error('[accountController.updateStatus]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/accounts/:id/password  — Admin reset mật khẩu cho nhân viên
// Body: { new_password }
const resetPassword = async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }
  try {
    const hash = await bcrypt.hash(new_password, 10);
    const [result] = await db.query(
      'UPDATE Accounts SET password = ?, updated_at = NOW() WHERE account_id = ?',
      [hash, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Đặt lại mật khẩu thành công.' });
  } catch (err) {
    console.error('[accountController.resetPassword]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/auth/register  — Khách hàng tự đăng ký tài khoản
const register = async (req, res) => {
  const { username, password, full_name, phone, email } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: username, password, full_name.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Tạo bản ghi Customers (hồ sơ khách)
    // identity_card để trống — khách sẽ bổ sung sau khi check-in
    const [custResult] = await conn.query(
      `INSERT INTO Customers (full_name, first_name, last_name, phone, identity_card, email)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        full_name.trim().split(' ').slice(0, -1).join(' ') || full_name.trim(),
        full_name.trim().split(' ').slice(-1)[0],
        phone   || null,
        // Dùng username làm placeholder identity_card cho đến khi khách cập nhật
        `PENDING_${username.toUpperCase()}`,
        email   || null,
      ]
    );
    const customer_id = custResult.insertId;

    // 2. Tạo tài khoản Accounts với role='customer', liên kết customer_id
    const hash = await bcrypt.hash(password, 10);
    const [accResult] = await conn.query(
      `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active, customer_id)
       VALUES (?, ?, ?, ?, ?, 'customer', 1, ?)`,
      [username, hash, full_name.trim(), phone || null, email || null, customer_id]
    );

    await conn.commit();

    // Trả về token ngay sau đăng ký (không cần đăng nhập lại)
    const jwt     = require('jsonwebtoken');
    const payload = { id: String(accResult.insertId), username, role: 'Khách hàng', customer_id };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    res.status(201).json({
      message: 'Đăng ký thành công.',
      token,
      user: {
        id: String(accResult.insertId), username, fullName: full_name.trim(),
        phone: phone || '', email: email || '',
        role: 'Khách hàng', status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        customer_id,
      },
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('username'))  return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });
      if (err.message.includes('email'))     return res.status(409).json({ message: 'Email đã được sử dụng.' });
      if (err.message.includes('phone'))     return res.status(409).json({ message: 'Số điện thoại đã được sử dụng.' });
    }
    console.error('[accountController.register]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  } finally {
    conn.release();
  }
};

// PATCH /api/auth/profile  — Người dùng tự cập nhật thông tin cá nhân
const updateProfile = async (req, res) => {
  const { phone, email, full_name } = req.body;
  const fields = [];
  const params = [];

  if (full_name !== undefined) { fields.push('full_name = ?'); params.push(full_name); }
  if (phone     !== undefined) { fields.push('phone = ?');     params.push(phone || null); }
  if (email     !== undefined) { fields.push('email = ?');     params.push(email || null); }

  if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

  try {
    params.push(req.user.id);
    await db.query(
      `UPDATE Accounts SET ${fields.join(', ')}, updated_at = NOW() WHERE account_id = ?`,
      params
    );
    res.json({ message: 'Cập nhật thông tin thành công.' });
  } catch (err) {
    console.error('[accountController.updateProfile]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getAccounts, createAccount, updateRole, updateStatus, resetPassword, register, updateProfile };
