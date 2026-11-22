/**
 * Module: frontend/src/pages/warden/WardenRoomsPage.jsx
 *
 * Work / Purpose:
 *   Warden rooms inspector page for managing and searching rooms and beds within assigned hostels.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  Bed,
  Search,
  Filter,
  Building,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  ChevronDown,
  Layers,
  Sparkles,
  User,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';

export const WardenRoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State
  const [selectedRoomModal, setSelectedRoomModal] = useState(null);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchRoomsData = async () => {
    try {
      setLoading(true);
      const [hostelRes, roomRes] = await Promise.allSettled([
        api.getHostels(),
        api.getRooms(),
      ]);

      if (hostelRes.status === 'fulfilled') {
        const hList = hostelRes.value?.results || hostelRes.value || [];
        setHostels(hList);
        if (hList.length > 0) setSelectedHostel(hList[0]);
      }

      if (roomRes.status === 'fulfilled') {
        const rList = roomRes.value?.results || roomRes.value || [];
        const mapped = rList.map((r) => {
          const occupied = r.occupied_count || 0;
          const capacity = r.capacity || 2;
          const residents = (r.beds || [])
            .filter((b) => b.current_occupant)
            .map((b) => ({
              name: `${b.current_occupant.first_name || ''} ${b.current_occupant.last_name || ''}`.trim() || b.current_occupant.email,
              regNo: b.current_occupant.student_profile?.registration_number || b.current_occupant.username || 'N/A',
              avatar: '/images/student_user.jpg',
              bed: `Bed ${b.bed_number}`,
            }));

          return {
            id: r.id,
            room_number: r.room_number,
            floor: r.floor,
            capacity: capacity,
            current_occupants: occupied,
            room_type: `${capacity} Seater`,
            status: !r.is_active ? 'MAINTENANCE' : (occupied >= capacity ? 'OCCUPIED' : (occupied > 0 ? 'PARTIAL' : 'VACANT')),
            maintenance: !r.is_active,
            is_available_for_exchange: r.is_available_for_exchange !== false,
            hostel_name: r.hostel_name || 'Hostel',
            hostel_code: r.hostel_code || 'Hostel',
            hostel_id: r.hostel_id,
            residents: residents,
            beds: r.beds || [],
            maintenanceNote: !r.is_active ? 'Maintenance hold active.' : '',
          };
        });
        setRooms(mapped);
      } else {
        setRooms([]);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsData();
  }, []);

  useRealtimeSync(fetchRoomsData, { pollIntervalMs: 6000 });

  const handleToggleMaintenance = async (roomId) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    try {
      const nextActive = targetRoom.maintenance; // if currently maintenance (is_active=false), clearing hold sets is_active=true
      await api.updateRoom(roomId, { is_active: nextActive });

      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === roomId) {
            const nextMaintenance = !nextActive;
            return {
              ...r,
              maintenance: nextMaintenance,
              status: nextMaintenance ? 'MAINTENANCE' : r.current_occupants >= r.capacity ? 'OCCUPIED' : r.current_occupants > 0 ? 'PARTIAL' : 'VACANT',
              maintenanceNote: nextMaintenance ? (maintenanceNote || 'Routine inspection / maintenance hold.') : '',
            };
          }
          return r;
        })
      );
      if (selectedRoomModal) {
        setSelectedRoomModal((prev) => ({
          ...prev,
          maintenance: !prev.maintenance,
          maintenanceNote: !prev.maintenance ? (maintenanceNote || 'Routine inspection / maintenance hold.') : '',
        }));
      }
      setActionSuccess(`Room ${targetRoom.room_number} status updated successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchRoomsData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update room maintenance status.');
    }
  };

  const handleToggleExchangeEligibility = async (roomId) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    try {
      const nextVal = !targetRoom.is_available_for_exchange;
      await api.updateRoom(roomId, { is_available_for_exchange: nextVal });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, is_available_for_exchange: nextVal } : r))
      );
      setActionSuccess(`Room ${targetRoom.room_number} exchange eligibility updated.`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchRoomsData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update room exchange eligibility.');
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (room.room_number || '').toLowerCase().includes(q) ||
      (room.residents || []).some((res) => res.name.toLowerCase().includes(q) || res.regNo.includes(q));

    const matchesFloor = selectedFloor === 'ALL' || room.floor.toString() === selectedFloor;
    const matchesType = selectedType === 'ALL' || room.room_type.includes(selectedType);

    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'OCCUPIED' && room.status === 'OCCUPIED' && !room.maintenance) ||
      (selectedStatus === 'PARTIAL' && room.status === 'PARTIAL' && !room.maintenance) ||
      (selectedStatus === 'VACANT' && room.status === 'VACANT' && !room.maintenance) ||
      (selectedStatus === 'MAINTENANCE' && room.maintenance);

    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  const totalBeds = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.maintenance ? 0 : r.current_occupants), 0);
  const maintenanceRooms = rooms.filter((r) => r.maintenance).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Title & Metrics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f78c30] uppercase tracking-wider mb-1">
              <Bed className="w-4 h-4" />
              <span>{selectedHostel?.name || selectedHostel?.code || 'Hostel'} Inventory</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Room Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Inspect all student rooms, monitor occupancy slots, and place maintenance holds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rooms</p>
              <p className="text-xl font-black text-slate-900">{rooms.length}</p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Beds Filled</p>
              <p className="text-xl font-black text-[#f78c30]">{occupiedBeds} / {totalBeds}</p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Maintenance</p>
              <p className="text-xl font-black text-amber-600">{maintenanceRooms}</p>
            </div>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by room number (e.g. 101) or resident name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Floor filter */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#f78c30]"
            >
              <option value="ALL">All Floors</option>
              <option value="1">1st Floor</option>
              <option value="2">2nd Floor</option>
              <option value="3">3rd Floor</option>
              <option value="4">4th Floor</option>
            </select>

            {/* Room Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#f78c30]"
            >
              <option value="ALL">All Room Types</option>
              <option value="1">1 Seater</option>
              <option value="2">2 Seater</option>
              <option value="3">3 Seater</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#f78c30]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OCCUPIED">Fully Occupied</option>
              <option value="PARTIAL">Partially Vacant</option>
              <option value="VACANT">Vacant</option>
              <option value="MAINTENANCE">Maintenance Hold</option>
            </select>
          </div>
        </div>

        {/* Room Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/70 shadow-xs text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 text-[#f78c30] flex items-center justify-center mx-auto mb-3.5 border border-orange-100">
              <Bed className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {rooms.length === 0 ? 'No Rooms in This Hostel (0 Rooms)' : 'No Rooms Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {rooms.length === 0
                ? 'Rooms are configured and added by the Admin in the Admin Portal. Once added, you will see them here to track capacity, manage residents, and place maintenance holds.'
                : 'No rooms match your active search or filter criteria. Try resetting your filters.'}
            </p>
            {rooms.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFloor('ALL');
                  setSelectedType('ALL');
                  setSelectedStatus('ALL');
                }}
                className="px-4 py-2 rounded-2xl bg-[#f4f7fb] hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((room) => {
              const isFull = room.current_occupants >= room.capacity;
              const vacantBeds = room.capacity - room.current_occupants;

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Floor {room.floor} · {room.room_type}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-0.5">
                          {room.hostel_code} {room.room_number}
                        </h3>
                      </div>

                      {room.maintenance ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Maintenance
                        </span>
                      ) : isFull ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-[#f78c30] border border-purple-200">
                          Full ({room.capacity}/{room.capacity})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {vacantBeds} Bed{vacantBeds > 1 ? 's' : ''} Open
                        </span>
                      )}
                    </div>

                    {/* Exchange Eligibility Badge */}
                    <div className="mb-3">
                      <button
                        onClick={() => handleToggleExchangeEligibility(room.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          room.is_available_for_exchange
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {room.is_available_for_exchange ? '✓ Exchange Allowed' : '🔒 Exchange Locked'}
                      </button>
                    </div>

                    {/* Residents List */}
                    <div className="space-y-2 mt-2 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Current Residents ({room.current_occupants}/{room.capacity})
                      </p>
                      {room.residents && room.residents.length > 0 ? (
                        room.residents.map((res, i) => (
                          <div key={i} className="flex items-center justify-between py-1 text-xs">
                            <div className="flex items-center gap-2">
                              <img
                                src={res.avatar}
                                alt={res.name}
                                loading="lazy"
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <p className="font-bold text-slate-800 leading-none">{res.name}</p>
                                <p className="text-[10px] text-slate-400">{res.regNo}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                              {res.bed}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-1">No residents allocated</p>
                      )}
                    </div>

                    {room.maintenanceNote && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800">
                        <strong>Note:</strong> {room.maintenanceNote}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedRoomModal(room)}
                      className="flex-1 py-2 px-3 rounded-2xl bg-[#f4f7fb] hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-center"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleToggleMaintenance(room.id)}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                        room.maintenance
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{room.maintenance ? 'Clear Hold' : 'Maintenance'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Room Inspection & Resident Management */}
        {selectedRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Room {selectedRoomModal.hostel_code || 'Hostel'} {selectedRoomModal.room_number}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Floor {selectedRoomModal.floor} · {selectedRoomModal.room_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoomModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Allocated Residents</h4>
                  <div className="space-y-2">
                    {selectedRoomModal.residents.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-[#f4f7fb] border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={r.avatar}
                            alt={r.name}
                            loading="lazy"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{r.name}</p>
                            <p className="text-[10px] text-slate-500">Reg: {r.regNo} · {r.bed}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Resident
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Maintenance Hold Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason for maintenance hold or inspection..."
                    value={maintenanceNote}
                    onChange={(e) => setMaintenanceNote(e.target.value)}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedRoomModal(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleToggleMaintenance(selectedRoomModal.id);
                    setSelectedRoomModal(null);
                  }}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition ${
                    selectedRoomModal.maintenance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#f78c30] hover:bg-[#e27518]'
                  }`}
                >
                  {selectedRoomModal.maintenance ? 'Mark as Available' : 'Place on Maintenance Hold'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default WardenRoomsPage;
