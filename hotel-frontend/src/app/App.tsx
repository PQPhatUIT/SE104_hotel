import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Unauthorized } from './components/Unauthorized';

import { Dashboard }          from './components/Dashboard';
import { RoomManagement }     from './components/RoomManagement';
import { BookingForm }        from './components/BookingForm';
import { CustomerManagement } from './components/CustomerManagement';
import { PaymentManagement }  from './components/PaymentManagement';
import { WarehouseManagement }from './components/WarehouseManagement';
import { EmployeeManagement } from './components/EmployeeManagement';
import { ReportPage }         from './components/ReportPage';
import { BookingSearch }      from './components/BookingSearch';
import { ExploreRooms }       from './components/ExploreRooms';

import CustomerDashboard           from './components/customer/CustomerDashboard';
import { CustomerRooms }           from './components/customer/CustomerRooms';
import { CustomerBookings }        from './components/customer/CustomerBookings';
import CustomerProfile             from './components/customer/CustomerProfile';

// 3 vai trò: Quản lý, Lễ tân, Khách hàng
function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/explore-rooms" replace />;
  switch (user.role) {
    case 'Quản lý': return <Navigate to="/dashboard" replace />;
    case 'Lễ tân':  return <Navigate to="/rooms" replace />;
    case 'Khách hàng': return <Navigate to="/customer-dashboard" replace />;
    default: return <Navigate to="/unauthorized" replace />;
  }
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/explore-rooms" replace />;

  return (
    <BookingProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Khách hàng */}
            <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/customer-rooms"     element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerRooms /></ProtectedRoute>} />
            <Route path="/customer-bookings"  element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerBookings /></ProtectedRoute>} />
            <Route path="/customer-profile"   element={<ProtectedRoute allowedRoles={['Khách hàng']}><CustomerProfile /></ProtectedRoute>} />

            {/* Quản lý + Lễ tân */}
            <Route path="/rooms"          element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><RoomManagement /></ProtectedRoute>} />
            <Route path="/bookings"       element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><BookingForm /></ProtectedRoute>} />
            <Route path="/customers"      element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><CustomerManagement /></ProtectedRoute>} />
            <Route path="/payments"       element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><PaymentManagement /></ProtectedRoute>} />
            <Route path="/warehouse"      element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><WarehouseManagement /></ProtectedRoute>} />
            <Route path="/booking-search" element={<ProtectedRoute allowedRoles={['Lễ tân', 'Quản lý']}><BookingSearch /></ProtectedRoute>} />

            {/* Quản lý only */}
            <Route path="/dashboard"  element={<ProtectedRoute allowedRoles={['Quản lý']}><Dashboard /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute allowedRoles={['Quản lý']}><ReportPage /></ProtectedRoute>} />
            <Route path="/employees"  element={<ProtectedRoute allowedRoles={['Quản lý']}><EmployeeManagement /></ProtectedRoute>} />

            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*"             element={<RoleBasedRedirect />} />
          </Routes>
        </main>
      </div>
    </BookingProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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