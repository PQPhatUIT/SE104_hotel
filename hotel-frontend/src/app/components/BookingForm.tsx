// BookingForm.tsx — Thêm tab "Danh sách booking" với nút Check-in
import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, FileText, Loader2, LogIn, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RoomType { room_type_id: number; type_name: string; base_price: number; max_occupancy: number; }
interface Room     { room_id: number; room_number: string; type_name: string; base_price: number; status: string; }
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
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

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
  });

  // ── State danh sách booking ──────────────────────────────────────────────
  const [bookings, setBookings]         = useState<any[]>([]);
  const [loadingList, setLoadingList]   = useState(false);
  const [actionLoadId, setActionLoadId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

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

  // ── Tra cứu khách hàng ───────────────────────────────────────────────────
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Tạo phiếu thành công! Mã booking: #${data.booking_id}`);
      setForm({ customerPhone: '', selectedRoomId: '', checkInDate: '', checkOutDate: '', numberOfGuests: 1, depositAmount: 0 });
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
      // Cập nhật local state thay vì reload toàn bộ
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

  return (
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
          <Calendar className="w-4 h-4" /> Danh sách booking & Check-in
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
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Nút CHECK-IN — chỉ hiện khi status = confirmed */}
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
                            {/* Nút HỦY — chỉ hiện khi pending hoặc confirmed */}
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
    </div>
  );
}
