// seed-accounts.js — Chạy 1 lần để tạo/reset mật khẩu các tài khoản test
// Usage: node seed-accounts.js
// Tạo mật khẩu bcrypt đúng cho tất cả tài khoản trong DB

const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'hotel_management',
  });

  // Danh sách tài khoản test — SỬA password theo ý muốn
  const testAccounts = [
    { username: 'admin',        password: 'admin123',    role: 'admin' },
    { username: 'manager',      password: 'manager123',  role: 'manager' },
    { username: 'receptionist', password: 'recept123',   role: 'receptionist' },
    { username: 'warehouse',    password: 'warehouse123', role: 'warehouse' },
  ];

  const conn = await pool.getConnection();
  try {
    for (const acc of testAccounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      const [rows] = await conn.query(
        'SELECT account_id FROM Accounts WHERE username = ?', [acc.username]
      );
      if (rows.length > 0) {
        await conn.query(
          'UPDATE Accounts SET password = ?, is_active = 1 WHERE username = ?',
          [hash, acc.username]
        );
        console.log(`✅ Updated password for: ${acc.username}`);
      } else {
        await conn.query(
          `INSERT INTO Accounts (username, password, full_name, role, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [acc.username, hash, acc.username, acc.role]
        );
        console.log(`✅ Created account: ${acc.username}`);
      }
    }
    console.log('\n📋 Tài khoản test:');
    testAccounts.forEach(a => console.log(`   ${a.username} / ${a.password}`));
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(console.error);
