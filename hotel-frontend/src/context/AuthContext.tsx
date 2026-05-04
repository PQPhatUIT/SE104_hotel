import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'Khách hàng' | 'Lễ tân' | 'Quản lý' | 'Thủ kho' | 'Admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  updateUserProfile: (data: Partial<User>) => void;
}

export interface RegisterData {
  username: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const mockUsers: (User & { password: string })[] = [
  {
    id: 'U001',
    username: 'admin',
    password: 'admin123',
    fullName: 'Nguyễn Văn Admin',
    phone: '0900000000',
    email: 'admin@hotel.com',
    role: 'Admin',
    status: 'active',
    createdAt: '2026-01-01',
  },
  {
    id: 'U002',
    username: 'manager',
    password: 'manager123',
    fullName: 'Trần Thị Quản Lý',
    phone: '0900000001',
    email: 'manager@hotel.com',
    role: 'Quản lý',
    status: 'active',
    createdAt: '2026-01-02',
  },
  {
    id: 'U003',
    username: 'receptionist',
    password: 'receptionist123',
    fullName: 'Lê Văn Lễ Tân',
    phone: '0900000002',
    email: 'receptionist@hotel.com',
    role: 'Lễ tân',
    status: 'active',
    createdAt: '2026-01-03',
  },
  {
    id: 'U004',
    username: 'warehouse',
    password: 'warehouse123',
    fullName: 'Phạm Thị Kho',
    phone: '0900000003',
    email: 'warehouse@hotel.com',
    role: 'Thủ kho',
    status: 'active',
    createdAt: '2026-01-04',
  },
  {
    id: 'U005',
    username: 'customer',
    password: 'customer123',
    fullName: 'Võ Văn Khách',
    phone: '0900000005',
    email: 'customer@email.com',
    role: 'Khách hàng',
    status: 'active',
    createdAt: '2026-01-05',
  },
];

let userIdCounter = mockUsers.length + 1;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const foundUser = mockUsers.find(
      (u) => u.username === username && u.password === password && u.status === 'active'
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    // Check if username or email already exists
    const userExists = mockUsers.some(
      (u) => u.username === data.username || u.email === data.email
    );

    if (userExists) {
      return false;
    }

    const newUser: User & { password: string } = {
      id: `U${String(userIdCounter++).padStart(3, '0')}`,
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: 'Khách hàng', // Default role
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    mockUsers.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updateUserProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Update in mock database
      const userIndex = mockUsers.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export mock users for admin management
export function getAllUsers() {
  return mockUsers.map(({ password, ...user }) => user);
}

export function updateUserRole(userId: string, role: UserRole) {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    mockUsers[userIndex].role = role;
    return true;
  }
  return false;
}

export function updateUserStatus(userId: string, status: 'active' | 'inactive') {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    mockUsers[userIndex].status = status;
    return true;
  }
  return false;
}
