// CustomerBookings.tsx — Đặt phòng đang active + Đổi ngày + Order dịch vụ + Lịch sử
import { useState, useEffect, useCallback } from 'react';
import { Calendar, Receipt, Loader2, Edit2, ShoppingCart, X, Save, Package } from 'lucide-react';
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

// ── Modal đổi ngày ────────────────────────────────────────────────────────────
function ModalDoiNgay({ booking, token, onClose, onDone }: { booking: any; token: string; onClose: () => void; onDone: () => void }) {
  const today       = new Date().toISOString().split('T')[0];
  const origCheckout = booking.check_out_date?.split('T')[0] || '';
  const [newCheckout, setNewCheckout] = useState(origCheckout);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  const origDate    = new Date(origCheckout);
  const newDate     = newCheckout ? new Date(newCheckout) : null;
  const extraDays   = newDate ? Math.ceil((newDate.getTime() - origDate.getTime()) / 86400000) : 0;
  const extraCharge = extraDays > 0 ? extraDays * Number(booking.price_per_night || 0) : 0;
  const isShorter   = newDate && newDate < origDate;

  const handle = async () => {
    if (!newCheckout) { toast.error('Vui lòng chọn ngày trả phòng mới'); return; }
    if (newCheckout <= today) { toast.error('Ngày trả phòng phải sau ngày hôm nay'); return; }
    if (isShorter) { toast.error('Không thể rút ngắn ngày ở. Chỉ được gia hạn thêm.'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customer/bookings/${booking.booking_id}/dates`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ check_out_date: newCheckout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
      toast.success(data.message);
    } catch (err: any) { toast.error(err.message || 'Lỗi đổi ngày'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) { result ? onDone() : onClose(); } }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Gia hạn ngày trả phòng</h2>
          <button onClick={() => result ? onDone() : onClose()} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Phòng:</span> <span className="font-medium">{booking.room_number} ({booking.room_type})</span></p>
            <p><span className="text-gray-500">Nhận phòng:</span> <span className="font-medium">{formatDate(booking.check_in_date)}</span></p>
            <p><span className="text-gray-500">Trả phòng hiện tại:</span> <span className="font-medium">{formatDate(booking.check_out_date)}</span></p>
            <p><span className="text-gray-500">Giá/đêm:</span> <span className="font-medium">{Number(booking.price_per_night || 0).toLocaleString('vi-VN')} đ</span></p>
          </div>
          {!result ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trả phòng mới <span className="text-red-500">*</span></label>
                <input type="date" value={newCheckout} min={origCheckout} onChange={(e) => setNewCheckout(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Chỉ được gia hạn thêm, không thể rút ngắn</p>
              </div>
              {isShorter && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  ❌ Không thể rút ngắn trước ngày {formatDate(origCheckout)}
                </div>
              )}
              {extraDays > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-orange-800 mb-1">⚠️ Phụ thu gia hạn</p>
                  <p><span className="text-gray-600">Gia hạn thêm:</span> <span className="font-bold">{extraDays} đêm</span></p>
                  <p><span className="text-gray-600">Phụ thu:</span> <span className="font-bold text-orange-700">{extraCharge.toLocaleString('vi-VN')} đ</span></p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <p className="font-bold text-green-800 mb-2">✅ Gia hạn thành công!</p>
              <p><span className="text-gray-600">Ngày mới:</span> <span className="font-bold">{formatDate(result.check_out_date)}</span></p>
              {result.extra_days > 0 && (
                <p><span className="text-gray-600">Phụ thu:</span> <span className="font-bold text-orange-600">{Number(result.extra_charge).toLocaleString('vi-VN')} đ</span></p>
              )}
              <p className="text-xs text-gray-400 mt-1">Vui lòng thanh toán phụ thu tại quầy lễ tân</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t">
          {!result ? (
            <>
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={handle} disabled={saving || !!isShorter || newCheckout === origCheckout}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Xác nhận gia hạn
              </button>
            </>
          ) : (
            <button onClick={onDone} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Đóng</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Order dịch vụ ───────────────────────────────────────────────────────
function ModalOrderDichVu({ booking, token, onClose }: { booking: any; token: string; onClose: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [ordering, setOrdering] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/services`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setServices(Array.isArray(d) ? d.filter((s: any) => s.is_available && s.stock_quantity > 0) : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleOrder = async (service: any) => {
    setOrdering(service.service_id);
    try {
      const res  = await fetch(`${API_BASE}/api/customer/services/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service_id: service.service_id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Đặt "${service.service_name}" thành công!`);
      // Cập nhật số lượng tồn trong UI
      setServices(prev => prev.map(s => s.service_id === service.service_id ? { ...s, stock_quantity: s.stock_quantity - 1 } : s)
        .filter(s => s.stock_quantity > 0));
    } catch (err: any) { toast.error(err.message || 'Lỗi đặt dịch vụ'); }
    finally { setOrdering(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Order dịch vụ</h2>
            <p className="text-sm text-gray-500">Phòng {booking.room_number} · Booking #{booking.booking_id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Không có dịch vụ nào hiện tại</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map(s => (
                <div key={s.service_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{s.service_name}</p>
                    <p className="text-sm text-gray-500">{Number(s.price).toLocaleString('vi-VN')} đ · Còn {s.stock_quantity} {s.unit}</p>
                  </div>
                  <button onClick={() => handleOrder(s)} disabled={ordering === s.service_id}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1">
                    {ordering === s.service_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 border-t">
          <button onClick={onClose} className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Đặt phòng đang active ────────────────────────────────────────────────
function TabActive({ token, bookings, reload }: { token: string; bookings: any[]; reload: () => void }) {
  const [doiNgayFor, setDoiNgayFor]     = useState<any | null>(null);
  const [orderFor,   setOrderFor]       = useState<any | null>(null);

  const activeBookings = bookings.filter(b => ['confirmed','checked_in'].includes(b.status));

  if (!activeBookings.length) return (
    <div className="text-center py-16 text-gray-400">
      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>Bạn không có phòng đang đặt hoặc đang ở</p>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {activeBookings.map(b => {
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
                <div><p className="text-gray-400 text-xs">Số đêm / Tiền phòng</p><p className="font-medium">{nights} đêm · {total.toLocaleString('vi-VN')} đ</p></div>
              </div>
              {b.deposit_amount > 0 && <p className="text-xs text-orange-600 mb-3">Tiền cọc: {Number(b.deposit_amount).toLocaleString('vi-VN')} đ</p>}
              <div className="flex gap-2 pt-3 border-t border-white/50">
                {/* Đổi ngày: chỉ cho confirmed hoặc checked_in */}
                <button onClick={() => setDoiNgayFor(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
                  <Edit2 className="w-3.5 h-3.5" /> Đổi ngày trả phòng
                </button>
                {/* Order dịch vụ: chỉ khi đang ở */}
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

// ── Tab: Lịch sử ─────────────────────────────────────────────────────────────
function TabHistory({ bookings }: { bookings: any[] }) {
  const [tab, setTab] = useState<'bookings'|'invoices'>('bookings');
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);

  useEffect(() => {
    if (tab !== 'invoices' || !token) return;
    setLoadingInv(true);
    fetch(`${API_BASE}/api/customer/my-invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setInvoices(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoadingInv(false));
  }, [tab, token]);

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
          {doneBookings.map(b => {
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
        loadingInv ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> :
        invoices.length === 0 ? <p className="text-center py-12 text-gray-400">Chưa có hóa đơn nào</p> :
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.invoice_id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">Hóa đơn #{inv.invoice_id}</p>
                  <p className="text-xs text-gray-400">Phòng {inv.room_number} ({inv.room_type}) · Booking #{inv.booking_id}</p>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Đã thanh toán</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Tiền phòng</span><span>{Number(inv.room_charge).toLocaleString('vi-VN')} đ</span></div>
                {Number(inv.service_charge) > 0 && <div className="flex justify-between"><span className="text-gray-500">Phụ thu/DV</span><span>{Number(inv.service_charge).toLocaleString('vi-VN')} đ</span></div>}
                <div className="flex justify-between font-bold pt-1 border-t border-gray-200"><span>Tổng</span><span className="text-blue-600">{Number(inv.total_amount).toLocaleString('vi-VN')} đ</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function CustomerBookings() {
  const { token } = useAuth();
  const [tab, setTab]         = useState<'active'|'history'>('active');
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

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> : (
        <>
          {tab === 'active'  && <TabActive  token={token!} bookings={bookings} reload={load} />}
          {tab === 'history' && <TabHistory bookings={bookings} />}
        </>
      )}
    </div>
  );
}

export default CustomerBookings;