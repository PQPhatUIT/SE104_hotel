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

const statusConfig: Record<RoomStatus, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Trống', color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
  occupied: { label: 'Đang ở', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
  reserved: { label: 'Đã đặt', color: 'text-orange-700', bgColor: 'bg-orange-100 border-orange-300' },
  cleaning: { label: 'Đang dọn', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-300' },
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
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    reserved: rooms.filter(r => r.status === 'reserved').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sơ đồ Phòng</h1>

      {/* Status Legend */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-8">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${config.bgColor.split(' ')[0]}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {config.label}: {statusCounts[status as RoomStatus]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm số phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Floor Filter */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả tầng</option>
            {[1, 2, 3, 4, 5].map((floor) => (
              <option key={floor} value={floor}>Tầng {floor}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả loại phòng</option>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>
        </div>
      </div>

      {/* Room Grid */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="grid grid-cols-10 gap-3">
          {filteredRooms.map((room) => {
            const config = statusConfig[room.status];
            return (
              <div
                key={room.id}
                className={`${config.bgColor} border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow`}
              >
                <div className="text-center">
                  <p className="font-bold text-lg text-gray-800">P{room.id}</p>
                  <p className="text-xs text-gray-600 mt-1">{room.type}</p>
                  <p className={`text-xs font-semibold mt-2 ${config.color}`}>
                    {config.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
