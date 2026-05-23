// controllers/authController.js
// SỬA LỖI: Normalize response để khớp đúng với interface User của Frontend
//
// VẤN ĐỀ GỐC RỄ:
//   Backend (DB Accounts) trả về:  { account_id, username, role: 'admin', is_active: 1, customer_id }
//   Frontend interface User mong:  { id, username, role: 'Admin', status: 'active', fullName, phone, email, createdAt }
//
//   Có 5 sự lệch lệch gây vỡ layout:
//   1. account_id  → Frontend cần id
//   2. is_active   → Frontend cần status: 'active' | 'inactive'
//   3. role value  → Backend: 'admin'/'receptionist' | Frontend: 'Admin'/'Lễ tân'
//   4. full_name   → Frontend cần fullName (camelCase)
//   5. created_at  → Frontend cần createdAt (camelCase)

const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
require('dotenv').config();

// ── Map: role DB (snake_case English) → role Frontend (tiếng Việt theo đặc tả BM 1.2) ──
const ROLE_DB_TO_FRONTEND = {
  'admin':        'Admin',
  'manager':      'Quản lý',
  'receptionist': 'Lễ tân',
  'warehouse':    'Thủ kho',
  'customer':     'Khách hàng',
};

// Map ngược lại dùng khi cần (để ghi vào DB từ Frontend)
const ROLE_FRONTEND_TO_DB = {
  'Admin':      'admin',
  'Quản lý':    'manager',
  'Lễ tân':     'receptionist',
  'Thủ kho':    'warehouse',
  'Khách hàng': 'customer',
};

/**
 * Normalize bản ghi từ DB Accounts → đúng shape của interface User (Frontend).
 * Hàm này giải quyết toàn bộ sự lệch nhau về tên trường và giá trị.
 *
 * @param {object} account - Bản ghi raw từ MySQL (snake_case)
 * @returns {object} - Object đúng shape interface User (Frontend)
 */
function normalizeAccountToUser(account) {
  return {
    // 1. account_id → id
    id:         String(account.account_id),

    // 2. Giữ nguyên
    username:   account.username || '',

    // 3. full_name (snake_case DB) → fullName (camelCase Frontend)
    fullName:   account.full_name || account.fullName || account.username || '',

    // 4. phone và email — giữ nguyên, fallback về '' nếu NULL trong DB
    phone:      account.phone || '',
    email:      account.email || '',

    // 5. role: map từ 'admin' → 'Admin', 'receptionist' → 'Lễ tân', v.v.
    role:       ROLE_DB_TO_FRONTEND[account.role] || account.role,

    // 6. is_active (0/1) → status ('active'/'inactive')
    status:     account.is_active === 1 || account.is_active === true ? 'active' : 'inactive',

    // 7. created_at (snake_case DB) → createdAt (camelCase Frontend)
    //    Chuyển sang ISO date string để Frontend parse được
    createdAt:  account.created_at
                  ? new Date(account.created_at).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],

    // 8. customer_id — giữ thêm để dùng trong các API booking của customer
    customer_id: account.customer_id || null,
  };
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Response: { message, token, user: <normalized User object> }
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    // Lấy tất cả trường cần thiết, kể cả full_name để normalize
    const [rows] = await db.query(
      `SELECT account_id, username, password, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE username = ? AND is_active = 1`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const account = rows[0];

    // So sánh mật khẩu (bcrypt hash)
    // Nếu DB đang dùng plain text, đổi thành: const isMatch = password === account.password;
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Normalize bản ghi DB → đúng shape Frontend
    const normalizedUser = normalizeAccountToUser(account);

    // JWT payload dùng đúng field name mà Frontend mong đợi
    const payload = {
      id:          normalizedUser.id,
      username:    normalizedUser.username,
      role:        normalizedUser.role,       // Lưu role đã normalize ('Admin', 'Lễ tân', ...)
      customer_id: normalizedUser.customer_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Trả về user đã normalize — Frontend có thể dùng trực tiếp
    res.json({
      message: 'Đăng nhập thành công.',
      token,
      user: normalizedUser,  // Đúng shape interface User của Frontend
    });

  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại.' });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại từ token — dùng để refresh user state khi F5
 * Yêu cầu: verifyToken
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT account_id, username, full_name, phone, email,
              role, is_active, customer_id, created_at
       FROM Accounts
       WHERE account_id = ? AND is_active = 1`,
      [req.user.id]
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
