// controllers/authController.js
// Xử lý đăng nhập và trả về JWT token
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * Lưu ý về password:
 * - Nếu DB đang lưu password dạng plain text (chưa hash) → dùng so sánh thẳng (xem comment bên dưới)
 * - Nếu DB đã lưu bcrypt hash → dùng bcrypt.compare()
 * Code hiện tại hỗ trợ CẢ HAI, ưu tiên bcrypt.
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  // Validate input cơ bản
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    // Truy vấn tài khoản theo username (không truyền password vào SQL để tránh SQL injection)
    const [rows] = await db.query(
      'SELECT * FROM Accounts WHERE username = ? AND is_active = 1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const account = rows[0];

    // --- So sánh mật khẩu ---
    // Cách 1: Nếu password trong DB là bcrypt hash (KHUYẾN NGHỊ)
    const isMatch = await bcrypt.compare(password, account.password);

    // Cách 2: Nếu password trong DB vẫn là plain text (tạm thời, cần migrate sau)
    // const isMatch = password === account.password;

    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Tạo JWT payload — KHÔNG đưa password vào payload
    const payload = {
      id: account.account_id,       // ID tài khoản — dùng trong các query sau
      username: account.username,
      role: account.role,           // 'admin' | 'receptionist' | 'manager' | 'warehouse' | 'customer'
      customer_id: account.customer_id || null, // Nếu là khách hàng, lưu customer_id riêng
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Trả về token và thông tin cơ bản (ẩn password)
    const { password: _pw, ...accountInfo } = account;
    res.json({
      message: 'Đăng nhập thành công.',
      token,
      user: accountInfo,
    });

  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({ message: 'Lỗi server, vui lòng thử lại.' });
  }
};

module.exports = { login };