// src/app/components/ReportPage.tsx
// BM 6.1 — Báo cáo doanh thu theo khoảng thời gian
// BM 6.2 — Báo cáo mật độ sử dụng phòng
// BM 6.3 — Báo cáo tình trạng dịch vụ
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Bed, Package, Search,
  AlertTriangle, CheckCircle, XCircle, Loader2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Format tiền VNĐ ──────────────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

// ── Màu theo tình trạng tồn kho ──────────────────────────────────────────────
const stockColor: Record<string, string> = {
  'Hết hàng':    'bg-red-100 text-red-700',
  'Cực kỳ thiếu':'bg-orange-100 text-orange-700',
  'Sắp hết':     'bg-yellow-100 text-yellow-700',
  'Đủ hàng':     'bg-green-100 text-green-700',
  'OK':           'bg-gray-100 text-gray-500',
};

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'revenue' | 'room-usage' | 'service';

// ═════════════════════════════════════════════════════════════════════════════
export function ReportPage() {
  const { token } = useAuth();
  const [tab, setTab]       = useState<Tab>('revenue');
  const [from, setFrom]     = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo]         = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Data states
  const [revenueData, setRevenueData]     = useState<any>(null);
  const [roomUsageData, setRoomUsageData] = useState<any>(null);
  const [serviceData, setServiceData]     = useState<any>(null);

  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch tương ứng tab ───────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!from || !to) { setError('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.'); return; }
    if (new Date(to) < new Date(from)) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return; }

    setError('');
    setLoading(true);
    try {
      if (tab === 'revenue') {
        const r = await fetch(`${API_BASE}/api/reports/revenue?from=${from}&to=${to}`, { headers });
        setRevenueData(await r.json());
      } else if (tab === 'room-usage') {
        const r = await fetch(`${API_BASE}/api/reports/room-usage?from=${from}&to=${to}`, { headers });
        setRoomUsageData(await r.json());
      } else {
        const r = await fetch(`${API_BASE}/api/reports/services`, { headers });
        setServiceData(await r.json());
      }
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const TAB_CONFIG = [
    { key: 'revenue',    label: 'BM 6.1 — Doanh thu',          icon: TrendingUp },
    { key: 'room-usage', label: 'BM 6.2 — Mật độ sử dụng phòng', icon: Bed       },
    { key: 'service',    label: 'BM 6.3 — Tình trạng dịch vụ', icon: Package    },
  ] as const;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Báo cáo & Thống kê</h1>

      {/* ── Tab chọn loại báo cáo (QĐ 6) ─────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key as Tab); setError(''); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Bộ lọc thời gian (ẩn nếu BM 6.3 vì không cần ngày) ───────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          {tab !== 'service' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={e => setFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={e => setTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </>
          )}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BM 6.1 — Báo cáo doanh thu                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'revenue' && revenueData && (
        <div className="space-y-6">
          {/* Tổng quan */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Số hóa đơn',     value: revenueData.summary?.total_invoices || 0,        unit: 'hóa đơn', color: 'blue' },
              { label: 'Tiền phòng',     value: fmtMoney(revenueData.summary?.total_room_revenue),   unit: '',        color: 'indigo' },
              { label: 'Tiền dịch vụ',  value: fmtMoney(revenueData.summary?.total_service_revenue), unit: '',        color: 'purple' },
              { label: 'Tổng doanh thu', value: fmtMoney(revenueData.summary?.grand_total),           unit: '',        color: 'green'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-xl font-bold text-${color}-600 mt-1`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Biểu đồ doanh thu theo ngày */}
          {revenueData.daily_revenue?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Doanh thu theo ngày</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueData.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [fmtMoney(v), 'Doanh thu']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bảng doanh thu theo hạng phòng */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Doanh thu theo hạng phòng</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Hạng phòng</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Số HĐ</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tiền phòng</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tiền DV</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tổng</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tỉ lệ</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.by_room_type?.map((row: any) => (
                  <tr key={row.room_type} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{row.room_type}</td>
                    <td className="px-5 py-3 text-right">{row.invoice_count}</td>
                    <td className="px-5 py-3 text-right">{fmtMoney(row.room_revenue)}</td>
                    <td className="px-5 py-3 text-right">{fmtMoney(row.service_revenue)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-blue-600">{fmtMoney(row.total_revenue)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {row.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(!revenueData.by_room_type || revenueData.by_room_type.length === 0) && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian này.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BM 6.2 — Báo cáo mật độ sử dụng phòng                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'room-usage' && roomUsageData && (
        <div className="space-y-6">
          {/* Tổng quan */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Tổng số phòng</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{roomUsageData.summary?.total_rooms}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Tổng ngày đã cho thuê</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{roomUsageData.summary?.total_days_used} ngày</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm text-gray-500">Mật độ tổng thể</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {roomUsageData.summary?.overall_usage_percentage}%
              </p>
            </div>
          </div>

          {/* Biểu đồ theo hạng phòng */}
          {roomUsageData.by_room_type?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Mật độ sử dụng theo hạng phòng (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roomUsageData.by_room_type}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="room_type" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Mật độ']} />
                  <Bar dataKey="usage_percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bảng chi tiết từng phòng — sắp xếp theo mật độ giảm dần (BM 6.2 thuật toán B5) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Chi tiết từng phòng (sắp xếp theo mật độ cao → thấp)</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Số phòng</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Hạng</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Ngày đã thuê</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tổng ngày kỳ</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Mật độ</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {[...(roomUsageData.rooms || [])]
                  .sort((a: any, b: any) => b.usage_percentage - a.usage_percentage)
                  .map((room: any) => (
                  <tr key={room.room_id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{room.room_number}</td>
                    <td className="px-5 py-3 text-gray-500">{room.room_type}</td>
                    <td className="px-5 py-3 text-right">{room.days_used}</td>
                    <td className="px-5 py-3 text-right">{room.total_days}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${room.usage_percentage}%` }}
                          />
                        </div>
                        <span className="font-medium text-blue-600 w-12 text-right">
                          {room.usage_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        room.status === 'occupied'    ? 'bg-red-100 text-red-700'   :
                        room.status === 'booked'      ? 'bg-blue-100 text-blue-700' :
                        room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {room.status === 'available'    ? 'Trống'         :
                         room.status === 'occupied'     ? 'Đang ở'        :
                         room.status === 'booked'       ? 'Đã đặt'        :
                         room.status === 'maintenance'  ? 'Bảo trì'       : room.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BM 6.3 — Báo cáo tình trạng dịch vụ                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'service' && serviceData && (
        <div className="space-y-6">
          {/* Tổng quan */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Tổng loại DV',  value: serviceData.summary?.total,        color: 'gray',   icon: Package       },
              { label: 'Hết hàng',      value: serviceData.summary?.out_of_stock, color: 'red',    icon: XCircle       },
              { label: 'Cực kỳ thiếu', value: serviceData.summary?.critical,     color: 'orange', icon: AlertTriangle },
              { label: 'Sắp hết',       value: serviceData.summary?.low,          color: 'yellow', icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className={`text-3xl font-bold text-${color}-600 mt-1`}>{value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bảng tồn kho chi tiết — theo BM 6.3 thuật toán B4 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Danh sách dịch vụ — So sánh tồn kho vs định mức</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Tên dịch vụ</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Đơn vị</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Tồn kho</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Định mức tối thiểu</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {serviceData.services?.map((svc: any) => (
                  <tr key={svc.service_id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{svc.service_name}</td>
                    <td className="px-5 py-3 text-center text-gray-500">{svc.unit}</td>
                    <td className="px-5 py-3 text-right font-semibold">{svc.stock_quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{svc.min_limit || '—'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${stockColor[svc.stock_status] || 'bg-gray-100 text-gray-600'}`}>
                        {svc.stock_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder khi chưa search */}
      {tab === 'revenue'    && !revenueData    && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Chọn khoảng thời gian và nhấn "Xem báo cáo"</p>
        </div>
      )}
      {tab === 'room-usage' && !roomUsageData  && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
          <Bed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Chọn khoảng thời gian và nhấn "Xem báo cáo"</p>
        </div>
      )}
      {tab === 'service' && !serviceData && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nhấn "Xem báo cáo" để tải tình trạng tồn kho</p>
        </div>
      )}
    </div>
  );
}
