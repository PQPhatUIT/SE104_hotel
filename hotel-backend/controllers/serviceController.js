// controllers/serviceController.js — ĐÃ SỬA LỖI
//
// LỖI ĐÃ SỬA:
//   ✅ const [result] = await db.query(INSERT/UPDATE) → const result = await db.query(...)
//      db.query() trong db.js đã unwrap [rows] rồi, destructure thêm sẽ lấy sai giá trị
//   ✅ addStock: biến _svcRows không dùng được → đổi thành svcRows và dùng svcRows[0]

const db = require('../config/db');

// GET /api/services?available=1&low_stock=1
const getServices = async (req, res) => {
  try {
    const { available, low_stock } = req.query;
    const conditions = [];
    const params     = [];

    if (available === '1') { conditions.push('s.is_available = 1'); }
    if (low_stock === '1') { conditions.push('s.stock_quantity <= s.min_limit AND s.min_limit > 0'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(
      `SELECT service_id, service_name, unit, price,
              stock_quantity, min_limit,
              (stock_quantity <= min_limit AND min_limit > 0) AS is_low_stock,
              description, is_available, updated_at
       FROM Services s ${where}
       ORDER BY is_low_stock DESC, service_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[serviceController.getServices]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// GET /api/services/:id
const getServiceById = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM Services WHERE service_id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[serviceController.getServiceById]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// POST /api/services
const createService = async (req, res) => {
  const { service_name, unit, price, stock_quantity = 0, min_limit = 0, description } = req.body;

  if (!service_name || !unit || price === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: service_name, unit, price.' });
  }
  if (!['Chai', 'Gói', 'Lượt'].includes(unit)) {
    return res.status(400).json({ message: 'unit phải là: Chai, Gói, hoặc Lượt.' });
  }

  try {
    // ✅ SỬA: bỏ dấu [] — db.query trả về ResultSetHeader trực tiếp với INSERT
    const result = await db.query(
      `INSERT INTO Services (service_name, unit, price, stock_quantity, min_limit, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [service_name, unit, price, stock_quantity, min_limit, description || null]
    );
    res.status(201).json({ message: 'Tạo dịch vụ thành công.', service_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: `Dịch vụ "${service_name}" đã tồn tại.` });
    }
    console.error('[serviceController.createService]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/services/:id
const updateService = async (req, res) => {
  const { service_name, unit, price, stock_quantity, min_limit, description, is_available } = req.body;
  const fields = [];
  const params = [];

  if (service_name   !== undefined) { fields.push('service_name = ?');   params.push(service_name); }
  if (unit           !== undefined) { fields.push('unit = ?');           params.push(unit); }
  if (price          !== undefined) { fields.push('price = ?');          params.push(price); }
  if (stock_quantity !== undefined) { fields.push('stock_quantity = ?'); params.push(Number(stock_quantity)); }
  if (min_limit      !== undefined) { fields.push('min_limit = ?');      params.push(Number(min_limit)); }
  if (description    !== undefined) { fields.push('description = ?');    params.push(description); }
  if (is_available   !== undefined) { fields.push('is_available = ?');   params.push(is_available ? 1 : 0); }

  if (!fields.length) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });

  try {
    params.push(req.params.id);
    // ✅ SỬA: bỏ dấu []
    const result = await db.query(
      `UPDATE Services SET ${fields.join(', ')}, updated_at = NOW() WHERE service_id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
    res.json({ message: 'Cập nhật dịch vụ thành công.' });
  } catch (err) {
    console.error('[serviceController.updateService]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

// PATCH /api/services/:id/stock
const addStock = async (req, res) => {
  const { quantity_added } = req.body;
  if (!quantity_added || Number(quantity_added) <= 0) {
    return res.status(400).json({ message: 'quantity_added phải là số dương.' });
  }
  try {
    // ✅ SỬA: bỏ dấu []
    const result = await db.query(
      `UPDATE Services SET stock_quantity = stock_quantity + ?, updated_at = NOW() WHERE service_id = ?`,
      [Number(quantity_added), req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });

    // ✅ SỬA: tên biến đúng là svcRows, dùng svcRows[0] thay vì svc (lỗi ReferenceError cũ)
    const svcRows = await db.query('SELECT stock_quantity FROM Services WHERE service_id = ?', [req.params.id]);
    res.json({ message: 'Nhập hàng thành công.', new_stock: svcRows[0].stock_quantity });
  } catch (err) {
    console.error('[serviceController.addStock]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};


// ── DELETE /api/services/:id ──────────────────────────────────────────────────
// Không cho xóa nếu dịch vụ đang có trong hóa đơn (lịch sử)
const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Kiểm tra tên dịch vụ để thông báo rõ ràng
    const rows = await db.query('SELECT service_name FROM Services WHERE service_id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });

    // Kiểm tra có trong Invoice_Details không
    const used = await db.query(
      'SELECT COUNT(*) AS cnt FROM Invoice_Details WHERE service_id = ?', [id]
    );
    if (parseInt(used[0]?.cnt || '0') > 0) {
      return res.status(409).json({
        message: `Không thể xóa "${rows[0].service_name}" vì đã có trong lịch sử hóa đơn.`,
      });
    }

    await db.query('DELETE FROM Services WHERE service_id = ?', [id]);
    res.json({ message: `Đã xóa dịch vụ "${rows[0].service_name}" thành công.` });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Không thể xóa: dịch vụ đang được sử dụng.' });
    }
    console.error('[serviceController.deleteService]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getServices, getServiceById, createService, updateService, addStock, deleteService };