// Register.tsx — Sửa thông báo lỗi trùng tài khoản rõ ràng hơn
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hotel, LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PENDING_BOOKING_KEY } from './ExploreRooms';

const HOTEL_BG =
  'https://images.unsplash.com/photo-1758714919725-d2740fc99f14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvYmJ5JTIwZWxlZ2FudCUyMGludGVyaW9yfGVufDF8fHx8MTc3Nzg0NTQxN3ww&ixlib=rb-4.1.0&q=80&w=1080';

interface RegisterFormData {
  username:        string;
  fullName:        string;
  phone:           string;
  email:           string;
  password:        string;
  confirmPassword: string;
}

type RegisterFormErrors = Partial<RegisterFormData>;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function Register() {
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading,           setIsLoading]           = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '', fullName: '', phone: '', email: '', password: '', confirmPassword: '',
  });
  const [errors,   setErrors]   = useState<RegisterFormErrors>({});
  const [apiError, setApiError] = useState('');

  const { register } = useAuth();
  const navigate     = useNavigate();

  const validateForm = (): boolean => {
    const e: RegisterFormErrors = {};
    if (!formData.username || formData.username.length < 3)  e.username = 'Tên tài khoản phải có ít nhất 3 ký tự';
    if (!formData.fullName || formData.fullName.length < 3)  e.fullName = 'Họ tên phải có ít nhất 3 ký tự';
    if (!/^0\d{9}$/.test(formData.phone))                   e.phone    = 'Số điện thoại phải có 10 số và bắt đầu bằng 0';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email    = 'Email không hợp lệ';
    if (formData.password.length < 8)                        e.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) e.password = 'Mật khẩu phải chứa cả chữ và số';
    if (formData.password !== formData.confirmPassword)      e.confirmPassword = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Gọi thẳng API để lấy thông báo lỗi chính xác từ server
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username:  formData.username,
          full_name: formData.fullName,
          phone:     formData.phone,
          email:     formData.email,
          password:  formData.password,
        }),
      });

      if (res.ok) {
        // Đăng ký thành công → đăng nhập luôn qua AuthContext
        const success = await register({
          username: formData.username,
          fullName: formData.fullName,
          phone:    formData.phone,
          email:    formData.email,
          password: formData.password,
        });

        if (success) {
          const hasPending = Boolean(sessionStorage.getItem(PENDING_BOOKING_KEY));
          navigate(hasPending ? '/customer-rooms' : '/customer-dashboard', { replace: true });
        }
      } else {
        // Lấy thông báo lỗi CỤ THỂ từ server thay vì hiện thông báo chung
        const data = await res.json();
        if (res.status === 409) {
          // Trùng username/email — server trả về message rõ ràng
          setApiError(data.message || 'Tên tài khoản hoặc email đã tồn tại. Vui lòng chọn tên khác.');
        } else {
          setApiError(data.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      }
    } catch {
      setApiError('Không thể kết nối server. Kiểm tra backend đã chạy chưa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundImage: `url(${HOTEL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
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
          <p className="text-blue-200 text-sm">Tạo tài khoản mới</p>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1 gap-1">
            <Link to="/login" className="flex-1 py-2 rounded-md font-medium text-gray-400 hover:text-gray-500 flex items-center justify-center gap-2 text-sm transition-colors">
              <LogIn className="w-4 h-4" /> Đăng nhập
            </Link>
            <div className="flex-1 py-2 rounded-md font-medium bg-blue-600 text-white shadow-md flex items-center justify-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Đăng ký
            </div>
          </div>

          {/* Lỗi API */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên tài khoản */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên tài khoản</label>
              <input type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="username" autoComplete="username" />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            {/* Họ và tên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
              <input type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Nguyễn Văn A" autoComplete="name" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
              <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0123456789" autoComplete="tel" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="email@example.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-2 pr-11 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Ít nhất 8 ký tự, có cả chữ và số" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-2 pr-11 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="••••••••" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang đăng ký...</>
              ) : 'Đăng ký tài khoản'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Chưa muốn đăng ký?{' '}
            <Link to="/explore-rooms" className="text-blue-600 hover:underline">Xem phòng trước</Link>
          </p>
        </div>
      </div>
    </div>
  );
}