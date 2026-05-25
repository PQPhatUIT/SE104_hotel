// BookingForm.tsx — Đặt phòng + Check-in + Hủy đặt phòng
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Calendar, FileText, Loader2, LogIn, XCircle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RoomType { room_type_id: number; type_name: string; base_price: number; max_occupancy: number; }
interface Room     { room_id: number; room_number: string; type_name: string; base_price: number; status: string; }
interface Customer { customer_id: number; full_name: string; phone: string; }
interface Booking  {
  booking_id: number;
  customer_name: string;
  customer_phone: string;
  room_number: string;
  room_type: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  price_per_night: number;
  deposit_amount: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  confirmed:   'Đã đặt',
  checked_in:  'Đang ở',
  checked_out: 'Đã trả phòng',
  cancelled:   'Đã hủy',
};
const STATUS_COLOR: Record<string, string> = {
  confirmed:   'bg-blue-100 text-blue-700',
  checked_in:  'bg-green-100 text-green-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled:   'bg-red-100 text-red-700',
};

// ── Tab 1: Lập phiếu đặt phòng ───────────────────────────────────────────────
function TabDatPhong({ token }: { token: string }) {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerPhone: '', selectedRoomId: '',
    checkInDate: '', checkOutDate: '',
    numberOfGuests: 1, depositAmount: 0,
  });

  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) return;
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) return;
    fetch(`${API_BASE}/api/rooms/available?check_in=${form.checkInDate}&check_out=${form.checkOutDate}`)
      .then(r => r.json()).then(d => setRooms(Array.isArray(d) ? d : [])).catch(() => setRooms([]));
  }, [form.checkInDate, form.checkOutDate]);

  const handleSearchCustomer = async () => {
    if (!form.customerPhone) { toast.error('Nhập SĐT khách hàng'); return; }
    setIsSearching(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(form.customerPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data.customers) ? data.customers : Array.isArray(data) ? data : [];
      if (!list.length) { toast.error('Không tìm thấy khách hàng'); setCustomer(null); return; }
      setCustomer(list[0]);
      toast.success(`Tìm thấy: ${list[0].full_name}`);
    } catch { toast.error('Lỗi kết nối'); }
    finally { setIsSearching(false); }
  };

  const selectedRoom = rooms.find(r => String(r.room_id) === form.selectedRoomId);
  const nights = (() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const d = Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000);
    return d > 0 ? d : 0;
  })();
  const totalAmount = selectedRoom ? selectedRoom.base_price * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer)            { toast.error('Vui lòng tra cứu khách hàng'); return; }
    if (!form.selectedRoomId) { toast.error('Vui lòng chọn phòng'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Vui lòng chọn ngày'); return; }
    if (nights <= 0)          { toast.error('Ngày trả phòng phải sau ngày nhận'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: customer.customer_id, room_id: Number(form.selectedRoomId),
          check_in_date: form.checkInDate,   check_out_date: form.checkOutDate,
          actual_guests: form.numberOfGuests, deposit_amount: form.depositAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Tạo phiếu đặt phòng thành công! Mã: #${data.booking_id}`);
      setForm({ customerPhone: '', selectedRoomId: '', checkInDate: '', checkOutDate: '', numberOfGuests: 1, depositAmount: 0 });
      setCustomer(null); setRooms([]);
    } catch (err: any) { toast.error(err.message || 'Lỗi tạo booking'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="grid grid-cols-2 gap-8">
          {/* Cột trái */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Search className="w-5 h-5" />Thông tin khách hàng</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="0901234567" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={handleSearchCustomer} disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
              <input type="text" value={customer?.full_name || ''} readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="Tra cứu từ SĐT" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số khách <span className="text-red-500">*</span></label>
              <input type="number" min={1} max={10} value={form.numberOfGuests}
                onChange={(e) => setForm({ ...form, numberOfGuests: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiền đặt cọc (đ)</label>
              <input type="number" min={0} step={10000} value={form.depositAmount}
                onChange={(e) => setForm({ ...form, depositAmount: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
              <p className="text-xs text-gray-400 mt-1">Tiền cọc sẽ được trừ vào tổng tiền khi thanh toán</p>
            </div>
          </div>

          {/* Cột phải */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5" />Thông tin phòng & ngày</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày nhận phòng <span className="text-red-500">*</span></label>
                <input type="date" value={form.checkInDate} min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm({ ...form, checkInDate: e.target.value, selectedRoomId: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trả phòng <span className="text-red-500">*</span></label>
                <input type="date" value={form.checkOutDate} min={form.checkInDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm({ ...form, checkOutDate: e.target.value, selectedRoomId: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn phòng trống <span className="text-red-500">*</span>
                {form.checkInDate && form.checkOutDate && <span className="ml-2 text-xs text-blue-600">({rooms.length} phòng)</span>}
              </label>
              {!form.checkInDate || !form.checkOutDate ? (
                <p className="text-sm text-gray-400 italic">Chọn ngày trước</p>
              ) : rooms.length === 0 ? (
                <p className="text-sm text-red-500 italic">Không có phòng trống</p>
              ) : (
                <select value={form.selectedRoomId} onChange={(e) => setForm({ ...form, selectedRoomId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      Phòng {r.room_number} — {r.type_name} — {r.base_price.toLocaleString('vi-VN')}đ/đêm
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedRoom && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm space-y-1">
                <p><span className="text-gray-500">Loại phòng:</span> <span className="font-medium">{selectedRoom.type_name}</span></p>
                <p><span className="text-gray-500">Giá/đêm:</span> <span className="font-medium">{selectedRoom.base_price.toLocaleString('vi-VN')} đ</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div><p className="text-sm text-gray-600">Số đêm</p><p className="text-xl font-bold text-gray-800">{nights} đêm</p></div>
              <div><p className="text-sm text-gray-600">Tổng tiền phòng</p><p className="text-xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</p></div>
              <div><p className="text-sm text-gray-600">Tiền cọc</p><p className="text-xl font-bold text-orange-600">{form.depositAmount.toLocaleString('vi-VN')} đ</p></div>
              <div><p className="text-sm text-gray-600">Còn lại khi trả</p><p className="text-xl font-bold text-green-700">{Math.max(totalAmount - form.depositAmount, 0).toLocaleString('vi-VN')} đ</p></div>
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Tạo phiếu đặt phòng
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ── Tab 2: Check-in / Hủy đặt phòng ─────────────────────────────────────────
function TabCheckIn({ token }: { token: string }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingId, setLoadingId]     = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchPhone.trim()) { toast.error('Nhập số điện thoại để tìm'); return; }
    setIsSearching(true); setBookings([]);
    try {
      const cusRes  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(searchPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cusData = await cusRes.json();
      const cusList = Array.isArray(cusData.customers) ? cusData.customers : Array.isArray(cusData) ? cusData : [];
      if (!cusList.length) { toast.error('Không tìm thấy khách hàng'); return; }

      const bkRes  = await fetch(`${API_BASE}/api/bookings?customer_id=${cusList[0].customer_id}&status=confirmed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bkData = await bkRes.json();
      const bkList = Array.isArray(bkData) ? bkData : [];
      if (!bkList.length) { toast.error('Khách hàng không có phiếu đặt phòng nào đang chờ check-in'); return; }
      setBookings(bkList);
    } catch { toast.error('Lỗi kết nối'); }
    finally { setIsSearching(false); }
  };

  const handleCheckIn = async (bookingId: number) => {
    setLoadingId(bookingId);
    try {
      const res  = await fetch(`${API_BASE}/api/bookings/${bookingId}/checkin`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Check-in thành công!');
      setBookings(prev => prev.filter(b => b.booking_id !== bookingId));
    } catch (err: any) { toast.error(err.message || 'Lỗi check-in'); }
    finally { setLoadingId(null); }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Bạn có chắc muốn hủy đặt phòng này?')) return;
    setLoadingId(bookingId);
    try {
      const res  = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Hủy đặt phòng thành công!');
      setBookings(prev => prev.filter(b => b.booking_id !== bookingId));
    } catch (err: any) { toast.error(err.message || 'Lỗi hủy booking'); }
    finally { setLoadingId(null); }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
      {/* Tìm kiếm */}
      <div className="flex gap-3 mb-6">
        <input type="tel" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Nhập SĐT khách hàng..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        <button onClick={handleSearch} disabled={isSearching}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Tìm
        </button>
      </div>

      {/* Danh sách booking */}
      {bookings.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Nhập SĐT để tìm phiếu đặt phòng chờ check-in</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => {
            const nights = Math.max(1, Math.ceil((new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000));
            const total  = nights * b.price_per_night;
            return (
              <div key={b.booking_id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">#{b.booking_id} — {b.customer_name}</p>
                    <p className="text-sm text-gray-500">{b.customer_phone}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm mb-4">
                  <div><p className="text-gray-400">Phòng</p><p className="font-medium">Phòng {b.room_number} ({b.room_type})</p></div>
                  <div><p className="text-gray-400">Nhận phòng</p><p className="font-medium">{new Date(b.check_in_date).toLocaleDateString('vi-VN')}</p></div>
                  <div><p className="text-gray-400">Trả phòng</p><p className="font-medium">{new Date(b.check_out_date).toLocaleDateString('vi-VN')}</p></div>
                  <div><p className="text-gray-400">Tiền cọc</p><p className="font-medium text-orange-600">{Number(b.deposit_amount).toLocaleString('vi-VN')} đ</p></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-sm text-gray-500">{nights} đêm × {Number(b.price_per_night).toLocaleString('vi-VN')} đ = </span>
                    <span className="font-bold text-blue-600">{total.toLocaleString('vi-VN')} đ</span>
                    {b.deposit_amount > 0 && (
                      <span className="text-sm text-gray-500 ml-2">(còn lại: {Math.max(total - Number(b.deposit_amount), 0).toLocaleString('vi-VN')} đ)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleCancel(b.booking_id)} disabled={loadingId === b.booking_id}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-1 disabled:opacity-60">
                      {loadingId === b.booking_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Hủy đặt phòng
                    </button>
                    <button onClick={() => handleCheckIn(b.booking_id)} disabled={loadingId === b.booking_id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1 disabled:opacity-60">
                      {loadingId === b.booking_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Check-in
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function BookingForm() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'dat' | 'checkin'>('dat');

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Đặt Phòng</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('dat')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${tab === 'dat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Plus className="w-4 h-4" /> Lập phiếu đặt phòng
        </button>
        <button onClick={() => setTab('checkin')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${tab === 'checkin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <LogIn className="w-4 h-4" /> Check-in / Hủy đặt phòng
        </button>
      </div>

      {tab === 'dat'     && <TabDatPhong token={token!} />}
      {tab === 'checkin' && <TabCheckIn  token={token!} />}
    </div>
  );
}