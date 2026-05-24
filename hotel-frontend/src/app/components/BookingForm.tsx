// BookingForm.tsx — Kết nối API thật
import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RoomType { room_type_id: number; type_name: string; base_price: number; max_occupancy: number; }
interface Room     { room_id: number; room_number: string; type_name: string; base_price: number; status: string; }
interface Customer { customer_id: number; full_name: string; phone: string; }

export function BookingForm() {
  const { token } = useAuth();

  const [roomTypes, setRoomTypes]   = useState<RoomType[]>([]);
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [customer, setCustomer]     = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerPhone:  '',
    selectedRoomId: '',
    checkInDate:    '',
    checkOutDate:   '',
    numberOfGuests: 1,
    depositAmount:  0,
  });

  // Load danh sách loại phòng
  useEffect(() => {
    fetch(`${API_BASE}/api/room-types`)
      .then(r => r.json())
      .then(d => setRoomTypes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load phòng trống khi chọn ngày
  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) return;
    if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) return;

    fetch(`${API_BASE}/api/rooms/available?check_in=${form.checkInDate}&check_out=${form.checkOutDate}`)
      .then(r => r.json())
      .then(d => setRooms(Array.isArray(d) ? d : []))
      .catch(() => setRooms([]));
  }, [form.checkInDate, form.checkOutDate]);

  const handleSearchCustomer = async () => {
    if (!form.customerPhone) { toast.error('Nhập SĐT khách hàng'); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(form.customerPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data.customers) ? data.customers : Array.isArray(data) ? data : [];
      if (!list.length) { toast.error('Không tìm thấy khách hàng — hãy thêm mới ở mục Quản lý Khách hàng'); setCustomer(null); return; }
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
    if (!customer)             { toast.error('Vui lòng tra cứu khách hàng'); return; }
    if (!form.selectedRoomId)  { toast.error('Vui lòng chọn phòng'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Vui lòng chọn ngày nhận và trả phòng'); return; }
    if (nights <= 0)           { toast.error('Ngày trả phòng phải sau ngày nhận phòng'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      toast.success(`Tạo phiếu đặt phòng thành công! Mã booking: #${data.booking_id}`);
      // Reset form
      setForm({ customerPhone: '', selectedRoomId: '', checkInDate: '', checkOutDate: '', numberOfGuests: 1, depositAmount: 0 });
      setCustomer(null);
      setRooms([]);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Lập Phiếu Đặt Phòng</h1>
      </div>

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
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Search className="w-5 h-5" />Thông tin khách hàng</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="0901234567"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button type="button" onClick={handleSearchCustomer} disabled={isSearching} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                <input
                  type="text"
                  value={customer?.full_name || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Tra cứu từ SĐT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số khách <span className="text-red-500">*</span></label>
                <input
                  type="number" min={1} max={10}
                  value={form.numberOfGuests}
                  onChange={(e) => setForm({ ...form, numberOfGuests: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiền đặt cọc</label>
                <input
                  type="number" min={0} step={10000}
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Cột phải — Phòng & Ngày */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5" />Thông tin phòng & ngày</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày nhận phòng <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkInDate: e.target.value, selectedRoomId: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trả phòng <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    min={form.checkInDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkOutDate: e.target.value, selectedRoomId: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                  <select
                    value={form.selectedRoomId}
                    onChange={(e) => setForm({ ...form, selectedRoomId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
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
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div><p className="text-sm text-gray-600">Số đêm</p><p className="text-xl font-bold text-gray-800">{nights} đêm</p></div>
                <div><p className="text-sm text-gray-600">Tổng tiền phòng</p><p className="text-xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</p></div>
                <div><p className="text-sm text-gray-600">Tiền cọc</p><p className="text-xl font-bold text-orange-600">{form.depositAmount.toLocaleString('vi-VN')} đ</p></div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Tạo phiếu đặt phòng
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}