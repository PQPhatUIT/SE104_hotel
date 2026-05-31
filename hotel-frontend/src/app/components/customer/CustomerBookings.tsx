// CustomerBookings.tsx — Fix 4 issues:
// 1. Đổi ngày: cho phép tăng HOẶC giảm (min = hôm nay)
// 2. Hóa đơn: fix fetch trả về array trực tiếp
// 3. Order dịch vụ: thêm chọn số lượng, tự động tính vào hóa đơn
import { useState, useEffect, useCallback } from 'react';
import { Calendar, Receipt, Loader2, Edit2, ShoppingCart, X, Save, Package, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_LABEL: Record<string, string> = {
  confirmed:   'Đã đặt — chờ nhận phòng',
  checked_in:  'Đang lưu trú',
  checked_out: 'Đã trả phòng',
  cancelled:   'Đã hủy',
};
const STATUS_COLOR: Record<string, string> = {
  confirmed:   'bg-blue-100 text-blue-700',
  checked_in:  'bg-green-100 text-green-700',
  checked_out: 'bg-gray-100 text-gray-500',
  cancelled:   'bg-red-100 text-red-600',
};

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

// ── Modal đổi ngày ────────────────────────────────────────────────────────────
function ModalDoiNgay({ booking, token, onClose, onDone }: any) {
  const today       = new Date().toISOString().split('T')[0];
  const [newCheckout, setNewCheckout] = useState(booking.check_out_date?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!newCheckout) { toast.error('Vui lòng chọn ngày trả phòng mới'); return; }
    // FIX: cho phép giảm, chỉ cần >= hôm nay
    if (newCheckout < today) { toast.error('Ngày trả phòng không được nhỏ hơn hôm nay'); return; }
    if (newCheckout <= booking.check_in_date) { toast.error('Ngày trả phòng phải sau ngày nhận phòng'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customer/bookings/${booking.booking_id}/dates`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ check_out_date: newCheckout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Đổi ngày thành công!');
      onDone();
    } catch (err: any) { toast.error(err.message || 'Lỗi đổi ngày'); }
    finally { setSaving(false); }
  };

  const oldNights = Math.max(0, Math.ceil(
    (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000));
  const newNights = newCheckout ? Math.max(0, Math.ceil(
    (new Date(newCheckout).getTime() - new Date(booking.check_in_date).getTime()) / 86400000)) : 0;
  const pricePerNight = Number(booking.price_per_night || 0);
  const oldTotal = oldNights * pricePerNight;
  const newTotal = newNights * pricePerNight;
  const diff     = newTotal - oldTotal;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Thay đổi ngày trả phòng</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Phòng:</span> <span className="font-medium">{booking.room_number} ({booking.room_type})</span></p>
            <p><span className="text-gray-500">Nhận phòng:</span> <span className="font-medium">{formatDate(booking.check_in_date)}</span></p>
            <p><span className="text-gray-500">Trả phòng hiện tại:</span> <span className="font-medium">{formatDate(booking.check_out_date)} ({oldNights} đêm)</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày trả phòng mới <span className="text-red-500">*</span>
            </label>
            <input type="date" value={newCheckout}
              min={today}  // FIX: min = today, cho phép giảm về hôm nay
              onChange={(e) => setNewCheckout(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">
              Có thể tăng hoặc giảm số ngày. Ngày mới phải ≥ hôm nay ({new Date().toLocaleDateString('vi-VN')})
            </p>
          </div>
          {newNights > 0 && (
            <div className={`rounded-lg p-3 text-sm ${diff > 0 ? 'bg-orange-50' : diff < 0 ? 'bg-green-50' : 'bg-blue-50'}`}>
              <p className="font-semibold mb-1">
                {diff > 0 ? '↑ Gia hạn thêm' : diff < 0 ? '↓ Rút ngắn' : 'Không thay đổi'}
              </p>
              <p><span className="text-gray-600">Số đêm mới:</span> <span className="font-bold">{newNights} đêm</span>
                {diff !== 0 && <span className="ml-2 text-gray-400">({diff > 0 ? '+' : ''}{newNights - oldNights} đêm)</span>}
              </p>
              <p><span className="text-gray-600">Tiền phòng mới:</span> <span className="font-bold">{fmtMoney(newTotal)}</span></p>
              {diff !== 0 && (
                <p className={`font-semibold ${diff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {diff > 0 ? 'Phụ thu thêm:' : 'Giảm:'} {fmtMoney(Math.abs(diff))}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Order dịch vụ — FIX: chọn số lượng ────────────────────────────────
function ModalOrderDichVu({ booking, token, onClose }: any) {
  const [services, setServices]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [ordering, setOrdering]   = useState<number | null>(null);
  const [orderedList, setOrderedList] = useState<any[]>([]); // DS đã order trong session

  useEffect(() => {
    fetch(`${API_BASE}/api/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d.filter((s: any) => s.is_available && s.stock_quantity > 0) : [];
        setServices(list);
        // Khởi tạo số lượng = 1 cho mỗi dịch vụ
        const initQty: Record<number, number> = {};
        list.forEach((s: any) => { initQty[s.service_id] = 1; });
        setQuantities(initQty);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const setQty = (id: number, val: number, max: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, Math.min(max, val)) }));
  };

  const handleOrder = async (service: any) => {
    const qty = quantities[service.service_id] || 1;
    setOrdering(service.service_id);
    try {
      const res  = await fetch(`${API_BASE}/api/customer/services/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service_id: service.service_id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Đặt "${service.service_name}" x${qty} thành công! (+${fmtMoney(data.subtotal)})`);
      // Thêm vào danh sách đã order
      setOrderedList(prev => [...prev, { ...service, qty, subtotal: data.subtotal }]);
      // Cập nhật tồn kho trong UI
      setServices(prev => prev
        .map(s => s.service_id === service.service_id
          ? { ...s, stock_quantity: s.stock_quantity - qty }
          : s
        )
        .filter(s => s.stock_quantity > 0 || s.unit === 'Lượt')
      );
      setQuantities(prev => ({ ...prev, [service.service_id]: 1 }));
    } catch (err: any) { toast.error(err.message || 'Lỗi đặt dịch vụ'); }
    finally { setOrdering(null); }
  };

  const sessionTotal = orderedList.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Order dịch vụ</h2>
            <p className="text-sm text-gray-500">Phòng {booking.room_number} · Booking #{booking.booking_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Không có dịch vụ nào</p>
            </div>
          ) : services.map(s => {
            const qty    = quantities[s.service_id] || 1;
            const subtot = Number(s.price) * qty;
            return (
              <div key={s.service_id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-800">{s.service_name}</p>
                    <p className="text-sm text-gray-500">
                      {fmtMoney(Number(s.price))} / {s.unit}
                      {s.unit !== 'Lượt' && <span className="ml-2 text-orange-500">Còn {s.stock_quantity} {s.unit}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Chọn số lượng */}
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button onClick={() => setQty(s.service_id, qty - 1, s.unit === 'Lượt' ? 99 : s.stock_quantity)}
                      className="px-3 py-1.5 hover:bg-gray-100 text-gray-600">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input type="number" value={qty} min={1}
                      max={s.unit === 'Lượt' ? 99 : s.stock_quantity}
                      onChange={e => setQty(s.service_id, parseInt(e.target.value) || 1, s.unit === 'Lượt' ? 99 : s.stock_quantity)}
                      className="w-14 text-center py-1.5 border-x border-gray-300 text-sm font-medium focus:outline-none" />
                    <button onClick={() => setQty(s.service_id, qty + 1, s.unit === 'Lượt' ? 99 : s.stock_quantity)}
                      className="px-3 py-1.5 hover:bg-gray-100 text-gray-600">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Tổng tiền */}
                  <span className="font-semibold text-blue-600 flex-1">{fmtMoney(subtot)}</span>
                  {/* Nút order */}
                  <button onClick={() => handleOrder(s)} disabled={ordering === s.service_id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
                    {ordering === s.service_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                    Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Đã order trong session */}
        {orderedList.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-green-50">
            <p className="text-sm font-semibold text-green-700 mb-2">✓ Đã order trong lần này:</p>
            {orderedList.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-green-700">
                <span>{item.service_name} x{item.qty}</span>
                <span>{fmtMoney(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-green-800 border-t border-green-200 mt-1 pt-1">
              <span>Tổng dịch vụ phiên này</span>
              <span>{fmtMoney(sessionTotal)}</span>
            </div>
            <p className="text-xs text-green-600 mt-1">✓ Đã tự động cộng vào hóa đơn thanh toán</p>
          </div>
        )}

        <div className="p-5 border-t">
          <button onClick={onClose} className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Đang active ──────────────────────────────────────────────────────────
function TabActive({ token, bookings, reload }: any) {
  const [doiNgayFor, setDoiNgayFor] = useState<any | null>(null);
  const [orderFor,   setOrderFor]   = useState<any | null>(null);
  const activeBookings = bookings.filter((b: any) => ['confirmed','checked_in'].includes(b.status));

  if (!activeBookings.length) return (
    <div className="text-center py-16 text-gray-400">
      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>Bạn không có phòng đang đặt hoặc đang ở</p>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {activeBookings.map((b: any) => {
          const nights = Math.max(1, Math.ceil((new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000));
          const total  = nights * Number(b.price_per_night || 0);
          return (
            <div key={b.booking_id} className={`border rounded-xl p-5 ${b.status === 'checked_in' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800 text-lg">Phòng {b.room_number} <span className="text-gray-500 font-normal text-sm">({b.room_type})</span></p>
                  <p className="text-sm text-gray-500">Booking #{b.booking_id}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status]}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                <div><p className="text-gray-400 text-xs">Nhận phòng</p><p className="font-medium">{formatDate(b.check_in_date)}</p></div>
                <div><p className="text-gray-400 text-xs">Trả phòng</p><p className="font-medium">{formatDate(b.check_out_date)}</p></div>
                <div><p className="text-gray-400 text-xs">Số đêm / Tiền phòng</p><p className="font-medium">{nights} đêm · {fmtMoney(total)}</p></div>
              </div>
              {b.deposit_amount > 0 && <p className="text-xs text-orange-600 mb-3">Tiền cọc: {fmtMoney(Number(b.deposit_amount))}</p>}
              <div className="flex gap-2 pt-3 border-t border-white/50">
                <button onClick={() => setDoiNgayFor(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
                  <Edit2 className="w-3.5 h-3.5" /> Đổi ngày trả phòng
                </button>
                {b.status === 'checked_in' && (
                  <button onClick={() => setOrderFor(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50">
                    <ShoppingCart className="w-3.5 h-3.5" /> Order dịch vụ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {doiNgayFor && <ModalDoiNgay booking={doiNgayFor} token={token} onClose={() => setDoiNgayFor(null)} onDone={() => { setDoiNgayFor(null); reload(); }} />}
      {orderFor   && <ModalOrderDichVu booking={orderFor} token={token} onClose={() => setOrderFor(null)} />}
    </>
  );
}

// ── Tab: Lịch sử — FIX: fetch invoices trả về array trực tiếp ────────────────
function TabHistory({ bookings }: { bookings: any[] }) {
  const [tab, setTab] = useState<'bookings'|'invoices'>('bookings');
  const { token } = useAuth();
  const [invoices, setInvoices]     = useState<any[]>([]);
  const [invDetails, setInvDetails] = useState<Record<number, any[]>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);

  useEffect(() => {
    if (tab !== 'invoices' || !token) return;
    setLoadingInv(true);
    fetch(`${API_BASE}/api/customer/my-invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.invoices ?? []);
        setInvoices(list);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInv(false));
  }, [tab, token]);

  // Load Invoice_Details khi expand
  const toggleExpand = async (invoiceId: number) => {
    if (expandedId === invoiceId) { setExpandedId(null); return; }
    setExpandedId(invoiceId);
    if (invDetails[invoiceId] !== undefined) return;
    try {
      const res = await fetch(`${API_BASE}/api/invoices/${invoiceId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setInvDetails(prev => ({ ...prev, [invoiceId]: Array.isArray(d) ? d : [] }));
    } catch {
      setInvDetails(prev => ({ ...prev, [invoiceId]: [] }));
    }
  };

  const PAYMENT_LABEL: Record<string, string> = {
    cash: 'Tiền mặt', card: 'Thẻ ngân hàng', transfer: 'Chuyển khoản',
  };

  const doneBookings = bookings.filter(b => ['checked_out','cancelled'].includes(b.status));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[{k:'bookings',l:'Lịch sử đặt phòng'},{k:'invoices',l:'Hóa đơn thanh toán'}].map(({k,l}) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab===k ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {tab === 'bookings' && (
        doneBookings.length === 0 ? <p className="text-center py-12 text-gray-400">Chưa có lịch sử</p> :
        <div className="space-y-3">
          {doneBookings.map((b: any) => {
            const nights = Math.max(1, Math.ceil((new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000));
            return (
              <div key={b.booking_id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800">Phòng {b.room_number} <span className="font-normal text-gray-400 text-sm">({b.room_type})</span></p>
                    <p className="text-xs text-gray-400">Booking #{b.booking_id}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-gray-400 text-xs">Nhận phòng</p><p>{formatDate(b.check_in_date)}</p></div>
                  <div><p className="text-gray-400 text-xs">Trả phòng</p><p>{formatDate(b.check_out_date)}</p></div>
                  <div><p className="text-gray-400 text-xs">Số đêm</p><p>{nights} đêm</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'invoices' && (
        loadingInv
          ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          : invoices.length === 0
            ? <p className="text-center py-12 text-gray-400">Chưa có hóa đơn nào</p>
            : <div className="space-y-4">
                {invoices.map((inv: any) => {
                  const nights = Math.max(1, Math.ceil(
                    (new Date(inv.check_out_date).getTime() - new Date(inv.check_in_date).getTime()) / 86400000
                  ));
                  const isExpanded = expandedId === inv.invoice_id;
                  const details    = invDetails[inv.invoice_id];

                  return (
                    <div key={inv.invoice_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header hóa đơn */}
                      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                        <div>
                          <p className="font-bold text-gray-800">Hóa đơn #{inv.invoice_id}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Booking #{inv.booking_id} · Phòng {inv.room_number} ({inv.room_type})</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Đã thanh toán</span>
                          <button onClick={() => toggleExpand(inv.invoice_id)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                            {isExpanded ? 'Thu gọn ▲' : 'Chi tiết ▼'}
                          </button>
                        </div>
                      </div>

                      {/* Thông tin cơ bản — luôn hiển thị */}
                      <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ngày đặt phòng</span>
                          <span className="font-medium">{formatDate(inv.booking_created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ngày thanh toán</span>
                          <span className="font-medium">{formatDate(inv.payment_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Nhận phòng</span>
                          <span className="font-medium">{formatDate(inv.check_in_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Trả phòng</span>
                          <span className="font-medium">{formatDate(inv.check_out_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Số đêm</span>
                          <span className="font-medium">{nights} đêm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hình thức TT</span>
                          <span className="font-medium">{PAYMENT_LABEL[inv.payment_method] || inv.payment_method}</span>
                        </div>
                      </div>

                      {/* Chi tiết tài chính — mở rộng */}
                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-3">
                          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                            <p className="font-semibold text-gray-700 mb-2">Chi tiết thanh toán</p>

                            <div className="flex justify-between">
                              <span className="text-gray-500">Tiền phòng ({nights} đêm × {fmtMoney(Number(inv.price_per_night))})</span>
                              <span>{fmtMoney(Number(inv.room_charge))}</span>
                            </div>

                            {Number(inv.service_charge) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Tiền dịch vụ / vật tư</span>
                                <span>{fmtMoney(Number(inv.service_charge))}</span>
                              </div>
                            )}

                            {/* Danh sách vật tư đã order */}
                            {details === undefined && Number(inv.service_charge) > 0 && (
                              <p className="text-xs text-gray-400 ml-4 italic">Đang tải chi tiết dịch vụ...</p>
                            )}
                            {details && details.length > 0 && (
                              <div className="ml-4 border-l-2 border-blue-100 pl-3 space-y-1">
                                <p className="text-xs font-medium text-gray-500 mb-1">Vật tư / Dịch vụ đã dùng:</p>
                                {details.map((d: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs text-gray-500">
                                    <span>· {d.service_name} × {d.quantity} {d.unit}</span>
                                    <span>{fmtMoney(Number(d.subtotal))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {details && details.length === 0 && Number(inv.service_charge) > 0 && (
                              <p className="text-xs text-gray-400 ml-4 italic">Không có chi tiết dịch vụ</p>
                            )}

                            {Number(inv.deposit_amount) > 0 && (
                              <div className="flex justify-between text-orange-600">
                                <span>Tiền đặt cọc (đã trừ)</span>
                                <span>- {fmtMoney(Number(inv.deposit_amount))}</span>
                              </div>
                            )}

                            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                              <span>Tổng thanh toán</span>
                              <span className="text-blue-600">{fmtMoney(Number(inv.total_amount))}</span>
                            </div>

                            {Number(inv.amount_paid) > 0 && (
                              <>
                                <div className="flex justify-between text-gray-500 text-xs">
                                  <span>Khách đưa</span>
                                  <span>{fmtMoney(Number(inv.amount_paid))}</span>
                                </div>
                                {Number(inv.change_amount) > 0 && (
                                  <div className="flex justify-between text-green-600 text-xs">
                                    <span>Tiền thừa trả lại</span>
                                    <span>{fmtMoney(Number(inv.change_amount))}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function CustomerBookings() {
  const { token } = useAuth();
  const [tab, setTab]           = useState<'active'|'history'>('active');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/customer/my-bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Đặt phòng của tôi</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('active')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 ${tab==='active' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Calendar className="w-4 h-4" /> Đang đặt / Đang ở
        </button>
        <button onClick={() => setTab('history')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 ${tab==='history' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Receipt className="w-4 h-4" /> Lịch sử
        </button>
      </div>
      {loading
        ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        : <>
            {tab === 'active'  && <TabActive  token={token!} bookings={bookings} reload={load} />}
            {tab === 'history' && <TabHistory bookings={bookings} />}
          </>
      }
    </div>
  );
}

export default CustomerBookings;
