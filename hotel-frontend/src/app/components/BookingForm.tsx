// BookingForm.tsx — 3 tabs: Lập phiếu | Danh sách & Check-in | Tra cứu
import { useState, useEffect } from 'react';
import {
  Search, Plus, Calendar, FileText, Loader2, LogIn, XCircle,
  RefreshCw, Package, Minus, ShoppingCart, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RoomType { room_type_id: number; type_name: string; base_price: number; max_occupancy: number; }
interface Room     { room_id: number; room_number: string; type_name: string; base_price: number; status: string; note?: string;}
interface Customer { customer_id: number; full_name: string; phone: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Chờ xác nhận', color: 'bg-gray-100 text-gray-600'   },
  confirmed:   { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700'   },
  checked_in:  { label: 'Đang ở',       color: 'bg-green-100 text-green-700' },
  checked_out: { label: 'Đã trả phòng', color: 'bg-gray-100 text-gray-400'   },
  cancelled:   { label: 'Đã hủy',       color: 'bg-red-100 text-red-500'     },
};

const fmtDate  = (s: string) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export function BookingForm() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'search'>('create');

  // ── State tạo phiếu ──────────────────────────────────────────────────────
  const [roomTypes, setRoomTypes]       = useState<RoomType[]>([]);
  const [rooms, setRooms]               = useState<Room[]>([]);
  const [customer, setCustomer]         = useState<Customer | null>(null);
  const [isSearching, setIsSearching]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerPhone:  '',
    selectedRoomId: '',
    checkInDate:    '',
    checkOutDate:   '',
    numberOfGuests: 1,
    depositAmount:  0,
    note: '',
  });

  // ── State danh sách booking ──────────────────────────────────────────────
  const [bookings, setBookings]         = useState<any[]>([]);
  const [loadingList, setLoadingList]   = useState(false);
  const [actionLoadId, setActionLoadId] = useState<number | null>(null);

  // ── State order dịch vụ cho nhân viên ───────────────────────────────────
  const [serviceModalBooking, setServiceModalBooking] = useState<any | null>(null);
  const [services, setServices]         = useState<any[]>([]);
  const [svcLoading, setSvcLoading]     = useState(false);
  const [svcQty, setSvcQty]             = useState<Record<number, number>>({});
  const [ordering, setOrdering]         = useState<number | null>(null);

  // ── State tra cứu ────────────────────────────────────────────────────────
  const [searchKeyword, setSearchKeyword]   = useState('');
  const [searchStatus, setSearchStatus]     = useState('');
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchResults, setSearchResults]   = useState<any[]>([]);
  const [searched, setSearched]             = useState(false);
  const [expandedId, setExpandedId]         = useState<number | null>(null);

  // ── Load room types ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/room-types`)
      .then(r => r.json())
      .then(d => setRoomTypes(Array.isArray(d) ? d : []))
      .catch(() => {});                                                               
  }, []);

  // ── Load phòng trống khi chọn ngày ───────────────────────────────────────
  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) return;
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) return;
    fetch(`${API_BASE}/api/rooms/available?check_in=${form.checkInDate}&check_out=${form.checkOutDate}`)
      .then(r => r.json())
      .then(d => setRooms(Array.isArray(d) ? d : []))
      .catch(() => setRooms([]));
  }, [form.checkInDate, form.checkOutDate]);

  // ── Load danh sách booking khi chuyển sang tab list ──────────────────────
  const loadBookings = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch(`${API_BASE}/api/bookings`, { headers });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') loadBookings();
  }, [activeTab]);

  // ── Mở modal order dịch vụ cho nhân viên ────────────────────────────────
  const openServiceModal = async (booking: any) => {
    setServiceModalBooking(booking);
    setServices([]);
    setSvcQty({});
    setSvcLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const raw  = Array.isArray(data) ? data
                 : Array.isArray(data?.services) ? data.services
                 : [];
      const list = raw.filter((s: any) => s.is_available != 0);
      setServices(list);
      const initQty: Record<number, number> = {};
      list.forEach((s: any) => { initQty[s.service_id] = 1; });
      setSvcQty(initQty);
    } catch (err) {
      console.error('openServiceModal error:', err);
      toast.error('Không thể tải danh sách dịch vụ');
    } finally {
      setSvcLoading(false);
    }
  };

  const handleStaffOrder = async (service: any) => {
    if (!serviceModalBooking) return;
    const qty = svcQty[service.service_id] || 1;
    if (service.unit !== 'Lượt' && qty > service.stock_quantity) {
      toast.error(`Tồn kho không đủ. Hiện có: ${service.stock_quantity} ${service.unit}`);
      return;
    }
    setOrdering(service.service_id);
    try {
      const res  = await fetch(`${API_BASE}/api/staff/services/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id: serviceModalBooking.booking_id,
          service_id: service.service_id,
          quantity: qty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Đặt "${service.service_name}" x${qty} thành công!`);
      setServices(prev => prev.map(s =>
        s.service_id === service.service_id && s.unit !== 'Lượt'
          ? { ...s, stock_quantity: s.stock_quantity - qty }
          : s
      ).filter(s => s.unit === 'Lượt' || s.stock_quantity > 0));
      setSvcQty(prev => ({ ...prev, [service.service_id]: 1 }));
    } catch (err: any) { toast.error(err.message || 'Lỗi đặt dịch vụ'); }
    finally { setOrdering(null); }
  };

  // ── Tra cứu khách hàng (tab create) ──────────────────────────────────────
  const handleSearchCustomer = async () => {
    if (!form.customerPhone) { toast.error('Nhập SĐT khách hàng'); return; }
    setIsSearching(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(form.customerPhone)}`, { headers });
      const data = await res.json();
      const list = Array.isArray(data.customers) ? data.customers : Array.isArray(data) ? data : [];
      if (!list.length) {
        toast.error('Không tìm thấy khách hàng — hãy thêm mới ở mục Quản lý Khách hàng');
        setCustomer(null);
        return;
      }
      setCustomer(list[0]);
      toast.success(`Tìm thấy: ${list[0].full_name}`);
    } catch { toast.error('Lỗi kết nối'); }
    finally { setIsSearching(false); }
  };

  // ── Tạo phiếu đặt phòng ──────────────────────────────────────────────────
  const selectedRoom = rooms.find(r => String(r.room_id) === form.selectedRoomId);
  const nights = (() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const d = Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000);
    return d > 0 ? d : 0;
  })();
  const totalAmount = selectedRoom ? selectedRoom.base_price * nights : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer)                           { toast.error('Vui lòng tra cứu khách hàng'); return; }
    if (!form.selectedRoomId)                { toast.error('Vui lòng chọn phòng'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Vui lòng chọn ngày'); return; }
    if (nights <= 0)                         { toast.error('Ngày trả phòng phải sau ngày nhận phòng'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          customer_id:    customer.customer_id,
          room_id:        Number(form.selectedRoomId),
          check_in_date:  form.checkInDate,
          check_out_date: form.checkOutDate,
          actual_guests:  form.numberOfGuests,
          deposit_amount: form.depositAmount,
          note: form.note
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Tạo phiếu thành công! Mã booking: #${data.booking_id}`);
      setForm({ customerPhone: '', selectedRoomId: '', checkInDate: '', checkOutDate: '', numberOfGuests: 1, depositAmount: 0, note: '' });
      setCustomer(null);
      setRooms([]);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Check-in ─────────────────────────────────────────────────────────────
  const handleCheckIn = async (bookingId: number) => {
    setActionLoadId(bookingId);
    try {
      const res  = await fetch(`${API_BASE}/api/bookings/${bookingId}/checkin`, {
        method: 'PATCH', headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Check-in thành công! Trạng thái phòng đã cập nhật.');
      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status: 'checked_in' } : b
      ));
    } catch (err: any) {
      toast.error(err.message || 'Lỗi check-in');
    } finally {
      setActionLoadId(null);
    }
  };

  // ── Hủy booking ──────────────────────────────────────────────────────────
  const handleCancel = async (bookingId: number) => {
    if (!confirm('Bạn chắc chắn muốn hủy booking này?')) return;
    setActionLoadId(bookingId);
    try {
      const res  = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH', headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Đã hủy booking thành công.');
      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hủy booking');
    } finally {
      setActionLoadId(null);
    }
  };

  // ── Tra cứu phiếu (tab search) ───────────────────────────────────────────
  const handleBookingSearch = async () => {
    if (!searchKeyword.trim()) {
      toast.error('Vui lòng nhập tên, số điện thoại hoặc CCCD để tìm kiếm');
      return;
    }
    setSearchLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      params.set('keyword', searchKeyword.trim());
      if (searchStatus) params.set('status', searchStatus);
      const res  = await fetch(`${API_BASE}/api/bookings?${params}`, { headers });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <>
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Đặt phòng</h1>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plus className="w-4 h-4" /> Lập phiếu đặt phòng
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" /> Danh sách & Check-in
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-4 h-4" /> Tra cứu phiếu
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab 1 — Tạo phiếu                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="mb-6 pb-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ngày lập phiếu</p>
                <p className="font-medium text-gray-800">{new Date().toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Cột trái — Khách hàng */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Search className="w-5 h-5" /> Thông tin khách hàng
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={form.customerPhone}
                      onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchCustomer())}
                      placeholder="0901234567"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button type="button" onClick={handleSearchCustomer} disabled={isSearching}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                  <input type="text" value={customer?.full_name || ''} readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Tra cứu từ SĐT" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số khách <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={1} max={10} value={form.numberOfGuests}
                    onChange={e => setForm({ ...form, numberOfGuests: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tiền đặt cọc</label>
                  <input type="number" min={0} step={10000} value={form.depositAmount}
                    onChange={e => setForm({ ...form, depositAmount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0" />
                </div>
              </div>

              {/* Cột phải — Phòng & Ngày */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Thông tin phòng & ngày
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày nhận phòng <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.checkInDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm({ ...form, checkInDate: e.target.value, selectedRoomId: '' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày trả phòng <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.checkOutDate}
                      min={form.checkInDate || new Date().toISOString().split('T')[0]}
                      onChange={e => setForm({ ...form, checkOutDate: e.target.value, selectedRoomId: '' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn phòng trống <span className="text-red-500">*</span>
                    {form.checkInDate && form.checkOutDate && (
                      <span className="ml-2 text-xs text-blue-600">({rooms.length} phòng trống)</span>
                    )}
                  </label>
                  {!form.checkInDate || !form.checkOutDate ? (
                    <p className="text-sm text-gray-400 italic">Chọn ngày nhận và trả phòng trước</p>
                  ) : rooms.length === 0 ? (
                    <p className="text-sm text-red-500 italic">Không có phòng trống trong khoảng thời gian này</p>
                  ) : (
                    <select value={form.selectedRoomId}
                      onChange={e => setForm({ ...form, selectedRoomId: e.target.value })}
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

            {/* Summary + Submit */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div><p className="text-sm text-gray-600">Số đêm</p><p className="text-xl font-bold text-gray-800">{nights} đêm</p></div>
                  <div><p className="text-sm text-gray-600">Tổng tiền phòng</p><p className="text-xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</p></div>
                  <div><p className="text-sm text-gray-600">Tiền cọc</p><p className="text-xl font-bold text-orange-600">{form.depositAmount.toLocaleString('vi-VN')} đ</p></div>
                </div>
                
                <div className="col-span-full mt-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú / Yêu cầu đặc biệt
                  </label>
                  <textarea
                    value={form.note || ''}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="VD: Khách cần nôi em bé, Check-in muộn lúc 22h..."
                  />
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Tạo phiếu đặt phòng
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab 2 — Danh sách booking + nút Check-in                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Danh sách phiếu đặt phòng</h3>
            <button onClick={loadBookings} disabled={loadingList}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {loadingList ? (
            <div className="p-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Chưa có phiếu đặt phòng nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Mã phiếu</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Khách hàng</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Phòng</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Nhận phòng</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Trả phòng</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Tiền cọc</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Ghi chú</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-600">Trạng thái</th>
                    <th className="px-5 py-3 text-center font-semibold text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b: any) => {
                    const st       = STATUS_CONFIG[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
                    const isLoading = actionLoadId === b.booking_id;
                    return (
                      <tr key={b.booking_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-gray-700">#{b.booking_id}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{b.customer_name || '—'}</p>
                          <p className="text-xs text-gray-400">{b.customer_phone}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{b.room_number}</p>
                          <p className="text-xs text-gray-400">{b.room_type}</p>
                        </td>
                        <td className="px-5 py-3">{fmtDate(b.check_in_date)}</td>
                        <td className="px-5 py-3">{fmtDate(b.check_out_date)}</td>
                        <td className="px-5 py-3">{fmtMoney(b.deposit_amount)}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={b.note}>
                          {b.note || '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {b.status === 'checked_in' && (
                              <button
                                onClick={() => openServiceModal(b)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-xs rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Package className="w-3.5 h-3.5" />
                                Dịch vụ
                              </button>
                            )}
                            {b.status === 'confirmed' && (
                              <button
                                onClick={() => handleCheckIn(b.booking_id)}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                              >
                                {isLoading
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <LogIn className="w-3.5 h-3.5" />}
                                Check-in
                              </button>
                            )}
                            {['pending','confirmed'].includes(b.status) && (
                              <button
                                onClick={() => handleCancel(b.booking_id)}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors"
                              >
                                {isLoading
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <XCircle className="w-3.5 h-3.5" />}
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab 3 — Tra cứu phiếu đặt phòng                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">Tìm kiếm theo tên, số điện thoại hoặc CCCD. Có thể lọc thêm theo trạng thái.</p>

          {/* Bộ lọc */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên / SĐT / CCCD *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nhập tên, SĐT hoặc CCCD..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBookingSearch()}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={searchStatus}
                  onChange={e => setSearchStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="checked_in">Đang ở</option>
                  <option value="checked_out">Đã trả phòng</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <button
                onClick={handleBookingSearch}
                disabled={searchLoading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {searchLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </div>
          </div>

          {/* Kết quả */}
          {searched && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Kết quả tra cứu
                </h3>
                <span className="text-sm text-gray-400">
                  {searchLoading ? 'Đang tải...' : `${searchResults.length} phiếu`}
                </span>
              </div>

              {searchLoading ? (
                <div className="p-16 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không tìm thấy phiếu đặt phòng nào phù hợp.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {searchResults.map((b: any) => {
                    const st      = STATUS_CONFIG[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
                    const expanded = expandedId === b.booking_id;
                    return (
                      <div key={b.booking_id}>
                        <div
                          className="flex items-center px-5 py-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedId(expanded ? null : b.booking_id)}
                        >
                          <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-400">Mã phiếu</p>
                              <p className="font-semibold text-gray-800">#{b.booking_id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Khách hàng</p>
                              <p className="font-medium">{b.customer_name || '—'}</p>
                              <p className="text-xs text-gray-400">{b.customer_phone}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Phòng</p>
                              <p className="font-medium">{b.room_number}</p>
                              <p className="text-xs text-gray-400">{b.room_type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Ngày nhận / trả</p>
                              <p className="font-medium">{fmtDate(b.check_in_date)}</p>
                              <p className="text-xs text-gray-400">→ {fmtDate(b.check_out_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Trạng thái</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${st.color}`}>
                                {st.label}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 text-gray-400">
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Chi tiết mở rộng */}
                        {expanded && (
                          <div className="px-5 pb-4 bg-gray-50 grid grid-cols-3 gap-6 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">CMND/CCCD</p>
                              <p>{b.id_card || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Số khách</p>
                              <p>{b.actual_guests} khách</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Số đêm</p>
                              <p>{b.nights} đêm</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Tiền đặt cọc</p>
                              <p className="font-medium">{fmtMoney(b.deposit_amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Giá phòng / đêm</p>
                              <p className="font-medium">{fmtMoney(b.price_per_night)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Ngày lập phiếu</p>
                              <p>{fmtDate(b.created_at)}</p>
                            </div>
                            {b.note && (
                              <div className="col-span-3">
                                <p className="text-xs text-gray-400 mb-1">Ghi chú</p>
                                <p className="text-gray-600 italic">{b.note}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* ── Modal Order Dịch Vụ cho Nhân Viên ──────────────────────────────── */}
    {serviceModalBooking && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={e => { if (e.target === e.currentTarget) setServiceModalBooking(null); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Order dịch vụ / vật tư</h2>
              <p className="text-sm text-gray-500">
                Phòng {serviceModalBooking.room_number} · Booking #{serviceModalBooking.booking_id} · {serviceModalBooking.customer_name}
              </p>
            </div>
            <button onClick={() => setServiceModalBooking(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {svcLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>Không có dịch vụ/vật tư nào đang hoạt động</p>
                <p className="text-xs mt-1 text-gray-300">Kiểm tra lại mục Quản lý Kho</p>
              </div>
            ) : services.map((s: any) => {
              const qty    = svcQty[s.service_id] || 1;
              const maxQty = s.unit === 'Lượt' ? 99 : s.stock_quantity;
              const subtot = Number(s.price) * qty;
              const isOut  = s.unit !== 'Lượt' && s.stock_quantity <= 0;
              return (
                <div key={s.service_id} className={`border rounded-xl p-4 ${isOut ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-800">{s.service_name}</p>
                      <p className="text-sm text-gray-500">
                        {Number(s.price).toLocaleString('vi-VN')}đ / {s.unit}
                        {s.unit !== 'Lượt' && (
                          <span className={`ml-2 font-medium ${s.stock_quantity <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                            · Còn {s.stock_quantity} {s.unit}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!isOut && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                        <button onClick={() => setSvcQty(prev => ({ ...prev, [s.service_id]: Math.max(1, qty - 1) }))}
                          className="px-3 py-1.5 hover:bg-gray-100 text-gray-600">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input type="number" value={qty} min={1} max={maxQty}
                          onChange={e => setSvcQty(prev => ({ ...prev, [s.service_id]: Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)) }))}
                          className="w-14 text-center py-1.5 border-x border-gray-300 text-sm font-medium focus:outline-none" />
                        <button onClick={() => setSvcQty(prev => ({ ...prev, [s.service_id]: Math.min(maxQty, qty + 1) }))}
                          className="px-3 py-1.5 hover:bg-gray-100 text-gray-600">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-semibold text-blue-600 flex-1 text-sm">
                        {subtot.toLocaleString('vi-VN')}đ
                      </span>
                      <button onClick={() => handleStaffOrder(s)} disabled={ordering === s.service_id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                        {ordering === s.service_id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <ShoppingCart className="w-3.5 h-3.5" />}
                        Order
                      </button>
                    </div>
                  )}
                  {isOut && <p className="text-xs text-red-400 italic">Hết hàng</p>}
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 p-4 flex justify-end">
            <button onClick={() => setServiceModalBooking(null)}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}