import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerProfile() {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const handleSave = () => {
    if (!/^0\d{9}$/.test(formData.phone)) {
      toast.error('Số điện thoại phải có 10 số và bắt đầu bằng 0');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email không hợp lệ');
      return;
    }

    updateUserProfile(formData);
    setIsEditing(false);
    toast.success('Cập nhật thông tin thành công');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Thông tin cá nhân</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-white">
                  {user?.fullName.split(' ').pop()?.charAt(0)}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{user?.fullName}</h2>
              <p className="text-sm text-gray-500 mt-1">{user?.username}</p>
              <span className="mt-3 px-4 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                {user?.role}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Mã khách hàng</p>
                <p className="font-medium text-gray-800">{user?.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Trạng thái tài khoản</p>
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  {user?.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ngày tạo</p>
                <p className="font-medium text-gray-800">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Thông tin liên hệ</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        phone: user?.phone || '',
                        email: user?.email || '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Read-only fields */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={user?.fullName}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  Tên tài khoản
                </label>
                <input
                  type="text"
                  value={user?.username}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi</p>
              </div>

              {/* Editable fields */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing
                      ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                  placeholder="0901234567"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                    isEditing
                      ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Lưu ý:</strong> Bạn chỉ có thể chỉnh sửa số điện thoại và email.
              Để thay đổi thông tin khác, vui lòng liên hệ quản trị viên.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
