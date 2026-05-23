// src/app/components/customer/CustomerBookings.tsx
// SỬA LỖI:
//   1. Dùng useBookings() thay vì truy cập mock array trực tiếp
//   2. Optional chaining (?.) trên toàn bộ thuộc tính booking để tránh crash khi undefined
//   3. Thêm loading skeleton và empty state

import { useBookings } from '../../context/BookingContext';

const STATUS_STYLE: Record<string, string> = {
  'Đã đặt':       'bg-blue-100 text-blue-800',
  'Đã nhận phòng':'bg-green-100 text-green-800',
  'Hoàn thành':   'bg-gray-100 text-gray-700',
  'Đã hủy':       'bg-red-100 text-red-700',
};

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

export default function CustomerBookings() {
  const { bookings, isLoading } = useBookings();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg font-medium">Chưa có đặt phòng nào</p>
        <p className="text-sm mt-1">Các lần đặt phòng của bạn sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Lịch sử đặt phòng</h2>

      <div className="space-y-4">
        {bookings.map((booking) => {
          // Optional chaining toàn bộ — layout không vỡ dù booking thiếu trường
          const statusStyle = STATUS_STYLE[booking?.status ?? ''] ?? 'bg-gray-100 text-gray-600';

          return (
            <div
              key={booking?.id ?? Math.random()}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              {/* Header: mã phòng + trạng thái */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-gray-400">Phòng</span>
                  <h3 className="text-lg font-bold text-gray-800">
                    {booking?.room || '—'}
                    {booking?.roomType && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({booking.roomType})
                      </span>
                    )}
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
                  {booking?.status ?? '—'}
                </span>
              </div>

              {/* Ngày & số đêm */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Nhận phòng</p>
                  <p className="font-medium text-gray-700">{formatDate(booking?.checkIn)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Trả phòng</p>
                  <p className="font-medium text-gray-700">{formatDate(booking?.checkOut)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">Số đêm</p>
                  <p className="font-medium text-gray-700">{booking?.nights ?? '—'} đêm</p>
                </div>
              </div>

              {/* Tài chính */}
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  Đặt cọc:{' '}
                  <span className="font-medium text-gray-700">
                    {formatCurrency(booking?.deposit)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Tổng tiền</span>
                  <p className="text-base font-bold text-indigo-600">
                    {formatCurrency(booking?.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Ngày đặt */}
              {booking?.bookingDate && (
                <p className="text-xs text-gray-300 mt-2">
                  Đặt ngày {formatDate(booking.bookingDate)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
