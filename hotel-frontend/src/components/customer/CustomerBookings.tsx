import { Calendar, MapPin, CreditCard, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Kết nối với hệ thống phân quyền của Phát

interface Booking {
  id: string;
  bookingDate: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  deposit: number;
  status: 'Đã đặt' | 'Đã nhận phòng' | 'Hoàn thành' | 'Đã hủy';
}

// Dữ liệu mẫu (Sau này Phát sẽ thay bằng lệnh fetch từ Backend)
const mockBookings: Booking[] = [
  {
    id: 'BK001',
    bookingDate: '2026-04-10',
    room: 'P301',
    roomType: 'Deluxe',
    checkIn: '2026-04-15',
    checkOut: '2026-04-18',
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    deposit: 500000,
    status: 'Hoàn thành',
  },
  {
    id: 'BK003',
    bookingDate: '2026-05-02',
    room: 'P501',
    roomType: 'Suite',
    checkIn: '2026-05-10',
    checkOut: '2026-05-14',
    nights: 4,
    guests: 4,
    totalAmount: 6000000,
    deposit: 1000000,
    status: 'Đã đặt',
  },
];

export function CustomerBookings() {
  const { user } = useAuth(); // Lấy thông tin khách hàng đang đăng nhập

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'Đã đặt': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Đã nhận phòng': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Hoàn thành': return 'bg-green-100 text-green-700 border-green-200';
      case 'Đã hủy': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lịch sử đặt phòng</h1>
        <p className="text-gray-500 mt-2">Chào {user?.fullName}, đây là danh sách các kỳ nghỉ của bạn.</p>
      </div>

      {/* Danh sách đặt phòng */}
      <div className="grid gap-6">
        {mockBookings.length > 0 ? (
          mockBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-blue-200 transition-all"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400">#{booking.id}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">Phòng {booking.room} — {booking.roomType}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Tổng thanh toán</p>
                    <p className="text-2xl font-black text-gray-900">
                      {booking.totalAmount.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-y border-gray-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Thời gian lưu trú</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {new Date(booking.checkIn).toLocaleDateString('vi-VN')} — {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Tiền đặt cọc</p>
                      <p className="text-sm font-semibold text-green-600">
                        {booking.deposit.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Chi tiết</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {booking.nights} đêm, {booking.guests} khách
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {booking.status === 'Đã đặt' && (
                    <button className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Yêu cầu hủy
                    </button>
                  )}
                  <button className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">
                    Xem hóa đơn
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400">Bạn chưa có lịch sử đặt phòng nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}