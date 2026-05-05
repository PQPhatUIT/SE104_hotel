import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, X, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useBookings, Booking } from '../../context/BookingContext';

interface Room {
  id: string;
  name: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  price: number;
  available: boolean;
  image: string;
  amenities: string[];
  capacity: number;
}

const rooms: Room[] = [
  {
    id: 'R001',
    name: 'Standard Room',
    type: 'Standard',
    price: 500000,
    available: true,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa'],
    capacity: 2,
  },
  {
    id: 'R002',
    name: 'Deluxe Room',
    type: 'Deluxe',
    price: 800000,
    available: true,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar'],
    capacity: 3,
  },
  {
    id: 'R003',
    name: 'Suite Room',
    type: 'Suite',
    price: 1500000,
    available: false,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Bồn tắm'],
    capacity: 4,
  },
  {
    id: 'R004',
    name: 'Standard Double',
    type: 'Standard',
    price: 550000,
    available: true,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa'],
    capacity: 2,
  },
  {
    id: 'R005',
    name: 'Deluxe Twin',
    type: 'Deluxe',
    price: 850000,
    available: true,
    image: 'https://images.unsplash.com/photo-1560185127-6a684fbacb42?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Phòng tắm riêng'],
    capacity: 3,
  },
  {
    id: 'R006',
    name: 'Presidential Suite',
    type: 'Suite',
    price: 2000000,
    available: true,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Bồn tắm', 'View biển'],
    capacity: 6,
  },
];

// ── Booking Modal ─────────────────────────────────────────────────────────────
interface BookingModalProps {
  room: Room;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string) => void;
  fullName: string;
  phone: string;
}

function BookingModal({ room, onClose, onConfirm, fullName, phone }: BookingModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState('');

  const calcNights = () => {
    if (!checkIn || !checkOut) return 1;
    const diff = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    return Math.max(1, diff);
  };

  const nights = calcNights();
  const total = nights * room.price;

  const handleConfirm = () => {
    if (!checkIn || !checkOut) {
      alert('Vui lòng chọn ngày nhận phòng và trả phòng.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      alert('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    onConfirm(checkIn, checkOut);
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal box */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
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

        {/* Modal body */}
        <div className="px-6 py-5 space-y-5">
          {/* Room info */}
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

          {/* Date pickers */}
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

          {/* Guest info (auto-filled) */}
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

          {/* Total */}
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

        {/* Modal footer */}
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

// ── Main Component ─────────────────────────────────────────────────────────────
export function CustomerRooms() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const { user } = useAuth();
  const { addBooking } = useBookings();
  const navigate = useNavigate();

  const filteredRooms = rooms.filter(
    (room) => selectedType === 'all' || room.type === selectedType
  );

  const handleBookClick = (room: Room) => {
    if (!room.available) return;
    setSelectedRoom(room);
  };

  const handleConfirm = (checkIn: string, checkOut: string) => {
    if (!selectedRoom) return;

    const nights = Math.max(
      1,
      Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
      )
    );

    const newBooking: Booking = {
      id: `BK${Date.now()}`,
      bookingDate: new Date().toISOString().split('T')[0],
      room: selectedRoom.name,
      roomType: selectedRoom.type,
      checkIn,
      checkOut,
      nights,
      guests: 1,
      totalAmount: nights * selectedRoom.price,
      deposit: Math.round((nights * selectedRoom.price) * 0.2),
      status: 'Đã đặt',
    };

    addBooking(newBooking);
    setSelectedRoom(null);
    toast.success('Đặt phòng thành công! Chúc bạn có chuyến đi vui vẻ 🎉');
    navigate('/customer-bookings');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Đặt phòng</h1>

      {/* Filter */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Loại phòng:</span>
          <div className="flex gap-2">
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

      {/* Room Cards */}
      <div className="grid grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-48 object-cover"
              />
              <span
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
                  room.available
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {room.available ? 'Còn trống' : 'Đã đặt'}
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.type}</p>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                    room.type === 'Standard'
                      ? 'bg-blue-100 text-blue-700'
                      : room.type === 'Deluxe'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
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
                    className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded"
                  >
                    {amenity}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
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
