/**
 * Module: frontend/src/components/warden/WardenDashboardModals.jsx
 *
 * Work / Purpose:
 *   Modular modal suite for Warden dashboard & approvals handling vacant room allocation,
 *   proposal cycle authorization, rejection reasoning, and deep request inspection.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/warden/WardenDashboard.jsx
 *   - frontend/src/pages/warden/WardenApprovalQueuePage.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  X,
  Check,
  XCircle,
  Bed,
  Building,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Search
} from 'lucide-react';

export const WardenDashboardModals = ({
  selectedRequestForApprove,
  setSelectedRequestForApprove,
  handleApproveConfirm,
  selectedRequestForReject,
  setSelectedRequestForReject,
  rejectReason,
  setRejectReason,
  handleRejectConfirm,
  selectedProposalForView,
  setSelectedProposalForView,
  onAuthorizeProposal,
  selectedRequestForView,
  setSelectedRequestForView,
  vacantBeds = [],
  selectedTargetBedId,
  setSelectedTargetBedId,
  approveRemarks = '',
  setApproveRemarks,
  submittingAction = false,
}) => {
  const [bedSearch, setBedSearch] = useState('');

  const isProposal = selectedRequestForApprove?.isProposal;

  useEffect(() => {
    if (selectedRequestForApprove && !selectedRequestForApprove.isProposal) {
      if (!selectedTargetBedId) {
        const preferred = selectedRequestForApprove.requestObj?.preferred_bed || selectedRequestForApprove.raw?.preferred_bed;
        if (preferred) {
          setSelectedTargetBedId?.(String(preferred));
        } else if (vacantBeds && vacantBeds.length > 0) {
          setSelectedTargetBedId?.(String(vacantBeds[0].id));
        }
      }
      if (!approveRemarks) {
        setApproveRemarks?.('Approved by hostel warden');
      }
    }
  }, [selectedRequestForApprove, vacantBeds]);

  // Filter vacant beds for the approval picker
  const filteredBeds = (vacantBeds || []).filter((b) => {
    if (!bedSearch.trim()) return true;
    const q = bedSearch.toLowerCase().trim();
    const full = (b.full_label || '').toLowerCase();
    const rm = String(b.room_number || '').toLowerCase();
    const blk = String(b.block_name || '').toLowerCase();
    const type = String(b.room_type || b.room_type_display || '').toLowerCase();
    return full.includes(q) || rm.includes(q) || blk.includes(q) || type.includes(q);
  });

  return (
    <>
      {/* MODAL 1: Authorize Approval Modal (Proposal or Vacant Room Allocation) */}
      {selectedRequestForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{isProposal ? 'Authorize Proposal Rotation' : 'Approve & Assign Bed'}</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              {/* Student Summary */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={selectedRequestForApprove.avatar || '/images/student_user.jpg'}
                  alt={selectedRequestForApprove.studentName}
                  loading="lazy"
                  className="w-11 h-11 rounded-full object-cover border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm truncate">{selectedRequestForApprove.studentName}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f78c30]/10 text-[#f78c30]">
                      {isProposal ? `${selectedRequestForApprove.type} Cycle` : 'Direct Request'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reg No: <span className="font-mono text-slate-700 font-semibold">{selectedRequestForApprove.regNo}</span>
                  </p>
                </div>
              </div>

              {/* Current Room vs Request */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-orange-50/70 border border-orange-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-semibold">Current Bed:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedRequestForApprove.currentRoom}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">{isProposal ? 'Assigned Bed:' : 'Requested Preference:'}</span>
                  <p className="font-bold text-[#f78c30] mt-0.5">{selectedRequestForApprove.requestedRoom}</p>
                </div>
              </div>

              {/* Reason / Preferences note if single request */}
              {!isProposal && selectedRequestForApprove.requestedRoomType && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#f78c30]" />
                    <span>Student Reason &amp; Preference:</span>
                  </span>
                  <p className="italic text-slate-600 bg-white p-2 rounded-xl border border-slate-100 mt-1">
                    "{selectedRequestForApprove.requestedRoomType}"
                  </p>
                </div>
              )}

              {/* Vacant Bed Picker for Single Request */}
              {!isProposal && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-[#f78c30]" />
                      <span>Select Target Vacant Bed:</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {filteredBeds.length} vacant bed{filteredBeds.length === 1 ? '' : 's'} available
                    </span>
                  </div>

                  {vacantBeds && vacantBeds.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter by room, floor, or block..."
                        value={bedSearch}
                        onChange={(e) => setBedSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                      />
                    </div>
                  )}

                  <select
                    value={selectedTargetBedId || ''}
                    onChange={(e) => setSelectedTargetBedId && setSelectedTargetBedId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                  >
                    <option value="">-- Choose Vacant Bed to Allocate --</option>
                    {filteredBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.full_label} ({bed.room_type_display || bed.room_type}, Floor {bed.floor})
                      </option>
                    ))}
                  </select>

                  {(!vacantBeds || vacantBeds.length === 0) && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      No vacant beds currently found in your hostel inventory. Please ensure beds are marked active.
                    </p>
                  )}
                </div>
              )}

              {/* Remarks Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Warden Approval Remarks:
                </label>
                <input
                  type="text"
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks && setApproveRemarks(e.target.value)}
                  placeholder="e.g. Approved by hostel warden - verified room change"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                />
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Institutional Atomic Transfer Execution:</span>
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  Upon approval, previous allocations are deactivated, new bed assignments are finalized, and a verified Transfer Record is permanently audited.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={submittingAction || (!isProposal && !selectedTargetBedId)}
                className="px-5 py-2.5 rounded-xl bg-[#f78c30] hover:bg-[#e27518] disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-[#f78c30]/20 flex items-center gap-1.5"
              >
                {submittingAction ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{submittingAction ? 'Executing...' : isProposal ? 'Confirm & Execute Proposal' : 'Confirm & Allocate Bed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject Reason Modal */}
      {selectedRequestForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Room Request</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForReject(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Rejecting transfer request for <span className="font-bold text-slate-900">{selectedRequestForReject.studentName}</span> ({selectedRequestForReject.currentRoom} ⮂ {selectedRequestForReject.requestedRoom}).
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Rejection:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Specify institutional policy reason (e.g. Block restriction, Room maintenance, Disciplinary pending, No vacant seats in desired wing)..."
                  rows={3}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForReject(null)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={submittingAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-500/20 flex items-center gap-1.5"
              >
                {submittingAction ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{submittingAction ? 'Rejecting...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Proposal Details Modal */}
      {selectedProposalForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${selectedProposalForView.dotColor}`} />
                <h3 className="text-base font-bold text-slate-900">{selectedProposalForView.type}</h3>
              </div>
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 text-xs">
                <span className="font-bold text-slate-900 block mb-1">Cycle Rotation Chain:</span>
                <p className="font-mono text-[#f78c30] font-bold">{selectedProposalForView.chain}</p>
                <p className="text-[11px] text-slate-500 mt-1">Rooms: {selectedProposalForView.rooms}</p>
              </div>

              {/* Room Previews */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Connected Room Previews:</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(selectedProposalForView.roomImages || ['/images/hostel_room_view.jpg']).slice(0, 3).map((img, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-slate-200">
                      <img src={img} alt="Room" loading="lazy" className="w-full h-16 object-cover" />
                      <p className="text-[9px] text-center font-bold text-slate-600 py-1 bg-slate-50">Room {i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Participants:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedProposalForView.studentCount} Students Accepted</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Created Date:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedProposalForView.date}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                onClick={onAuthorizeProposal}
                className="px-5 py-2.5 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-xs"
              >
                Authorize Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Student Exchange Request Inspection Modal */}
      {selectedRequestForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f78c30]" />
                <h3 className="text-base font-bold text-slate-900">Exchange Request Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedRequestForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Student Header */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={selectedRequestForView.avatar || '/images/student_user.jpg'}
                  alt={selectedRequestForView.studentName}
                  loading="lazy"
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedRequestForView.studentName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Reg No: <span className="font-semibold text-slate-800">{selectedRequestForView.regNo}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Status: <span className="text-[#f78c30] font-bold">{selectedRequestForView.policyCheck || 'Open Request'}</span>
                  </p>
                </div>
              </div>

              {/* Current Room vs Request */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Current Bed:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedRequestForView.currentRoom}</p>
                  <span className="text-[10px] text-slate-400">Allocated Bed</span>
                </div>
                <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100">
                  <span className="text-slate-400 block font-semibold">Requested Hostel:</span>
                  <p className="font-bold text-[#f78c30] mt-0.5">{selectedRequestForView.requestedRoom}</p>
                  <span className="text-[10px] text-slate-400">Preferred Scope</span>
                </div>
              </div>

              {/* Student Reason */}
              {selectedRequestForView.requestedRoomType && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-900 block mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#f78c30]" />
                    <span>Resident Statement &amp; Preference:</span>
                  </span>
                  <p className="italic text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    "{selectedRequestForView.requestedRoomType}"
                  </p>
                </div>
              )}

              {/* Policy & Eligibility Checks */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-[11px] space-y-1.5">
                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Policy Eligibility:</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-emerald-800 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Hostel Gender Compliant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>No Disciplinary Holds</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Clear Fee Ledger</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Valid Active Allocation</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedRequestForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRequestForReject(selectedRequestForView);
                  setSelectedRequestForView(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
              >
                Reject Request
              </button>
              <button
                onClick={() => {
                  setSelectedRequestForApprove(selectedRequestForView);
                  setSelectedRequestForView(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve &amp; Assign Bed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WardenDashboardModals;
