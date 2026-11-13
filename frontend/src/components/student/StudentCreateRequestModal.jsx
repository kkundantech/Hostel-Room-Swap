/**
 * Module: frontend/src/components/student/StudentCreateRequestModal.jsx
 *
 * Work / Purpose:
 *   Modular student modal form for creating a new room exchange request with hostel, seater, floor, and reason fields.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const StudentCreateRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  formError,
  formSuccess,
  allocation,
  selectedHostel,
  setSelectedHostel,
  hostels,
  preferredSeater,
  setPreferredSeater,
  preferredFloor,
  setPreferredFloor,
  reason,
  setReason,
  submitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fff8f1] text-[#f78c30] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Create Room Exchange Request
              </h3>
              <p className="text-[11px] text-slate-400">
                Specify preferences to enter the automated cycle matching engine.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Current Allocation Pill */}
          <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center justify-between text-xs">
            <span className="text-orange-950 font-medium">Current Allocation:</span>
            <span className="font-bold text-[#f78c30] bg-white px-2.5 py-0.5 rounded-lg border border-orange-200/80 shadow-2xs">
              {allocation ? `${allocation.bed?.hostel_name || 'Hostel'} ${allocation.bed?.room_number || 'Room'}` : 'No Room Allocated'}
            </span>
          </div>

          {/* Preferred Hostel */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Preferred Hostel Block
            </label>
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            >
              <option value="">Any Compatible Hostel (Campus-Wide Cycle)</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code}) &bull; {h.gender_display || h.gender}
                </option>
              ))}
              {hostels.length === 0 && (
                <>
                  <option value="BH1">Boys Hostel 1 (BH-1)</option>
                  <option value="BH2">Boys Hostel 2 (BH-2)</option>
                  <option value="BH3">Boys Hostel 3 (BH-3)</option>
                  <option value="BH4">Boys Hostel 4 (BH-4)</option>
                </>
              )}
            </select>
          </div>

          {/* Preference Row: Room Type & Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room Capacity
              </label>
              <select
                value={preferredSeater}
                onChange={(e) => setPreferredSeater(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
              >
                <option value="1 Seater">Single Seater (Private)</option>
                <option value="2 Seater">2 Seater</option>
                <option value="3 Seater">3 Seater</option>
                <option value="4 Seater">4 Seater</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Floor Preference
              </label>
              <select
                value={preferredFloor}
                onChange={(e) => setPreferredFloor(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
              >
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st or 2nd Floor">1st or 2nd Floor</option>
                <option value="3rd or 4th Floor">3rd or 4th Floor (Quiet)</option>
                <option value="Any Floor">Any Compatible Floor</option>
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Exchange
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g., Looking for a quiet floor closer to research lab peers for semester project."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-md shadow-[#f78c30]/25 flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Exchange Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentCreateRequestModal;
