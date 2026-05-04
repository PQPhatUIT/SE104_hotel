import { useState } from 'react';
import { Search, Plus, Printer, DollarSign } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface PaymentForm {
  customerName: string;
  customerPhone: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  roomPrice: number;
  deposit: number;
  services: Service[];
}

const availableServices = [
  { id: 'SV001', name: 'Giặt là', price: 50000 },
  { id: 'SV002', name: 'Minibar', price: 100000 },
  { id: 'SV003', name: 'Massage', price: 300000 },
  { id: 'SV004', name: 'Ăn sáng', price: 150000 },
  { id: 'SV005', name: 'Taxi', price: 200000 },
];

export function PaymentManagement() {
  const [payment, setPayment] = useState<PaymentForm>({
    customerName: '',
    customerPhone: '',
    roomNumber: '',
    checkInDate: '',
    checkOutDate: '',
    roomPrice: 0,
    deposit: 0,
    services: [],
  });

  const [searchPhone, setSearchPhone] = useState('');

  const handleSearchCustomer = () => {
    // Mock customer lookup
    setPayment({
      ...payment,
      customerName: 'Nguyễn Văn An',
      customerPhone: '0901234567',
      roomNumber: 'P301',
      checkInDate: '2026-05-01',
      checkOutDate: '2026-05-04',
      roomPrice: 1500000,
      deposit: 500000,
      services: [
        { id: 'SV001', name: 'Giặt là', quantity: 2, price: 50000 },
        { id: 'SV004', name: 'Ăn sáng', quantity: 3, price: 150000 },
      ],
    });
  };

  const calculateDays = () => {
    if (!payment.checkInDate || !payment.checkOutDate) return 0;
    const start = new Date(payment.checkInDate);
    const end = new Date(payment.checkOutDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const totalRoomCost = payment.roomPrice * calculateDays();
  const totalServiceCost = payment.services.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  const totalAmount = totalRoomCost + totalServiceCost - payment.deposit;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Thanh toán</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Customer Search */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tra cứu khách hàng</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="0901234567"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSearchCustomer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {payment.customerName && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Khách hàng</p>
                      <p className="font-medium text-gray-800">{payment.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Số phòng</p>
                      <p className="font-medium text-gray-800">{payment.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ngày nhận - trả</p>
                      <p className="font-medium text-gray-800">
                        {payment.checkInDate} đến {payment.checkOutDate}
                      </p>
                      <p className="text-sm text-blue-600">({calculateDays()} đêm)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Payment Details */}
        <div className="col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Hóa đơn thanh toán</h2>

            {/* Room Charges */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-3">Chi phí phòng</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Giá phòng/đêm</span>
                  <span className="font-medium">{payment.roomPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Số đêm</span>
                  <span className="font-medium">{calculateDays()} đêm</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-800">Tổng tiền phòng</span>
                  <span className="font-semibold text-blue-600">{totalRoomCost.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">Dịch vụ sử dụng</h3>
              </div>

              {payment.services.length > 0 ? (
                <div className="space-y-2">
                  {payment.services.map((service, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{service.name}</p>
                        <p className="text-sm text-gray-500">
                          {service.quantity} × {service.price.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <span className="font-medium text-gray-800">
                        {(service.quantity * service.price).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-800">Tổng tiền dịch vụ</span>
                    <span className="font-semibold text-blue-600">{totalServiceCost.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Không có dịch vụ</p>
              )}
            </div>

            {/* Total */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tiền phòng</span>
                  <span className="font-medium">{totalRoomCost.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tiền dịch vụ</span>
                  <span className="font-medium">{totalServiceCost.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tiền đặt cọc</span>
                  <span className="font-medium text-red-600">-{payment.deposit.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
                  <span className="text-xl font-bold text-gray-800">Tổng thanh toán</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <DollarSign className="w-5 h-5" />
                  Thanh toán
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                  <Printer className="w-5 h-5" />
                  In hóa đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
