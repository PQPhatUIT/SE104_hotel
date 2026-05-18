const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Cấu hình kết nối MySQL (khớp với XAMPP của bạn)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hotel_management'
});

db.connect(err => {
  if (err) {
    console.error('Lỗi kết nối MySQL: ' + err.stack);
    return;
  }
  console.log('Đã kết nối Database thành công!');
});

// API mẫu: Lấy danh sách phòng
app.get('/api/rooms', (req, res) => {
  db.query('SELECT * FROM Rooms', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// API Đăng nhập (Dành cho 5 vai trò: Admin, Lễ tân, Quản lý, Thủ kho, Khách hàng)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM Accounts WHERE username = ? AND password = ?';
  
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length > 0) {
      res.json({ message: 'Thành công', user: results[0] });
    } else {
      res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }
  });
});

app.listen(5000, () => {
  console.log('Backend server đang chạy tại http://localhost:5000');
});