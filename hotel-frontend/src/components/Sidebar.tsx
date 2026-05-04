import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bed,
  Users,
  Receipt,
  Settings,
  Hotel,
  LogOut,
  Package,
  FileText,
  UserCog,
  Calendar,
  User
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';

interface MenuItem {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  // Khách hàng
  { path: '/customer-dashboard', icon: LayoutDashboard, label: 'Trang chủ', roles: ['Khách hàng'] },
  { path: '/customer-rooms', icon: Bed, label: 'Đặt phòng', roles: ['Khách hàng'] },
  { path: '/customer-bookings', icon: Calendar, label: 'Lịch sử đặt phòng', roles: ['Khách hàng'] },
  { path: '/customer-profile', icon: User, label: 'Thông tin cá nhân', roles: ['Khách hàng'] },

  // Nhân viên & Quản lý
  { path: '/', icon: LayoutDashboard, label: 'Báo cáo', roles: ['Quản lý', 'Admin', 'Thủ kho'] },
  { path: '/rooms', icon: Bed, label: 'Sơ đồ phòng', roles: ['Lễ tân', 'Quản lý', 'Admin'] },
  { path: '/bookings', icon: FileText, label: 'Lập phiếu đặt phòng', roles: ['Lễ tân', 'Quản lý', 'Admin'] },
  { path: '/customers', icon: Users, label: 'Danh sách khách hàng', roles: ['Lễ tân', 'Quản lý', 'Admin'] },
  { path: '/payments', icon: Receipt, label: 'Thanh toán', roles: ['Lễ tân', 'Quản lý', 'Admin'] },
  { path: '/warehouse', icon: Package, label: 'Quản lý Kho', roles: ['Thủ kho', 'Quản lý', 'Admin'] },
  { path: '/employees', icon: UserCog, label: 'Quản lý Nhân viên', roles: ['Quản lý', 'Admin'] },
  { path: '/system', icon: Settings, label: 'Cấu hình hệ thống', roles: ['Admin'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => hasRole(item.roles));

  return (
    <div className="w-64 bg-blue-900 text-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-blue-800">
        <Hotel className="w-8 h-8" />
        <div>
          <h1 className="font-bold text-lg">Hotel Admin</h1>
          <p className="text-xs text-blue-300">Hệ thống quản lý</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-blue-800">
        <div className="px-4 py-3 mb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
              <span className="font-semibold">
                {user?.fullName.split(' ').pop()?.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm truncate">{user?.fullName}</p>
              <p className="text-xs text-blue-300">{user?.role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-blue-100 hover:bg-blue-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
