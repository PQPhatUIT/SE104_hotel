// src/app/components/customer/CustomerProfile.tsx
// SỬA LỖI:
//   1. user?.fullName, user?.phone, user?.email — optional chaining toàn bộ
//   2. Khởi tạo form với giá trị fallback '' thay vì undefined
//   3. Gọi updateUserProfile() từ AuthContext (đã kết nối API)

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfile() {
  const { user, updateUserProfile } = useAuth();

  // Khởi tạo state với fallback '' để input không bị uncontrolled
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    phone:    user?.phone    ?? '',
    email:    user?.email    ?? '',
  });
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Đồng bộ form khi user thay đổi (ví dụ: sau khi context reload từ API)
  useEffect(() => {
    setForm({
      fullName: user?.fullName ?? '',
      phone:    user?.phone    ?? '',
      email:    user?.email    ?? '',
    });
  }, [user?.id]);  // Chỉ re-sync khi đổi user (không re-sync mỗi render)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updateUserProfile({
        fullName: form.fullName,
        phone:    form.phone,
        email:    form.email,
      });
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  // Không crash nếu user chưa load — hiển thị skeleton
  if (!user) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Thông tin cá nhân</h2>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
          {/* Lấy ký tự đầu của fullName, fallback username, fallback '?' */}
          {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{user.fullName || user.username}</p>
          <p className="text-sm text-gray-400">{user.role}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Trường chỉ đọc */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Tên đăng nhập</label>
          <input
            type="text"
            value={user.username ?? ''}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        {/* Họ và tên */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Nhập họ và tên"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Nhập số điện thoại"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Nhập email"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        {/* Thông báo */}
        {message && (
          <p className={`text-sm px-3 py-2 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
