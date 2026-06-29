# 🏨 SE104 — Website Quản lý & Đặt phòng Khách sạn

Đồ án môn **SE104 — Nhập môn Công nghệ phần mềm** — UIT  
Ứng dụng web quản lý khách sạn full-stack với phân quyền 3 vai trò: Quản lý, Lễ tân và Khách hàng.

---

## 👥 Thành viên nhóm

| MSSV | Họ tên | Vai trò |
| ---- | ------ | ------- |
| ...  | ...    | ...     |
| ...  | ...    | ...     |
| ...  | ...    | ...     |

---

## 🛠 Công nghệ sử dụng

| Tầng     | Công nghệ                                 |
| -------- | ----------------------------------------- |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express.js                       |
| Database | MySQL (qua XAMPP)                         |
| Auth     | JWT (JSON Web Token)                      |

---

## ✅ Yêu cầu cài đặt

Trước khi chạy, cần cài sẵn:

- [Node.js](https://nodejs.org/) **v18 trở lên** — kiểm tra bằng `node -v`
- [XAMPP](https://www.apachefriends.org/) — để chạy MySQL local
- Git (tùy chọn)

---

## 🚀 Hướng dẫn cài đặt & chạy

### Bước 1 — Khởi động MySQL qua XAMPP

1. Mở **XAMPP Control Panel**
2. Nhấn **Start** ở dòng **MySQL**
3. Đảm bảo cột Status hiển thị màu xanh

### Bước 2 — Tạo database

1. Mở trình duyệt, truy cập: `http://localhost/phpmyadmin`
2. Nhấn **New** ở cột trái → Đặt tên database là `hotel_management` → nhấn **Create**
3. Chọn database `hotel_management` vừa tạo → nhấn tab **Import**
4. Nhấn **Choose File** → chọn file `hotel_management.sql` (nhận riêng qua email/Drive)
5. Kéo xuống cuối → nhấn **Import**
6. Nếu thấy thông báo xanh "Import has been successfully finished" là thành công

### Bước 3 — Cài đặt Backend

Mở terminal (CMD / PowerShell / Terminal), chạy lần lượt:

```bash
cd hotel-backend
npm install
```

Tạo file cấu hình môi trường:

```bash
# Windows (CMD)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Mở file `.env` vừa tạo, điền thông tin nếu cần (mặc định XAMPP thường không cần sửa):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hotel_management
JWT_SECRET=se104_hotel_secret_key
PORT=5000
```

> **Lưu ý:** XAMPP mặc định không có mật khẩu MySQL. Nếu bạn đã đặt mật khẩu thì điền vào `DB_PASSWORD`.

Khởi động backend:

```bash
npm run dev
```

Nếu thấy dòng:

```
✅ Kết nối MySQL thành công! DB: hotel_management
🚀 Server đang chạy tại http://localhost:5000
```

→ Backend đã chạy thành công.

### Bước 4 — Cài đặt Frontend

Mở **terminal mới** (giữ nguyên terminal backend đang chạy), chạy:

```bash
cd hotel-frontend
npm install
npm run dev
```

Truy cập ứng dụng tại: **http://localhost:5173**

---

## 🔑 Tài khoản demo

| Vai trò    | Username   | Password |
| ---------- | ---------- | -------- |
| Quản lý    | `admin`    | `123456` |
| Lễ tân     | `recept01` | `123456` |
| Khách hàng | `kh_an`    | `123456` |

---

## 📁 Cấu trúc thư mục

```
SE104_hotel/
├── hotel-backend/          # Server Node.js + Express
│   ├── config/
│   │   └── db.js           # Kết nối MySQL
│   ├── controllers/        # Xử lý logic nghiệp vụ
│   ├── middleware/         # Xác thực JWT, phân quyền
│   ├── .env.example        # Mẫu file cấu hình môi trường
│   ├── server.js           # Entry point backend
│   └── package.json
│
├── hotel-frontend/         # Giao diện React + TypeScript
│   ├── src/
│   │   └── app/
│   │       ├── components/ # Các màn hình chức năng
│   │       ├── context/    # Auth context (quản lý đăng nhập)
│   │       └── App.tsx     # Router chính
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🎯 Chức năng chính

### Quản lý (Manager)

- Xem báo cáo doanh thu theo tháng/hình thức thanh toán
- Quản lý danh sách phòng và hạng phòng
- Quản lý tài khoản nhân viên (tạo, khóa/mở khóa, phân quyền)
- Quản lý kho dịch vụ (tồn kho, cảnh báo hàng sắp hết)

### Lễ tân (Receptionist)

- Tạo phiếu đặt phòng cho khách (có ghi chú)
- Check-in / Check-out linh hoạt (không giới hạn theo ngày dự kiến)
- Thanh toán và xuất hóa đơn (tiền mặt / chuyển khoản / thẻ)
- Tra cứu lịch sử hóa đơn theo SĐT

### Khách hàng (Customer)

- Xem danh sách hạng phòng và giá
- Đặt phòng trực tuyến
- Xem lịch sử đặt phòng

---

## ⚠️ Lỗi thường gặp

**Lỗi `ECONNREFUSED 127.0.0.1:3306`**
→ MySQL chưa chạy. Mở XAMPP → Start MySQL.

**Lỗi `Unknown database 'hotel_management'`**
→ Chưa tạo database. Thực hiện lại Bước 2.

**Lỗi `Cannot find module '...'`**
→ Chưa cài dependencies. Chạy lại `npm install` trong đúng thư mục.

**Trang trắng hoặc không load được API**
→ Kiểm tra backend đã chạy chưa (terminal hiện `Server đang chạy tại http://localhost:5000`).

---

## 📝 Ghi chú

- File SQL chứa dữ liệu mẫu được gửi riêng, không đưa lên repository vì lý do bảo mật
- Backend mặc định chạy cổng `5000`, frontend chạy cổng `5173`
- Cả hai service phải chạy đồng thời thì ứng dụng mới hoạt động
