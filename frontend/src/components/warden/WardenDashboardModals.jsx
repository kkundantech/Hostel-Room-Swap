/**
 * Module: frontend/src/components/warden/WardenDashboardModals.jsx
 *
 * Work / Purpose:
 *   Modular modal suite for WardenDashboard handling swap approval confirmation, rejection reasoning, and proposal cycle inspection.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/warden/WardenDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { CheckCircle2, X, Check, XCircle } from 'lucide-react';

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
}) => {
  return (
    <>
      {/* MODAL 1: Confirm Approval Modal */}
      {selectedRequestForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Authorize Room Transfer</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={selectedRequestForApprove.avatar}
                  alt={selectedRequestForApprove.studentName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedRequestForApprove.studentName}</p>
                  <p className="text-[11px] text-slate-400">Registration No: {selectedRequestForApprove.regNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-orange-50/70 border border-orange-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-semibold">Current Room:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedRequestForApprove.currentRoom}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Approved Room:</span>
                  <p className="font-bold text-[#f78c30] mt-0.5">{selectedRequestForApprove.requestedRoom}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Atomic Rotation Security:</span>
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  Both bed de-allocations and new bed assignments will execute atomically with institutional transfer letter generation.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                className="px-5 py-2.5 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-md shadow-[#f78c30]/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Execute Approval</span>
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
                  placeholder="Specify institutional policy reason (e.g. Block restriction, Room maintenance, Disciplinary pending)..."
                  rows={3}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForReject(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-500/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Proposal Details / Review Modal */}
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
                  {selectedProposalForView.roomImages.slice(0, 3).map((img, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-slate-200">
                      <img src={img} alt="Room" className="w-full h-16 object-cover" />
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
    </>
  );
};

export default WardenDashboardModals;

