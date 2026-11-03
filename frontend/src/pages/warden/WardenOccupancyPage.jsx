import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  Users,
  Building,
  Bed,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  Sparkles,
  ChevronRight,
  Wrench,
  X
} from 'lucide-react';

export const WardenOccupancyPage = () => {
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOccupancyData = async () => {
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
            .map((b) => `${b.current_occupant.first_name || ''} ${b.current_occupant.last_name || ''}`.trim() || b.current_occupant.email);

          return {
            id: r.id,
            room: r.room_number,
            hostel_code: r.hostel_code || 'Hostel',
            floor: r.floor || 1,
            type: `${capacity} Seater`,
            capacity: capacity,
            occupied: occupied,
            status: !r.is_active ? 'MAINTENANCE' : (occupied >= capacity ? 'FULL' : (occupied > 0 ? 'PARTIAL' : 'VACANT')),
            residents: residents,
            note: !r.is_active ? 'Maintenance hold active on this room.' : '',
          };
        });
        setRooms(mapped);
      } else {
        setRooms([]);
      }
    } catch (err) {
      console.error('Error loading occupancy:', err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupancyData();
  }, []);

  const totalOccupied = rooms.reduce((acc, r) => acc + (r.status === 'MAINTENANCE' ? 0 : r.occupied), 0);
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const vacantBeds = Math.max(0, totalCapacity - totalOccupied);
  const occupancyPercentage = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const strokeDashoffset = totalCapacity > 0 ? 251.2 - (251.2 * occupancyPercentage) / 100 : 251.2;

  // Dynamic floor statistics
  const distinctFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  const floorData = distinctFloors.map((fl) => {
    const floorRooms = rooms.filter((r) => r.floor === fl);
    const flCap = floorRooms.reduce((acc, r) => acc + r.capacity, 0);
    const flOcc = floorRooms.reduce((acc, r) => acc + (r.status === 'MAINTENANCE' ? 0 : r.occupied), 0);
    const pct = flCap > 0 ? Math.round((flOcc / flCap) * 100) : 0;
    const names = { 0: 'Ground Floor', 1: '1st Floor', 2: '2nd Floor', 3: '3rd Floor', 4: '4th Floor' };
    return {
      floor: fl,
      name: names[fl] || `Floor ${fl}`,
      total: flCap,
      occupied: flOcc,
      pct: pct,
    };
  });

  const filteredGrid = rooms.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = r.room.toLowerCase().includes(q) || r.residents.some((res) => res.toLowerCase().includes(q));
    const matchFloor = selectedFloor === 'ALL' || r.floor.toString() === selectedFloor;
    return matchSearch && matchFloor;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#5B4DF5] uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Hostel Capacity & Live Occupancy</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Occupancy View ({selectedHostel?.name || selectedHostel?.code || 'Hostel'})
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time bed utilization, floor capacity analytics, and interactive room allocations.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#f8faff] p-3 rounded-2xl border border-slate-100">
            {/* Donut Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#5B4DF5"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-900">{occupancyPercentage}%</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{totalOccupied} / {totalCapacity}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Total Beds Filled</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{vacantBeds} Beds Vacant</p>
            </div>
          </div>
        </div>

        {/* Floor-wise Occupancy Cards */}
        {floorData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {floorData.map((f) => (
              <button
                key={f.floor}
                onClick={() => setSelectedFloor(selectedFloor === f.floor.toString() ? 'ALL' : f.floor.toString())}
                className={`p-4 rounded-3xl border transition text-left ${
                  selectedFloor === f.floor.toString()
                    ? 'bg-[#5B4DF5] text-white border-[#5B4DF5] shadow-md shadow-[#5B4DF5]/20'
                    : 'bg-white text-slate-800 border-slate-200/70 hover:border-slate-300 shadow-xs'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedFloor === f.floor.toString() ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {f.name}
                </p>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-black">{f.occupied}</span>
                  <span className={`text-xs font-semibold ${selectedFloor === f.floor.toString() ? 'text-indigo-200' : 'text-slate-400'}`}>
                    / {f.total}
                  </span>
                </div>
                <div className="w-full bg-black/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${selectedFloor === f.floor.toString() ? 'bg-white' : 'bg-[#5B4DF5]'}`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search room (e.g. 101) or resident name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Floor Filter:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-bold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#5B4DF5]"
            >
              <option value="ALL">All Floors</option>
              {distinctFloors.map((fl) => (
                <option key={fl} value={fl.toString()}>
                  Floor {fl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Room Grid */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Room Floorplan
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF5]"></span> Full (100%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available Bed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Maintenance
              </span>
            </div>
          </div>

          {filteredGrid.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                <Bed className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {rooms.length === 0 ? 'No Rooms in This Hostel (0 Rooms)' : 'No Rooms Match Search'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {rooms.length === 0
                  ? 'There are currently 0 rooms configured for this hostel. Rooms added by the Administrator in the Admin Portal will appear here.'
                  : 'Try adjusting your room search query or floor filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {filteredGrid.map((r) => {
                const isMaintenance = r.status === 'MAINTENANCE';
                const isFull = r.status === 'FULL';
                const isPartial = r.status === 'PARTIAL';

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomDetails(r)}
                    className={`p-3.5 rounded-2xl border transition text-left flex flex-col justify-between group hover:scale-[1.02] ${
                      isMaintenance
                        ? 'bg-amber-50/50 border-amber-200'
                        : isPartial
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-200/80 hover:border-[#5B4DF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{r.room}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isMaintenance ? 'bg-amber-500' : isPartial ? 'bg-emerald-500' : 'bg-[#5B4DF5]'
                        }`}
                      ></span>
                    </div>

                    <div className="my-2 text-[10px] text-slate-400 font-medium">
                      {r.type} · Fl {r.floor}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600">
                        {r.occupied}/{r.capacity} Beds
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          isMaintenance
                            ? 'bg-amber-100 text-amber-800'
                            : isPartial
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Room Resident Details Modal */}
        {selectedRoomDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedRoomDetails.hostel_code || selectedHostel?.code || 'Room'} {selectedRoomDetails.room}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Floor {selectedRoomDetails.floor} · {selectedRoomDetails.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoomDetails(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Allocated Students
                </h4>
                {selectedRoomDetails.residents && selectedRoomDetails.residents.length > 0 ? (
                  selectedRoomDetails.residents.map((name, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-[#f4f7fb] border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                          {name[0]}
                        </div>
                        <span className="font-bold text-slate-800">{name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Bed {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No students allocated to this room.</p>
                )}

                {selectedRoomDetails.note && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <strong>Notice:</strong> {selectedRoomDetails.note}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedRoomDetails(null)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#5B4DF5] text-white hover:bg-[#4d3ef0] transition shadow-md shadow-[#5B4DF5]/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default WardenOccupancyPage;
