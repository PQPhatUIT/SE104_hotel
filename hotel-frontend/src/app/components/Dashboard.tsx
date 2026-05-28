import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, Users, Bed, DollarSign,
  Package, AlertTriangle, ClipboardList, Boxes, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Warehouse Dashboard — kết nối API thật ────────────────────────────────
function WarehouseDashboard() {
  const { token } = useAuth();
  const [services, setServices]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/services`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [token]);

  // Phân loại từ dữ liệu thật
  const urgentItems = services.filter((s: any) =>
    s.min_limit > 0 && s.stock_quantity <= s.min_limit
  );
  const lowCount      = urgentItems.length;
  const criticalCount = urgentItems.filter((s: any) =>
    s.stock_quantity <= s.min_limit * 0.5
  ).length;

  const getStatusLabel = (svc: any) => {
    if (svc.stock_quantity === 0)                        return { label: 'Hết hàng',     cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    };
    if (svc.stock_quantity <= svc.min_limit * 0.5)      return { label: 'Cực kỳ thiếu', cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    };
    if (svc.stock_quantity <= svc.min_limit)             return { label: 'Sắp hết',      cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' };
    return                                                      { label: 'Đủ hàng',      cls: 'bg-green-100 text-green-700', dot: 'bg-green-500'  };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Đang tải dữ liệu kho...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Tổng quan Kho hàng</h1>

      {/* KPI Cards — từ dữ liệu thật */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Tổng loại dịch vụ</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">{services.length}</p>
            <p className="text-blue-600 text-sm mt-1">Đang quản lý</p>
          </div>
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Boxes className="w-7 h-7 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Dịch vụ sắp hết hàng</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{lowCount}</p>
            {lowCount > 0 && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Cần nhập gấp
              </p>
            )}
          </div>
          <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Cực kỳ thiếu</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{criticalCount}</p>
            <p className="text-orange-500 text-sm mt-1">Dưới 50% định mức</p>
          </div>
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-7 h-7 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Bảng dịch vụ cần nhập gấp */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <Package className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Dịch vụ cần nhập gấp
            {urgentItems.length > 0 && (
              <span className="ml-2 text-sm font-normal text-red-500">({urgentItems.length} mặt hàng)</span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {urgentItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Tất cả dịch vụ đang đủ hàng.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Tên dịch vụ</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Đơn vị</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Tồn kho / Định mức</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urgentItems.map((item: any) => {
                  const st = getStatusLabel(item);
                  return (
                    <tr key={item.service_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{item.service_name}</td>
                      <td className="px-5 py-3 text-center text-gray-500">{item.unit}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-bold text-red-600">{item.stock_quantity}</span>
                        <span className="text-gray-400 text-xs"> / {item.min_limit}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin / Quản lý Dashboard ─────────────────────────────────────────────
function AdminDashboard() {
  const { token } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [rooms, setRooms]       = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/rooms`,    { headers }).then(r => r.json()),
      fetch(`${API_BASE}/api/bookings`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/api/invoices`, { headers }).then(r => r.json()),
    ]).then(([roomsData, bookingsData, invoicesData]) => {
      setRooms   (Array.isArray(roomsData)    ? roomsData    : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  // FIX: totalRooms = số phòng thực tế từ API /api/rooms, KHÔNG phải bookings.length
  const totalRooms    = rooms.length;
  const occupiedRooms = rooms.filter((r: any) => r.status === 'occupied').length;
  const occupancyPct  = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const monthRevenue = invoices
    .filter((inv: any) => {
      const d = new Date(inv.payment_date || inv.created_at || '');
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0);

  const today        = now.toISOString().split('T')[0];
  const todayBookings = bookings.filter((b: any) =>
    b.created_at && b.created_at.toString().startsWith(today)
  ).length;

  const currentGuests = bookings
    .filter((b: any) => b.status === 'checked_in')
    .reduce((sum: number, b: any) => sum + (parseInt(b.actual_guests) || 1), 0);

  // ── Biểu đồ doanh thu 6 tháng ─────────────────────────────────────────────
  const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const mIdx = (thisMonth - 5 + i + 12) % 12;
    const yr   = thisMonth - 5 + i < 0 ? thisYear - 1 : thisYear;
    const rev  = invoices
      .filter((inv: any) => {
        const d = new Date(inv.payment_date || inv.created_at || '');
        return d.getMonth() === mIdx && d.getFullYear() === yr;
      })
      .reduce((s: number, inv: any) => s + (parseFloat(inv.total_amount) || 0), 0);
    return { month: monthNames[mIdx], revenue: rev };
  });

  // ── Doanh thu theo hạng phòng ──────────────────────────────────────────────
  const revenueByTypeMap: Record<string, number> = {};
  invoices.forEach((inv: any) => {
    const type = inv.room_type || 'Khác';
    revenueByTypeMap[type] = (revenueByTypeMap[type] || 0) + (parseFloat(inv.total_amount) || 0);
  });
  const totalTypeRev  = Object.values(revenueByTypeMap).reduce((s, v) => s + v, 0);
  const revenueByType = Object.entries(revenueByTypeMap).map(([type, revenue]) => ({
    type,
    revenue,
    percentage: totalTypeRev > 0 ? Math.round((revenue / totalTypeRev) * 1000) / 10 : 0,
  }));

  // ── Mật độ phòng theo tuần — FIX: đếm phòng riêng biệt (Set), không đếm booking
  // Công thức đúng: số phòng KHÁC NHAU có booking giao với tuần / tổng phòng
  const roomUsageData = Array.from({ length: 4 }, (_, i) => {
    const weekEnd   = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    const ws = weekStart.toISOString().split('T')[0];
    const we = weekEnd.toISOString().split('T')[0];

    // Set để đếm mỗi phòng chỉ 1 lần dù có nhiều booking
    const usedRoomIds = new Set(
      bookings
        .filter((b: any) =>
          ['confirmed', 'checked_in', 'checked_out'].includes(b.status) &&
          b.check_in_date <= we && b.check_out_date >= ws
        )
        .map((b: any) => b.room_id)
    );

    return {
      name:  `Tuần ${4 - i}`,
      used:  usedRoomIds.size,          // số phòng thực sự bị chiếm
      total: totalRooms,                // FIX: totalRooms từ API rooms, không bao giờ = 100
    };
  }).reverse();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Báo cáo Tổng quan</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Doanh thu tháng</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {monthRevenue.toLocaleString('vi-VN')} đ
              </p>
              <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Tháng {thisMonth + 1}/{thisYear}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Phòng đang sử dụng</p>
              {/* FIX: totalRooms = rooms.length, chính xác từ DB */}
              <p className="text-2xl font-bold text-gray-800 mt-2">{occupiedRooms}/{totalRooms}</p>
              <p className="text-gray-600 text-sm mt-1">{occupancyPct}% công suất</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Khách lưu trú</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{currentGuests}</p>
              <p className="text-gray-600 text-sm mt-1">Hiện tại</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đặt phòng mới</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{todayBookings}</p>
              <p className="text-orange-600 text-sm mt-1">Hôm nay</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Doanh thu 6 tháng gần đây</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => `${(v as number).toLocaleString('vi-VN')} đ`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#2563eb" name="Doanh thu" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            Mật độ sử dụng phòng
            {totalRooms > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                (tổng {totalRooms} phòng)
              </span>
            )}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={roomUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, totalRooms || 10]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="used"  stroke="#10b981" name="Phòng đã dùng" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="total" stroke="#94a3b8" name="Tổng phòng"    strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Room Type */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          Doanh thu theo Hạng phòng (BM 6.1)
        </h2>
        {revenueByType.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Chưa có dữ liệu doanh thu</p>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => `${(v as number).toLocaleString('vi-VN')} đ`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Doanh thu" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-sm self-start">
              <thead className="bg-gray-50 rounded-lg overflow-hidden">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 rounded-tl-lg">Hạng phòng</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Doanh thu</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 rounded-tr-lg">Tỉ lệ %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenueByType.map((item) => (
                  <tr key={item.type} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.type}</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {item.revenue.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {item.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-800">Tổng cộng</td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {revenueByType.reduce((s, i) => s + i.revenue, 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'Thủ kho' ? <WarehouseDashboard /> : <AdminDashboard />;
}
