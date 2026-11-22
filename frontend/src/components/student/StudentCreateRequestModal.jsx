/**
 * Module: frontend/src/components/student/StudentCreateRequestModal.jsx
 *
 * Work / Purpose:
 *   Modular student modal form for creating a new room exchange request with hostel,
 *   seater, floor, and reason fields, including real-time floor availability warnings.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *   - frontend/src/__tests__/core.test.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useMemo } from 'react';
import { Plus, X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/**
 * Check whether the requested floor is available in the selected hostel.
 * If the student requests a floor not available on BH1 or BH2 (or any hostel),
 * returns a warning so students are proactively informed.
 */
export const checkFloorAvailability = (selectedHostel, preferredFloor, hostels = []) => {
  if (!selectedHostel || !preferredFloor || preferredFloor === 'Any Floor' || preferredFloor === 'Any Compatible Floor') {
    return null;
  }

  const hostel = hostels.find(
    (h) => String(h.id) === String(selectedHostel) || h.code === selectedHostel
  );

  const hostelName = hostel?.name || (selectedHostel === 'BH1' ? 'Boys Hostel 1' : selectedHostel === 'BH2' ? "Boy's Hostel 2" : 'this hostel');
  const hostelCode = (hostel?.code || selectedHostel || '').toUpperCase();
  const maxFloor = hostel?.max_floor || (hostelCode === 'BH1' ? 3 : hostelCode === 'BH2' ? 4 : hostelCode === 'GH1' ? 2 : 3);
  const activeFloors = hostel?.available_floors || [1];

  let isUnavailable = false;

  // Evaluate floor preference
  if (preferredFloor.includes('4th') || preferredFloor.includes('5th')) {
    if (maxFloor < 4 || !activeFloors.includes(4)) {
      isUnavailable = true;
    }
  } else if (preferredFloor.includes('3rd') || preferredFloor.includes('3rd or 4th')) {
    if (maxFloor < 3 || (!activeFloors.includes(3) && !activeFloors.includes(4))) {
      isUnavailable = true;
    }
  } else if (preferredFloor.includes('2nd')) {
    if (maxFloor < 2 || !activeFloors.includes(2)) {
      isUnavailable = true;
    }
  }

  // Explicit validation for BH1 and BH2 as required by university specifications
  if (hostelCode === 'BH1' || selectedHostel === 'BH1') {
    // BH1 has only 3 floors and rooms currently on floor 1
    if (preferredFloor.includes('4th') || preferredFloor.includes('5th') || preferredFloor.includes('3rd or 4th')) {
      isUnavailable = true;
    }
  } else if (hostelCode === 'BH2' || selectedHostel === 'BH2') {
    // BH2 rooms currently on floor 1
    if (preferredFloor.includes('4th') || preferredFloor.includes('5th') || preferredFloor.includes('3rd or 4th')) {
      isUnavailable = true;
    }
  }

  if (isUnavailable) {
    return {
      message: `Currently it is not available on ${hostelName}, maybe in future you can try.`,
      details: `${hostelName} (${hostelCode}) has ${maxFloor} floors total. Rooms on ${preferredFloor} are currently not available for exchange.`,
    };
  }

  return null;
};

export const StudentCreateRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  formError,
  formSuccess,
  allocation,
  selectedHostel,
  setSelectedHostel,
  hostels = [],
  preferredSeater,
  setPreferredSeater,
  preferredFloor,
  setPreferredFloor,
  reason,
  setReason,
  submitting,
}) => {
  const floorWarning = useMemo(
    () => checkFloorAvailability(selectedHostel, preferredFloor, hostels),
    [selectedHostel, preferredFloor, hostels]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
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
                  {h.name} ({h.code}) &bull; {h.gender_display || h.gender || h.hostel_category}
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
                <option value="Ground Floor">
                  Ground Floor (Floor 1) {selectedHostel && !checkFloorAvailability(selectedHostel, 'Ground Floor', hostels) ? '• Available ✓' : ''}
                </option>
                <option value="2nd Floor">
                  2nd Floor {checkFloorAvailability(selectedHostel, '2nd Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="3rd Floor">
                  3rd Floor {checkFloorAvailability(selectedHostel, '3rd Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="4th Floor">
                  4th Floor {checkFloorAvailability(selectedHostel, '4th Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="5th Floor">
                  5th Floor {checkFloorAvailability(selectedHostel, '5th Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="1st or 2nd Floor">
                  1st or 2nd Floor {checkFloorAvailability(selectedHostel, '1st or 2nd Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="3rd or 4th Floor">
                  3rd or 4th Floor (Quiet) {checkFloorAvailability(selectedHostel, '3rd or 4th Floor', hostels) ? '• Currently Unavailable' : '• Available ✓'}
                </option>
                <option value="Any Floor">Any Compatible Floor • Available ✓</option>
              </select>
            </div>
          </div>

          {/* Floor Availability Warning Banner (When Room / Floor is NOT available) */}
          {floorWarning ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/95 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold text-amber-950">Floor Availability Advisory</p>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                    Currently Unavailable
                  </span>
                </div>
                <p className="mt-1 font-semibold leading-relaxed text-amber-800">
                  {floorWarning.message}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1 leading-relaxed">
                  {floorWarning.details}
                </p>
                <p className="text-[10px] text-amber-900 font-bold mt-2 bg-amber-100/70 p-2 rounded-lg border border-amber-200/60">
                  Notice: Rooms on this floor are not available right now. Please select an available floor (e.g. Ground Floor / Any Floor) to go ahead.
                </p>
              </div>
            </div>
          ) : (
            /* Affirmative Banner (When Room / Floor IS available - "see if room available then we can go ahead") */
            (selectedHostel || preferredFloor) && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/95 border border-emerald-200/90 text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-emerald-950">Room Available</p>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                      Ready to Go Ahead
                    </span>
                  </div>
                  <p className="mt-1 font-semibold leading-relaxed text-emerald-800">
                    Room is available on {preferredFloor} in {
                      hostels.find((h) => String(h.id) === String(selectedHostel) || h.code === selectedHostel)?.name || (selectedHostel === 'BH1' ? 'Boys Hostel 1' : selectedHostel === 'BH2' ? "Boy's Hostel 2" : 'the selected hostel')
                    }! You can go ahead and submit your exchange request.
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-1 leading-relaxed">
                    Active accommodations validated for policy and gender criteria.
                  </p>
                </div>
              </div>
            )
          )}

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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(floorWarning)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                floorWarning
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-[#f78c30] hover:bg-[#e27518] text-white shadow-md shadow-[#f78c30]/25 cursor-pointer'
              }`}
            >
              {submitting
                ? 'Submitting...'
                : floorWarning
                ? 'Room Not Available — Cannot Go Ahead'
                : 'Go Ahead & Submit Request →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentCreateRequestModal;
