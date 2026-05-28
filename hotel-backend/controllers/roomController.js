// controllers/roomController.js — ĐÃ SỬA LỖI
//
// LỖI ĐÃ SỬA:
//   ✅ updateRoomStatus: dùng rows.length === 0 để check → sửa thành result.affectedRows === 0
//      (db.query với UPDATE trả về ResultSetHeader, không phải array nên .length không hoạt động)
//   ✅ createRoom: rows.insertId → result.insertId (đặt đúng tên biến)
//   ✅ Xóa comment thừa "OUTPUT INSERTED" trong câu SQL (cú pháp T-SQL không dùng trong MySQL)

const db = require('../config/db');

// GET /api/rooms
const getRooms = async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params     = [];

    if (status) { conditions.push('r.status = ?'); params.push(status); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(
      `SELECT r.room_id, r.room_number, r.room_type_id,
              r.status, r.updated_at,
              rt.type_name, rt.base_price, rt.max_occupancy, rt.description AS type_description
       FROM Rooms r
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       ${where}
       ORDER BY r.room_number`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[roomController.getRooms]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách phòng.' });
  }
};

// GET /api/rooms/available
const getAvailableRooms = async (req, res) => {
  const { check_in, check_out } = req.query;

  if (!check_in || !check_out) {
    return res.status(400).json({ message: 'Vui lòng cung cấp check_in và check_out.' });
  }
  if (new Date(check_out) <= new Date(check_in)) {
    return res.status(400).json({ message: 'check_out phải sau check_in.' });
  }

  try {
    const rows = await db.query(
      `SELECT r.room_id, r.room_number, r.status,
              rt.room_type_id, rt.type_name, rt.base_price, rt.max_occupancy, rt.description
       FROM Rooms r
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE r.status = 'available'
         AND r.room_id NOT IN (
           SELECT b.room_id FROM Bookings b
           WHERE b.status IN ('confirmed','checked_in')
             AND NOT (b.check_out_date <= ? OR b.check_in_date >= ?)
         )
       ORDER BY r.room_number`,
      [check_in, check_out]
    );
    res.json(rows);
  } catch (err) {
    console.error('[roomController.getAvailableRooms]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// GET /api/rooms/:id
const getRoomById = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT r.*, rt.type_name, rt.base_price, rt.max_occupancy, rt.description AS type_description
       FROM Rooms r JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE r.room_id = ?`,
      [parseInt(req.params.id, 10)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[roomController.getRoomById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/rooms/:id/status
const updateRoomStatus = async (req, res) => {
  const { status } = req.body;
  const VALID = ['available', 'occupied', 'booked', 'maintenance'];

  if (!VALID.includes(status)) {
    return res.status(400).json({ message: `status phải là một trong: ${VALID.join(', ')}` });
  }

  try {
    // ✅ SỬA: UPDATE trả về ResultSetHeader → dùng result.affectedRows, KHÔNG dùng rows.length
    const result = await db.query(
      `UPDATE Rooms SET status = ?, updated_at = NOW() WHERE room_id = ?`,
      [status, parseInt(req.params.id, 10)]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    }
    res.json({ message: 'Cập nhật trạng thái phòng thành công.', room_id: req.params.id, status });
  } catch (err) {
    console.error('[roomController.updateRoomStatus]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/rooms
const createRoom = async (req, res) => {
  const { room_number, room_type_id } = req.body;

  if (!room_number || !room_type_id) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: room_number, room_type_id.' });
  }

  try {
    // ✅ SỬA: INSERT trả về ResultSetHeader → dùng result.insertId (không phải rows.insertId)
    const result = await db.query(
      `INSERT INTO Rooms (room_number, room_type_id) VALUES (?, ?)`,
      [room_number, parseInt(room_type_id, 10)]
    );
    res.status(201).json({ message: 'Tạo phòng thành công.', room_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Số phòng "${room_number}" đã tồn tại.` });
    }
    console.error('[roomController.createRoom]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// GET /api/room-types
const getRoomTypes = async (_req, res) => {
  try {
    const rows = await db.query('SELECT * FROM Room_Types ORDER BY base_price');
    res.json(rows);
  } catch (err) {
    console.error('[roomController.getRoomTypes]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};


// ── DELETE /api/rooms/:id ─────────────────────────────────────────────────
// QĐ 2.2: Không được xóa phòng đang ở trạng thái 'occupied' hoặc 'booked'
const deleteRoom = async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT status, room_number FROM Rooms WHERE room_id = ?',
      [parseInt(req.params.id, 10)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy phòng.' });

    const room = rows[0];
    if (room.status === 'occupied' || room.status === 'booked') {
      return res.status(409).json({
        message: `Không thể xóa phòng ${room.room_number} — đang ở trạng thái "${room.status === 'occupied' ? 'Đang sử dụng' : 'Đã đặt'}". Phải trả phòng trước.`,
      });
    }

    // Kiểm tra booking active
    const bookings = await db.query(
      `SELECT COUNT(*) AS cnt FROM Bookings
       WHERE room_id = ? AND status IN ('pending','confirmed','checked_in')`,
      [parseInt(req.params.id, 10)]
    );
    if (parseInt(bookings[0]?.cnt || '0') > 0) {
      return res.status(409).json({ message: 'Không thể xóa: phòng còn lịch đặt đang hoạt động.' });
    }

    await db.query('DELETE FROM Rooms WHERE room_id = ?', [parseInt(req.params.id, 10)]);
    res.json({ message: `Đã xóa phòng ${room.room_number} thành công.` });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Không thể xóa phòng còn lịch sử đặt phòng.' });
    }
    console.error('[roomController.deleteRoom]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getRooms, getAvailableRooms, getRoomById, updateRoomStatus, createRoom, getRoomTypes, deleteRoom };