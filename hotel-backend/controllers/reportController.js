// controllers/reportController.js
// BM 6.1 — Báo cáo doanh thu theo khoảng thời gian
// BM 6.2 — Báo cáo mật độ sử dụng phòng
// BM 6.3 — Báo cáo tình trạng dịch vụ / tồn kho
const db = require('../config/db');

// ── GET /api/reports/revenue?from=2026-01-01&to=2026-05-31 ──────────────────
// BM 6.1: Doanh thu theo khoảng thời gian, phân tách theo hạng phòng
const getRevenueReport = async (req, res) => {
  const { from, to } = req.query;

  // QĐ 6: Tất cả các trường không được bỏ trống
  if (!from || !to) {
    return res.status(400).json({ message: 'Vui lòng cung cấp ngày bắt đầu (from) và ngày kết thúc (to).' });
  }
  if (new Date(to) < new Date(from)) {
    return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
  }

  try {
    // 1. Tổng doanh thu + phân tách theo hạng phòng
    const revenueByType = await db.query(
      `SELECT
         rt.type_name                          AS room_type,
         COUNT(i.invoice_id)                   AS invoice_count,
         SUM(i.room_charge)                    AS room_revenue,
         SUM(i.service_charge)                 AS service_revenue,
         SUM(i.total_amount)                   AS total_revenue
       FROM Invoices i
       JOIN Bookings   b  ON i.booking_id   = b.booking_id
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE DATE(i.created_at) BETWEEN ? AND ?
       GROUP BY rt.type_name
       ORDER BY total_revenue DESC`,
      [from, to]
    );

    // 2. Tổng cộng toàn khách sạn
    const totals = await db.query(
      `SELECT
         COUNT(i.invoice_id)  AS total_invoices,
         SUM(i.room_charge)   AS total_room_revenue,
         SUM(i.service_charge)AS total_service_revenue,
         SUM(i.total_amount)  AS grand_total
       FROM Invoices i
       WHERE DATE(i.created_at) BETWEEN ? AND ?`,
      [from, to]
    );

    // 3. Doanh thu theo ngày (cho biểu đồ đường)
    const dailyRevenue = await db.query(
      `SELECT
         DATE(i.created_at)  AS date,
         SUM(i.total_amount) AS revenue,
         COUNT(i.invoice_id) AS invoices
       FROM Invoices i
       WHERE DATE(i.created_at) BETWEEN ? AND ?
       GROUP BY DATE(i.created_at)
       ORDER BY date`,
      [from, to]
    );

    // Tính % cho từng hạng phòng
    const grandTotal = parseFloat(totals[0]?.grand_total || 0);
    const revenueByTypeWithPct = revenueByType.map((row) => ({
      ...row,
      percentage: grandTotal > 0
        ? Math.round((parseFloat(row.total_revenue) / grandTotal) * 1000) / 10
        : 0,
    }));

    res.json({
      period:         { from, to },
      summary:        totals[0],
      by_room_type:   revenueByTypeWithPct,
      daily_revenue:  dailyRevenue,
    });
  } catch (err) {
    console.error('[reportController.getRevenueReport]', err);
    res.status(500).json({ message: 'Lỗi server khi tạo báo cáo doanh thu.' });
  }
};

