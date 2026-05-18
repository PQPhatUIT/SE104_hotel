import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wifi, Tv, Wind, Wine, Bath, Waves, LogIn, UserPlus, Hotel } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

// ── Hằng số sessionStorage key ───────────────────────────────────────────────

/** Key lưu vết phòng mà khách vãng lai đang muốn đặt */
export const PENDING_BOOKING_KEY = 'pendingBookingRoom';

// ── Kiểu dữ liệu ─────────────────────────────────────────────────────────────

export interface RoomInfo {
  id: string;
  name: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  price: number;
  available: boolean;
  image: string;
  amenities: string[];
  capacity: number;
  /** Mô tả ngắn hiển thị trên card */
  description: string;
}

/** Dữ liệu lưu vào sessionStorage khi khách vãng lai chọn đặt phòng */
export interface PendingBookingData {
  roomId: string;
  roomName: string;
  roomType: 'Standard' | 'Deluxe' | 'Suite';
  price: number;
}

// ── Dữ liệu phòng (mock, đồng bộ với CustomerRooms) ─────────────────────────

export const ROOM_LIST: RoomInfo[] = [
  {
    id: 'R001',
    name: 'Standard Room',
    type: 'Standard',
    price: 500000,
    available: true,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa'],
    capacity: 2,
    description: 'Phòng tiêu chuẩn ấm cúng, đầy đủ tiện nghi cơ bản, thích hợp cho cặp đôi hoặc du khách đơn.',
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
    description: 'Không gian rộng rãi hơn với nội thất cao cấp, minibar riêng và tầm nhìn ra thành phố.',
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
    description: 'Suite sang trọng với phòng khách riêng, bồn tắm đứng và dịch vụ butler 24/7.',
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
    description: 'Phòng đôi tiêu chuẩn với 2 giường đơn, lý tưởng cho bạn bè hoặc đồng nghiệp.',
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
    description: 'Phòng deluxe đôi với phòng tắm riêng biệt, hoàn hảo cho gia đình nhỏ.',
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
    description: 'Đỉnh cao của sự xa xỉ — suite tổng thống với ban công view biển toàn cảnh.',
  },
];

// ── Icon cho tiện ích ─────────────────────────────────────────────────────────

function AmenityIcon({ name }: { name: string }) {
  if (name === 'Wifi')                return <Wifi  className="w-3.5 h-3.5" />;
  if (name === 'TV')                  return <Tv    className="w-3.5 h-3.5" />;
  if (name === 'Điều hòa')            return <Wind  className="w-3.5 h-3.5" />;
  if (name === 'Minibar')             return <Wine  className="w-3.5 h-3.5" />;
  if (name === 'Bồn tắm')             return <Bath  className="w-3.5 h-3.5" />;
  if (name === 'View biển')           return <Waves className="w-3.5 h-3.5" />;
  return null;
}

// ── Room Card ─────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: RoomInfo;
  onBookClick: (room: RoomInfo) => void;
}

function RoomCard({ room, onBookClick }: RoomCardProps) {
  const typeColorMap: Record<RoomInfo['type'], string> = {
    Standard: 'bg-blue-100 text-blue-700',
    Deluxe:   'bg-purple-100 text-purple-700',
    Suite:    'bg-orange-100 text-orange-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Ảnh phòng */}
      <div className="relative">
        <img
          src={room.image}
          alt={room.name}
          className="w-full h-48 object-cover"
        />
        {/* Badge trạng thái */}
        <span
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${
            room.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {room.available ? 'Còn trống' : 'Đã đặt'}
        </span>
      </div>

      {/* Nội dung card */}
      <div className="p-5 flex flex-col flex-1">
        {/* Tên & loại phòng */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-800">{room.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{room.description}</p>
          </div>
          <span className={`ml-3 flex-shrink-0 px-2.5 py-1 text-xs rounded-full font-medium ${typeColorMap[room.type]}`}>
            {room.type}
          </span>
        </div>

        {/* Sức chứa */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 my-3">
          <Users className="w-4 h-4" />
          <span>Tối đa {room.capacity} người</span>
        </div>

        {/* Tiện ích */}
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

        {/* Giá + nút đặt phòng — đẩy xuống cuối card */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
          <div>
            <p className="text-xs text-gray-400">Giá mỗi đêm</p>
            <p className="text-xl font-bold text-blue-600">
              {room.price.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <button
            onClick={() => onBookClick(room)}
            disabled={!room.available}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              room.available
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {room.available ? 'Đặt phòng ngay' : 'Hết phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Trang xem phòng công khai — không yêu cầu đăng nhập.
 *
 * Khi khách vãng lai nhấn "Đặt phòng ngay":
 *  1. Lưu thông tin phòng vào sessionStorage (PENDING_BOOKING_KEY).
 *  2. Hiện toast hướng dẫn đăng nhập.
 *  3. Chuyển hướng về /login.
 */
export function ExploreRooms() {
  const [selectedType, setSelectedType] = useState<'all' | 'Standard' | 'Deluxe' | 'Suite'>('all');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const filteredRooms = ROOM_LIST.filter(
    (room) => selectedType === 'all' || room.type === selectedType
  );

  /**
   * Xử lý khi khách nhấn "Đặt phòng ngay".
   * - Nếu đã đăng nhập: chuyển thẳng sang /customer-rooms để mở modal đặt phòng.
   * - Nếu chưa đăng nhập: lưu vết vào sessionStorage rồi redirect về /login.
   */
  const handleBookClick = (room: RoomInfo) => {
    if (!room.available) return;

    if (isAuthenticated) {
      // Đã login → chuyển sang trang đặt phòng của khách hàng, mang theo roomId
      navigate(`/customer-rooms?openRoom=${room.id}`);
      return;
    }

    // Chưa login → lưu vết phòng vào sessionStorage
    const pendingData: PendingBookingData = {
      roomId:   room.id,
      roomName: room.name,
      roomType: room.type,
      price:    room.price,
    };
    sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(pendingData));

    toast.info('Vui lòng đăng nhập để hoàn tất đặt phòng', {
      description: `Phòng "${room.name}" đã được lưu lại. Đăng nhập để tiếp tục.`,
      duration: 4000,
    });

    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/*
        Sidebar khách vãng lai:
        Component Sidebar đã tự kiểm tra isAuthenticated và render
        phiên bản rút gọn (chỉ "Xem phòng" + nút Đăng nhập/Đăng ký).
      */}
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Hero banner */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-10 py-12">
          <div className="flex items-center gap-3 mb-3">
            <Hotel className="w-8 h-8 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wider">
              Hotel Management System
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Khám phá phòng của chúng tôi</h1>
          <p className="text-blue-200 text-lg max-w-xl">
            Tham khảo hình ảnh, tiện ích và bảng giá. Đăng nhập để đặt phòng ngay hôm nay.
          </p>
        </div>

        <div className="px-10 py-8">
          {/* Bộ lọc loại phòng */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium text-gray-700">Lọc theo loại phòng:</span>
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

          {/* Lưu ý cho khách vãng lai */}
          {!isAuthenticated && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
              <LogIn className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium text-sm">
                  Bạn đang xem với tư cách khách
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Nhấn "Đặt phòng ngay" để được hướng dẫn đăng nhập và hoàn tất đặt phòng nhanh chóng.
                </p>
              </div>
              <div className="flex gap-2 ml-auto flex-shrink-0">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-3 py-1.5 border border-amber-600 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng ký
                </button>
              </div>
            </div>
          )}

          {/* Danh sách phòng */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onBookClick={handleBookClick}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}