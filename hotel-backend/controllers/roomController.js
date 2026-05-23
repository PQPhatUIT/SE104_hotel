// controllers/roomController.js
const db = require('../config/db');

// GET /api/rooms?floor=&type=&status=
// Lấy danh sách phòng, hỗ trợ filter theo tầng, loại, trạng thái
const getRooms = async (req, res) => {
  try {
    const { floor, type, status } = req.query;
    const conditions = [];
    const params     = [];

    if (floor)  { conditions.push('r.floor = ?');      params.push(Number(floor)); }
    if (type)   { conditions.push('r.room_type = ?');  params.push(type); }
    if (status) { conditions.push('r.status = ?');     params.push(status); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT r.room_id, r.room_number, r.room_type, r.room_type_id,
              r.floor, r.capacity, r.price_per_night,
              r.status, r.notes, r.updated_at,
              rt.base_price, rt.description AS type_description
       FROM Rooms r
       JOIN Room_Types rt ON r.room_type_id = rt.id
       ${where}
       ORDER BY r.floor, r.room_number`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[roomController.getRooms]', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách phòng.' });
  }
};

// GET /api/rooms/available?type=Standard&check_in=2026-06-01&check_out=2026-06-04
// Thuật toán 2.2.3 — tránh Overbooking
const getAvailableRooms = async (req, res) => {
  const { type, check_in, check_out } = req.query;

  if (!check_in || !check_out) {
    return res.status(400).json({ message: 'Vui lòng cung cấp check_in và check_out.' });
  }
  if (new Date(check_out) <= new Date(check_in)) {
    return res.status(400).json({ message: 'check_out phải sau check_in.' });
  }

  try {
    const conditions = [`r.status IN ('available','maintenance')`];
    // maintenance tạm loại — chỉ available
    const params = [];

    if (type) { conditions.push('r.room_type = ?'); params.push(type); }

    // Thêm params cho NOT IN sub-query (2 lần: check_in, check_out)
    params.push(check_in, check_out);

    const [rows] = await db.query(
      `SELECT r.room_id, r.room_number, r.room_type,
              r.floor, r.capacity, r.price_per_night, r.status,
              rt.type_name, rt.base_price, rt.description
       FROM Rooms r
       JOIN Room_Types rt ON r.room_type_id = rt.id
       WHERE r.status = 'available'
         ${type ? 'AND r.room_type = ?' : ''}
         AND r.room_id NOT IN (
           SELECT b.room_id FROM Bookings b
           WHERE b.status IN ('confirmed','checked_in')
             AND NOT (b.check_out_date <= ? OR b.check_in_date >= ?)
         )
       ORDER BY r.floor, r.room_number`,
      params
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
    const [rows] = await db.query(
      `SELECT r.*, rt.type_name, rt.base_price, rt.description AS type_description
       FROM Rooms r JOIN Room_Types rt ON r.room_type_id = rt.id
       WHERE r.room_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy phòng.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[roomController.getRoomById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/rooms/:id/status
// Body: { status: 'available' | 'booked' | 'checked_in' | 'maintenance', notes? }
const updateRoomStatus = async (req, res) => {
  const { status, notes } = req.body;
  const VALID = ['available', 'booked', 'checked_in', 'maintenance'];

  if (!VALID.includes(status)) {
    return res.status(400).json({ message: `status phải là một trong: ${VALID.join(', ')}` });
  }

  try {
    const [result] = await db.query(
      `UPDATE Rooms SET status = ?, notes = COALESCE(?, notes), updated_at = NOW()
       WHERE room_id = ?`,
      [status, notes ?? null, req.params.id]
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

// POST /api/rooms  (Admin/Quản lý thêm phòng mới)
const createRoom = async (req, res) => {
  const { room_number, room_type_id, room_type, floor, capacity, price_per_night, notes } = req.body;

  if (!room_number || !room_type_id || !price_per_night) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: room_number, room_type_id, price_per_night.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO Rooms (room_number, room_type_id, room_type, floor, capacity, price_per_night, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [room_number, room_type_id, room_type || 'Standard', floor || 1, capacity || 2, price_per_night, notes || null]
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
    const [rows] = await db.query('SELECT * FROM Room_Types ORDER BY base_price');
    res.json(rows);
  } catch (err) {
    console.error('[roomController.getRoomTypes]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getRooms, getAvailableRooms, getRoomById, updateRoomStatus, createRoom, getRoomTypes };
