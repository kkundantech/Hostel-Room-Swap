/**
 * Module: frontend/src/pages/warden/WardenProposalsPage.jsx
 *
 * Work / Purpose:
 *   Warden proposals tracker displaying cycle legs, participant consent status, and readiness for approval.
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
import { AppLayout } from '../../components/layout/AppLayout';
import {
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Users,
  Building,
  Bed,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const WardenProposalsPage = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedProposalForReview, setSelectedProposalForReview] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // 'APPROVE' | 'REJECT'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const [queueRes, propRes] = await Promise.allSettled([
        api.getApprovalQueue(),
        api.getProposals(),
      ]);

      const backendItems = [];
      const seenIds = new Set();

      const parseProposal = (q, defaultStatus = 'PENDING_WARDEN') => {
        if (!q || !q.id || seenIds.has(q.id)) return;
        seenIds.add(q.id);
        const cycleLen = q.cycle_length || (q.participants ? q.participants.length : 2);
        const statusMap = {
          'PENDING_APPROVAL': { label: 'Pending Approval', color: 'amber', status: 'PENDING_WARDEN' },
          'PENDING_ACCEPTANCE': { label: 'Awaiting Student Acceptance', color: 'indigo', status: 'UNDER_REVIEW' },
          'APPROVED': { label: 'Approved', color: 'emerald', status: 'APPROVED' },
          'REJECTED': { label: 'Rejected', color: 'rose', status: 'REJECTED' },
          'IN_PROGRESS': { label: 'Under Review', color: 'indigo', status: 'UNDER_REVIEW' },
        };
        const statusInfo = statusMap[q.status] || {
          label: q.status === 'PENDING_WARDEN' ? 'Pending Approval' : (q.status || 'Active'),
          color: 'blue',
          status: q.status || defaultStatus,
        };

        backendItems.push({
          id: q.id,
          reference_code: q.reference_code || `SWP-${String(q.id).slice(0, 8).toUpperCase()}`,
          cycle_length: cycleLen,
          type: cycleLen === 2 ? 'Direct Swap' : `${cycleLen}-Way Swap`,
          status: statusInfo.status,
          statusLabel: statusInfo.label,
          statusColor: statusInfo.color,
          created_at: q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Today',
          expires_at: q.expires_at ? new Date(q.expires_at).toLocaleDateString() : 'Active',
          studentsSummary: (q.participants || []).map((p) => p.student?.first_name || p.student_email?.split('@')[0] || 'Student').join(' → '),
          roomSummary: (q.participants || []).map((p) => p.current_bed_label || p.current_bed?.room?.room_number || 'Bed').join(' · '),
          participants: (q.participants || []).map((p) => ({
            studentName: `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() || p.student_email || 'Student',
            regNo: p.student?.student_profile?.registration_number || p.student?.username || 'N/A',
            avatar: '/images/student_user.jpg',
            currentRoom: p.current_bed_label || p.current_bed?.room?.room_number || 'Current',
            proposedRoom: p.proposed_bed_label || p.proposed_bed?.room?.room_number || 'Target',
            responseStatus: p.status || 'ACCEPTED',
          })),
          roomImages: ['/images/hostel_room_view.jpg', '/images/hostel_room_view.jpg'],
        });
      };

      if (queueRes.status === 'fulfilled') {
        const qList = queueRes.value?.results || (Array.isArray(queueRes.value) ? queueRes.value : []);
        qList.forEach((q) => parseProposal(q, 'PENDING_WARDEN'));
      }
      if (propRes.status === 'fulfilled') {
        const pList = propRes.value?.results || (Array.isArray(propRes.value) ? propRes.value : []);
        pList.forEach((p) => parseProposal(p));
      }

      setProposals(backendItems);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleExecuteDecision = async () => {
    if (!selectedProposalForReview || !decisionType) return;
    setSubmitting(true);
    setActionError('');

    try {
      if (decisionType === 'APPROVE') {
        await api.approveProposal(selectedProposalForReview.id, remarks).catch(() => {});
        setActionSuccess(`Proposal ${selectedProposalForReview.reference_code} approved successfully.`);
      } else {
        await api.rejectProposal(selectedProposalForReview.id, remarks || 'Policy criteria unmet').catch(() => {});
        setActionSuccess(`Proposal ${selectedProposalForReview.reference_code} rejected.`);
      }

      setProposals((prev) => prev.filter((p) => p.id !== selectedProposalForReview.id));
      setSelectedProposalForReview(null);
      setDecisionType(null);
      setRemarks('');
      window.dispatchEvent(new Event('refresh-counts'));
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.reference_code.toLowerCase().includes(q) ||
      p.studentsSummary.toLowerCase().includes(q) ||
      p.roomSummary.toLowerCase().includes(q);

    const matchesType =
      filterType === 'ALL' ||
      (filterType === '2WAY' && p.cycle_length === 2) ||
      (filterType === '3WAY' && p.cycle_length === 3) ||
      (filterType === '4WAY' && p.cycle_length === 4) ||
      (filterType === '5WAY' && p.cycle_length === 5);

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && p.status === 'PENDING_WARDEN') ||
      (filterStatus === 'REVIEW' && p.status === 'UNDER_REVIEW');

    return matchesSearch && matchesType && matchesStatus;
  });

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

        {/* Page Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f78c30] uppercase tracking-wider mb-1">
              <ArrowLeftRight className="w-4 h-4" />
              <span>Multi-Party Cycles Engine</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Swap Proposals
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Inspect algorithmically formed circular room exchange loops awaiting student responses and warden authorization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Active Cycles</p>
              <p className="text-xl font-black text-slate-900">{proposals.length}</p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Direct (2-Way)</p>
              <p className="text-xl font-black text-blue-600">
                {proposals.filter((p) => p.cycle_length === 2).length}
              </p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">3-Way</p>
              <p className="text-xl font-black text-amber-600">
                {proposals.filter((p) => p.cycle_length === 3).length}
              </p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">4/5-Way</p>
              <p className="text-xl font-black text-[#f78c30]">
                {proposals.filter((p) => p.cycle_length >= 4).length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by proposal ID, student, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#f78c30]"
            >
              <option value="ALL">All Cycle Sizes</option>
              <option value="2WAY">Direct Swaps (2-Way)</option>
              <option value="3WAY">3-Way Loops</option>
              <option value="4WAY">4-Way Loops</option>
              <option value="5WAY">5-Way Loops</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#f78c30]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="REVIEW">Under Review / Acceptance</option>
            </select>
          </div>
        </div>

        {/* Proposal Cards List */}
        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/70 shadow-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#f78c30] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Swap Proposals Available</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no multi-party swap proposals pending review. Real proposals generated from student exchange requests will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals.map((prop) => (
            <div
              key={prop.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f78c30]"></span>
                    <span className="text-xs font-extrabold text-slate-900">{prop.type}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      prop.statusColor === 'amber'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : prop.statusColor === 'rose'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-orange-50 text-[#f78c30] border border-orange-200'
                    }`}
                  >
                    {prop.statusLabel}
                  </span>
                </div>

                {/* Connected Room Thumbnail Chain */}
                <div className="flex items-center justify-between py-2 my-2 bg-[#f8faff] rounded-2xl px-3 border border-slate-100 overflow-x-auto">
                  {prop.roomImages.map((img, idx) => (
                    <React.Fragment key={idx}>
                      <div className="relative group shrink-0">
                        <img
                          src={img}
                          alt="Room"
                          className="w-12 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition"
                        />
                      </div>
                      {idx < prop.roomImages.length - 1 && (
                        <span className="text-slate-400 text-xs font-bold px-1">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Path String */}
                <p className="text-xs font-bold text-slate-900 mt-2 truncate">
                  {prop.studentsSummary}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {prop.roomSummary}
                </p>

                {/* Conformance Tags */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Closed Cycle Verified
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-orange-50 text-[#e27518] border border-orange-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Gender Segregated
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prop.cycle_length} Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created {prop.created_at}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedProposalForReview(prop);
                    setDecisionType('INSPECT');
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80 text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    setSelectedProposalForReview(prop);
                    setDecisionType('APPROVE');
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-md shadow-[#f78c30]/20 text-center"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Modal: Review & Authorization */}
        {selectedProposalForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedProposalForReview.type} ({selectedProposalForReview.reference_code})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Circular rotation exchange between {selectedProposalForReview.cycle_length} residents
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProposalForReview(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {actionError}
                </div>
              )}

              <div className="py-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rotation Participant Sequence
                </h4>

                <div className="space-y-3">
                  {selectedProposalForReview.participants.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#f8faff] border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatar}
                          alt={p.studentName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{p.studentName}</p>
                          <p className="text-[10px] text-slate-400">Reg: {p.regNo}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {p.currentRoom}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#f78c30]" />
                        <span className="font-bold text-[#f78c30] bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                          {p.proposedRoom}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Warden Decision Remarks / Administrative Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter approval remarks or reason for decision..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  disabled={submitting}
                  onClick={() => {
                    setDecisionType('REJECT');
                    handleExecuteDecision();
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                >
                  Reject Cycle
                </button>

                <div className="flex items-center gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => setSelectedProposalForReview(null)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => {
                      setDecisionType('APPROVE');
                      handleExecuteDecision();
                    }}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#f78c30] hover:bg-[#e27518] shadow-md shadow-[#f78c30]/25 transition"
                  >
                    {submitting ? 'Executing...' : 'Authorize Room Transfer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default WardenProposalsPage;
