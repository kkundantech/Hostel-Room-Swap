/**
 * Module: frontend/src/components/student/StudentBrowseRoomsModal.jsx
 *
 * Work / Purpose:
 *   Modular student modal for searching and filtering available campus rooms by block or query and initiating a swap request.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { Search, X } from 'lucide-react';

export const StudentBrowseRoomsModal = ({
  isOpen,
  onClose,
  roomSearchQuery,
  setRoomSearchQuery,
  availableBlocks,
  roomFilterBlock,
  setRoomFilterBlock,
  filteredRooms,
  onRequestSwap,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-[#f78c30]" />
              <span>Browse Available Rooms for Swap</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified campus rooms matching your policy eligibility.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by room number, block or AC..."
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#f78c30]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {availableBlocks.map((blk) => (
              <button
                key={blk}
                onClick={() => setRoomFilterBlock(blk)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  roomFilterBlock === blk
                    ? 'bg-[#f78c30] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {blk}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Cards List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-[#f78c30] bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src="/images/hostel_room_view.jpg"
                    alt={r.room}
                    className="w-16 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {r.block} &bull; Room {r.room}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                        {r.seater}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#f78c30] border border-orange-200 text-[10px] font-bold">
                        {r.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Floor: <span className="font-semibold text-slate-700">{r.floor}</span> &bull; {r.distance}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onRequestSwap}
                  className="px-4 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-xs shrink-0 self-end sm:self-center"
                >
                  Request Swap
                </button>
              </div>
            ))
          ) : (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#f78c30] flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Rooms Available</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                There are no rooms currently published. Once hostel rooms are configured by administration, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentBrowseRoomsModal;
