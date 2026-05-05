import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { Calendar, CreditCard, Bed, Luggage } from 'lucide-react';

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Bed className="w-12 h-12 text-blue-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">
        Bạn chưa có lịch sử đặt phòng nào.
      </h3>
      <p className="text-gray-400 mb-8">
        Hãy bắt đầu chuyến đi đầu tiên của bạn cùng chúng tôi!
      </p>
      <button
        onClick={() => navigate('/customer-rooms')}
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md"
      >
        Đặt phòng ngay
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function CustomerDashboard() {
  const { user } = useAuth();
  const { bookings, isNewUser } = useBookings();

  const totalSpent = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const currentlyStaying = bookings.filter((b) => b.status === 'Đã nhận phòng').length;

  const stats = [
    {
      label: 'Tổng đặt phòng',
      value: isNewUser ? '0' : String(bookings.length),
      icon: Calendar,
      colorBg: 'bg-blue-100',
      colorIcon: 'text-blue-600',
    },
    {
      label: 'Đang lưu trú',
      value: isNewUser ? '0' : String(currentlyStaying),
      icon: Bed,
      colorBg: 'bg-green-100',
      colorIcon: 'text-green-600',
    },
    {
      label: 'Tổng chi tiêu',
      value: isNewUser ? '0 đ' : `${totalSpent.toLocaleString('vi-VN')} đ`,
      icon: CreditCard,
      colorBg: 'bg-purple-100',
      colorIcon: 'text-purple-600',
    },
  ];

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Xin chào, {user?.fullName}!
        </h1>
        <p className="text-gray-500 mt-1">
          Chào mừng bạn đến với hệ thống đặt phòng khách sạn
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.colorBg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-6 h-6 ${stat.colorIcon}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking history / Empty state */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Lịch sử đặt phòng gần đây</h2>
        </div>

        {isNewUser ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bed className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{booking.room}</p>
                    <p className="text-xs text-gray-400">Mã: {booking.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.checkIn).toLocaleDateString('vi-VN')} —{' '}
                      {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {booking.totalAmount.toLocaleString('vi-VN')} đ
                  </p>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs mt-1 font-medium ${
                      booking.status === 'Hoàn thành'
                        ? 'bg-green-100 text-green-700'
                        : booking.status === 'Đã đặt'
                        ? 'bg-orange-100 text-orange-700'
                        : booking.status === 'Đã nhận phòng'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
