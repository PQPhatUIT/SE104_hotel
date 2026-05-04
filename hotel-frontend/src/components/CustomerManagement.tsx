import { useState } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  idCard: string;
  address: string;
  totalVisits: number;
}

const mockCustomers: Customer[] = [
  { id: 'KH001', name: 'Nguyễn Văn An', phone: '0901234567', email: 'nva@email.com', idCard: '001234567890', address: 'TP.HCM', totalVisits: 5 },
  { id: 'KH002', name: 'Trần Thị Bình', phone: '0912345678', email: 'ttb@email.com', idCard: '001234567891', address: 'Hà Nội', totalVisits: 3 },
  { id: 'KH003', name: 'Lê Hoàng Cường', phone: '0923456789', email: 'lhc@email.com', idCard: '001234567892', address: 'Đà Nẵng', totalVisits: 8 },
  { id: 'KH004', name: 'Phạm Minh Duy', phone: '0934567890', email: 'pmd@email.com', idCard: '001234567893', address: 'TP.HCM', totalVisits: 2 },
  { id: 'KH005', name: 'Võ Thị Em', phone: '0945678901', email: 'vte@email.com', idCard: '001234567894', address: 'Cần Thơ', totalVisits: 6 },
  { id: 'KH006', name: 'Đỗ Văn Phúc', phone: '0956789012', email: 'dvp@email.com', idCard: '001234567895', address: 'Nha Trang', totalVisits: 1 },
  { id: 'KH007', name: 'Hoàng Thị Giang', phone: '0967890123', email: 'htg@email.com', idCard: '001234567896', address: 'Hải Phòng', totalVisits: 4 },
  { id: 'KH008', name: 'Bùi Minh Hải', phone: '0978901234', email: 'bmh@email.com', idCard: '001234567897', address: 'TP.HCM', totalVisits: 7 },
];

export function CustomerManagement() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.idCard.includes(searchQuery)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Khách hàng</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Thêm khách hàng
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, số điện thoại hoặc CMND..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã KH</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Họ tên</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Số điện thoại</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CMND/CCCD</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Địa chỉ</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lượt lưu trú</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{customer.id}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{customer.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.idCard}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.address}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {customer.totalVisits}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
