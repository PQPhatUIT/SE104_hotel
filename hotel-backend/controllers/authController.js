// controllers/authController.js
// ✅ Chuyển từ mysql2 → mssql
// Thay đổi chính:
//   - const [rows] = await db.query(...)  →  const rows = await db.query(...)
//   - DATEDIFF cú pháp T-SQL: DATEDIFF(DAY, start, end) thay vì DATEDIFF(end, start)
//   - Tham số dùng ? (wrapper db.query tự convert sang @p0, @p1, ...)

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
require('dotenv').config();

// ── Map role DB → Frontend ─────────────────────────────────────────────────
const ROLE_DB_TO_FRONTEND = {
  'admin':        'Admin',
  'manager':      'Quản lý',
  'receptionist': 'Lễ tân',
  'warehouse':    'Thủ kho',
  'customer':     'Khách hàng',
};

const ROLE_FRONTEND_TO_DB = {
  'Admin':      'admin',
  'Quản lý':    'manager',
  'Lễ tân':     'receptionist',
  'Thủ kho':    'warehouse',
  'Khách hàng': 'customer',
};

function normalizeAccountToUser(account) {
  return {
    id:          String(account.account_id),
    username:    account.username || '',
    fullName:    account.full_name || account.fullName || account.username || '',
    phone:       account.phone  || '',
    email:       account.email  || '',
    role:        ROLE_DB_TO_FRONTEND[account.role] || account.role,
    // ✅ mssql trả BIT là true/false (không phải 1/0 như mysql2)
    status:      (account.is_active === true || account.is_active === 1) ? 'active' : 'inactive',
    createdAt:   account.created_at
                   ? new Date(account.created_at).toISOString().split('T')[0]
                   : new Date().toISOString().split('T')[0],
    customer_id: account.customer_id ?? null,
  };
}

// ── POST /api/auth/login ───────────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    // ✅ mssql: không dùng destructure [rows] — db.query() trả thẳng array
    const rows = await db.query(
      `SELECT account_id, username, password, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE username = ? AND is_active = 1`,
      [username]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const account = rows[0];

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const normalizedUser = normalizeAccountToUser(account);

    const payload = {
      id:          normalizedUser.id,
      username:    normalizedUser.username,
      role:        normalizedUser.role,
      customer_id: normalizedUser.customer_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      message: 'Đăng nhập thành công.',
      token,
      user: normalizedUser,
    });

  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại.' });
  }
};

// ── GET /api/auth/me ───────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // ✅ mssql: không dùng destructure [rows]
    const rows = await db.query(
      `SELECT account_id, username, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE account_id = ? AND is_active = 1`,
      [parseInt(req.user.id, 10)]  // ✅ đảm bảo number để bind sql.Int
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
    }

    res.json({ user: normalizeAccountToUser(rows[0]) });
  } catch (err) {
    console.error('[authController.getMe]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { login, getMe, normalizeAccountToUser, ROLE_DB_TO_FRONTEND, ROLE_FRONTEND_TO_DB };