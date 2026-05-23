// src/app/context/BookingContext.tsx
// SỬA LỖI: Gọi API thật thay vì mock data tĩnh
// Phòng thủ đầy đủ với optional chaining, Array.isArray(), fallback giá trị

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ── Interface Booking — KHÔNG thay đổi để các component không bị ảnh hưởng ──
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

// ── Map: status DB → status Frontend ─────────────────────────────────────────
const STATUS_MAP: Record<string, Booking['status']> = {
  pending:      'Đã đặt',
  confirmed:    'Đã đặt',
  checked_in:   'Đã nhận phòng',
  checked_out:  'Hoàn thành',
  cancelled:    'Đã hủy',
};

/**
 * Normalize một bản ghi booking từ API → đúng shape interface Booking.
 * Phòng thủ với optional chaining và fallback cho từng trường.
 */
function normalizeBooking(raw: Record<string, unknown>): Booking {
  // Tính số đêm từ check_in / check_out nếu nights không có sẵn
  const checkIn  = String(raw.check_in_date  ?? raw.checkIn  ?? '');
  const checkOut = String(raw.check_out_date ?? raw.checkOut ?? '');
  let nights = Number(raw.nights ?? 0);
  if (!nights && checkIn && checkOut) {
    const diff = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    );
    nights = Math.max(1, diff);
  }

  const statusRaw = String(raw.status ?? '').toLowerCase();

  return {
    id:          String(raw.booking_id ?? raw.id ?? ''),
    bookingDate: String(raw.created_at ?? raw.bookingDate ?? '').split('T')[0],
    // Backend JOIN trả về room_number; nếu không có thì fallback về room_id
    room:        String(raw.room_number ?? raw.room ?? raw.room_id ?? ''),
    roomType:    String(raw.room_type   ?? raw.roomType ?? raw.type_name ?? ''),
    checkIn,
    checkOut,
    nights,
    guests:      Number(raw.actual_guests ?? raw.guests ?? 1),
    totalAmount: Number(raw.total_amount  ?? raw.totalAmount ?? 0),
    deposit:     Number(raw.deposit_amount ?? raw.deposit ?? 0),
    status:      STATUS_MAP[statusRaw] ?? 'Đã đặt',
  };
}

// ── Context Types ─────────────────────────────────────────────────────────────
interface BookingContextType {
  bookings:   Booking[];
  addBooking: (booking: Booking) => void;
  isNewUser:  boolean;
  isLoading:  boolean;
  refetch:    () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export function BookingProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = async () => {
    // Chỉ fetch nếu user là Khách hàng và có token
    if (!user || !token || user.role !== 'Khách hàng') {
      setBookings([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customer/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setBookings([]);
        return;
      }

      const data: unknown = await res.json();

      // Phòng thủ: data có thể là array trực tiếp hoặc { bookings: [...] }
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.bookings)
          ? ((data as Record<string, unknown>).bookings as unknown[])
          : [];

      setBookings(rawList.map((item) => normalizeBooking(item as Record<string, unknown>)));

    } catch (err) {
      console.error('[BookingContext.fetchBookings]', err);
      setBookings([]); // Luôn set về [] khi lỗi để tránh undefined crash
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch lại mỗi khi user thay đổi (đăng nhập / đăng xuất)
  useEffect(() => {
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  // addBooking: thêm optimistic vào local state
  // Component gọi hàm này sau khi POST /api/bookings thành công
  const addBooking = (booking: Booking) => {
    setBookings((prev) => [booking, ...prev]);
  };

  const isNewUser = bookings.length === 0 && !isLoading;

  return (
    <BookingContext.Provider value={{ bookings, addBooking, isNewUser, isLoading, refetch: fetchBookings }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookings must be used within a BookingProvider');
  return ctx;
}

// Giữ lại export mock để không break import ở các file test (nếu có)
export const mockData_OldUser: Booking[] = [];
export const mockData_NewUser: Booking[] = [];
