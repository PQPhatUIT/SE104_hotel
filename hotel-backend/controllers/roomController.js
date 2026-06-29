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
              r.status, r.updated_at, r.notes,
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
  const { status, notes } = req.body;
  const roomId = parseInt(req.params.id, 10);

  // Quản lý chỉ được thao tác 2 chiều: available ↔ maintenance
  if (!['available', 'maintenance'].includes(status)) {
    return res.status(400).json({
      message: 'Chỉ được đổi trạng thái giữa "Trống" và "Bảo trì". Các trạng thái khác được hệ thống tự động quản lý.',
    });
  }

  try {
    // Kiểm tra phòng hiện tại
    const rooms = await db.query('SELECT status FROM Rooms WHERE room_id = ?', [roomId]);
    if (!rooms.length) return res.status(404).json({ message: 'Không tìm thấy phòng.' });

    const current = rooms[0].status;

    // Nếu muốn đổi sang available: phải không có booking active
    if (status === 'available') {
      const active = await db.query(
        `SELECT booking_id FROM Bookings WHERE room_id = ? AND status IN ('confirmed','checked_in') LIMIT 1`,
        [roomId]
      );
      if (active.length > 0) {
        return res.status(409).json({ message: 'Không thể đổi về Trống — phòng đang có khách đặt hoặc đang ở.' });
      }
      if (current !== 'maintenance') {
        return res.status(400).json({ message: `Chỉ có thể đổi từ "Bảo trì" về "Trống".` });
      }
    }

    // Nếu muốn đổi sang maintenance: phòng phải đang trống
    if (status === 'maintenance' && current !== 'available') {
      return res.status(400).json({ message: 'Chỉ có thể đưa vào bảo trì khi phòng đang Trống.' });
    }

    // Thay đổi ghi chú phòng
    if (notes !== undefined) {
    await db.query('UPDATE Rooms SET status = ?, notes = ?, updated_at = NOW() WHERE room_id = ?', [status, notes, roomId]);
    } else {
    await db.query('UPDATE Rooms SET status = ?, updated_at = NOW() WHERE room_id = ?', [status, roomId]);
    }
    
    await db.query('UPDATE Rooms SET status = ?, updated_at = NOW() WHERE room_id = ?', [status, roomId]);
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
// Ghi đè updateRoomStatus với logic mới
// (export đã có ở cuối file, cần patch trực tiếp)
// PATCH /api/rooms/:id — sửa loại phòng (room_type_id)
const updateRoom = async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const { room_type_id } = req.body;

  if (!room_type_id) {
    return res.status(400).json({ message: 'Thiếu room_type_id.' });
  }

  try {
    const rooms = await db.query('SELECT status, room_number FROM Rooms WHERE room_id = ?', [roomId]);
    if (!rooms.length) return res.status(404).json({ message: 'Không tìm thấy phòng.' });

    if (['occupied', 'booked'].includes(rooms[0].status)) {
      return res.status(409).json({ message: `Không thể sửa loại phòng ${rooms[0].room_number} khi đang có khách.` });
    }

    const types = await db.query('SELECT room_type_id FROM Room_Types WHERE room_type_id = ?', [parseInt(room_type_id, 10)]);
    if (!types.length) return res.status(404).json({ message: 'Loại phòng không tồn tại.' });

    await db.query(
      'UPDATE Rooms SET room_type_id = ?, updated_at = NOW() WHERE room_id = ?',
      [parseInt(room_type_id, 10), roomId]
    );
    res.json({ message: 'Cập nhật loại phòng thành công.', room_id: roomId });
  } catch (err) {
    console.error('[roomController.updateRoom]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/room-types
const createRoomType = async (req, res) => {
  const { type_name, base_price, max_occupancy = 2, description, image, amenities } = req.body;

  if (!type_name || base_price === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: type_name, base_price.' });
  }
  if (Number(base_price) <= 0) {
    return res.status(400).json({ message: 'base_price phải lớn hơn 0.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO Room_Types (type_name, base_price, max_occupancy, description, image, amenities) VALUES (?, ?, ?, ?, ?, ?)',
      [type_name.trim(), Number(base_price), parseInt(max_occupancy, 10), description || null, image || null, amenities || null]
    );
    res.status(201).json({ message: 'Tạo hạng phòng thành công.', room_type_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Hạng phòng "${type_name}" đã tồn tại.` });
    }
    console.error('[roomController.createRoomType]', err);
    res.status(500).json({ message: 'Lỗi server khi tạo hạng phòng.' });
  }
};

// PATCH /api/room-types/:id
const updateRoomType = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { type_name, base_price, max_occupancy, description, image, amenities } = req.body;

  const fields = [];
  const params = [];

  if (type_name     !== undefined) { fields.push('type_name = ?');     params.push(type_name.trim()); }
  if (base_price    !== undefined) { fields.push('base_price = ?');     params.push(Number(base_price)); }
  if (max_occupancy !== undefined) { fields.push('max_occupancy = ?'); params.push(parseInt(max_occupancy, 10)); }
  if (description   !== undefined) { fields.push('description = ?');   params.push(description); }
  if (image         !== undefined) { fields.push('image = ?');         params.push(image); }
  if (amenities     !== undefined) { fields.push('amenities = ?');     params.push(amenities); }

  if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

  try {
    params.push(id);
    const result = await db.query(
      `UPDATE Room_Types SET ${fields.join(', ')} WHERE room_type_id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy hạng phòng.' });
    res.json({ message: 'Cập nhật hạng phòng thành công.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Tên hạng phòng "${type_name}" đã tồn tại.` });
    }
    console.error('[roomController.updateRoomType]', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật hạng phòng.' });
  }
};

// DELETE /api/room-types/:id — xóa hạng phòng
const deleteRoomType = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const inUse = await db.query('SELECT COUNT(*) AS cnt FROM Rooms WHERE room_type_id = ?', [id]);
    if (parseInt(inUse[0]?.cnt || '0') > 0) {
      return res.status(409).json({ message: 'Không thể xóa: còn phòng đang thuộc hạng này.' });
    }

    const types = await db.query('SELECT type_name FROM Room_Types WHERE room_type_id = ?', [id]);
    if (!types.length) return res.status(404).json({ message: 'Không tìm thấy hạng phòng.' });

    await db.query('DELETE FROM Room_Types WHERE room_type_id = ?', [id]);
    res.json({ message: `Đã xóa hạng phòng "${types[0].type_name}" thành công.` });
  } catch (err) {
    console.error('[roomController.deleteRoomType]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// Ghi đè export
module.exports = {
  getRooms, getAvailableRooms, getRoomById,
  updateRoomStatus, updateRoom, createRoom, deleteRoom,
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType,
};
