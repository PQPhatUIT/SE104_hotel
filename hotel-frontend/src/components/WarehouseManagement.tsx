import { useState } from 'react';
import { Package, AlertTriangle, Plus, Edit } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  price: number;
  lastUpdated: string;
}

const mockInventory: InventoryItem[] = [
  { id: 'INV001', name: 'Mì gói', category: 'Thực phẩm', quantity: 15, minThreshold: 50, unit: 'Thùng', price: 120000, lastUpdated: '2026-05-01' },
  { id: 'INV002', name: 'Nước suối', category: 'Đồ uống', quantity: 30, minThreshold: 100, unit: 'Thùng', price: 80000, lastUpdated: '2026-05-02' },
  { id: 'INV003', name: 'Khăn tắm', category: 'Vật dụng', quantity: 120, minThreshold: 50, unit: 'Chiếc', price: 50000, lastUpdated: '2026-05-03' },
  { id: 'INV004', name: 'Dầu gội', category: 'Vệ sinh', quantity: 25, minThreshold: 30, unit: 'Chai', price: 35000, lastUpdated: '2026-05-01' },
  { id: 'INV005', name: 'Sữa tắm', category: 'Vệ sinh', quantity: 20, minThreshold: 30, unit: 'Chai', price: 35000, lastUpdated: '2026-05-01' },
  { id: 'INV006', name: 'Bia Heineken', category: 'Đồ uống', quantity: 8, minThreshold: 20, unit: 'Thùng', price: 450000, lastUpdated: '2026-05-04' },
  { id: 'INV007', name: 'Snack', category: 'Thực phẩm', quantity: 45, minThreshold: 40, unit: 'Hộp', price: 150000, lastUpdated: '2026-05-02' },
  { id: 'INV008', name: 'Nước ngọt Coca', category: 'Đồ uống', quantity: 12, minThreshold: 30, unit: 'Thùng', price: 200000, lastUpdated: '2026-05-03' },
  { id: 'INV009', name: 'Bàn chải đánh răng', category: 'Vệ sinh', quantity: 5, minThreshold: 20, unit: 'Hộp', price: 80000, lastUpdated: '2026-05-04' },
  { id: 'INV010', name: 'Kem đánh răng', category: 'Vệ sinh', quantity: 6, minThreshold: 20, unit: 'Hộp', price: 90000, lastUpdated: '2026-05-04' },
];

export function WarehouseManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];

  const filteredInventory = inventory.filter(item =>
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const lowStockItems = inventory.filter(item => item.quantity <= item.minThreshold);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Kho & Dịch vụ</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Thêm vật tư
        </button>
      </div>

      {/* Alert for Low Stock */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Cảnh báo tồn kho thấp!</p>
              <p className="text-sm text-red-700">
                {lowStockItems.length} mặt hàng có số lượng tồn kho ≤ định mức tối thiểu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Package className="w-5 h-5 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.filter(c => c !== 'all').map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <div className="flex-1"></div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Đủ hàng: {inventory.filter(i => i.quantity > i.minThreshold).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Thiếu hàng: {lowStockItems.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã vật tư</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tên vật tư</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Danh mục</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Số lượng tồn</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Định mức tối thiểu</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Đơn vị</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Đơn giá</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cập nhật</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity <= item.minThreshold;
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isLowStock ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium">{item.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-bold ${
                      isLowStock ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {item.quantity}
                    </span>
                    {isLowStock && (
                      <AlertTriangle className="w-4 h-4 inline ml-2 text-red-600" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.minThreshold}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {item.price.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.lastUpdated}</td>
                  <td className="px-6 py-4 text-sm">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Tổng giá trị tồn kho</p>
          <p className="text-2xl font-bold text-blue-600">
            {inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString('vi-VN')} đ
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Tổng số mặt hàng</p>
          <p className="text-2xl font-bold text-gray-800">{inventory.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Mặt hàng cần nhập</p>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </div>
      </div>
    </div>
  );
}
