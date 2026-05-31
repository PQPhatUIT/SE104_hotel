// RoomManagement.tsx — Quản lý phòng + hạng phòng
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Save, Hotel } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Types ────────────────────────────────────────────────────────────────────
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

interface RoomType {
  room_type_id: number;
  type_name: string;
  base_price: number;
  max_occupancy: number;
  description?: string;
}

const STATUS_LABEL: Record<string, string> = {
  available:   'Trống',
  occupied:    'Đang dùng',
  booked:      'Đã đặt',
  maintenance: 'Bảo trì',
};
const STATUS_COLOR: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  occupied:    'bg-red-100 text-red-700',
  booked:      'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
};

// ── Component ────────────────────────────────────────────────────────────────
export function RoomManagement() {
  const { token } = useAuth();

  // Tab hiện tại: 'rooms' | 'types'
  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');

  // ── State: Phòng ──────────────────────────────────────────────────────────
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [roomTypes, setRoomTypes]     = useState<RoomType[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [filterStatus, setFilterStatus]     = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

  // Modal phòng
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom]           = useState<Room | null>(null);
  const [roomForm, setRoomForm]           = useState({ room_number: '', room_type_id: '', status: 'available' });
  const [savingRoom, setSavingRoom]       = useState(false);

  // ── State: Hạng phòng ─────────────────────────────────────────────────────
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<number | null>(null);

  // Modal hạng phòng
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editType, setEditType]           = useState<RoomType | null>(null);
  const [typeForm, setTypeForm]           = useState({ type_name: '', base_price: '', max_occupancy: '2', description: '' });
  const [savingType, setSavingType]       = useState(false);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res  = await fetch(`${API_BASE}/api/rooms${params}`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch { toast.error('Không thể tải danh sách phòng'); }
    finally { setIsLoadingRooms(false); }
  }, [filterStatus]);

  const fetchRoomTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const res  = await fetch(`${API_BASE}/api/room-types`);
      const data = await res.json();
      setRoomTypes(Array.isArray(data) ? data : []);
    } catch { toast.error('Không thể tải danh sách hạng phòng'); }
    finally { setIsLoadingTypes(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => { fetchRoomTypes(); }, [fetchRoomTypes]);

  // ── Handlers: Phòng ───────────────────────────────────────────────────────
  const openCreateRoom = () => {
    setEditRoom(null);
    setRoomForm({ room_number: '', room_type_id: roomTypes[0]?.room_type_id?.toString() || '', status: 'available' });
    setShowRoomModal(true);
  };

  const openEditRoom = (r: Room) => {
    setEditRoom(r);
    setRoomForm({ room_number: r.room_number, room_type_id: String(r.room_type_id), status: r.status });
    setShowRoomModal(true);
  };

  const handleSaveRoom = async () => {
    if (!roomForm.room_number && !editRoom) { toast.error('Vui lòng nhập số phòng'); return; }
    if (!roomForm.room_type_id) { toast.error('Vui lòng chọn loại phòng'); return; }
    setSavingRoom(true);
    try {
      if (editRoom) {
        // Gọi 2 API riêng nếu cả 2 field đều thay đổi
        const promises = [];

        // Sửa loại phòng nếu thay đổi
        if (Number(roomForm.room_type_id) !== editRoom.room_type_id) {
          promises.push(
            fetch(`${API_BASE}/api/rooms/${editRoom.room_id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ room_type_id: Number(roomForm.room_type_id) }),
            }).then(async r => { if (!r.ok) throw new Error((await r.json()).message); })
          );
        }

        // Sửa trạng thái nếu thay đổi
        if (roomForm.status !== editRoom.status) {
          promises.push(
            fetch(`${API_BASE}/api/rooms/${editRoom.room_id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status: roomForm.status }),
            }).then(async r => { if (!r.ok) throw new Error((await r.json()).message); })
          );
        }

        if (promises.length === 0) { toast('Không có thay đổi nào.'); setShowRoomModal(false); return; }
        await Promise.all(promises);
        toast.success('Cập nhật phòng thành công');
      } else {
        const res  = await fetch(`${API_BASE}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ room_number: roomForm.room_number, room_type_id: Number(roomForm.room_type_id) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success('Thêm phòng thành công');
      }
      setShowRoomModal(false);
      fetchRooms();
    } catch (err: any) { toast.error(err.message || 'Lỗi lưu'); }
    finally { setSavingRoom(false); }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (['occupied', 'booked'].includes(room.status)) {
      toast.error(`Không thể xóa phòng ${room.room_number} đang có khách.`);
      return;
    }
    if (!confirm(`Xóa phòng ${room.room_number}? Hành động này không thể hoàn tác.`)) return;
    setDeletingRoomId(room.room_id);
    try {
      const res  = await fetch(`${API_BASE}/api/rooms/${room.room_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchRooms();
    } catch (err: any) { toast.error(err.message || 'Lỗi xóa phòng'); }
    finally { setDeletingRoomId(null); }
  };

  // ── Handlers: Hạng phòng ─────────────────────────────────────────────────
  const openCreateType = () => {
    setEditType(null);
    setTypeForm({ type_name: '', base_price: '', max_occupancy: '2', description: '' });
    setShowTypeModal(true);
  };

  const openEditType = (rt: RoomType) => {
    setEditType(rt);
    setTypeForm({
      type_name:     rt.type_name,
      base_price:    String(rt.base_price),
      max_occupancy: String(rt.max_occupancy),
      description:   rt.description || '',
    });
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.type_name.trim()) { toast.error('Vui lòng nhập tên hạng phòng'); return; }
    if (!typeForm.base_price || Number(typeForm.base_price) <= 0) { toast.error('Giá phòng phải lớn hơn 0'); return; }
    setSavingType(true);
    try {
      const body = {
        type_name:     typeForm.type_name.trim(),
        base_price:    Number(typeForm.base_price),
        max_occupancy: Number(typeForm.max_occupancy),
        description:   typeForm.description || null,
      };
      const url    = editType ? `${API_BASE}/api/room-types/${editType.room_type_id}` : `${API_BASE}/api/room-types`;
      const method = editType ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(editType ? 'Cập nhật hạng phòng thành công' : 'Thêm hạng phòng thành công');
      setShowTypeModal(false);
      fetchRoomTypes();
      fetchRooms(); // refresh vì giá/tên hạng có thể đã thay đổi
    } catch (err: any) { toast.error(err.message || 'Lỗi lưu'); }
    finally { setSavingType(false); }
  };

  const handleDeleteType = async (rt: RoomType) => {
    if (!confirm(`Xóa hạng phòng "${rt.type_name}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingTypeId(rt.room_type_id);
    try {
      const res  = await fetch(`${API_BASE}/api/room-types/${rt.room_type_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      fetchRoomTypes();
    } catch (err: any) { toast.error(err.message || 'Lỗi xóa'); }
    finally { setDeletingTypeId(null); }
  };

  // ── KPI ──────────────────────────────────────────────────────────────────
  const counts = {
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Phòng</h1>
        <button
          onClick={tab === 'rooms' ? openCreateRoom : openCreateType}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {tab === 'rooms' ? 'Thêm phòng' : 'Thêm hạng phòng'}
        </button>
      </div>

      {/* KPI Cards — chỉ hiện ở tab phòng */}
      {tab === 'rooms' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng phòng',    value: counts.total,       color: 'text-gray-800' },
            { label: 'Phòng trống',   value: counts.available,   color: 'text-green-600' },
            { label: 'Đang sử dụng',  value: counts.occupied,    color: 'text-red-600' },
            { label: 'Bảo trì',       value: counts.maintenance, color: 'text-yellow-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {([['rooms', 'Danh sách phòng'], ['types', 'Hạng phòng']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Danh sách phòng ── */}
      {tab === 'rooms' && (
        <>
          {/* Filter */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-6 flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">Lọc:</span>
            {(['', 'available', 'occupied', 'maintenance'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'Tất cả' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            {isLoadingRooms ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" /> Đang tải...
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Không có phòng nào</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Số phòng', 'Loại phòng', 'Giá/đêm', 'Sức chứa', 'Trạng thái', 'Cập nhật', 'Thao tác'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rooms.map(r => (
                    <tr key={r.room_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">Phòng {r.room_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{r.type_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{r.base_price?.toLocaleString('vi-VN')} đ</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.max_occupancy} người</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {r.updated_at ? new Date(r.updated_at).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRoom(r)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa phòng"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r)}
                            disabled={deletingRoomId === r.room_id || ['occupied', 'booked'].includes(r.status)}
                            className={`p-2 rounded-lg transition-colors ${
                              ['occupied', 'booked'].includes(r.status)
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                            title={['occupied', 'booked'].includes(r.status) ? 'Không thể xóa khi phòng đang sử dụng' : 'Xóa phòng'}
                          >
                            {deletingRoomId === r.room_id
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
        </>
      )}

      {/* ── Tab: Hạng phòng ── */}
      {tab === 'types' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          {isLoadingTypes ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" /> Đang tải...
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="text-center py-16 text-gray-500">Chưa có hạng phòng nào</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Tên hạng phòng', 'Giá/đêm', 'Sức chứa tối đa', 'Mô tả', 'Thao tác'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roomTypes.map(rt => (
                  <tr key={rt.room_type_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-blue-500" />
                        {rt.type_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      {rt.base_price?.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rt.max_occupancy} người</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {rt.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditType(rt)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa hạng phòng"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(rt)}
                          disabled={deletingTypeId === rt.room_type_id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Xóa hạng phòng"
                        >
                          {deletingTypeId === rt.room_type_id
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
      )}

      {/* ── Modal: Phòng ── */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editRoom ? `Cập nhật phòng ${editRoom.room_number}` : 'Thêm phòng mới'}
              </h2>
              <button onClick={() => setShowRoomModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Số phòng — chỉ hiện khi tạo mới */}
              {!editRoom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số phòng *</label>
                  <input
                    type="text"
                    value={roomForm.room_number}
                    onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })}
                    placeholder="101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Loại phòng — hiện cả khi tạo lẫn khi sửa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại phòng *</label>
                <select
                  value={roomForm.room_type_id}
                  onChange={e => setRoomForm({ ...roomForm, room_type_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {roomTypes.map(rt => (
                    <option key={rt.room_type_id} value={rt.room_type_id}>
                      {rt.type_name} — {rt.base_price.toLocaleString('vi-VN')}đ/đêm
                    </option>
                  ))}
                </select>
              </div>

              {/* Trạng thái — chỉ hiện khi sửa */}
              {editRoom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  {['occupied', 'booked'].includes(editRoom.status) ? (
                    <div className="space-y-1">
                      <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        🔴 Phòng đang có khách — không thể thay đổi thủ công
                      </div>
                      <p className="text-xs text-gray-400">Trạng thái sẽ tự chuyển về "Trống" khi khách check-out</p>
                    </div>
                  ) : (
                    <>
                      <select
                        value={roomForm.status}
                        onChange={e => setRoomForm({ ...roomForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="available">Trống</option>
                        <option value="maintenance">Bảo trì</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Chỉ chuyển được giữa Trống ↔ Bảo trì.</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowRoomModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Huỷ
              </button>
              <button
                onClick={handleSaveRoom}
                disabled={savingRoom}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editRoom ? 'Cập nhật' : 'Thêm phòng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Hạng phòng ── */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editType ? `Sửa hạng: ${editType.type_name}` : 'Thêm hạng phòng mới'}
              </h2>
              <button onClick={() => setShowTypeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hạng phòng *</label>
                <input
                  type="text"
                  value={typeForm.type_name}
                  onChange={e => setTypeForm({ ...typeForm, type_name: e.target.value })}
                  placeholder="VD: Deluxe, Standard, Suite..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá/đêm (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  value={typeForm.base_price}
                  onChange={e => setTypeForm({ ...typeForm, base_price: e.target.value })}
                  placeholder="VD: 500000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa tối đa *</label>
                <input
                  type="number"
                  min="1"
                  value={typeForm.max_occupancy}
                  onChange={e => setTypeForm({ ...typeForm, max_occupancy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả tiện nghi, đặc điểm..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowTypeModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Huỷ
              </button>
              <button
                onClick={handleSaveType}
                disabled={savingType}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editType ? 'Cập nhật' : 'Thêm hạng phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}