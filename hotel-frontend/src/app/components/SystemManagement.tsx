import { useState } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: 'Quản lý' | 'Lễ tân' | 'Thủ kho';
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

const mockEmployees: Employee[] = [
  { id: 'NV001', name: 'Nguyễn Văn Quản', role: 'Quản lý', email: 'nvq@hotel.com', phone: '0901111111', status: 'active' },
  { id: 'NV002', name: 'Trần Thị Tân', role: 'Lễ tân', email: 'ttt@hotel.com', phone: '0902222222', status: 'active' },
  { id: 'NV003', name: 'Lê Văn Tân', role: 'Lễ tân', email: 'lvt@hotel.com', phone: '0903333333', status: 'active' },
  { id: 'NV004', name: 'Phạm Thị Kho', role: 'Thủ kho', email: 'ptk@hotel.com', phone: '0904444444', status: 'active' },
  { id: 'NV005', name: 'Võ Văn Bình', role: 'Lễ tân', email: 'vvb@hotel.com', phone: '0905555555', status: 'inactive' },
];

const rolePermissions = {
  'Quản lý': ['Xem báo cáo', 'Quản lý nhân viên', 'Quản lý phòng', 'Quản lý khách hàng', 'Quản lý thanh toán'],
  'Lễ tân': ['Quản lý phòng', 'Quản lý khách hàng', 'Quản lý thanh toán', 'Đặt phòng'],
  'Thủ kho': ['Quản lý vật tư', 'Quản lý dịch vụ'],
};

export function SystemManagement() {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const filteredEmployees = employees.filter((emp) =>
    selectedRole === 'all' || emp.role === selectedRole
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Hệ thống</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Thêm nhân viên
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Employees List */}
        <div className="col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Danh sách nhân viên</h2>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="Quản lý">Quản lý</option>
                <option value="Lễ tân">Lễ tân</option>
                <option value="Thủ kho">Thủ kho</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-blue-600">
                        {employee.name.split(' ').pop()?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{employee.name}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {employee.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{employee.id} • {employee.role}</p>
                      <p className="text-sm text-gray-600">{employee.email} • {employee.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Role Permissions */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Phân quyền</h2>
            </div>

            <div className="space-y-4">
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <div key={role} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-3">{role}</p>
                  <ul className="space-y-2">
                    {permissions.map((permission) => (
                      <li key={permission} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Login History */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Lịch sử đăng nhập</h2>
            <div className="space-y-3">
              {[
                { user: 'Trần Thị Tân', time: '10:30 - 04/05/2026', ip: '192.168.1.10' },
                { user: 'Lê Văn Tân', time: '09:15 - 04/05/2026', ip: '192.168.1.11' },
                { user: 'Nguyễn Văn Quản', time: '08:00 - 04/05/2026', ip: '192.168.1.5' },
              ].map((log, index) => (
                <div key={index} className="text-sm border-b border-gray-100 pb-2">
                  <p className="font-medium text-gray-800">{log.user}</p>
                  <p className="text-gray-500 text-xs">{log.time}</p>
                  <p className="text-gray-400 text-xs">IP: {log.ip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
