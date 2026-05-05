import { Calendar, MapPin, CreditCard } from 'lucide-react';
import { useBookings } from '../../context/BookingContext';

export function CustomerBookings() {
  const { bookings } = useBookings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã đặt':        return 'bg-orange-100 text-orange-700';
      case 'Đã nhận phòng': return 'bg-blue-100 text-blue-700';
      case 'Hoàn thành':    return 'bg-green-100 text-green-700';
      case 'Đã hủy':        return 'bg-red-100 text-red-700';
      default:              return 'bg-gray-100 text-gray-700';
    }
  };

  const totalSpent    = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const upcoming      = bookings.filter((b) => b.status === 'Đã đặt').length;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Lịch sử đặt phòng</h1>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-24 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Bạn chưa có lịch sử đặt phòng nào.</p>
          <p className="text-gray-400 text-sm mt-1">Đặt phòng đầu tiên để bắt đầu!</p>
        </div>
      ) : (
        <>
          {/* Bookings List */}
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-800">
                        Mã đặt phòng: {booking.id}
                      </h3>
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full font-medium ${getStatusColor(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Ngày đặt:{' '}
                      {new Date(booking.bookingDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Tổng tiền</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {booking.totalAmount.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Phòng</span>
                    </div>
                    <p className="font-semibold text-gray-800">{booking.room}</p>
                    <p className="text-sm text-gray-500">{booking.roomType}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Nhận phòng</span>
                    </div>
                    <p className="font-semibold text-gray-800">
                      {new Date(booking.checkIn).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Trả phòng</span>
                    </div>
                    <p className="font-semibold text-gray-800">
                      {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs">Đặt cọc</span>
                    </div>
                    <p className="font-semibold text-green-600">
                      {booking.deposit.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span>{booking.nights} đêm</span>
                    <span>{booking.guests} khách</span>
                  </div>
                  <button className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm">
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Tổng đặt phòng</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{bookings.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Đặt phòng sắp tới</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{upcoming}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Tổng chi tiêu</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {totalSpent.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
