// controllers/accountController.js — MySQL (XAMPP)
const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const { normalizeAccountToUser, ROLE_DB_TO_FRONTEND, ROLE_FRONTEND_TO_DB } = require('./authController');

const ROLE_DB_TO_FE = ROLE_DB_TO_FRONTEND;
const ROLE_FE_TO_DB = ROLE_FRONTEND_TO_DB;

const getAccounts = async (req, res) => {
  try {
    const { role, status } = req.query;
    const conditions = [];
    const params     = [];

    if (role) {
      conditions.push('a.role = ?');
      params.push(ROLE_FE_TO_DB[role] || role);
    }
    if (status === 'active')   { conditions.push('a.is_active = 1'); }
    if (status === 'inactive') { conditions.push('a.is_active = 0'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(
      `SELECT account_id AS id, username, full_name AS fullName,
              phone, email, role, is_active, created_at AS createdAt
       FROM Accounts a ${where}
       ORDER BY FIELD(role,'admin','manager','receptionist','warehouse','customer'), created_at`,
      params
    );

    res.json(rows.map(r => ({
      ...r,
      role:   ROLE_DB_TO_FE[r.role] || r.role,
      status: r.is_active ? 'active' : 'inactive',
    })));
  } catch (err) {
    console.error('[accountController.getAccounts]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const createAccount = async (req, res) => {
  const { username, password, full_name, phone, email, role } = req.body;
  if (!username || !password || !full_name || !role)
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });

  const dbRole = ROLE_FE_TO_DB[role] || role;
  if (!['admin','manager','receptionist','warehouse','customer'].includes(dbRole))
    return res.status(400).json({ message: 'role không hợp lệ.' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });

  try {
    const hash   = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [username, hash, full_name, phone||null, email||null, dbRole]
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

const updateRole = async (req, res) => {
  const { role } = req.body;
  const dbRole   = ROLE_FE_TO_DB[role] || role;

  if (!Object.values(ROLE_FE_TO_DB).includes(dbRole))
    return res.status(400).json({ message: 'Role không hợp lệ.' });
  if (String(req.params.id) === String(req.user.id))
    return res.status(403).json({ message: 'Không thể tự đổi role của bản thân.' });

  try {
    const result = await db.query(
      'UPDATE Accounts SET role = ? WHERE account_id = ?',
      [dbRole, parseInt(req.params.id, 10)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Cập nhật role thành công.' });
  } catch (err) {
    console.error('[accountController.updateRole]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const updateStatus = async (req, res) => {
  const { is_active } = req.body;
  if (is_active === undefined) return res.status(400).json({ message: 'Thiếu trường is_active.' });
  if (String(req.params.id) === String(req.user.id))
    return res.status(403).json({ message: 'Không thể tự khóa tài khoản của bản thân.' });

  try {
    const result = await db.query(
      'UPDATE Accounts SET is_active = ? WHERE account_id = ?',
      [is_active ? 1 : 0, parseInt(req.params.id, 10)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: `Tài khoản đã ${is_active ? 'kích hoạt' : 'khóa'}.` });
  } catch (err) {
    console.error('[accountController.updateStatus]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const resetPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });

  try {
    const hash   = await bcrypt.hash(password, 10);
    const result = await db.query(
      'UPDATE Accounts SET password = ? WHERE account_id = ?',
      [hash, parseInt(req.params.id, 10)]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Đặt lại mật khẩu thành công.' });
  } catch (err) {
    console.error('[accountController.resetPassword]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const register = async (req, res) => {
  // DEBUG LOG — xóa sau khi fix xong

  const { username, password, full_name, phone, email, id_card } = req.body;
  if (!username || !password || !full_name)
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });

  try {
    // Kiểm tra trùng username
    const existing = await db.query(
      'SELECT account_id FROM Accounts WHERE username = ?', [username]
    );
    if (existing.length > 0)
      return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.' });

    // Kiểm tra trùng email trong Accounts
    if (email) {
      const emailCheckAcc = await db.query(
        'SELECT account_id FROM Accounts WHERE email = ?', [email]
      );
      if (emailCheckAcc.length > 0)
        return res.status(409).json({ message: 'Email đã được sử dụng. Vui lòng dùng email khác.' });

      const emailCheckCust = await db.query(
        'SELECT customer_id FROM Customers WHERE email = ?', [email]
      );
      if (emailCheckCust.length > 0)
        return res.status(409).json({ message: 'Email đã được sử dụng. Vui lòng dùng email khác.' });
    }

    const t = await db.beginTransaction();
    try {
      const hash    = await bcrypt.hash(password, 10);
      const custRes = await t.query(
        'INSERT INTO Customers (full_name, phone, email, id_card) VALUES (?, ?, ?, ?)',
        [full_name, phone||null, email||null, id_card||null]
      );
      const customerId = custRes.insertId;

      const accRes = await t.query(
        `INSERT INTO Accounts (username, password, full_name, phone, email, role, is_active, customer_id)
         VALUES (?, ?, ?, ?, ?, 'customer', 1, ?)`,
        [username, hash, full_name, phone||null, email||null, customerId]
      );

      await t.commit();
      res.status(201).json({
        message:     'Đăng ký thành công.',
        account_id:  accRes.insertId,
        customer_id: customerId,
      });
    } catch (err) {
      await t.rollback();
      console.error('[register] transaction error:', err.code, err.message);
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ message: 'Tên đăng nhập hoặc email đã tồn tại.' });
      res.status(500).json({ message: 'Lỗi server.' });
    }
  } catch (err) {
    console.error('[register] outer error:', err.code, err.message);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

const updateProfile = async (req, res) => {
  const { full_name, phone, email } = req.body;
  const fields = [], params = [];

  if (full_name) { fields.push('full_name = ?'); params.push(full_name); }
  if (phone)     { fields.push('phone = ?');     params.push(phone); }
  if (email)     { fields.push('email = ?');     params.push(email); }

  if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

  params.push(parseInt(req.user.id, 10));
  try {
    const result = await db.query(
      `UPDATE Accounts SET ${fields.join(', ')} WHERE account_id = ?`, params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ message: 'Cập nhật thông tin thành công.' });
  } catch (err) {
    console.error('[accountController.updateProfile]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getAccounts, createAccount, updateRole, updateStatus, resetPassword, register, updateProfile };