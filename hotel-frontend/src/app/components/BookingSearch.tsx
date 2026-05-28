// src/app/components/BookingSearch.tsx
// BM 4.3 — Tra cứu phiếu đặt phòng theo tên khách hàng
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmtDate  = (s: string) => s ? new Date(s).toLocaleDateString('vi-VN') : '—';
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Chờ xác nhận', color: 'bg-gray-100 text-gray-600'  },
  confirmed:   { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700'  },
  checked_in:  { label: 'Đang ở',       color: 'bg-green-100 text-green-700'},
  checked_out: { label: 'Đã trả phòng', color: 'bg-gray-100 text-gray-500'  },
  cancelled:   { label: 'Đã hủy',       color: 'bg-red-100 text-red-600'    },
};

export function BookingSearch() {
  const { token } = useAuth();
  const [keyword, setKeyword]     = useState('');
  const [status, setStatus]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [bookings, setBookings]   = useState<any[]>([]);
  const [searched, setSearched]   = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (status)         params.set('status',  status);

      const res  = await fetch(`${API_BASE}/api/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Tra cứu Phiếu đặt phòng</h1>
      <p className="text-sm text-gray-500">BM 4.3 — Tìm kiếm theo tên khách hàng, trạng thái</p>

      {/* ── Bộ lọc ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Tên khách hàng */}
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên khách hàng
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nhập tên khách..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
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
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
      </div>

      {/* ── Kết quả ─────────────────────────────────────────────────────── */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Kết quả tra cứu
            </h3>
            <span className="text-sm text-gray-400">
              {loading ? 'Đang tải...' : `${bookings.length} phiếu`}
            </span>
          </div>

          {loading ? (
            <div className="p-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Không tìm thấy phiếu đặt phòng nào phù hợp.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map((b: any) => {
                const st      = STATUS_LABEL[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
                const expanded = expandedId === b.booking_id;
                return (
                  <div key={b.booking_id}>
                    {/* Row chính */}
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
  );
}
