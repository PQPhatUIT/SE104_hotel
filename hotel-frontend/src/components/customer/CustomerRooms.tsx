import { useState } from 'react';
import { Bed, Users, Wifi, Coffee, Tv, Wind } from 'lucide-react';
import { toast } from 'sonner';

interface Room {
  id: string;
  name: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  price: number;
  available: boolean;
  image: string;
  amenities: string[];
  capacity: number;
}

const rooms: Room[] = [
  {
    id: 'R001',
    name: 'Standard Room',
    type: 'Standard',
    price: 500000,
    available: true,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa'],
    capacity: 2,
  },
  {
    id: 'R002',
    name: 'Deluxe Room',
    type: 'Deluxe',
    price: 800000,
    available: true,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar'],
    capacity: 3,
  },
  {
    id: 'R003',
    name: 'Suite Room',
    type: 'Suite',
    price: 1500000,
    available: false,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Bồn tắm'],
    capacity: 4,
  },
  {
    id: 'R004',
    name: 'Standard Double',
    type: 'Standard',
    price: 550000,
    available: true,
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa'],
    capacity: 2,
  },
  {
    id: 'R005',
    name: 'Deluxe Twin',
    type: 'Deluxe',
    price: 850000,
    available: true,
    image: 'https://images.unsplash.com/photo-1560185127-6a684fbacb42?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Phòng tắm riêng'],
    capacity: 3,
  },
  {
    id: 'R006',
    name: 'Presidential Suite',
    type: 'Suite',
    price: 2000000,
    available: true,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
    amenities: ['Wifi', 'TV', 'Điều hòa', 'Minibar', 'Bồn tắm', 'View biển'],
    capacity: 6,
  },
];

export function CustomerRooms() {
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredRooms = rooms.filter((room) =>
    selectedType === 'all' || room.type === selectedType
  );

  const handleBooking = (room: Room) => {
    if (!room.available) {
      toast.error('Phòng hiện không có sẵn');
      return;
    }
    toast.success(`Đã thêm ${room.name} vào giỏ đặt phòng`);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Đặt phòng</h1>

      {/* Filter */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Loại phòng:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedType('Standard')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'Standard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setSelectedType('Deluxe')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'Deluxe'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deluxe
            </button>
            <button
              onClick={() => setSelectedType('Suite')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'Suite'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suite
            </button>
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="grid grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-48 object-cover"
              />
              {!room.available && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 text-sm font-medium">
                  Đã đặt
                </div>
              )}
              {room.available && (
                <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 text-sm font-medium">
                  Còn trống
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.type}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${
                  room.type === 'Standard' ? 'bg-blue-100 text-blue-700' :
                  room.type === 'Deluxe' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {room.type}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Users className="w-4 h-4" />
                <span>Tối đa {room.capacity} người</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {room.amenities.map((amenity) => (
                  <span key={amenity} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {amenity}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Giá mỗi đêm</p>
                  <p className="text-xl font-bold text-blue-600">
                    {room.price.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <button
                  onClick={() => handleBooking(room)}
                  disabled={!room.available}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    room.available
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {room.available ? 'Đặt phòng' : 'Hết phòng'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
