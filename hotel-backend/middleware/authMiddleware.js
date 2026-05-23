// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const LEGACY_ROLE_MAP = {
  'admin':        'Admin',
  'manager':      'Quản lý',
  'receptionist': 'Lễ tân',
  'warehouse':    'Thủ kho',
  'customer':     'Khách hàng',
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Không có token xác thực. Vui lòng đăng nhập.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Định dạng token không hợp lệ.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(403).json({ message: 'Token không hợp lệ.' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực.' });
    }
    const rawRole = req.user.role || '';
    const normalizedRole = LEGACY_ROLE_MAP[rawRole.toLowerCase()] || rawRole;
    if (!roles.includes(normalizedRole)) {
      return res.status(403).json({
        message: `Bạn không có quyền truy cập. Yêu cầu: ${roles.join(', ')}.`,
      });
    }
    req.user.role = normalizedRole;
    next();
  };
};

module.exports = { verifyToken, requireRole };