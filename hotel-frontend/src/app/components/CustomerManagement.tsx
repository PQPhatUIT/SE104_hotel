// CustomerManagement.tsx — Kết nối API thật
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Customer {
  customer_id: number;
  full_name: string;
  phone: string;
  email: string;
  id_card: string;
  address: string;
  total_bookings: number;
}

const emptyForm = { full_name: '', phone: '', email: '', id_card: '', address: '' };

export function CustomerManagement() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);

  const fetchCustomers = useCallback(async (keyword = '') => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      const res = await fetch(`${API_BASE}/api/customers${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Lỗi tải danh sách');
      const data = await res.json();
      setCustomers(Array.isArray(data.customers) ? data.customers : Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải danh sách khách hàng');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSearch = () => fetchCustomers(searchQuery);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.customer_id);
    setForm({ full_name: c.full_name, phone: c.phone, email: c.email || '', id_card: c.id_card || '', address: c.address || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.id_card) {
      toast.error('Vui lòng nhập đầy đủ Họ tên, SĐT và CMND/CCCD');
      return;
    }
    setSaving(true);
    try {
      const url    = editingId ? `${API_BASE}/api/customers/${editingId}` : `${API_BASE}/api/customers`;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu');
      toast.success(editingId ? 'Cập nhật thành công' : 'Thêm khách hàng thành công');
      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xoá khách hàng "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Đã xoá khách hàng');
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xoá');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Khách hàng</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT hoặc CMND..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button onClick={handleSearch} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" /> Đang tải...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Không có dữ liệu khách hàng</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['ID', 'Họ tên', 'SĐT', 'Email', 'CMND/CCCD', 'Địa chỉ', 'Lượt đặt', 'Thao tác'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((c) => (
                <tr key={c.customer_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">#{c.customer_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{c.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.id_card || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.address || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{c.total_bookings ?? 0}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.customer_id, c.full_name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Họ và tên *', key: 'full_name', placeholder: 'Nguyễn Văn A' },
                { label: 'Số điện thoại *', key: 'phone', placeholder: '0901234567' },
                { label: 'CMND/CCCD *', key: 'id_card', placeholder: '012345678901' },
                { label: 'Email', key: 'email', placeholder: 'email@example.com' },
                { label: 'Địa chỉ', key: 'address', placeholder: 'Số nhà, đường, quận, tỉnh...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}