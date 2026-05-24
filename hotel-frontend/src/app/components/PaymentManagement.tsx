// PaymentManagement.tsx — Kết nối API thật
import { useState } from 'react';
import { Search, DollarSign, Printer, Loader2 } from 'lucide-react';
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
  booking_status: string;
}

interface Invoice {
  invoice_id: number;
  room_charge: number;
  service_charge: number;
  total_amount: number;
}

export function PaymentManagement() {
  const { token } = useAuth();
  const [searchPhone, setSearchPhone]     = useState('');
  const [bookings, setBookings]           = useState<BookingInfo[]>([]);
  const [selectedBooking, setSelected]    = useState<BookingInfo | null>(null);
  const [extraCharge, setExtraCharge]     = useState(0);
  const [isSearching, setIsSearching]     = useState(false);
  const [isPaying, setIsPaying]           = useState(false);
  const [invoice, setInvoice]             = useState<Invoice | null>(null);

  // Tìm booking đang checked_in theo SĐT
  const handleSearch = async () => {
    if (!searchPhone.trim()) { toast.error('Nhập số điện thoại để tìm'); return; }
    setIsSearching(true);
    setBookings([]);
    setSelected(null);
    setInvoice(null);
    try {
      // Tìm customer theo phone
      const cusRes = await fetch(`${API_BASE}/api/customers?phone=${encodeURIComponent(searchPhone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cusData = await cusRes.json();
      const cusList = Array.isArray(cusData.customers) ? cusData.customers : Array.isArray(cusData) ? cusData : [];
      if (!cusList.length) { toast.error('Không tìm thấy khách hàng với SĐT này'); return; }

      const customerId = cusList[0].customer_id;

      // Lấy bookings của customer đang checked_in
      const bkRes = await fetch(`${API_BASE}/api/bookings?customer_id=${customerId}&status=checked_in`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bkData = await bkRes.json();
      const bkList = Array.isArray(bkData) ? bkData : [];
      if (!bkList.length) { toast.error('Khách hàng không có phòng đang lưu trú'); return; }

      setBookings(bkList);
      setSelected(bkList[0]);
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setIsSearching(false);
    }
  };

  const nights = selectedBooking
    ? Math.max(1, Math.ceil(
        (new Date(selectedBooking.check_out_date).getTime() - new Date(selectedBooking.check_in_date).getTime()) / 86400000
      ))
    : 0;

  const roomCharge    = selectedBooking ? nights * selectedBooking.price_per_night : 0;
  const deposit       = selectedBooking ? selectedBooking.deposit_amount : 0;
  const totalAmount   = Math.max(roomCharge + extraCharge - deposit, 0);

  const handlePayment = async () => {
    if (!selectedBooking) return;
    setIsPaying(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ booking_id: selectedBooking.booking_id, extra_charges: extraCharge }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Thanh toán thành công!');
      setInvoice(data.invoice);
      setBookings([]);
      setSelected(null);
      setSearchPhone('');
      setExtraCharge(0);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thanh toán');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Thanh toán</h1>
      </div>

      {/* Kết quả hoá đơn vừa thanh toán */}
      {invoice && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-green-800 mb-3">✅ Thanh toán thành công — Hoá đơn #{invoice.invoice_id}</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Tiền phòng</p><p className="font-bold">{invoice.room_charge?.toLocaleString('vi-VN')} đ</p></div>
            <div><p className="text-gray-500">Phụ thu</p><p className="font-bold">{invoice.service_charge?.toLocaleString('vi-VN')} đ</p></div>
            <div><p className="text-gray-500">Tổng thanh toán</p><p className="font-bold text-blue-600 text-lg">{invoice.total_amount?.toLocaleString('vi-VN')} đ</p></div>
          </div>
          <button onClick={() => setInvoice(null)} className="mt-4 text-sm text-green-700 underline">Đóng</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Tìm kiếm */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tra cứu khách hàng</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="0901234567"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Chọn booking nếu có nhiều */}
              {bookings.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn phòng</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    onChange={(e) => setSelected(bookings.find(b => b.booking_id === Number(e.target.value)) || null)}
                  >
                    {bookings.map(b => (
                      <option key={b.booking_id} value={b.booking_id}>Phòng {b.room_number} — {b.customer_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedBooking && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div><p className="text-xs text-gray-500">Khách hàng</p><p className="font-medium text-gray-800">{selectedBooking.customer_name}</p></div>
                  <div><p className="text-xs text-gray-500">SĐT</p><p className="font-medium text-gray-800">{selectedBooking.customer_phone}</p></div>
                  <div><p className="text-xs text-gray-500">Phòng</p><p className="font-medium text-gray-800">{selectedBooking.room_number} — {selectedBooking.room_type}</p></div>
                  <div>
                    <p className="text-xs text-gray-500">Ngày nhận - trả</p>
                    <p className="font-medium text-gray-800">{selectedBooking.check_in_date} → {selectedBooking.check_out_date}</p>
                    <p className="text-sm text-blue-600">({nights} đêm)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chi tiết thanh toán */}
        <div className="col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Hoá đơn thanh toán</h2>

            {!selectedBooking ? (
              <div className="text-center py-16 text-gray-400">Tìm kiếm khách hàng để hiển thị hoá đơn</div>
            ) : (
              <>
                {/* Chi phí phòng */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Chi phí phòng</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Giá phòng/đêm</span><span className="font-medium">{selectedBooking.price_per_night.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Số đêm</span><span className="font-medium">{nights} đêm</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold text-gray-800">Tổng tiền phòng</span><span className="font-semibold text-blue-600">{roomCharge.toLocaleString('vi-VN')} đ</span></div>
                  </div>
                </div>

                {/* Phụ thu */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Phụ thu / Dịch vụ thêm</h3>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={extraCharge}
                    onChange={(e) => setExtraCharge(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Tổng */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-700">Tiền phòng</span><span className="font-medium">{roomCharge.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-700">Phụ thu</span><span className="font-medium">{extraCharge.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-700">Tiền đặt cọc</span><span className="font-medium text-red-600">-{deposit.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between pt-3 border-t-2 border-blue-300">
                      <span className="text-xl font-bold text-gray-800">Tổng thanh toán</span>
                      <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={handlePayment} disabled={isPaying} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium">
                      {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                      Thanh toán
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                      <Printer className="w-5 h-5" /> In hoá đơn
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}