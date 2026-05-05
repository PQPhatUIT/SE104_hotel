import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

// ── Mock data sets ──────────────────────────────────────────────────────────
export const mockData_OldUser: Booking[] = [
  {
    id: 'BK001',
    bookingDate: '2026-04-10',
    room: 'P301',
    roomType: 'Deluxe',
    checkIn: '2026-04-15',
    checkOut: '2026-04-18',
    nights: 3,
    guests: 2,
    totalAmount: 2400000,
    deposit: 500000,
    status: 'Hoàn thành',
  },
  {
    id: 'BK002',
    bookingDate: '2026-03-15',
    room: 'P205',
    roomType: 'Standard',
    checkIn: '2026-03-20',
    checkOut: '2026-03-22',
    nights: 2,
    guests: 1,
    totalAmount: 1000000,
    deposit: 300000,
    status: 'Hoàn thành',
  },
  {
    id: 'BK003',
    bookingDate: '2026-05-02',
    room: 'P501',
    roomType: 'Suite',
    checkIn: '2026-05-10',
    checkOut: '2026-05-14',
    nights: 4,
    guests: 4,
    totalAmount: 6000000,
    deposit: 1000000,
    status: 'Đã đặt',
  },
];

export const mockData_NewUser: Booking[] = [];

// ── Context ─────────────────────────────────────────────────────────────────
interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  isNewUser: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Seed bookings based on whether this is the demo user or a newly registered one
  useEffect(() => {
    if (!user) return;
    if (user.username === 'customer') {
      setBookings([...mockData_OldUser]);
    } else {
      setBookings([...mockData_NewUser]);
    }
  }, [user?.username]);

  const addBooking = (booking: Booking) => {
    setBookings((prev) => [booking, ...prev]);
  };

  const isNewUser = bookings.length === 0;

  return (
    <BookingContext.Provider value={{ bookings, addBooking, isNewUser }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookings must be used within a BookingProvider');
  return ctx;
}
