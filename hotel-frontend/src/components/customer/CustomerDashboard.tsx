import { useAuth } from '../../context/AuthContext';
import { Calendar, CreditCard, User, Bed, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { label: 'Tổng đặt phòng', value: '12', icon: Calendar, color: 'blue' },
    { label: 'Đang lưu trú', value: '0', icon: Bed, color: 'green' },
    { label: 'Tổng chi tiêu', value: '45.600.000 đ', icon: CreditCard, color: 'purple' },
  ];

  // Màu sắc động trong Tailwind cần khai báo rõ class để không bị lỗi khi build
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const recentBookings = [
    { id: 'BK001', room: 'P301', checkIn: '2026-04-15', checkOut: '2026-04-18', status: 'Hoàn thành', total: 2400000 },
    { id: 'BK002', room: 'P205', checkIn: '2026-03-20', checkOut: '2026-03-22', status: 'Hoàn thành', total: 1000000 },
    { id: 'BK003', room: 'P501', checkIn: '2026-02-10', checkOut: '2026-02-14', status: 'Hoàn thành', total: 6000000 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-blue-400 p-8 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">Chào mừng trở lại, {user?.fullName}!</h1>
          <p className="opacity-90 mt-1">Bạn có một kỳ nghỉ tuyệt vời sắp tới chứ?</p>
        </div>
        <button 
          onClick={() => navigate('/customer/rooms')}
          className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-sm"
        >
          Đặt phòng ngay
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorMap[stat.color]}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Đặt phòng gần đây</h2>
            <button 
              onClick={() => navigate('/customer/bookings')}
              className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="group flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-white rounded-lg flex items-center justify-center transition-colors">
                    <Bed className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Phòng {booking.room}</p>
                    <p className="text-xs text-gray-400 font-medium">Mã: {booking.id}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(booking.checkIn).toLocaleDateString('vi-VN')} - {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{booking.total.toLocaleString('vi-VN')} đ</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded-full mt-2">
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Info / Membership Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Hạng thành viên</h2>
          <div className="bg-gray-900 text-white p-6 rounded-xl relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <Star className="w-10 h-10 text-yellow-400 mb-4" />
              <p className="text-sm opacity-70 uppercase tracking-widest">Hạng Vàng</p>
              <p className="text-2xl font-bold mt-1">{user?.fullName}</p>
              <div className="mt-8 flex justify-between items-end">
                <div>
                  <p className="text-[10px] opacity-50 uppercase">Ngày gia nhập</p>
                  <p className="text-xs font-mono">01/2026</p>
                </div>
                <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm" />
              </div>
            </div>
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl" />
          </div>
          
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Bạn chỉ cần thêm **3.400.000 đ** chi tiêu nữa để thăng hạng **Bạch Kim** và nhận thêm ưu đãi 10% dịch vụ.
            </p>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-yellow-400 h-full w-[70%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}