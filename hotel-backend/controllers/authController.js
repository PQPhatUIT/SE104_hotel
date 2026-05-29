// controllers/authController.js — ĐÃ SỬA HOÀN CHỈNH
//
// LỖI ĐÃ SỬA:
//   ✅ const [rows] = await db.query(...)  →  const rows = await db.query(...)
//      (mssql trả về recordset trực tiếp, KHÔNG phải [rows, fields] như mysql2)
//   ✅ rows.length → rows.length (giữ nguyên, đã đúng)
//   ✅ rows[0]     → rows[0]     (giữ nguyên, đã đúng)

const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
require('dotenv').config();

// ── Map: role DB → role Frontend ─────────────────────────────
const ROLE_DB_TO_FRONTEND = {
  'admin':        'Quản lý',
  'manager':      'Quản lý',
  'receptionist': 'Lễ tân',
  'warehouse':    'Lễ tân',
  'customer':     'Khách hàng',
};

const ROLE_FRONTEND_TO_DB = Object.fromEntries(
  Object.entries(ROLE_DB_TO_FRONTEND).map(([k, v]) => [v, k])
);

function normalizeAccountToUser(account) {
  return {
    id:          String(account.account_id),
    username:    account.username    || '',
    fullName:    account.full_name   || account.username || '',
    phone:       account.phone       || '',
    email:       account.email       || '',
    role:        ROLE_DB_TO_FRONTEND[account.role] || account.role,
    status:      (account.is_active === 1 || account.is_active === true) ? 'active' : 'inactive',
    createdAt:   account.created_at
                   ? new Date(account.created_at).toISOString().split('T')[0]
                   : new Date().toISOString().split('T')[0],
    customer_id: account.customer_id || null,
  };
}

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    // ✅ SỬA LỖI: bỏ dấu [] — mssql trả về mảng trực tiếp, không phải [rows, fields]
    const rows = await db.query(
      `SELECT account_id, username, password, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE username = ? AND is_active = 1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const account  = rows[0];
    const isMatch  = await bcrypt.compare(password, account.password);
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

    res.json({ message: 'Đăng nhập thành công.', token, user: normalizedUser });

  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // ✅ SỬA LỖI: bỏ dấu []
    const rows = await db.query(
      `SELECT account_id, username, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE account_id = ? AND is_active = 1`,
      [parseInt(req.user.id, 10)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa.' });
    }

    res.json({ user: normalizeAccountToUser(rows[0]) });
  } catch (err) {
    console.error('[authController.getMe]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { login, getMe, normalizeAccountToUser, ROLE_DB_TO_FRONTEND, ROLE_FRONTEND_TO_DB };