// ── GET /api/reports/room-usage?from=2026-01-01&to=2026-05-31 ──────────────
// BM 6.2: Mật độ sử dụng phòng = tổng ngày thuê / (tổng phòng × số ngày kỳ)
const getRoomUsageReport = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ message: 'Vui lòng cung cấp from và to.' });
  }

  try {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    const totalDays = Math.ceil((toDate - fromDate) / 86400000) + 1;

    // 1. Tổng số phòng hiện có
    const roomsData = await db.query(
      `SELECT r.room_id, r.room_number, r.status,
              rt.type_name AS room_type, rt.base_price
       FROM Rooms r
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       ORDER BY r.room_number`
    );
    const totalRooms = roomsData.length;

    // 2. Số ngày thuê thực tế cho từng phòng trong khoảng thời gian
    const usageData = await db.query(
      `SELECT
         r.room_id,
         r.room_number,
         rt.type_name AS room_type,
         -- Tính số ngày overlap: min(check_out, to) - max(check_in, from)
         SUM(
           DATEDIFF(
             LEAST(b.check_out_date, ?),
             GREATEST(b.check_in_date, ?)
           )
         ) AS days_used
       FROM Bookings b
       JOIN Rooms      r  ON b.room_id      = r.room_id
       JOIN Room_Types rt ON r.room_type_id = rt.room_type_id
       WHERE b.status IN ('checked_in', 'checked_out', 'confirmed')
         AND b.check_in_date  <= ?
         AND b.check_out_date >= ?
       GROUP BY r.room_id, r.room_number, rt.type_name
       ORDER BY days_used DESC`,
      [to, from, to, from]
    );

    // 3. Ghép dữ liệu, tính % mật độ cho từng phòng
    const usageMap = {};
    usageData.forEach((row) => {
      usageMap[row.room_id] = Math.max(0, parseInt(row.days_used) || 0);
    });

    const roomsWithUsage = roomsData.map((room) => {
      const daysUsed  = usageMap[room.room_id] || 0;
      const maxDays   = totalDays;
      const usagePct  = maxDays > 0 ? Math.round((daysUsed / maxDays) * 1000) / 10 : 0;
      return { ...room, days_used: daysUsed, total_days: maxDays, usage_percentage: usagePct };
    });

    // 4. Tổng hợp theo hạng phòng
    const byTypeMap = {};
    roomsWithUsage.forEach((r) => {
      if (!byTypeMap[r.room_type]) byTypeMap[r.room_type] = { days_used: 0, count: 0 };
      byTypeMap[r.room_type].days_used += r.days_used;
      byTypeMap[r.room_type].count     += 1;
    });
    const byType = Object.entries(byTypeMap).map(([type, { days_used, count }]) => ({
      room_type:        type,
      room_count:       count,
      total_days_used:  days_used,
      max_days:         count * totalDays,
      usage_percentage: count * totalDays > 0
        ? Math.round((days_used / (count * totalDays)) * 1000) / 10
        : 0,
    }));

    // 5. Tổng mật độ toàn khách sạn
    const totalDaysUsed = roomsWithUsage.reduce((s, r) => s + r.days_used, 0);
    const overallPct    = totalRooms * totalDays > 0
      ? Math.round((totalDaysUsed / (totalRooms * totalDays)) * 1000) / 10
      : 0;

    res.json({
      period:           { from, to, total_days: totalDays },
      summary: {
        total_rooms:    totalRooms,
        total_days_used: totalDaysUsed,
        overall_usage_percentage: overallPct,
      },
      by_room_type:     byType,
      rooms:            roomsWithUsage,
    });
  } catch (err) {
    console.error('[reportController.getRoomUsageReport]', err);
    res.status(500).json({ message: 'Lỗi server khi tạo báo cáo mật độ phòng.' });
  }
};

// ── GET /api/reports/services ───────────────────────────────────────────────
// BM 6.3: Tình trạng tồn kho dịch vụ, cảnh báo dưới định mức
const getServiceReport = async (req, res) => {
  try {
    const services = await db.query(
      `SELECT
         service_id,
         service_name,
         unit,
         price,
         stock_quantity,
         min_limit,
         is_available,
         updated_at,
         -- Phân loại tình trạng
         CASE
           WHEN min_limit = 0              THEN 'OK'
           WHEN stock_quantity = 0         THEN 'Hết hàng'
           WHEN stock_quantity <= min_limit * 0.5 THEN 'Cực kỳ thiếu'
           WHEN stock_quantity <= min_limit       THEN 'Sắp hết'
           ELSE                                        'Đủ hàng'
         END AS stock_status
       FROM Services
       ORDER BY
         CASE
           WHEN min_limit > 0 AND stock_quantity = 0         THEN 1
           WHEN min_limit > 0 AND stock_quantity <= min_limit * 0.5 THEN 2
           WHEN min_limit > 0 AND stock_quantity <= min_limit       THEN 3
           ELSE 4
         END,
         service_name`
    );

    const summary = {
      total:       services.length,
      out_of_stock: services.filter((s) => s.stock_status === 'Hết hàng').length,
      critical:    services.filter((s) => s.stock_status === 'Cực kỳ thiếu').length,
      low:         services.filter((s) => s.stock_status === 'Sắp hết').length,
      ok:          services.filter((s) => s.stock_status === 'Đủ hàng' || s.stock_status === 'OK').length,
    };

    res.json({ summary, services });
  } catch (err) {
    console.error('[reportController.getServiceReport]', err);
    res.status(500).json({ message: 'Lỗi server khi tạo báo cáo dịch vụ.' });
  }
};

module.exports = { getRevenueReport, getRoomUsageReport, getServiceReport };
