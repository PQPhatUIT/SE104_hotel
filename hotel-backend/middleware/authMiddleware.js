const jwt = require('jsonwebtoken');
require('dotenv').config();

// Gộp roles: admin+manager→Quản lý, receptionist+warehouse→Lễ tân
const ROLE_MAP = {
  'admin':        'Quản lý',
  'manager':      'Quản lý',
  'receptionist': 'Lễ tân',
  'warehouse':    'Lễ tân',
  'customer':     'Khách hàng',
  // Frontend values (pass-through)
  'Quản lý':    'Quản lý',
  'Lễ tân':     'Lễ tân',
  'Khách hàng': 'Khách hàng',
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Không có token xác thực.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Định dạng token không hợp lệ.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    decoded.role  = ROLE_MAP[decoded.role] || decoded.role;
    req.user      = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token đã hết hạn.' });
    return res.status(403).json({ message: 'Token không hợp lệ.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Chưa xác thực.' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: `Không có quyền. Yêu cầu: ${roles.join(', ')}.` });
  next();
};

module.exports = { verifyToken, requireRole };