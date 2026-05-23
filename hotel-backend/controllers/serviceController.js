// controllers/serviceController.js
// Thủ kho / Quản lý: quản lý dịch vụ, cập nhật tồn kho, cảnh báo sắp hết
const db = require('../config/db');

// GET /api/services?available=1&low_stock=1
const getServices = async (req, res) => {
  try {
    const { available, low_stock } = req.query;
    const conditions = [];
    const params     = [];

    if (available === '1') { conditions.push('s.is_available = 1'); }
    // Lọc các dịch vụ đang gần hết hàng (stock <= min_limit)
    if (low_stock === '1') { conditions.push('s.stock_quantity <= s.min_limit AND s.min_limit > 0'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(
      `SELECT service_id, service_name, unit, price,
              stock_quantity, min_limit,
              -- Flag cảnh báo để FE hiển thị badge
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
// Body: { service_name, unit, price, stock_quantity?, min_limit?, description? }
const createService = async (req, res) => {
  const { service_name, unit, price, stock_quantity = 0, min_limit = 0, description } = req.body;

  if (!service_name || !unit || price === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: service_name, unit, price.' });
  }
  if (!['Chai', 'Gói', 'Lượt'].includes(unit)) {
    return res.status(400).json({ message: 'unit phải là: Chai, Gói, hoặc Lượt.' });
  }

  try {
    const [result] = await db.query(
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
// Cập nhật thông tin hoặc số lượng tồn kho
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
    const [result] = await db.query(
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
// Cộng thêm số lượng tồn kho (nhập hàng) — tránh ghi đè nhầm
// Body: { quantity_added: 50 }
const addStock = async (req, res) => {
  const { quantity_added } = req.body;
  if (!quantity_added || Number(quantity_added) <= 0) {
    return res.status(400).json({ message: 'quantity_added phải là số dương.' });
  }
  try {
    const [result] = await db.query(
      `UPDATE Services
       SET stock_quantity = stock_quantity + ?, updated_at = NOW()
       WHERE service_id = ?`,
      [Number(quantity_added), req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });

    const _svcRows = await db.query('SELECT stock_quantity FROM Services WHERE service_id = ?', [req.params.id]);
    res.json({ message: 'Nhập hàng thành công.', new_stock: svc.stock_quantity });
  } catch (err) {
    console.error('[serviceController.addStock]', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
};

module.exports = { getServices, getServiceById, createService, updateService, addStock };
