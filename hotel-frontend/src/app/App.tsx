// App.tsx — SỬA LỖI: Route "/" (Báo cáo) bị redirect về /explore-rooms khi Admin bấm vào
// NGUYÊN NHÂN: Route "/" ngoài cùng (Root) đang redirect → /explore-rooms TRƯỚC khi AppLayout xử lý
// FIX: Đổi route "/" ngoài cùng thành /explore-rooms, để AppLayout xử lý "/" bên trong

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Unauthorized } from './components/Unauthorized';

import { Dashboard } from './components/Dashboard';
import { RoomManagement } from './components/RoomManagement';
import { BookingForm } from './components/BookingForm';
import { CustomerManagement } from './components/CustomerManagement';
import { PaymentManagement } from './components/PaymentManagement';
import { WarehouseManagement } from './components/WarehouseManagement';
import { EmployeeManagement } from './components/EmployeeManagement';
import { SystemManagement } from './components/SystemManagement';

import CustomerDashboard from './components/customer/CustomerDashboard';
import { CustomerRooms } from './components/customer/CustomerRooms';
import CustomerBookings from './components/customer/CustomerBookings';
import CustomerProfile from './components/customer/CustomerProfile';
import { ExploreRooms } from './components/ExploreRooms';

// ── Redirect sau đăng nhập → đúng trang theo role ────────────────────────────
function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/explore-rooms" replace />;
  switch (user.role) {
    case 'Admin':
    case 'Quản lý':
    case 'Thủ kho':
      return <Navigate to="/dashboard" replace />;
    case 'Lễ tân':
      return <Navigate to="/rooms" replace />;
    case 'Khách hàng':
      return <Navigate to="/customer-dashboard" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}

// ── Layout sau khi đăng nhập ──────────────────────────────────────────────────
function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/explore-rooms" replace />;

  return (
    <BookingProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Customer routes */}
            <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/customer-rooms"     element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerRooms /></ProtectedRoute>} />
            <Route path="/customer-bookings"  element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerBookings /></ProtectedRoute>} />
            <Route path="/customer-profile"   element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerProfile /></ProtectedRoute>} />

            {/* Staff routes */}
            {/* ✅ SỬA: dùng /dashboard thay vì "/" để tránh conflict với route gốc */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Quản lý', 'Admin', 'Thủ kho']}><Dashboard /></ProtectedRoute>} />
            <Route path="/rooms"     element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý', 'Admin']}><RoomManagement /></ProtectedRoute>} />
            <Route path="/bookings"  element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý', 'Admin']}><BookingForm /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý', 'Admin']}><CustomerManagement /></ProtectedRoute>} />
            <Route path="/payments"  element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý', 'Admin']}><PaymentManagement /></ProtectedRoute>} />
            <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['Thủ kho', 'Quản lý', 'Admin']}><WarehouseManagement /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['Quản lý', 'Admin']}><EmployeeManagement /></ProtectedRoute>} />
            <Route path="/system"    element={<ProtectedRoute allowedRoles={['Admin']}><SystemManagement /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </main>
      </div>
    </BookingProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ SỬA: "/" không còn redirect ngay → để AppLayout xử lý (nếu đã login → /dashboard) */}
          <Route path="/explore-rooms" element={<ExploreRooms />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />
          <Route path="/*"             element={<AppLayout />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}