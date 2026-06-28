import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wifi, Tv, Wind, Wine, Bath, Waves, LogIn, UserPlus, Hotel, X, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

export const PENDING_BOOKING_KEY = 'pendingBookingRoom';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface RoomInfo {
  id: string;
  name: string;
  type: string; 
  price: number;
  image: string;
  amenities: string[];
  capacity: number;
  description: string;
}

export interface PendingBookingData {
  roomId: string;
  roomName: string;
  roomType: string;
  price: number;
}

// Hàm hỗ trợ render icon tiện ích
function AmenityIcon({ name }: { name: string }) {
  if (name === 'Wifi')      return <Wifi  className="w-3.5 h-3.5" />;
  if (name === 'TV')        return <Tv    className="w-3.5 h-3.5" />;
  if (name === 'Điều hòa')  return <Wind  className="w-3.5 h-3.5" />;
  if (name === 'Minibar')   return <Wine  className="w-3.5 h-3.5" />;
  if (name === 'Bồn tắm')   return <Bath  className="w-3.5 h-3.5" />;
  if (name === 'View biển') return <Waves className="w-3.5 h-3.5" />;
  return null;
}

// Hàm lấy màu ngẫu nhiên theo tên hạng phòng
const getTypeColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('suite') || t.includes('vip')) return 'bg-orange-100 text-orange-700';
  if (t.includes('deluxe') || t.includes('cao cấp')) return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-blue-700';
};

// ── Modal chi tiết hạng phòng ──────────────────────────────────────────────────────
const GALLERY_LABELS = ['Phòng ngủ', 'Phòng tắm', 'Không gian nghỉ', 'Tiện nghi'];

