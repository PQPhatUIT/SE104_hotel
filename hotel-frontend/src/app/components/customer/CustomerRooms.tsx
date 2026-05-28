// customer/CustomerRooms.tsx
// FIX:
//   1. Fetch danh sách phòng từ GET /api/rooms/available (DB thật)
//   2. handleConfirm gọi POST /api/bookings (DB thật) thay vì chỉ add context local
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Wifi, Tv, Wind, Wine, Bath, Waves, X, Eye, Loader2, CalendarCheck, ChevronLeft, ChevronRight, BedDouble, Droplets, Dumbbell, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { PENDING_BOOKING_KEY, PendingBookingData } from '../ExploreRooms';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Types ────────────────────────────────────────────────────────────────────
interface RoomInfo {
  room_id:   number;
  room_number: string;
  type_name: string;         // 'Standard' | 'Deluxe' | 'Suite'
  base_price: number;
  max_occupancy: number;
  status:    string;
  description?: string;
  // UI helpers
  image?:    string;
  amenities?: string[];
}

// Ảnh mặc định theo hạng phòng
const TYPE_IMAGES: Record<string, string> = {
  Standard: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
  Deluxe:   'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
  Suite:    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
};

const TYPE_COLOR: Record<string, string> = {
  Standard: 'bg-blue-100 text-blue-700',
  Deluxe:   'bg-purple-100 text-purple-700',
  Suite:    'bg-orange-100 text-orange-700',
};


