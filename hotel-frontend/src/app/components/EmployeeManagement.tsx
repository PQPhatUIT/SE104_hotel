import { useState } from 'react';
import { Edit, Trash2, UserPlus, Shield, Ban, CheckCircle } from 'lucide-react';
import { getAllUsers, updateUserRole, updateUserStatus, UserRole } from '../context/AuthContext';

export function EmployeeManagement() {
  const [users, setUsers] = useState(getAllUsers());
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('Khách hàng');

  const filteredUsers = users.filter((user) =>
    selectedRole === 'all' || user.role === selectedRole
  );

  const handleRoleChange = (userId: string) => {
    updateUserRole(userId, newRole);
    setUsers(getAllUsers());
    setEditingUser(null);
  };

  const handleStatusToggle = (userId: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateUserStatus(userId, newStatus);
    setUsers(getAllUsers());
  };

  const roleOptions: UserRole[] = ['Khách hàng', 'Lễ tân', 'Quản lý', 'Thủ kho', 'Admin'];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Nhân viên & Tài khoản</h1>
      </div>

      {/* Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Shield className="w-5 h-5 text-gray-500" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả vai trò</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <div className="flex-1"></div>
          <div className="text-sm text-gray-600">
            Tổng: <span className="font-semibold">{filteredUsers.length}</span> tài khoản
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã NV</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tên tài khoản</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Họ tên</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">SĐT</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vai trò</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ngày tạo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{user.id}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{user.username}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{user.fullName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  {editingUser === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRoleChange(user.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-400"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'Quản lý' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'Lễ tân' ? 'bg-green-100 text-green-700' :
                      user.role === 'Thủ kho' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {user.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.createdAt}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user.id);
                        setNewRole(user.role);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa vai trò"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusToggle(user.id, user.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.status === 'active'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={user.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    >
                      {user.status === 'active' ? (
                        <Ban className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Lưu ý:</strong> Tài khoản mới đăng ký mặc định có vai trò <span className="font-semibold">"Khách hàng"</span>.
          Chỉ Admin và Quản lý mới có quyền thay đổi vai trò và vô hiệu hóa tài khoản.
        </p>
      </div>
    </div>
  );
}
