// middleware/authMiddleware.js
// Middleware xác thực JWT — gắn thông tin user vào req.user cho các route cần bảo vệ
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware xác thực token JWT.
 * Đặt trước bất kỳ route nào cần đăng nhập.
 * Sau khi qua middleware này, req.user sẽ có: { id, username, role, ... }
 */
const verifyToken = (req, res, next) => {
  // Token phải được gửi trong header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Không có token xác thực. Vui lòng đăng nhập.' });
  }

  // Tách "Bearer " khỏi token thực
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Định dạng token không hợp lệ. Yêu cầu: Bearer <token>' });
  }

  try {
    // Giải mã và xác minh token — sẽ throw lỗi nếu hết hạn hoặc sai chữ ký
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn payload vào request để controller sử dụng
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }
    return res.status(403).json({ message: 'Token không hợp lệ.' });
  }
};

/**
 * Middleware kiểm tra vai trò (role-based access control).
 * Dùng sau verifyToken.
 * Ví dụ: router.get('/admin-only', verifyToken, requireRole('admin', 'manager'), controller)
 *
 * @param {...string} roles - Danh sách các role được phép truy cập
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };