// config/db.js — MySQL2 (XAMPP)
// Drop-in replacement cho mssql: giữ nguyên API db.query() và db.beginTransaction()
// để toàn bộ controller KHÔNG cần sửa cách gọi db

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306'),
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',          // XAMPP mặc định không có password
  database:        process.env.DB_NAME     || 'hotel_management',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',                           // Hỗ trợ tiếng Việt
  timezone:           '+07:00',                            // GMT+7
});

// Kiểm tra kết nối ngay khi khởi động
pool.getConnection()
  .then(conn => {
    console.log(`✅ Kết nối MySQL thành công! DB: ${process.env.DB_NAME || 'hotel_management'}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối MySQL:', err.message);
    console.error('   → Kiểm tra: XAMPP đang chạy, DB_NAME đúng, user/password đúng');
    process.exit(1);
  });

// ── db.query() — tương thích với cách controllers đang gọi ──────────────────
// Controllers dùng: const rows = await db.query(sql, params)
// mysql2 pool trả về: [rows, fields] → ta chỉ trả rows để đồng nhất với mssql API
async function query(sqlText, params = []) {
  const [rows] = await pool.query(sqlText, params);
  return rows;   // Trả về array trực tiếp (không phải [rows, fields])
}

// ── db.beginTransaction() — tương thích với bookingController/paymentController
// Controllers dùng:
//   const t = await db.beginTransaction()
//   await t.query(...)
//   await t.commit() / t.rollback()
async function beginTransaction() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  return {
    query: async (sqlText, params = []) => {
      const [rows] = await conn.query(sqlText, params);
      return rows;
    },
    commit: async () => {
      await conn.commit();
      conn.release();
    },
    rollback: async () => {
      try { await conn.rollback(); } catch { /* ignore */ }
      conn.release();
    },
  };
}

module.exports = { query, beginTransaction };
