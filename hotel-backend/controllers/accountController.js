// controllers/accountController.js — ĐÃ SỬA HOÀN CHỈNH
//
// LỖI ĐÃ SỬA:
//   ✅ const [rows] = await db.query(...)  → const rows = await db.query(...)
//   ✅ result.insertId (mysql2)           → dùng OUTPUT INSERTED.account_id (T-SQL)
//   ✅ FIELD(role,...) MySQL              → ORDER BY CASE WHEN... T-SQL
//   ✅ err.code 'ER_DUP_ENTRY'           → mssql dùng err.number 2627 hoặc err.number 2601

const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const { normalizeAccountToUser, ROLE_DB_TO_FRONTEND, ROLE_FRONTEND_TO_DB } = require('./authController');

// Alias local cho ngắn gọn
const ROLE_DB_TO_FE = ROLE_DB_TO_FRONTEND;
const ROLE_FE_TO_DB = ROLE_FRONTEND_TO_DB;

// ── GET /api/accounts?role=&status= ──────────────────────────
const getAccounts = async (req, res) => {
  try {
    const { role, status } = req.query;
    const conditions = [];
    const params     = [];

    if (role) {
      const dbRole = ROLE_FE_TO_DB[role] || role;
      conditions.push('a.role = ?');
      params.push(dbRole);
    }
    if (status === 'active')   { conditions.push('a.is_active = 1'); }
    if (status === 'inactive') { conditions.push('a.is_active = 0'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // ✅ SỬA: FIELD() MySQL → CASE WHEN T-SQL; bỏ dấu []
    const rows = await db.query(
      `SELECT account_id AS id, username, full_name AS fullName,
              phone, email, role, is_active,
              created_at AS createdAt
       FROM Accounts a
       ${where}
       ORDER BY
         CASE role
           WHEN 'admin'        THEN 1
           WHEN 'manager'      THEN 2
           WHEN 'receptionist' THEN 3
           WHEN 'warehouse'    THEN 4
           ELSE 5
         END,
         created_at`,
      params
    );

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

// ── POST /api/accounts ────────────────────────────────────────
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

    // ✅ SỬA: OUTPUT INSERTED.account_id để lấy ID mới (T-SQL không có insertId)
    const rows = await db.query(
      `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active)
       OUTPUT INSERTED.account_id
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, full_name, phone || null, email || null, dbRole]
    );

    res.status(201).json({ message: 'Tạo tài khoản thành công.', account_id: rows[0]?.account_id });
  } catch (err) {
    // ✅ SỬA: mssql dùng err.number thay vì err.code
    if (err.number === 2627 || err.number === 2601) {
      const field = err.message.includes('email') ? 'Email' : 'Tên đăng nhập';
      return res.status(409).json({ message: `${field} đã tồn tại.` });
    }
    console.error('[accountController.createAccount]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/accounts/:id/role ──────────────────────────────
const updateRole = async (req, res) => {
  const { role } = req.body;
  const dbRole   = ROLE_FE_TO_DB[role] || role;

  const VALID = Object.values(ROLE_FE_TO_DB);
  if (!VALID.includes(dbRole)) {
    return res.status(400).json({ message: 'Role không hợp lệ.' });
  }

  // Không cho tự đổi role của chính mình
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ message: 'Không thể tự thay đổi role của bản thân.' });
  }

  try {
    const rows = await db.query(
      'UPDATE Accounts SET role = ? OUTPUT INSERTED.account_id WHERE account_id = ?',
      [dbRole, parseInt(req.params.id, 10)]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Cập nhật role thành công.' });
  } catch (err) {
    console.error('[accountController.updateRole]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/accounts/:id/status ───────────────────────────
const updateStatus = async (req, res) => {
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({ message: 'Thiếu trường is_active.' });
  }

  if (String(req.params.id) === String(req.user.id)) {
    return res.status(403).json({ message: 'Không thể tự khóa tài khoản của bản thân.' });
  }

  try {
    const rows = await db.query(
      'UPDATE Accounts SET is_active = ? OUTPUT INSERTED.account_id WHERE account_id = ?',
      [is_active ? 1 : 0, parseInt(req.params.id, 10)]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: `Tài khoản đã ${is_active ? 'kích hoạt' : 'khóa'} thành công.` });
  } catch (err) {
    console.error('[accountController.updateStatus]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/accounts/:id/password ─────────────────────────
const resetPassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const rows = await db.query(
      'UPDATE Accounts SET password = ? OUTPUT INSERTED.account_id WHERE account_id = ?',
      [hash, parseInt(req.params.id, 10)]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Đặt lại mật khẩu thành công.' });
  } catch (err) {
    console.error('[accountController.resetPassword]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── POST /api/auth/register ───────────────────────────────────
const register = async (req, res) => {
  const { username, password, full_name, phone, email } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: username, password, full_name.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // 1. Tạo Customer trước
    const custRows = await db.query(
      `INSERT INTO Customers (full_name, phone, email)
       OUTPUT INSERTED.customer_id
       VALUES (?, ?, ?)`,
      [full_name, phone || null, email || null]
    );
    const customerId = custRows[0]?.customer_id;

    // 2. Tạo Account gắn với Customer
    const accRows = await db.query(
      `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active, customer_id)
       OUTPUT INSERTED.account_id
       VALUES (?, ?, ?, ?, ?, 'customer', 1, ?)`,
      [username, hash, full_name, phone || null, email || null, customerId]
    );

    res.status(201).json({
      message:     'Đăng ký thành công.',
      account_id:  accRows[0]?.account_id,
      customer_id: customerId,
    });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });
    }
    console.error('[accountController.register]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// ── PATCH /api/auth/profile ───────────────────────────────────
const updateProfile = async (req, res) => {
  const { full_name, phone, email } = req.body;
  const accountId = parseInt(req.user.id, 10);

  const fields = [];
  const params = [];

  if (full_name) { fields.push('full_name = ?'); params.push(full_name); }
  if (phone)     { fields.push('phone = ?');     params.push(phone); }
  if (email)     { fields.push('email = ?');     params.push(email); }

  if (!fields.length) {
    return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
  }

  params.push(accountId);

  try {
    const rows = await db.query(
      `UPDATE Accounts SET ${fields.join(', ')} OUTPUT INSERTED.account_id WHERE account_id = ?`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Cập nhật thông tin thành công.' });
  } catch (err) {
    console.error('[accountController.updateProfile]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getAccounts, createAccount, updateRole, updateStatus, resetPassword, register, updateProfile };