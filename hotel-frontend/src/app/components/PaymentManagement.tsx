// PaymentManagement.tsx — Thanh toán + Tra cứu hóa đơn
import { useState } from 'react';
import { Search, DollarSign, FileText, Loader2, Receipt, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface BookingInfo {
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

interface Invoice {
  invoice_id: number;
  booking_id: number;
  room_charge: number;
  service_charge: number;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  customer_name: string;
  room_number: string;
  room_type: string;
}

// ── Tab 1: Thanh toán (Check-out) ─────────────────────────────────────────────
function TabThanhToan({ token }: { token: string }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [bookings, setBookings]       = useState<BookingInfo[]>([]);
  const [selected, setSelected]       = useState<BookingInfo | null>(null);
  const [extraCharge, setExtraCharge] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isPaying, setIsPaying]       = useState(false);
  const [doneInvoice, setDoneInvoice] = useState<Invoice | null>(null);

  const handleSearch = async () => {
    if (!searchPhone.trim()) { toast.error('Nhập số điện thoại để tìm'); return; }
    setIsSearching(true); setBookings([]); setSelected(null); setDoneInvoice(null);
    try {
      const cusRes  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(searchPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cusData = await cusRes.json();
      const cusList = Array.isArray(cusData.customers) ? cusData.customers : Array.isArray(cusData) ? cusData : [];
      if (!cusList.length) { toast.error('Không tìm thấy khách hàng'); return; }

      const bkRes  = await fetch(`${API_BASE}/api/bookings?customer_id=${cusList[0].customer_id}&status=checked_in`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bkData = await bkRes.json();
      const bkList = Array.isArray(bkData) ? bkData : [];
      if (!bkList.length) { toast.error('Khách hàng không có phòng đang lưu trú (chưa check-in)'); return; }
      setBookings(bkList);
      setSelected(bkList[0]);
    } catch { toast.error('Lỗi kết nối'); }
    finally { setIsSearching(false); }
  };

  const nights      = selected ? Math.max(1, Math.ceil((new Date(selected.check_out_date).getTime() - new Date(selected.check_in_date).getTime()) / 86400000)) : 0;
  const roomCharge  = selected ? nights * Number(selected.price_per_night) : 0;
  const deposit     = selected ? Number(selected.deposit_amount) : 0;
  const totalAmount = Math.max(roomCharge + extraCharge - deposit, 0);

  const handlePayment = async () => {
    if (!selected) return;
    setIsPaying(true);
    try {
      const res  = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ booking_id: selected.booking_id, extra_charges: extraCharge }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Thanh toán & Check-out thành công!');
      setDoneInvoice({ ...data.invoice, customer_name: selected.customer_name, room_number: selected.room_number, room_type: selected.room_type });
      setBookings([]); setSelected(null); setSearchPhone(''); setExtraCharge(0);
    } catch (err: any) { toast.error(err.message || 'Lỗi thanh toán'); }
    finally { setIsPaying(false); }
  };

  return (
    <div>
      {/* Kết quả hóa đơn vừa thanh toán */}
      {doneInvoice && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">Thanh toán thành công — Hóa đơn #{doneInvoice.invoice_id}</h2>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Khách hàng</p><p className="font-bold">{doneInvoice.customer_name}</p></div>
            <div><p className="text-gray-500">Phòng</p><p className="font-bold">{doneInvoice.room_number}</p></div>
            <div><p className="text-gray-500">Tiền phòng</p><p className="font-bold">{Number(doneInvoice.room_charge).toLocaleString('vi-VN')} đ</p></div>
            <div><p className="text-gray-500">Tổng thanh toán</p><p className="font-bold text-blue-600 text-lg">{Number(doneInvoice.total_amount).toLocaleString('vi-VN')} đ</p></div>
          </div>
          <button onClick={() => setDoneInvoice(null)} className="mt-3 text-sm text-green-700 underline">Đóng</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Tìm kiếm */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tìm khách đang lưu trú</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <div className="flex gap-2">
                  <input type="text" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="0901234567" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleSearch} disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {bookings.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn phòng</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    onChange={(e) => setSelected(bookings.find(b => b.booking_id === Number(e.target.value)) || null)}>
                    {bookings.map(b => (
                      <option key={b.booking_id} value={b.booking_id}>Phòng {b.room_number}</option>
                    ))}
                  </select>
                </div>
              )}

              {selected && (
                <div className="pt-4 border-t border-gray-200 space-y-2 text-sm">
                  <div><p className="text-gray-400">Khách hàng</p><p className="font-medium">{selected.customer_name}</p></div>
                  <div><p className="text-gray-400">SĐT</p><p className="font-medium">{selected.customer_phone}</p></div>
                  <div><p className="text-gray-400">Phòng</p><p className="font-medium">{selected.room_number} ({selected.room_type})</p></div>
                  <div><p className="text-gray-400">Check-in</p><p className="font-medium">{new Date(selected.check_in_date).toLocaleDateString('vi-VN')}</p></div>
                  <div><p className="text-gray-400">Check-out (dự kiến)</p><p className="font-medium">{new Date(selected.check_out_date).toLocaleDateString('vi-VN')}</p></div>
                  <div><p className="text-gray-400">Số đêm</p><p className="font-medium text-blue-600">{nights} đêm</p></div>
                  <div><p className="text-gray-400">Tiền đặt cọc</p><p className="font-medium text-orange-600">{deposit.toLocaleString('vi-VN')} đ</p></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chi tiết thanh toán */}
        <div className="col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Hóa đơn thanh toán</h2>

            {!selected ? (
              <div className="text-center py-16 text-gray-400">Tìm kiếm khách hàng đang lưu trú để lập hóa đơn</div>
            ) : (
              <>
                <div className="mb-5 bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Giá phòng/đêm</span><span className="font-medium">{Number(selected.price_per_night).toLocaleString('vi-VN')} đ</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Số đêm</span><span className="font-medium">{nights} đêm</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold"><span>Tiền phòng</span><span className="text-blue-600">{roomCharge.toLocaleString('vi-VN')} đ</span></div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phụ thu / Dịch vụ thêm (đ)</label>
                  <input type="number" min={0} step={10000} value={extraCharge}
                    onChange={(e) => setExtraCharge(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>

                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between"><span className="text-gray-700">Tiền phòng</span><span>{roomCharge.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-700">Phụ thu</span><span>{extraCharge.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between text-red-600"><span>Tiền đặt cọc (trừ)</span><span>-{deposit.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between pt-3 border-t-2 border-blue-300">
                      <span className="text-xl font-bold text-gray-800">Tổng thanh toán</span>
                      <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <button onClick={handlePayment} disabled={isPaying}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
                    {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    Thanh toán & Check-out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Tra cứu hóa đơn ───────────────────────────────────────────────────
function TabTraCuuHoaDon({ token }: { token: string }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [invoices, setInvoices]       = useState<Invoice[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchPhone.trim()) { toast.error('Nhập số điện thoại để tìm'); return; }
    setIsSearching(true); setInvoices([]);
    try {
      // Tìm customer
      const cusRes  = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(searchPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cusData = await cusRes.json();
      const cusList = Array.isArray(cusData.customers) ? cusData.customers : Array.isArray(cusData) ? cusData : [];
      if (!cusList.length) { toast.error('Không tìm thấy khách hàng'); return; }

      // Lấy tất cả bookings đã checked_out của customer
      const bkRes  = await fetch(`${API_BASE}/api/bookings?customer_id=${cusList[0].customer_id}&status=checked_out`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bkData = await bkRes.json();
      const bkList = Array.isArray(bkData) ? bkData : [];
      if (!bkList.length) { toast.info('Khách hàng chưa có hóa đơn nào'); return; }

      // Lấy invoice cho từng booking
      const invResults = await Promise.all(
        bkList.map((b: any) =>
          fetch(`${API_BASE}/api/payments/${b.booking_id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      const invList = invResults.filter(Boolean);
      if (!invList.length) { toast.info('Không tìm thấy hóa đơn'); return; }
      setInvoices(invList);
      toast.success(`Tìm thấy ${invList.length} hóa đơn`);
    } catch { toast.error('Lỗi kết nối'); }
    finally { setIsSearching(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      {/* Tìm kiếm */}
      <div className="flex gap-3 mb-6">
        <input type="text" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Nhập SĐT khách hàng để tìm hóa đơn..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        <button onClick={handleSearch} disabled={isSearching}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Tìm hóa đơn
        </button>
      </div>

      {/* Danh sách hóa đơn */}
      {invoices.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Nhập SĐT để tra cứu lịch sử hóa đơn</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-2">Tìm thấy {invoices.length} hóa đơn</p>
          {invoices.map(inv => (
            <div key={inv.invoice_id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">Hóa đơn #{inv.invoice_id}</p>
                  <p className="text-sm text-gray-500">Booking #{inv.booking_id} • {inv.room_number} ({inv.room_type})</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Đã thanh toán</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-gray-400">Khách hàng</p><p className="font-medium">{inv.customer_name}</p></div>
                <div><p className="text-gray-400">Tiền phòng</p><p className="font-medium">{Number(inv.room_charge).toLocaleString('vi-VN')} đ</p></div>
                <div><p className="text-gray-400">Phụ thu</p><p className="font-medium">{Number(inv.service_charge).toLocaleString('vi-VN')} đ</p></div>
                <div><p className="text-gray-400">Tổng thanh toán</p><p className="font-bold text-blue-600">{Number(inv.total_amount).toLocaleString('vi-VN')} đ</p></div>
              </div>
              {inv.payment_date && (
                <p className="text-xs text-gray-400 mt-2">Ngày thanh toán: {new Date(inv.payment_date).toLocaleString('vi-VN')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function PaymentManagement() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'thanhtoan' | 'tracuu'>('thanhtoan');

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Thanh toán</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('thanhtoan')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${tab === 'thanhtoan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <LogOut className="w-4 h-4" /> Thanh toán & Check-out
        </button>
        <button onClick={() => setTab('tracuu')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${tab === 'tracuu' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <Receipt className="w-4 h-4" /> Tra cứu hóa đơn
        </button>
      </div>

      {tab === 'thanhtoan' && <TabThanhToan token={token!} />}
      {tab === 'tracuu'    && <TabTraCuuHoaDon token={token!} />}
    </div>
  );
}