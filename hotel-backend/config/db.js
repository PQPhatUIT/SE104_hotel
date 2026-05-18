// config/db.js
// Dùng mysql2 với Promise pool để hỗ trợ async/await toàn project
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_management',
  waitForConnections: true,
  connectionLimit: 10,    // Tối đa 10 kết nối đồng thời
  queueLimit: 0,          // Không giới hạn hàng chờ
});

// Kiểm tra kết nối ngay khi khởi động
pool.getConnection()
  .then(conn => {
    console.log('✅ Đã kết nối MySQL thành công!');
    conn.release(); // Trả kết nối về pool ngay sau khi kiểm tra
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối MySQL:', err.message);
    process.exit(1); // Dừng server nếu không kết nối được DB
  });

module.exports = pool;