// ── Gallery ảnh theo hạng phòng (phòng ngủ, nhà vệ sinh, tiện nghi, không gian chung)
const GALLERY_IMAGES: Record<string, { url: string; label: string }[]> = {
  Standard: [
    { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=80', label: 'Phòng ngủ' },
    { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&q=80', label: 'Phòng tắm' },
    { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80', label: 'Không gian nghỉ' },
    { url: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=900&q=80', label: 'Tiện nghi' },
  ],
  Deluxe: [
    { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&q=80', label: 'Phòng ngủ' },
    { url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80', label: 'Phòng tắm' },
    { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&q=80', label: 'View thành phố' },
    { url: 'https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=900&q=80', label: 'Minibar & tiện nghi' },
  ],
  Suite: [
    { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80', label: 'Phòng ngủ' },
    { url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=900&q=80', label: 'Phòng tắm & bồn tắm' },
    { url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=900&q=80', label: 'Phòng khách riêng' },
    { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=900&q=80', label: 'Ban công & view' },
  ],
};

// Tiện nghi chi tiết theo hạng phòng
const ROOM_FACILITIES: Record<string, { icon: string; label: string }[]> = {
  Standard: [
    { icon: 'bed',     label: 'Giường đôi Queen' },
    { icon: 'wifi',    label: 'Wifi tốc độ cao' },
    { icon: 'tv',      label: 'TV 40 inch' },
    { icon: 'ac',      label: 'Điều hòa riêng' },
    { icon: 'shower',  label: 'Vòi sen nóng lạnh' },
    { icon: 'safe',    label: 'Két an toàn' },
  ],
  Deluxe: [
    { icon: 'bed',     label: 'Giường King Size' },
    { icon: 'wifi',    label: 'Wifi tốc độ cao' },
    { icon: 'tv',      label: 'Smart TV 50 inch' },
    { icon: 'ac',      label: 'Điều hòa riêng' },
    { icon: 'bath',    label: 'Bồn tắm + vòi sen' },
    { icon: 'minibar', label: 'Minibar miễn phí' },
    { icon: 'coffee',  label: 'Máy pha cà phê' },
    { icon: 'safe',    label: 'Két an toàn' },
  ],
  Suite: [
    { icon: 'bed',     label: 'Giường King Size' },
    { icon: 'wifi',    label: 'Wifi tốc độ cao' },
    { icon: 'tv',      label: 'Smart TV 65 inch' },
    { icon: 'ac',      label: 'Hệ thống điều hòa trung tâm' },
    { icon: 'bath',    label: 'Bồn tắm sục Jacuzzi' },
    { icon: 'minibar', label: 'Minibar cao cấp' },
    { icon: 'coffee',  label: 'Máy pha cà phê Nespresso' },
    { icon: 'lounge',  label: 'Phòng khách riêng biệt' },
    { icon: 'balcony', label: 'Ban công view thành phố' },
    { icon: 'butler',  label: 'Dịch vụ Butler 24/7' },
  ],
};

function FacilityIcon({ icon }: { icon: string }) {
  if (icon === 'bed')     return <BedDouble className="w-4 h-4" />;
  if (icon === 'shower' || icon === 'bath') return <Droplets className="w-4 h-4" />;
  if (icon === 'coffee')  return <Coffee className="w-4 h-4" />;
  if (icon === 'wifi')    return <Wifi className="w-4 h-4" />;
  if (icon === 'tv')      return <Tv className="w-4 h-4" />;
  if (icon === 'ac')      return <Wind className="w-4 h-4" />;
  if (icon === 'minibar') return <Wine className="w-4 h-4" />;
  return <Dumbbell className="w-4 h-4" />;
}

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
function BookingModal({
  room, fullName, phone, isSubmitting,
  onClose, onConfirm,
}: {
  room: RoomInfo;
  fullName: string;
  phone: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string, guests: number) => void;
}) {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [checkIn,  setCheckIn]  = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests,   setGuests]   = useState(1);

  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
  const total   = nights * room.base_price;
  const deposit = Math.round(total * 0.2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Đặt phòng {room.room_number} — {room.type_name}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Khách hàng */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Họ tên</label>
              <input type="text" value={fullName} readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Số điện thoại</label>
              <input type="text" value={phone} readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600" />
            </div>
          </div>

          {/* Ngày */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày nhận phòng *</label>
              <input type="date" value={checkIn} min={today}
                onChange={e => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(e.target.value); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày trả phòng *</label>
              <input type="date" value={checkOut} min={checkIn || today}
                onChange={e => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Số khách */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Số khách (tối đa {room.max_occupancy})
            </label>
            <input type="number" min={1} max={room.max_occupancy} value={guests}
              onChange={e => setGuests(Math.min(room.max_occupancy, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Tóm tắt chi phí */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{nights} đêm × {room.base_price.toLocaleString('vi-VN')} đ</span>
              <span className="font-medium">{total.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tiền đặt cọc (20%)</span>
              <span>{deposit.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between font-bold text-blue-700 border-t border-blue-200 pt-2">
              <span>Tổng cộng</span>
              <span>{total.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
            Huỷ
          </button>
          <button
            onClick={() => onConfirm(checkIn, checkOut, guests)}
            disabled={isSubmitting || !checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            {isSubmitting ? 'Đang đặt...' : 'Xác nhận đặt phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Room Detail Modal ─────────────────────────────────────────────────────────
function RoomDetailModal({ room, onClose, onBook }: { room: RoomInfo; onClose: () => void; onBook: () => void }) {
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<'gallery' | 'facilities' | 'description'>('gallery');

  const gallery    = GALLERY_IMAGES[room.type_name]    || GALLERY_IMAGES.Standard;
  const facilities = ROOM_FACILITIES[room.type_name]   || ROOM_FACILITIES.Standard;

  const prevImg = useCallback(() => setActiveImg(i => (i - 1 + gallery.length) % gallery.length), [gallery.length]);
  const nextImg = useCallback(() => setActiveImg(i => (i + 1) % gallery.length), [gallery.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Phòng {room.room_number}</h2>
            <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs rounded-full font-medium ${TYPE_COLOR[room.type_name] || 'bg-gray-100 text-gray-600'}`}>
              {room.type_name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${room.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {room.status === 'available' ? '● Còn trống' : '● Không trống'}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ── Gallery ảnh chính ── */}
          <div className="relative bg-black" style={{ height: '300px' }}>
            <img
              src={gallery[activeImg].url}
              alt={gallery[activeImg].label}
              className="w-full h-full object-cover opacity-90"
            />
            {/* Label ảnh */}
            <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              {gallery[activeImg].label}
            </div>
            {/* Nút prev/next */}
            <button onClick={prevImg}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextImg}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {gallery.map((_, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activeImg ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>

          {/* ── Thumbnail strip ── */}
          <div className="flex gap-2 p-3 bg-gray-50 border-b border-gray-100 overflow-x-auto">
            {gallery.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-blue-600' : 'border-transparent'}`}
                style={{ width: '72px', height: '52px' }}>
                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-100">
            {(['gallery', 'facilities', 'description'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'gallery'      ? '🖼 Ảnh phòng' :
                 tab === 'facilities'   ? '🛎 Tiện nghi'  :
                                         '📋 Mô tả'}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="p-6">
            {/* Tab: Ảnh phòng (grid thumbnail) */}
            {activeTab === 'gallery' && (
              <div className="grid grid-cols-2 gap-3">
                {gallery.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-blue-600' : 'border-gray-200'}`}
                    style={{ height: '120px' }}>
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent py-2 px-3">
                      <p className="text-white text-xs font-medium">{img.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Tiện nghi */}
            {activeTab === 'facilities' && (
              <div className="grid grid-cols-2 gap-3">
                {facilities.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FacilityIcon icon={f.icon} />
                    </div>
                    <span className="text-sm text-gray-700">{f.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Mô tả */}
            {activeTab === 'description' && (
              <div className="space-y-4 text-sm text-gray-600">
                <p>{room.description ||
                  (room.type_name === 'Suite'   ? 'Suite hạng sang với không gian rộng rãi, phòng khách riêng biệt, bồn tắm Jacuzzi và ban công view thành phố toàn cảnh. Lý tưởng cho các dịp đặc biệt hoặc kỳ nghỉ cao cấp.' :
                   room.type_name === 'Deluxe'  ? 'Phòng Deluxe rộng rãi với nội thất cao cấp, giường King Size êm ái, minibar đa dạng và tầm nhìn ra thành phố tuyệt đẹp. Trải nghiệm hoàn hảo cho cặp đôi.' :
                   'Phòng Standard ấm cúng, đầy đủ tiện nghi cơ bản cần thiết, phù hợp cho cả khách công tác lẫn du lịch. Sạch sẽ, thoáng mát, vị trí thuận tiện.')}
                </p>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="font-semibold text-blue-800 mb-2">Thông tin phòng</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Hạng phòng: <span className="font-medium">{room.type_name}</span></li>
                    <li>• Sức chứa: <span className="font-medium">Tối đa {room.max_occupancy} người</span></li>
                    <li>• Giá: <span className="font-medium">{room.base_price.toLocaleString('vi-VN')} đ / đêm</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Giá mỗi đêm</p>
            <p className="text-2xl font-bold text-blue-600">{room.base_price.toLocaleString('vi-VN')} đ</p>
          </div>
          <button onClick={onBook} disabled={room.status !== 'available'}
            className={`px-8 py-3 rounded-xl font-semibold text-sm transition-colors ${room.status === 'available' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            {room.status === 'available' ? 'Đặt phòng ngay' : 'Hết phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CustomerRooms() {
  const [searchParams]                  = useSearchParams();
  const [selectedType, setSelectedType] = useState<'all' | 'Standard' | 'Deluxe' | 'Suite'>('all');
  const [rooms,        setRooms]        = useState<RoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
  const [detailRoom,   setDetailRoom]   = useState<RoomInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, token }  = useAuth();
  const { refetch }      = useBookings();
  const navigate         = useNavigate();

  // ── Fetch danh sách phòng trống từ API thật ─────────────────────────────────
  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const res    = await fetch(`${API_BASE}/api/rooms${params}`);
      const data   = await res.json();
      const list   = Array.isArray(data) ? data : [];
      // Gán ảnh mặc định theo hạng phòng
      const enriched = list.map((r: RoomInfo) => ({
        ...r,
        image:     TYPE_IMAGES[r.type_name] || TYPE_IMAGES.Standard,
        amenities: r.type_name === 'Suite'    ? ['Wifi','TV','Điều hòa','Minibar','Bồn tắm'] :
                   r.type_name === 'Deluxe'   ? ['Wifi','TV','Điều hòa','Minibar'] :
                                                ['Wifi','TV','Điều hòa'],
      }));
      setRooms(enriched);
    } catch {
      toast.error('Không thể tải danh sách phòng');
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => { fetchRooms(); }, [selectedType]);

  // ── Xử lý pending booking từ ExploreRooms ──────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (raw) {
      try {
        const pending: PendingBookingData = JSON.parse(raw);
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        // Tìm phòng theo type vì ROOM_LIST dùng id khác với room_id DB
        // Chờ rooms load xong rồi mở modal
        toast.info(`Đang tìm phòng ${pending.roomType} cho bạn...`);
      } catch {
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
      }
    }
  }, []);

  // ── handleConfirm: gọi POST /api/bookings thật ─────────────────────────────
  const handleConfirm = async (checkIn: string, checkOut: string, guests: number) => {
    if (!selectedRoom || !user || !token) return;

    // Tìm customer_id từ user (đã được lưu trong JWT)
    const customerId = user.customer_id;
    if (!customerId) {
      toast.error('Không tìm thấy hồ sơ khách hàng. Vui lòng liên hệ lễ tân.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_id:    customerId,
          room_id:        selectedRoom.room_id,
          check_in_date:  checkIn,
          check_out_date: checkOut,
          actual_guests:  guests,
          deposit_amount: Math.round(selectedRoom.base_price *
            Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) * 0.2),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(`Đặt phòng thành công! Mã booking: #${data.booking_id} 🎉`);
      setSelectedRoom(null);

      // Refresh danh sách phòng (phòng vừa đặt sẽ đổi sang 'booked')
      fetchRooms();

      // Refresh booking context để CustomerBookings hiện ngay
      refetch?.();

      navigate('/customer-bookings');
    } catch (err: any) {
      toast.error(err.message || 'Đặt phòng thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter(r =>
    selectedType === 'all' || r.type_name === selectedType
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Đặt phòng</h1>

      {/* Bộ lọc */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-gray-700">Loại phòng:</span>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'Standard', 'Deluxe', 'Suite'] as const).map(type => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {type === 'all' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingRooms ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" /> Đang tải danh sách phòng...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Không có phòng trống cho loại này.</p>
        </div>
      ) : (
        /* Danh sách phòng */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <div key={room.room_id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="relative w-full" style={{ paddingTop: '66.67%' }}>
                <img src={room.image} alt={`Phòng ${room.room_number}`}
                  className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${room.status === 'available' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {room.status === 'available' ? 'Còn trống' : 'Không trống'}
                </span>
                <button onClick={() => setDetailRoom(room)}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 text-white text-xs rounded-lg hover:bg-black/70 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                </button>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">Phòng {room.room_number}</h3>
                    <p className="text-sm text-gray-500">{room.type_name}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${TYPE_COLOR[room.type_name] || 'bg-gray-100 text-gray-600'}`}>
                    {room.type_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Users className="w-4 h-4" />
                  <span>Tối đa {room.max_occupancy} người</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(room.amenities || []).map(a => (
                    <span key={a} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      <AmenityIcon name={a} />{a}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                  <div>
                    <p className="text-xs text-gray-400">Giá mỗi đêm</p>
                    <p className="text-xl font-bold text-blue-600">{room.base_price.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <button onClick={() => room.status === 'available' && setSelectedRoom(room)}
                    disabled={room.status !== 'available'}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${room.status === 'available' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {room.status === 'available' ? 'Đặt phòng' : 'Hết phòng'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal chi tiết */}
      {detailRoom && (
        <RoomDetailModal room={detailRoom} onClose={() => setDetailRoom(null)}
          onBook={() => { setDetailRoom(null); if (detailRoom.status === 'available') setSelectedRoom(detailRoom); }} />
      )}

      {/* Booking Modal */}
      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          fullName={user?.fullName ?? ''}
          phone={user?.phone ?? ''}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedRoom(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
