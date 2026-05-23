// src/app/context/BookingContext.tsx
// FIX BUG #2: fetchBookings không tự reset khi component unmount/remount
//             + thêm refetch manual + phòng thủ tối đa

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Booking {
  id: string;
  bookingDate: string;
  room: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  deposit: number;
  status: 'Đã đặt' | 'Đã nhận phòng' | 'Hoàn thành' | 'Đã hủy';
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_MAP: Record<string, Booking['status']> = {
  pending:      'Đã đặt',
  confirmed:    'Đã đặt',
  checked_in:   'Đã nhận phòng',
  checked_out:  'Hoàn thành',
  cancelled:    'Đã hủy',
  // Hỗ trợ thêm nếu DB dùng tiếng Việt trực tiếp
  'đã đặt':        'Đã đặt',
  'đã nhận phòng': 'Đã nhận phòng',
  'hoàn thành':    'Hoàn thành',
  'đã hủy':        'Đã hủy',
};

function normalizeBooking(raw: Record<string, unknown>): Booking {
  const checkIn  = String(raw.check_in_date  ?? raw.checkIn  ?? '');
  const checkOut = String(raw.check_out_date ?? raw.checkOut ?? '');
  let nights = Number(raw.nights ?? 0);
  if (!nights && checkIn && checkOut) {
    const diff = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    nights = Math.max(1, isNaN(diff) ? 1 : diff);
  }

  const statusRaw = String(raw.status ?? '').toLowerCase().trim();

  return {
    id:          String(raw.booking_id ?? raw.id ?? ''),
    bookingDate: String(raw.created_at ?? raw.bookingDate ?? '').split('T')[0],
    room:        String(raw.room_number ?? raw.room ?? raw.room_id ?? ''),
    roomType:    String(raw.type_name   ?? raw.room_type ?? raw.roomType ?? ''),
    checkIn,
    checkOut,
    nights,
    guests:      Number(raw.actual_guests ?? raw.guests ?? 1),
    totalAmount: Number(raw.total_amount  ?? raw.totalAmount ?? 0),
    deposit:     Number(raw.deposit_amount ?? raw.deposit ?? 0),
    // ✅ Fallback về 'Đã đặt' nếu không map được — không bao giờ undefined
    status:      STATUS_MAP[statusRaw] ?? 'Đã đặt',
  };
}

interface BookingContextType {
  bookings:   Booking[];
  addBooking: (booking: Booking) => void;
  isNewUser:  boolean;
  isLoading:  boolean;
  refetch:    () => void;
  error:      string | null;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ✅ FIX BUG #2: dùng useCallback để fetchBookings ổn định qua các render
  const fetchBookings = useCallback(async () => {
    if (!user || !token || user.role !== 'Khách hàng') {
      setBookings([]);
      setError(null);
      return;
    }

    // ✅ Kiểm tra thêm: user phải có customer_id
    if (!user.customer_id) {
      console.warn('[BookingContext] user.customer_id là null/undefined. Kiểm tra DB Accounts.');
      setBookings([]);
      setError('Tài khoản chưa được liên kết với hồ sơ khách hàng.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/customer/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Token hết hạn — không crash, chỉ báo lỗi
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        setBookings([]);
        return;
      }

      if (!res.ok) {
        setError(`Lỗi API: ${res.status}`);
        setBookings([]);
        return;
      }

      const data: unknown = await res.json();

      // ✅ Phòng thủ: xử lý được cả array[] lẫn { bookings: [] } lẫn object lạ
      let rawList: unknown[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.bookings)) rawList = obj.bookings;
        else if (Array.isArray(obj.data))     rawList = obj.data;
      }

      setBookings(rawList.map((item) => normalizeBooking(item as Record<string, unknown>)));

    } catch (err) {
      console.error('[BookingContext.fetchBookings]', err);
      setError('Không thể kết nối server. Kiểm tra backend đã chạy chưa.');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, user?.customer_id, token]);
  // ✅ Chỉ re-run khi id/role/customer_id/token thực sự thay đổi

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const addBooking = (booking: Booking) => {
    setBookings((prev) => [booking, ...prev]);
  };

  const isNewUser = bookings.length === 0 && !isLoading && !error;

  return (
    <BookingContext.Provider value={{
      bookings,
      addBooking,
      isNewUser,
      isLoading,
      refetch: fetchBookings,
      error,
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookings must be used within a BookingProvider');
  return ctx;
}

export const mockData_OldUser: Booking[] = [];
export const mockData_NewUser: Booking[] = [];