import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, X, CalendarCheck, Wifi, Tv, Wind, Wine, Bath, Waves } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useBookings, Booking } from '../../context/BookingContext';
import { PENDING_BOOKING_KEY, PendingBookingData, ROOM_LIST, RoomInfo } from '../ExploreRooms';

// ── Icon tiện ích ─────────────────────────────────────────────────────────────

function AmenityIcon({ name }: { name: string }) {
  if (name === 'Wifi')      return <Wifi  className="w-3.5 h-3.5" />;
  if (name === 'TV')        return <Tv    className="w-3.5 h-3.5" />;
  if (name === 'Điều hòa')  return <Wind  className="w-3.5 h-3.5" />;
  if (name === 'Minibar')   return <Wine  className="w-3.5 h-3.5" />;
  if (name === 'Bồn tắm')   return <Bath  className="w-3.5 h-3.5" />;
  if (name === 'View biển') return <Waves className="w-3.5 h-3.5" />;
  return null;
}

// ── Booking Modal ─────────────────────────────────────────────────────────────

interface BookingModalProps {
  room: RoomInfo;
  fullName: string;
  phone: string;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string) => void;
}

function BookingModal({ room, onClose, onConfirm, fullName, phone }: BookingModalProps) {
  const today     = new Date().toISOString().split('T')[0];
  const [checkIn,  setCheckIn]  = useState<string>(today);
  const [checkOut, setCheckOut] = useState<string>('');

  /** Tính số đêm từ checkIn → checkOut */
  const calcNights = (): number => {
    if (!checkIn || !checkOut) return 1;
    const diff = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    return Math.max(1, diff);
  };

  const nights = calcNights();
  const total  = nights * room.price;

  const handleConfirm = () => {
    if (!checkIn || !checkOut) {
      toast.error('Vui lòng chọn ngày nhận phòng và trả phòng.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    onConfirm(checkIn, checkOut);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Chi tiết đặt phòng</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Thông tin phòng */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
            <img
              src={room.image}
              alt={room.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
            <div>
              <p className="font-bold text-gray-800">{room.name}</p>
              <p className="text-sm text-gray-500">{room.type}</p>
              <p className="text-blue-600 font-semibold mt-0.5">
                {room.price.toLocaleString('vi-VN')} đ
                <span className="text-gray-400 font-normal text-xs"> / đêm</span>
              </p>
            </div>
          </div>

          {/* Chọn ngày */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Ngày nhận phòng
              </label>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Ngày trả phòng
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Thông tin khách hàng (auto-fill từ tài khoản) */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Thông tin khách hàng
            </p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Họ và tên</label>
              <input
                type="text"
                readOnly
                value={fullName}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Số điện thoại</label>
              <input
                type="text"
                readOnly
                value={phone}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* Tổng tiền */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Tổng tiền dự kiến</p>
              <p className="text-xs text-gray-400">
                {nights} đêm × {room.price.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {total.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Xác nhận đặt phòng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Trang đặt phòng dành cho khách hàng đã đăng nhập.
 *
 * Luồng "lưu vết" từ ExploreRooms:
 *  - Khi được redirect về đây sau khi login, URL có thể mang query ?openRoom=<id>
 *    (trường hợp đã login rồi mới nhấn từ ExploreRooms).
 *  - Hoặc sessionStorage có PENDING_BOOKING_KEY (trường hợp vừa login/register xong).
 *  - useEffect đọc cả hai, ưu tiên sessionStorage, rồi tự động mở modal.
 */
export function CustomerRooms() {
  const [searchParams]                    = useSearchParams();
  const [selectedType, setSelectedType]   = useState<'all' | 'Standard' | 'Deluxe' | 'Suite'>('all');
  const [selectedRoom, setSelectedRoom]   = useState<RoomInfo | null>(null);

  const { user }        = useAuth();
  const { addBooking }  = useBookings();
  const navigate        = useNavigate();

  /**
   * Kiểm tra lưu vết phòng khi component mount.
   * Ưu tiên: sessionStorage (do luồng login) → query param ?openRoom (đã login rồi)
   */
  useEffect(() => {
    // 1. Kiểm tra sessionStorage trước (từ luồng vừa login/register)
    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (raw) {
      try {
        const pending: PendingBookingData = JSON.parse(raw);
        const room = ROOM_LIST.find((r) => r.id === pending.roomId);
        if (room && room.available) {
          // Xóa dữ liệu tạm ngay sau khi đọc, tránh mở lại lần sau
          sessionStorage.removeItem(PENDING_BOOKING_KEY);
          setSelectedRoom(room);
          toast.success(`Tiếp tục đặt phòng "${room.name}"`, {
            description: 'Thông tin tài khoản đã được điền sẵn.',
          });
        } else {
          // Phòng không còn trống hoặc không tìm thấy
          sessionStorage.removeItem(PENDING_BOOKING_KEY);
          if (room && !room.available) {
            toast.warning('Rất tiếc, phòng bạn chọn trước đó hiện đã hết trống.');
          }
        }
      } catch {
        // JSON không hợp lệ → bỏ qua
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
      }
      return; // Đã xử lý sessionStorage, không cần kiểm tra query param nữa
    }

    // 2. Kiểm tra query param ?openRoom=<id> (đã login rồi bấm từ ExploreRooms)
    const openRoomId = searchParams.get('openRoom');
    if (openRoomId) {
      const room = ROOM_LIST.find((r) => r.id === openRoomId);
      if (room && room.available) {
        setSelectedRoom(room);
      }
    }
  }, [searchParams]);

  const filteredRooms = ROOM_LIST.filter(
    (room) => selectedType === 'all' || room.type === selectedType
  );

  /** Xử lý khi khách đã login nhấn "Đặt phòng" trực tiếp trên trang này */
  const handleBookClick = (room: RoomInfo) => {
    if (!room.available) return;
    setSelectedRoom(room);
  };

  /** Xử lý xác nhận đặt phòng từ modal */
  const handleConfirm = (checkIn: string, checkOut: string) => {
    if (!selectedRoom) return;

    const nights = Math.max(
      1,
      Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
      )
    );

    const newBooking: Booking = {
      id:           `BK${Date.now()}`,
      bookingDate:  new Date().toISOString().split('T')[0],
      room:         selectedRoom.name,
      roomType:     selectedRoom.type,
      checkIn,
      checkOut,
      nights,
      guests:       1,
      totalAmount:  nights * selectedRoom.price,
      deposit:      Math.round(nights * selectedRoom.price * 0.2),
      status:       'Đã đặt',
    };

    addBooking(newBooking);
    setSelectedRoom(null);
    toast.success('Đặt phòng thành công! Chúc bạn có chuyến đi vui vẻ 🎉');
    navigate('/customer-bookings');
  };

  const typeColorMap: Record<RoomInfo['type'], string> = {
    Standard: 'bg-blue-100 text-blue-700',
    Deluxe:   'bg-purple-100 text-purple-700',
    Suite:    'bg-orange-100 text-orange-700',
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Đặt phòng</h1>

      {/* Bộ lọc loại phòng */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-gray-700">Loại phòng:</span>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'Standard', 'Deluxe', 'Suite'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Danh sách Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
          >
            {/* Ảnh */}
            <div className="relative">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-48 object-cover"
              />
              <span
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
                  room.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}
              >
                {room.available ? 'Còn trống' : 'Đã đặt'}
              </span>
            </div>

            {/* Nội dung */}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.type}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${typeColorMap[room.type]}`}>
                  {room.type}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Users className="w-4 h-4" />
                <span>Tối đa {room.capacity} người</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {room.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded"
                  >
                    <AmenityIcon name={amenity} />
                    {amenity}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <div>
                  <p className="text-xs text-gray-400">Giá mỗi đêm</p>
                  <p className="text-xl font-bold text-blue-600">
                    {room.price.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <button
                  onClick={() => handleBookClick(room)}
                  disabled={!room.available}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                    room.available
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {room.available ? 'Đặt phòng' : 'Hết phòng'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          fullName={user?.fullName ?? ''}
          phone={user?.phone ?? ''}
          onClose={() => setSelectedRoom(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}