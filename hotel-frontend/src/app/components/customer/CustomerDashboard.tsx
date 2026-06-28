// src/app/components/customer/CustomerDashboard.tsx
// SỬA LỖI:
//   1. user?.fullName thay vì user.fullName (tránh crash khi user chưa load)
//   2. Số liệu thống kê lấy từ bookings context thật thay vì hardcode
//   3. Hiển thị trạng thái loading đúng cách

import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { bookings, isLoading } = useBookings();

  // Tính thống kê từ dữ liệu thật — Array.isArray() phòng thủ trước khi .filter()
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const stats = {
    total:      safeBookings.length,
    active:     safeBookings.filter((b) => b?.status === 'Đã nhận phòng').length,
    upcoming:   safeBookings.filter((b) => b?.status === 'Đã đặt').length,
    completed:  safeBookings.filter((b) => b?.status === 'Hoàn thành').length,
    totalSpent: safeBookings
      .filter((b) => b?.status === 'Hoàn thành')
      .reduce((sum, b) => sum + (b?.totalAmount ?? 0), 0),
  };

  // Lấy booking gần nhất (đã sắp xếp DESC từ context)
  const latestBooking = safeBookings[0] ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Chào mừng — dùng optional chaining để tránh crash */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">
          Xin chào, {user?.fullName || user?.username || 'Khách'}! 👋
        </h2>
        <p className="text-indigo-100 mt-1 text-sm">
          {user?.email && `📧 ${user.email}`}
          {user?.phone && ` · 📱 ${user.phone}`}
        </p>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Tổng đặt phòng',  value: stats.total,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Đang lưu trú',    value: stats.active,    color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Sắp nhận phòng',  value: stats.upcoming,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Đã hoàn thành',   value: stats.completed, color: 'text-gray-600',   bg: 'bg-gray-50'   },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
            {isLoading ? (
              <div className="animate-pulse h-8 w-12 bg-gray-200 rounded mb-2" />
            ) : (
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tổng chi tiêu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm text-gray-500 mb-1">Tổng chi tiêu (đã hoàn thành)</p>
        {isLoading ? (
          <div className="animate-pulse h-8 w-40 bg-gray-200 rounded" />
        ) : (
          <p className="text-2xl font-bold text-indigo-600">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
              .format(stats.totalSpent)}
          </p>
        )}
      </div>

      {/* Booking gần nhất */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Đặt phòng gần nhất</h3>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ) : latestBooking ? (
          <div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">
                Phòng {latestBooking?.room ?? '—'}
                {latestBooking?.roomType && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({latestBooking.roomType})
                  </span>
                )}
              </p>
              <span className="text-xs text-gray-400">
                {latestBooking?.status ?? ''}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {latestBooking?.checkIn ?? '—'} → {latestBooking?.checkOut ?? '—'}
              {latestBooking?.nights != null && ` (${latestBooking.nights} đêm)`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Chưa có lịch sử đặt phòng.</p>
        )}
      </div>
    </div>
  );
}
