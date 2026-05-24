// src/app/context/AuthContext.tsx
// SỬA LỖI CHÍNH: Kết nối API thật thay vì mock data
// Đồng thời giữ nguyên toàn bộ interface/type để KHÔNG phá vỡ các component khác

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'Khách hàng' | 'Lễ tân' | 'Quản lý' | 'Thủ kho' | 'Admin';

// ── Interface User — KHÔNG thay đổi, các component đang dùng đúng shape này ──
export interface User {
  id: string;
  username: string;
  fullName: string;      // Backend trả về full_name → authController đã normalize → fullName
  phone: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';  // Backend trả về is_active 0/1 → đã normalize
  createdAt: string;
  customer_id?: number | null;     // Thêm field này để dùng trong booking API
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<UserRole | null>;
  register: (data: RegisterData) => Promise<true | string>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  updateUserProfile: (data: Partial<User>) => void;
  token: string | null;   // Expose token để các component khác gọi API có auth
}

export interface RegisterData {
  username: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'hotel_token';
const USER_KEY  = 'hotel_user';

// ── Helper: đọc token từ localStorage ──────────────────────────────────────
function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ── Helper: lưu/xóa session ─────────────────────────────────────────────────
function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Helper: đọc user từ localStorage (dùng khi F5 reload trang) ─────────────
function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ── Phòng thủ: đảm bảo object từ API đúng shape User ───────────────────────
// Backend authController.js đã normalize, nhưng thêm lớp phòng thủ ở FE để chắc chắn
function sanitizeUser(raw: Record<string, unknown>): User {
  return {
    id:          String(raw.id         ?? raw.account_id ?? ''),
    username:    String(raw.username   ?? ''),
    // Hỗ trợ cả full_name (nếu backend chưa normalize) lẫn fullName (đã normalize)
    fullName:    String(raw.fullName   ?? raw.full_name ?? raw.username ?? ''),
    phone:       String(raw.phone      ?? ''),
    email:       String(raw.email      ?? ''),
    // role phải là một trong 5 giá trị hợp lệ
    role:        (['Admin','Quản lý','Lễ tân','Thủ kho','Khách hàng'].includes(raw.role as string)
                    ? raw.role
                    : 'Khách hàng') as UserRole,
    // is_active (0/1) hoặc status ('active'/'inactive') đều xử lý được
    status:      (raw.status === 'active' || raw.is_active === 1 || raw.is_active === true)
                    ? 'active'
                    : 'inactive',
    createdAt:   String(raw.createdAt  ?? raw.created_at ?? ''),
    customer_id: (raw.customer_id as number | null) ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);

  // Khi reload trang: nếu có token cũ, gọi /api/auth/me để xác minh vẫn hợp lệ
  useEffect(() => {
    const storedToken = getStoredToken();
    if (!storedToken) return;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { user: Record<string, unknown> }) => {
        const fresh = sanitizeUser(data.user);
        setUser(fresh);
        setToken(storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        // Token hết hạn hoặc invalid → đăng xuất luôn
        clearSession();
        setUser(null);
        setToken(null);
      });
  }, []);  // Chỉ chạy một lần khi mount

  // ── login: gọi API thật ───────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<UserRole | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // 401 = sai mật khẩu — trả null để Login component hiển thị lỗi
        return null;
      }

      const data: { token: string; user: Record<string, unknown> } = await res.json();

      // Phòng thủ: sanitize dù backend đã normalize
      const safeUser = sanitizeUser(data.user);

      saveSession(data.token, safeUser);
      setToken(data.token);
      setUser(safeUser);

      return safeUser.role;

    } catch (err) {
      // Lỗi mạng (backend chưa chạy, CORS, ...) → trả null
      console.error('[AuthContext.login] Network error:', err);
      return null;
    }
  };

  const register = async (data: RegisterData): Promise<true | string> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username:  data.username,
          full_name: data.fullName,
          phone:     data.phone,
          email:     data.email,
          password:  data.password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return body.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      }

      // Đăng ký thành công → tự động đăng nhập để lấy token
      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: data.username, password: data.password }),
      });

      if (!loginRes.ok) return 'Đăng ký thành công nhưng không thể tự động đăng nhập. Vui lòng đăng nhập thủ công.';

      const loginData: { token: string; user: Record<string, unknown> } = await loginRes.json();
      const safeUser = sanitizeUser(loginData.user);

      saveSession(loginData.token, safeUser);
      setToken(loginData.token);
      setUser(safeUser);

      return true;

    } catch (err) {
      console.error('[AuthContext.register] Network error:', err);
      return 'Không thể kết nối server.';
    }
  };

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    clearSession();
    setUser(null);
    setToken(null);
  };

  // ── hasRole ───────────────────────────────────────────────────────────────
  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // ── updateUserProfile: cập nhật local state + gọi API ────────────────────
  const updateUserProfile = async (data: Partial<User>) => {
    if (!user || !token) return;

    // Cập nhật local trước để UI phản hồi ngay (optimistic update)
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));

    // Gọi API để persist xuống DB
    try {
      await fetch(`${API_BASE}/api/auth/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: data.phone,
          email: data.email,
        }),
      });
    } catch (err) {
      console.error('[AuthContext.updateUserProfile]', err);
      // Không rollback vì đây là thao tác ít nhạy cảm; lần reload sau sẽ đồng bộ lại
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        hasRole,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ── Export helpers cho EmployeeManagement ────────────────────────────────────
// Các hàm này giờ chỉ là stub; EmployeeManagement cần được refactor để gọi API
// Giữ signature cũ để tránh TypeScript error ngay lập tức
export function getAllUsers(): User[] {
  // Trả về [] thay vì mockUsers — EmployeeManagement sẽ fetch từ API
  return [];
}

export function updateUserRole(_userId: string, _role: UserRole): boolean {
  return true; // Stub — logic thật nằm trong EmployeeManagement.tsx (gọi API)
}

export function updateUserStatus(_userId: string, _status: 'active' | 'inactive'): boolean {
  return true; // Stub
}