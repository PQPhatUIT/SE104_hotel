import { useState } from 'react';
import { Search, Plus, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BookingFormData {
  bookingId: string;
  customerPhone: string;
  customerName: string;
  roomType: 'Standard' | 'Deluxe' | 'Suite';
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  deposit: number;
  notes: string;
}

const roomPrices = {
  Standard: 500000,
  Deluxe: 800000,
  Suite: 1500000,
};

const availableRooms = {
  Standard: ['101', '102', '103', '201', '202'],
  Deluxe: ['301', '302', '303', '401', '402'],
  Suite: ['501', '502', '503'],
};

export function BookingForm() {
  const [formData, setFormData] = useState<BookingFormData>({
    bookingId: `BK${Date.now().toString().slice(-6)}`,
    customerPhone: '',
    customerName: '',
    roomType: 'Standard',
    roomNumber: '',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    deposit: 0,
    notes: '',
  });

  const [searchResult, setSearchResult] = useState<boolean>(false);

  const handleSearchCustomer = () => {
    // Mock customer search
    if (formData.customerPhone.length === 10) {
      setFormData({
        ...formData,
        customerName: 'Nguyễn Văn An', // Mock data
      });
      setSearchResult(true);
      toast.success('Tìm thấy khách hàng');
    } else {
      setSearchResult(false);
      toast.error('Không tìm thấy khách hàng với SĐT này');
    }
  };

  const calculateDays = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const start = new Date(formData.checkInDate);
    const end = new Date(formData.checkOutDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const totalAmount = roomPrices[formData.roomType] * calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName) {
      toast.error('Vui lòng tra cứu khách hàng');
      return;
    }

    if (!formData.roomNumber) {
      toast.error('Vui lòng chọn số phòng');
      return;
    }

    if (!formData.checkInDate || !formData.checkOutDate) {
      toast.error('Vui lòng chọn ngày nhận và trả phòng');
      return;
    }

    if (calculateDays() <= 0) {
      toast.error('Ngày trả phòng phải sau ngày nhận phòng');
      return;
    }

    toast.success('Tạo phiếu đặt phòng thành công!');

    // Reset form
    setFormData({
      bookingId: `BK${Date.now().toString().slice(-6)}`,
      customerPhone: '',
      customerName: '',
      roomType: 'Standard',
      roomNumber: '',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      deposit: 0,
      notes: '',
    });
    setSearchResult(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Lập Phiếu Đặt Phòng (BM 5)</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
          {/* Header with Booking ID */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mã phiếu đặt</p>
                <p className="text-xl font-bold text-blue-600">{formData.bookingId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Ngày lập phiếu</p>
                <p className="font-medium text-gray-800">
                  {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Customer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Thông tin khách hàng
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="0901234567"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCustomer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Tra cứu từ SĐT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số khách <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.numberOfGuests}
                  onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Yêu cầu đặc biệt..."
                />
              </div>
            </div>

            {/* Right Column - Room & Date Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Thông tin phòng & ngày
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hạng phòng <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roomType}
                  onChange={(e) => setFormData({ ...formData, roomType: e.target.value as any, roomNumber: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Standard">Standard - {roomPrices.Standard.toLocaleString('vi-VN')}đ/đêm</option>
                  <option value="Deluxe">Deluxe - {roomPrices.Deluxe.toLocaleString('vi-VN')}đ/đêm</option>
                  <option value="Suite">Suite - {roomPrices.Suite.toLocaleString('vi-VN')}đ/đêm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số phòng <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Chọn phòng --</option>
                  {availableRooms[formData.roomType].map((room) => (
                    <option key={room} value={room}>Phòng {room}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày nhận phòng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày trả phòng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiền đặt cọc <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Số đêm</p>
                  <p className="text-xl font-bold text-gray-800">{calculateDays()} đêm</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tổng tiền phòng</p>
                  <p className="text-xl font-bold text-blue-600">
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tiền cọc</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formData.deposit.toLocaleString('vi-VN')} đ
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Tạo phiếu đặt phòng
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
