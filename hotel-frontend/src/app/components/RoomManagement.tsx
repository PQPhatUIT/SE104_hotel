// RoomManagement.tsx — Kết nối API thật
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Room {
  room_id: number;
  room_number: string;
  room_type_id: number;
  type_name: string;
  base_price: number;
  max_occupancy: number;
  status: 'available' | 'occupied' | 'booked' | 'maintenance';
  updated_at: string;
}

interface RoomType { room_type_id: number; type_name: string; base_price: number; max_occupancy: number; }

const STATUS_LABEL: Record<string, string> = {
  available:   'Trống',
  occupied:    'Đang dùng',
  maintenance: 'Bảo trì',
};
const STATUS_COLOR: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  occupied:    'bg-red-100 text-red-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
};

export function RoomManagement() {
  const { token } = useAuth();
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom]   = useState<Room | null>(null);
  const [form, setForm]           = useState({ room_number: '', room_type_id: '', status: 'available' });
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`${API_BASE}/api/rooms${params}`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch { toast.error('Không thể tải danh sách phòng'); }
    finally { setIsLoading(false); }
  }, [filterStatus]);

  useEffect(() => {
    fetchRooms();
    fetch(`${API_BASE}/api/room-types`)
      .then(r => r.json())
      .then(d => setRoomTypes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchRooms]);

  const openCreate = () => {
    setEditRoom(null);
    setForm({ room_number: '', room_type_id: roomTypes[0]?.room_type_id?.toString() || '', status: 'available' });
    setShowModal(true);
  };

  const openEdit = (r: Room) => {
    setEditRoom(r);
    setForm({ room_number: r.room_number, room_type_id: String(r.room_type_id), status: r.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.room_number || !form.room_type_id) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    setSaving(true);
    try {
      if (editRoom) {
        // Cập nhật trạng thái
        const res = await fetch(`${API_BASE}/api/rooms/${editRoom.room_id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: form.status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success('Cập nhật trạng thái phòng thành công');
      } else {
        // Tạo phòng mới
        const res = await fetch(`${API_BASE}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ room_number: form.room_number, room_type_id: Number(form.room_type_id) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success('Thêm phòng thành công');
      }
      setShowModal(false);
      fetchRooms();
    } catch (err: any) { toast.error(err.message || 'Lỗi lưu'); }
    finally { setSaving(false); }
  };


  // ── Xóa phòng — QĐ 2.2: không xóa khi đang ở ──────────────────────────
  const handleDelete = async (room: Room) => {
    if (room.status === 'occupied' || room.status === 'booked') {
      toast.error(`Không thể xóa phòng ${room.room_number} đang có khách. Đổi trạng thái về "Trống" trước.`);
      return;
    }
    if (!confirm(`Bạn chắc chắn muốn xóa phòng ${room.room_number}? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(room.room_id);
    try {
      const res  = await fetch(`${API_BASE}/api/rooms/${room.room_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa phòng');
    } finally {
      setDeletingId(null);
    }
  };

  const counts = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Phòng</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> Thêm phòng
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng phòng', value: counts.total, color: 'text-gray-800' },
          { label: 'Phòng trống', value: counts.available, color: 'text-green-600' },
          { label: 'Đang sử dụng', value: counts.occupied, color: 'text-red-600' },
          { label: 'Bảo trì', value: counts.maintenance, color: 'text-yellow-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6 flex items-center gap-4">
        <span className="text-sm text-gray-600 font-medium">Lọc trạng thái:</span>
        {['', 'available', 'occupied', 'maintenance'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === '' ? 'Tất cả' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500"><Loader2 className="w-6 h-6 animate-spin" /> Đang tải...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Không có phòng nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Số phòng', 'Loại phòng', 'Giá/đêm', 'Sức chứa', 'Trạng thái', 'Cập nhật', 'Thao tác'].map(h =>
                <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.map(r => (
                <tr key={r.room_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">Phòng {r.room_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{r.type_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{r.base_price?.toLocaleString('vi-VN')} đ</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.max_occupancy} người</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa trạng thái">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.room_id || r.status === 'occupied' || r.status === 'booked'}
                        className={`p-2 rounded-lg transition-colors ${
                          r.status === 'occupied' || r.status === 'booked'
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                        title={r.status === 'occupied' || r.status === 'booked' ? 'Không thể xóa khi phòng đang sử dụng' : 'Xóa phòng'}
                      >
                        {deletingId === r.room_id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editRoom ? `Cập nhật phòng ${editRoom.room_number}` : 'Thêm phòng mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!editRoom && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số phòng *</label>
                    <input type="text" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="101" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại phòng *</label>
                    <select value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {roomTypes.map(rt => <option key={rt.room_type_id} value={rt.room_type_id}>{rt.type_name} — {rt.base_price.toLocaleString('vi-VN')}đ/đêm</option>)}
                    </select>
                  </div>
                </>
              )}
              {editRoom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="available">Trống</option>
                    <option value="occupied">Đang sử dụng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editRoom ? 'Cập nhật' : 'Thêm phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}