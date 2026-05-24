// EmployeeManagement.tsx — Kết nối API thật
import { useState, useEffect, useCallback } from 'react';
import { Edit, Ban, CheckCircle, Shield, Loader2, UserPlus, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, UserRole } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Account {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
}

const roleOptions: UserRole[] = ['Khách hàng', 'Lễ tân', 'Quản lý', 'Thủ kho', 'Admin'];
const emptyForm = { username: '', fullName: '', phone: '', email: '', password: '', role: 'Lễ tân' as UserRole };

export function EmployeeManagement() {
  const { token, user: currentUser } = useAuth();
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole]   = useState<UserRole>('Lễ tân');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = selectedRole !== 'all' ? `?role=${encodeURIComponent(selectedRole)}` : '';
      const res = await fetch(`${API_BASE}/api/accounts${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch { toast.error('Không thể tải danh sách tài khoản'); }
    finally { setIsLoading(false); }
  }, [token, selectedRole]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleRoleChange = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Cập nhật vai trò thành công');
      setEditingId(null);
      fetchAccounts();
    } catch (err: any) { toast.error(err.message || 'Lỗi cập nhật'); }
  };

  const handleStatusToggle = async (id: string, current: 'active' | 'inactive') => {
    const newActive = current === 'active' ? 0 : 1;
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: newActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(newActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      fetchAccounts();
    } catch (err: any) { toast.error(err.message || 'Lỗi cập nhật'); }
  };

  const handleCreate = async () => {
    if (!form.username || !form.fullName || !form.password) { toast.error('Điền đầy đủ thông tin bắt buộc'); return; }
    if (form.password.length < 6) { toast.error('Mật khẩu ít nhất 6 ký tự'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: form.username, password: form.password, full_name: form.fullName, phone: form.phone, email: form.email, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Tạo tài khoản thành công');
      setShowCreate(false);
      setForm(emptyForm);
      fetchAccounts();
    } catch (err: any) { toast.error(err.message || 'Lỗi tạo tài khoản'); }
    finally { setSaving(false); }
  };

  const filtered = accounts.filter(a => selectedRole === 'all' || a.role === selectedRole);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Nhân viên & Tài khoản</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-5 h-5" /> Tạo tài khoản
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Shield className="w-5 h-5 text-gray-500" />
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="all">Tất cả vai trò</option>
            {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex-1" />
          <p className="text-sm text-gray-600">Tổng: <span className="font-semibold">{filtered.length}</span> tài khoản</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /> Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Không có tài khoản nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['ID', 'Tài khoản', 'Họ tên', 'SĐT', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h =>
                <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">#{u.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{u.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{u.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2">
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                          {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => handleRoleChange(u.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">Lưu</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-400">Huỷ</button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'Quản lý' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'Lễ tân' ? 'bg-green-100 text-green-700' :
                        u.role === 'Thủ kho' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.createdAt || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(u.id); setEditRole(u.role); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa vai trò">
                        <Edit className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleStatusToggle(u.id, u.status)} className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} title={u.status === 'active' ? 'Vô hiệu hoá' : 'Kích hoạt'}>
                          {u.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo tài khoản */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Tạo tài khoản mới</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Tên đăng nhập *', key: 'username', placeholder: 'username' },
                { label: 'Mật khẩu *', key: 'password', placeholder: 'Ít nhất 6 ký tự' },
                { label: 'Họ và tên *', key: 'fullName', placeholder: 'Nguyễn Văn A' },
                { label: 'Số điện thoại', key: 'phone', placeholder: '0901234567' },
                { label: 'Email', key: 'email', placeholder: 'email@example.com' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={key === 'password' ? 'password' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Huỷ</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900"><strong>Lưu ý:</strong> Tài khoản đăng ký tự mặc định là <strong>"Khách hàng"</strong>. Chỉ Admin mới có quyền thay đổi vai trò.</p>
      </div>
    </div>
  );
}