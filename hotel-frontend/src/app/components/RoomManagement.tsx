import { useState } from 'react';
import { Filter, Search } from 'lucide-react';

type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

interface Room {
  id: string;
  floor: number;
  type: 'Standard' | 'Deluxe' | 'Suite';
  status: RoomStatus;
  price: number;
}

const statusConfig: Record<
  RoomStatus,
  { label: string; color: string; bgColor: string; badgeBg: string; badgeText: string; dot: string }
> = {
  available: {
    label: 'Trống',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
    dot: 'bg-green-500',
  },
  occupied: {
    label: 'Đang ở',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    dot: 'bg-red-500',
  },
  reserved: {
    label: 'Đã đặt',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    dot: 'bg-orange-500',
  },
  cleaning: {
    label: 'Đang dọn',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-800',
    dot: 'bg-yellow-500',
  },
};

// Mock data
const generateRooms = (): Room[] => {
  const rooms: Room[] = [];
  const statuses: RoomStatus[] = ['available', 'occupied', 'reserved', 'cleaning'];
  const types: Room['type'][] = ['Standard', 'Deluxe', 'Suite'];

  for (let floor = 1; floor <= 5; floor++) {
    for (let room = 1; room <= 20; room++) {
      rooms.push({
        id: `${floor}${room.toString().padStart(2, '0')}`,
        floor,
        type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        price: 500000 + Math.floor(Math.random() * 1000000),
      });
    }
  }
  return rooms;
};

export function RoomManagement() {
  const [rooms] = useState<Room[]>(generateRooms());
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = rooms.filter((room) => {
    const matchFloor = selectedFloor === 'all' || room.floor === selectedFloor;
    const matchType = selectedType === 'all' || room.type === selectedType;
    const matchSearch = room.id.includes(searchQuery);
    return matchFloor && matchType && matchSearch;
  });

  const statusCounts = {
    available: rooms.filter((r) => r.status === 'available').length,
    occupied:  rooms.filter((r) => r.status === 'occupied').length,
    reserved:  rooms.filter((r) => r.status === 'reserved').length,
    cleaning:  rooms.filter((r) => r.status === 'cleaning').length,
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sơ đồ Phòng</h1>

      {/* Status Legend — badge/pill style */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center flex-wrap gap-3">
          {(Object.entries(statusConfig) as [RoomStatus, typeof statusConfig[RoomStatus]][]).map(
            ([status, cfg]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm ${cfg.badgeBg} ${cfg.badgeText}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className="font-bold">{statusCounts[status]}</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-20 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm số phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Floor Filter */}
          <select
            value={selectedFloor}
            onChange={(e) =>
              setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả tầng</option>
            {[1, 2, 3, 4, 5].map((floor) => (
              <option key={floor} value={floor}>
                Tầng {floor}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả loại phòng</option>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>

          <span className="ml-auto text-sm text-gray-500">
            Hiển thị <span className="font-semibold text-gray-700">{filteredRooms.length}</span> phòng
          </span>
        </div>
      </div>

      {/* Room Grid */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-10 gap-3">
          {filteredRooms.map((room) => {
            const config = statusConfig[room.status];
            return (
              <div
                key={room.id}
                className={`${config.bgColor} border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
              >
                <div className="text-center">
                  <p className="font-bold text-base text-gray-800">P{room.id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{room.type}</p>
                  <p className={`text-xs font-semibold mt-1.5 ${config.color}`}>{config.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
