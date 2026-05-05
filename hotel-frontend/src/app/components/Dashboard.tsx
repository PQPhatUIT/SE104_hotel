import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, Users, Bed, DollarSign,
  Package, AlertTriangle, ClipboardList, Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Admin / Quản lý data ──────────────────────────────────────────────────
const revenueByType = [
  { type: 'Standard', revenue: 25000000, percentage: 37.3 },
  { type: 'Deluxe',   revenue: 28000000, percentage: 41.8 },
  { type: 'Suite',    revenue: 14000000, percentage: 20.9 },
];

const revenueData = [
  { month: 'T1', revenue: 45000000, rooms: 120 },
  { month: 'T2', revenue: 52000000, rooms: 145 },
  { month: 'T3', revenue: 48000000, rooms: 135 },
  { month: 'T4', revenue: 61000000, rooms: 168 },
  { month: 'T5', revenue: 55000000, rooms: 152 },
  { month: 'T6', revenue: 67000000, rooms: 180 },
];

const roomUsageData = [
  { name: 'Tuần 1', used: 85, total: 100 },
  { name: 'Tuần 2', used: 92, total: 100 },
  { name: 'Tuần 3', used: 78, total: 100 },
  { name: 'Tuần 4', used: 88, total: 100 },
];

// ─── Thủ kho data ──────────────────────────────────────────────────────────
const warehouseFlowData = [
  { day: 'T2', nhap: 12, xuat: 8  },
  { day: 'T3', nhap: 5,  xuat: 15 },
  { day: 'T4', nhap: 20, xuat: 10 },
  { day: 'T5', nhap: 8,  xuat: 12 },
  { day: 'T6', nhap: 15, xuat: 7  },
  { day: 'T7', nhap: 3,  xuat: 9  },
  { day: 'CN', nhap: 0,  xuat: 4  },
];

const urgentItems = [
  { id: 'INV001', name: 'Mì gói',             quantity: 15, min: 50,  status: 'Cực kỳ thiếu' },
  { id: 'INV006', name: 'Bia Heineken',        quantity: 8,  min: 20,  status: 'Cực kỳ thiếu' },
  { id: 'INV009', name: 'Bàn chải đánh răng', quantity: 5,  min: 20,  status: 'Cực kỳ thiếu' },
  { id: 'INV010', name: 'Kem đánh răng',      quantity: 6,  min: 20,  status: 'Cực kỳ thiếu' },
  { id: 'INV002', name: 'Nước suối',          quantity: 30, min: 100, status: 'Thiếu hàng'   },
  { id: 'INV004', name: 'Dầu gội',            quantity: 25, min: 30,  status: 'Sắp hết'      },
  { id: 'INV005', name: 'Sữa tắm',            quantity: 20, min: 30,  status: 'Sắp hết'      },
  { id: 'INV008', name: 'Nước ngọt Coca',     quantity: 12, min: 30,  status: 'Thiếu hàng'   },
];

// ─── Warehouse Dashboard ───────────────────────────────────────────────────
function WarehouseDashboard() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Tổng quan Kho hàng</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tổng loại vật tư */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Tổng loại vật tư</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">10</p>
            <p className="text-blue-600 text-sm mt-1">Đang quản lý</p>
          </div>
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Boxes className="w-7 h-7 text-blue-600" />
          </div>
        </div>

        {/* Sản phẩm sắp hết */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Sản phẩm sắp hết (Low Stock)</p>
            <p className="text-3xl font-bold text-red-600 mt-2">8</p>
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Cần nhập gấp
            </p>
          </div>
          <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
        </div>

        {/* Phiếu chờ duyệt */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Phiếu xuất/nhập chờ duyệt</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">3</p>
            <p className="text-orange-500 text-sm mt-1">Đang chờ xử lý</p>
          </div>
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-7 h-7 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Main content: Table + Chart */}
      <div className="grid grid-cols-2 gap-6">
        {/* Urgent Items Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <Package className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-800">Danh sách vật tư cần nhập gấp</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Tên vật tư</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Tồn kho</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urgentItems.map((item) => {
                  const isCritical = item.status === 'Cực kỳ thiếu';
                  const isLow     = item.status === 'Thiếu hàng';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-bold ${isCritical ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-gray-400 text-xs"> / {item.min}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isCritical
                            ? 'bg-red-100 text-red-700'
                            : isLow
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import/Export 7-day Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            Tình hình xuất / nhập kho — 7 ngày qua
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={warehouseFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="nhap" fill="#2563eb" name="Nhập kho" />
              <Bar dataKey="xuat" fill="#f97316" name="Xuất kho" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Admin / Quản lý Dashboard ─────────────────────────────────────────────
function AdminDashboard() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Báo cáo Tổng quan</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Doanh thu tháng</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">67.000.000 đ</p>
              <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> +12.5%
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
              <p className="text-2xl font-bold text-gray-800 mt-2">72/100</p>
              <p className="text-gray-600 text-sm mt-1">72% công suất</p>
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
              <p className="text-2xl font-bold text-gray-800 mt-2">156</p>
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
              <p className="text-2xl font-bold text-gray-800 mt-2">28</p>
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
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${(v as number).toLocaleString('vi-VN')} đ`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#2563eb" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Mật độ sử dụng phòng</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={roomUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
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
          Báo cáo Doanh thu theo Hạng phòng (BM 7.1)
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${(v as number).toLocaleString('vi-VN')} đ`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#8b5cf6" name="Doanh thu" />
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
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'Thủ kho' ? <WarehouseDashboard /> : <AdminDashboard />;
}