function RoomDetailModal({ room, onClose, onBook }: { room: RoomInfo; onClose: () => void; onBook: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  
  // Tự sinh thêm vài tấm ảnh giả lập cho đẹp nếu DB không có
  const gallery = [
    room.image,
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Gallery ảnh */}
        <div className="relative flex-shrink-0">
          <img src={gallery[imgIdx]} alt={GALLERY_LABELS[imgIdx]} className="w-full object-cover" style={{ height: '240px' }} />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70">
            <X className="w-4 h-4" />
          </button>
          <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/50 text-white text-xs rounded-lg">{GALLERY_LABELS[imgIdx] || ''}</span>
          <div className="absolute bottom-3 right-3 flex gap-1">
            {gallery.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </div>
        
        {/* Thumbnails */}
        <div className="flex gap-2 px-4 py-2 bg-gray-50 flex-shrink-0">
          {gallery.map((src, i) => (
            <button key={i} onClick={() => setImgIdx(i)}
              className={`flex-1 rounded-lg overflow-hidden border-2 transition-colors ${i === imgIdx ? 'border-blue-500' : 'border-transparent'}`}>
              <img src={src} alt={GALLERY_LABELS[i]} className="w-full h-14 object-cover" />
            </button>
          ))}
        </div>

        {/* Nội dung */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{room.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{room.description}</p>
            </div>
            <span className={`ml-3 flex-shrink-0 px-3 py-1 text-xs rounded-full font-semibold ${getTypeColor(room.type)}`}>
              {room.type}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Users className="w-4 h-4" />
            <span>Sức chứa tối đa: {room.capacity} người</span>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tiện nghi</p>
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg">
                  <AmenityIcon name={a} />{a}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Giá tham khảo / đêm</p>
              <p className="text-2xl font-bold text-blue-600">{room.price.toLocaleString('vi-VN')} đ</p>
            </div>
            <button
              onClick={onBook}
              className="px-6 py-2.5 rounded-xl font-medium text-sm transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              Đặt phòng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────
interface RoomCardProps {
  room: RoomInfo;
  onBookClick: (room: RoomInfo) => void;
  onDetailClick: (room: RoomInfo) => void;
}

function RoomCard({ room, onBookClick, onDetailClick }: RoomCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative w-full" style={{ paddingTop: '66.67%' }}>
        <img src={room.image} alt={room.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <button
          onClick={() => onDetailClick(room)}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 text-white text-xs rounded-lg hover:bg-black/70 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Xem chi tiết
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-800">{room.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{room.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 my-3">
          <Users className="w-4 h-4" />
          <span>Tối đa {room.capacity} người</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {room.amenities.map((amenity) => (
            <span key={amenity} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
              <AmenityIcon name={amenity} />{amenity}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
          <div>
            <p className="text-xs text-gray-400">Giá tham khảo / đêm</p>
            <p className="text-xl font-bold text-blue-600">{room.price.toLocaleString('vi-VN')} đ</p>
          </div>
          <button
            onClick={() => onBookClick(room)}
            className="px-4 py-2 rounded-xl font-medium text-sm transition-colors bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
          >
            Đặt ngay
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ExploreRooms() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailRoom, setDetailRoom]     = useState<RoomInfo | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Gọi API lấy data hạng phòng thật từ DB
  useEffect(() => {
    fetch(`${API_BASE}/api/room-types`)
      .then(res => res.json())
      .then((data: any[]) => {
        // Map dữ liệu từ bảng Room_Types sang format giao diện
        const mappedTypes: RoomInfo[] = data.map(rt => {
          
          // Lấy tiện nghi từ DB, nếu không có thì set giá trị mặc định cho đỡ trống
          const amenitiesList = rt.amenities 
            ? rt.amenities.split(',').map((a: string) => a.trim()).filter(Boolean)
            : ['Wifi', 'TV', 'Điều hòa'];

          // Lấy ảnh từ DB, nếu không có thì gán đại một tấm hình phòng ngủ nào đó
          const fallbackImage = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80';

          return {
            id: String(rt.room_type_id),
            name: rt.type_name, 
            type: rt.type_name,
            price: rt.base_price,
            image: rt.image || fallbackImage,
            amenities: amenitiesList,         
            capacity: rt.max_occupancy,
            description: rt.description || 'Không gian nghỉ ngơi ấm cúng và đầy đủ tiện nghi, mang lại cho bạn cảm giác thoải mái nhất.',
          };
        });
        setRooms(mappedTypes);
      })
      .catch(() => toast.error('Lỗi khi tải danh sách hạng phòng'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleBookClick = (room: RoomInfo) => {
    setDetailRoom(null);

    if (isAuthenticated) {
      // Chuyển hướng sang trang đặt phòng và truyền ID hạng phòng
      navigate(`/customer-rooms?openRoom=${room.id}`);
      return;
    }

    const pendingData: PendingBookingData = {
      roomId:   room.id,
      roomName: room.name,
      roomType: room.type,
      price:    room.price,
    };
    sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(pendingData));

    toast.info('Vui lòng đăng nhập để hoàn tất đặt phòng', {
      description: `Hạng phòng "${room.name}" đã được lưu lại. Đăng nhập để tiếp tục.`,
      duration: 4000,
    });

    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-10 py-12">
          <div className="flex items-center gap-3 mb-3">
            <Hotel className="w-8 h-8 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wider">
              Hotel Management System
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Khám phá các hạng phòng</h1>
          <p className="text-blue-200 text-lg max-w-xl">
            Tham khảo hình ảnh, tiện ích và bảng giá của các hạng phòng. Đăng nhập để tiến hành đặt phòng.
          </p>
        </div>

        <div className="px-10 py-8">
          {!isAuthenticated && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
              <LogIn className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium text-sm">Bạn đang xem với tư cách khách</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Nhấn "Xem chi tiết" để xem thông tin phòng, "Đặt ngay" để đặt phòng.
                </p>
              </div>
              <div className="flex gap-2 ml-auto flex-shrink-0">
                <button onClick={() => navigate('/login')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5" /> Đăng nhập
                </button>
                <button onClick={() => navigate('/register')} className="px-3 py-1.5 border border-amber-600 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> Đăng ký
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p>Đang tải danh sách hạng phòng...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Hotel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Chưa có hạng phòng nào được cấu hình.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onBookClick={handleBookClick}
                  onDetailClick={setDetailRoom}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {detailRoom && (
        <RoomDetailModal
          room={detailRoom}
          onClose={() => setDetailRoom(null)}
          onBook={() => handleBookClick(detailRoom)}
        />
      )}
    </div>
  );
}