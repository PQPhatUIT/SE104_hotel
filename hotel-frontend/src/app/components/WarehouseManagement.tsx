// WarehouseManagement.tsx — SỬA THÊM: lỗi hiển thị số 0 thừa ở tồn kho
// NGUYÊN NHÂN: input type=number với value={form.stock_quantity} khi xóa số → NaN → hiện "0"
// FIX: dùng string cho input, parse khi submit; thêm placeholder, bỏ controlled value dạng số

import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Plus, Edit, X, Save, Loader2 , Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Service {
  service_id: number;
  service_name: string;
  unit: string;
  price: number;
  stock_quantity: number;
  min_limit: number;
  is_low_stock: boolean;
  description: string;
  is_available: boolean;
  updated_at: string;
}

// ✅ SỬA: dùng string cho tất cả số trong form để tránh lỗi hiện "0" thừa
interface FormState {
  service_name: string;
  unit: string;
  price: string;
  stock_quantity: string;
  min_limit: string;
  description: string;
}

const emptyForm: FormState = {
  service_name: '', unit: 'Lượt', price: '', stock_quantity: '', min_limit: '', description: '',
};

export function WarehouseManagement() {
  const { token } = useAuth();
  const [services, setServices]     = useState<Service[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [filterLow, setFilterLow]   = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [stockModal, setStockModal] = useState<Service | null>(null);
  const [addQty, setAddQty]         = useState('');

  const fetchServices = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = filterLow ? '?low_stock=1' : '';
      const res  = await fetch(`${API_BASE}/api/services${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch { toast.error('Không thể tải danh sách dịch vụ/vật tư'); }
    finally { setIsLoading(false); }
  }, [token, filterLow]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.service_id);
    // ✅ SỬA: convert số → string để input không bị "0" thừa
    setForm({
      service_name:  s.service_name,
      unit:          s.unit,
      price:         s.price > 0 ? String(s.price) : '',
      stock_quantity: s.stock_quantity > 0 ? String(s.stock_quantity) : '',
      min_limit:     s.min_limit > 0 ? String(s.min_limit) : '',
      description:   s.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.service_name || !form.unit) { toast.error('Vui lòng nhập tên và đơn vị'); return; }
    setSaving(true);
    try {
      const url    = editingId ? `${API_BASE}/api/services/${editingId}` : `${API_BASE}/api/services`;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          service_name:  form.service_name,
          unit:          form.unit,
          price:         Number(form.price) || 0,
          stock_quantity: Number(form.stock_quantity) || 0,
          min_limit:     Number(form.min_limit) || 0,
          description:   form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(editingId ? 'Cập nhật thành công' : 'Thêm dịch vụ thành công');
      setShowModal(false);
      fetchServices();
    } catch (err: any) { toast.error(err.message || 'Lỗi lưu'); }
    finally { setSaving(false); }
  };

  const handleToggleAvailable = async (s: Service) => {
    try {
      const res = await fetch(`${API_BASE}/api/services/${s.service_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_available: !s.is_available }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(s.is_available ? 'Đã tạm ngưng' : 'Đã kích hoạt');
      fetchServices();
    } catch (err: any) { toast.error(err.message || 'Lỗi'); }
  };

  const handleAddStock = async () => {
    const qty = Number(addQty);
    if (!stockModal || qty <= 0) { toast.error('Số lượng phải lớn hơn 0'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/services/${stockModal.service_id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity_added: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Nhập hàng thành công! Tồn kho mới: ${data.new_stock}`);
      setStockModal(null);
      setAddQty('');
      fetchServices();
    } catch (err: any) { toast.error(err.message || 'Lỗi nhập hàng'); }
    finally { setSaving(false); }
  };

  const lowStockCount = services.filter(s => s.is_low_stock).length;
  const totalValue    = services.reduce((sum, s) => sum + s.price * s.stock_quantity, 0);


  // ── Xóa dịch vụ/vật tư ────────────────────────────────────────────────────
  const handleDelete = async (svc: any) => {
    if (!confirm(`Bạn chắc chắn muốn xóa "${svc.service_name}"?\nHành động này không thể hoàn tác.`)) return;
    setDeletingId(svc.service_id);
    try {
      const res  = await fetch(`${API_BASE}/api/services/${svc.service_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa dịch vụ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Kho & Dịch vụ</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> Thêm dịch vụ/vật tư
        </button>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Cảnh báo tồn kho thấp!</p>
              <p className="text-sm text-red-700">{lowStockCount} mặt hàng có số lượng ≤ định mức tối thiểu</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Package className="w-5 h-5 text-gray-500" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filterLow} onChange={(e) => setFilterLow(e.target.checked)} className="w-4 h-4 accent-red-600" />
            <span className="text-sm text-gray-700 font-medium">Chỉ hiện mặt hàng sắp hết</span>
          </label>
          <div className="flex-1" />
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-gray-600">Đủ hàng: {services.filter(s => !s.is_low_stock).length}</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded" /><span className="text-gray-600">Sắp hết: {lowStockCount}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /> Đang tải...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Không có dữ liệu</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['ID', 'Tên', 'Đơn vị', 'Đơn giá', 'Tồn kho', 'Định mức', 'Trạng thái', 'Thao tác'].map(h =>
                <th key={h} className="px-4 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {services.map((s: any) => (
                <tr key={s.service_id} className={`hover:bg-gray-50 transition-colors ${s.is_low_stock ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-800">#{s.service_id}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-800">{s.service_name}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.unit}</td>
                  <td className="px-4 py-4 text-sm text-gray-800">{s.price.toLocaleString('vi-VN')} đ</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`font-bold ${s.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(s.stock_quantity)}
                    </span>
                    {s.is_low_stock && <AlertTriangle className="w-4 h-4 inline ml-1 text-red-500" />}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{s.min_limit}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_available ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { setStockModal(s); setAddQty(''); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-xs font-medium px-2" title="Nhập kho">+Kho</button>
                      <button onClick={() => handleToggleAvailable(s)} className={`p-1.5 rounded-lg text-xs font-medium px-2 ${s.is_available ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}>
                        {s.is_available ? 'Ngưng' : 'Bật'}
                      </button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Xóa vật tư"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Tổng giá trị tồn kho</p>
          <p className="text-2xl font-bold text-blue-600">{totalValue.toLocaleString('vi-VN')} đ</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Tổng loại dịch vụ/vật tư</p>
          <p className="text-2xl font-bold text-gray-800">{services.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm text-gray-500">Mặt hàng cần nhập</p>
          <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
        </div>
      </div>

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Sửa dịch vụ/vật tư' : 'Thêm mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                <input type="text" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="Nước suối 500ml" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị *</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="Lượt">Lượt</option>
                  <option value="Chai">Chai</option>
                  <option value="Gói">Gói</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (đ)</label>
                  {/* ✅ SỬA: value là string, placeholder thay cho 0 mặc định */}
                  <input type="number" min={0} value={form.price} placeholder="0"
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho ban đầu</label>
                  <input type="number" min={0} value={form.stock_quantity} placeholder="0"
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Định mức tối thiểu</label>
                <input type="number" min={0} value={form.min_limit} placeholder="0"
                  onChange={(e) => setForm({ ...form, min_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingId ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập kho */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Nhập kho</h2>
              <button onClick={() => setStockModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Mặt hàng: <strong>{stockModal.service_name}</strong></p>
              <p className="text-gray-600 text-sm">Tồn kho hiện tại: <strong>{stockModal.stock_quantity}</strong> {stockModal.unit}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng nhập thêm</label>
                {/* ✅ SỬA: string value */}
                <input type="number" min={1} value={addQty} placeholder="Nhập số lượng"
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              {Number(addQty) > 0 && (
                <p className="text-green-600 text-sm">Tồn kho sau nhập: <strong>{stockModal.stock_quantity + Number(addQty)}</strong></p>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setStockModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={handleAddStock} disabled={saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}