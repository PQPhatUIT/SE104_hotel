import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Bed, DollarSign } from 'lucide-react';

// Revenue data by room type (BM 7.1)
const revenueByType = [
  { type: 'Standard', revenue: 25000000, percentage: 37.3 },
  { type: 'Deluxe', revenue: 28000000, percentage: 41.8 },
  { type: 'Suite', revenue: 14000000, percentage: 20.9 },
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

export function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Báo cáo Tổng quan</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Doanh thu tháng</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">67.000.000 đ</p>
              <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12.5%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Phòng đang sử dụng</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">72/100</p>
              <p className="text-gray-600 text-sm mt-1">72% công suất</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Bed className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Khách lưu trú</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">156</p>
              <p className="text-gray-600 text-sm mt-1">Hiện tại</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đặt phòng mới</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">28</p>
              <p className="text-orange-600 text-sm mt-1">Hôm nay</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Doanh thu 6 tháng gần đây</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${(value as number).toLocaleString('vi-VN')} đ`} />
              <Legend />
              <Bar dataKey="revenue" fill="#2563eb" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Room Usage Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mật độ sử dụng phòng</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roomUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="used" stroke="#10b981" name="Phòng đã dùng" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#94a3b8" name="Tổng phòng" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Room Type (BM 7.1) */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Báo cáo Doanh thu theo Hạng phòng (BM 7.1)</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip formatter={(value) => `${(value as number).toLocaleString('vi-VN')} đ`} />
                <Legend />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hạng phòng</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Doanh thu</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tỉ lệ %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueByType.map((item) => (
                  <tr key={item.type}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">
                      {item.revenue.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {item.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-800">Tổng cộng</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">
                    {revenueByType.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
