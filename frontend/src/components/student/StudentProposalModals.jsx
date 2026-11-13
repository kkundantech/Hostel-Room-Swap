/**
 * Module: frontend/src/components/student/StudentProposalModals.jsx
 *
 * Work / Purpose:
 *   Modular student modals for inspecting matched exchange proposal cycle details and submitting accept/decline decisions.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { X, Check } from 'lucide-react';

export const StudentProposalModals = ({
  selectedProposalForView,
  setSelectedProposalForView,
  selectedProposalForRespond,
  setSelectedProposalForRespond,
  handleRespondDecision,
}) => {
  return (
    <>
      {/* View Proposal Details Modal */}
      {selectedProposalForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-orange-50 text-[#f78c30] border-orange-200">
                  {selectedProposalForView.cycle_length === 2 ? 'Direct Swap' : `${selectedProposalForView.cycle_length}-Way Rotation`}
                </span>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {selectedProposalForView.reference_code || `#${String(selectedProposalForView.id).slice(0, 8)}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/60 via-purple-50/40 to-orange-50/60 border border-orange-100 text-center">
                <p className="text-xs font-bold text-slate-800">
                  Rotation with {selectedProposalForView.cycle_length || 2} Students
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Status: <span className="font-semibold text-[#f78c30]">{selectedProposalForView.status}</span>
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Proposal ID</span>
                  <span className="font-mono font-bold text-slate-800">#{selectedProposalForView.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Created On</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedProposalForView.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Approval Requirement</span>
                  <span className="font-semibold text-amber-600">Unanimous Student Acceptance + Warden Authorization</span>
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
              {selectedProposalForView.status === 'PENDING_ACCEPTANCE' && (
                <button
                  onClick={() => {
                    const p = selectedProposalForView;
                    setSelectedProposalForView(null);
                    setSelectedProposalForRespond(p);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-xs"
                >
                  Proceed to Respond
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal (Accept or Decline) */}
      {selectedProposalForRespond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">
              Respond to Exchange Proposal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Proposal: <span className="font-bold text-slate-800">#{selectedProposalForRespond.reference_code || selectedProposalForRespond.id}</span>
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
              Accepting will record your agreement to complete this rotation. Once all students in the cycle accept, the proposal will be reviewed by the hostel warden for atomic transfer execution.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => handleRespondDecision(false)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
              >
                Decline Proposal
              </button>

              <button
                onClick={() => handleRespondDecision(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Accept Proposal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentProposalModals;
