import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { Hotel, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PENDING_BOOKING_KEY } from './ExploreRooms';

const HOTEL_BG =
  'https://images.unsplash.com/photo-1758714919725-d2740fc99f14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvYmJ5JTIwZWxlZ2FudCUyMGludGVyaW9yfGVufDF8fHx8MTc3Nzg0NTQxN3ww&ixlib=rb-4.1.0&q=80&w=1080';

// ── Kiểu form ─────────────────────────────────────────────────────────────────

interface LoginFormData {
  username: string;
  password: string;
}

// ── Helper: điều hướng sau khi login thành công ───────────────────────────────

/**
 * Nếu trong sessionStorage có phòng đặt dở (PENDING_BOOKING_KEY),
 * chuyển về /customer-rooms để useEffect ở đó tự động mở modal.
 * Ngược lại, chuyển về trang chủ theo role.
 */
function resolveRedirectAfterLogin(role: UserRole, hasPending: boolean): string {
  if (hasPending && role === 'Khách hàng') {
    return '/customer-rooms';
  }
  switch (role) {
    case 'Admin':
    case 'Quản lý':
    case 'Thủ kho':
      return '/';
    case 'Lễ tân':
      return '/rooms';
    case 'Khách hàng':
      return '/customer-dashboard';
    default:
      return '/';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Login() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData]         = useState<LoginFormData>({ username: '', password: '' });
  const [errors, setErrors]             = useState<Partial<LoginFormData>>({});
  const [apiError, setApiError]         = useState<string>('');

  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên tài khoản';
    }
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    const role = await login(formData.username, formData.password);

    if (role) {
      // Kiểm tra có đặt phòng dở dang không
      const hasPending = Boolean(sessionStorage.getItem(PENDING_BOOKING_KEY));
      const destination = resolveRedirectAfterLogin(role, hasPending);
      navigate(destination, { replace: true });
    } else {
      setApiError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  // ── Input change ────────────────────────────────────────────────────────────

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setApiError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage:    `url(${HOTEL_BG})`,
        backgroundSize:     'cover',
        backgroundPosition: 'center',
        backgroundRepeat:   'no-repeat',
      }}
    >
      {/* Overlay mờ */}
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <Hotel className="w-10 h-10 text-blue-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Hotel Management System</h1>
          <p className="text-blue-200 text-sm">Hệ thống Quản lý Khách sạn</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {/* Tab chuyển Login / Register */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1 gap-1">
            {/* Tab đang active */}
            <div className="flex-1 py-2 rounded-md font-medium bg-blue-600 text-white shadow-md flex items-center justify-center gap-2 text-sm">
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </div>
            <Link
              to="/register"
              className="flex-1 py-2 rounded-md font-medium text-gray-400 hover:text-gray-500 flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </Link>
          </div>

          {/* Lỗi API */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {apiError}
            </div>
          )}

          {/* Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên tài khoản */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên tài khoản
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="username"
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-2 pr-11 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors mt-2"
            >
              Đăng nhập
            </button>
          </form>

          {/* Link sang trang xem phòng công khai */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Chưa muốn đăng nhập?{' '}
            <Link to="/explore-rooms" className="text-blue-600 hover:underline">
              Xem phòng trước
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}