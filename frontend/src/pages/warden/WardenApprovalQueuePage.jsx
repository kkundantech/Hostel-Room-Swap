import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Users
} from 'lucide-react';

export const WardenApprovalQueuePage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspection & Action Modal
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT'
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getApprovalQueue();
      setQueue(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenReview = (proposal) => {
    setSelectedProposal(proposal);
    setRemarks('');
    setActionError('');
  };

  const handleExecuteDecision = async () => {
    if (!selectedProposal || !actionType) return;
    setSubmitting(true);
    setActionError('');

    try {
      if (actionType === 'APPROVE') {
        await api.approveProposal(selectedProposal.id, remarks.trim() || 'Approved by hostel warden');
      } else {
        await api.rejectProposal(selectedProposal.id, remarks.trim() || 'Rejected by hostel warden');
      }
      setSelectedProposal(null);
      setActionType(null);
      fetchQueue();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Error processing approval decision. Ensure all participants have accepted and you are authorized for these hostels.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQueue = queue.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <AppLayout
      pageTitle="Warden Approval Queue"
      pageDescription="Inspect participant acceptances, verify room allocations, and execute atomic room swaps with warden remarks."
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Proposals in Queue</option>
              <option value="PENDING_APPROVAL">Ready for Approval (All Accepted)</option>
              <option value="PENDING_ACCEPTANCE">Awaiting Participant Responses</option>
              <option value="APPROVED">Approved & Executed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredQueue.length} item{filteredQueue.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Queue Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading queue...</div>
          ) : filteredQueue.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Approval Queue Empty"
              description="No exchange proposals are currently awaiting review or action for your assigned hostel scope."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Cycle</th>
                    <th>Participants</th>
                    <th>Acceptance Status</th>
                    <th>Expires</th>
                    <th>Proposal Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((prop) => {
                    const totalParts = prop.participants?.length || 0;
                    const acceptedParts = prop.participants?.filter((p) => p.accepted).length || 0;
                    const allAccepted = totalParts > 0 && acceptedParts === totalParts;

                    return (
                      <tr key={prop.id}>
                        <td className="font-mono text-slate-900 font-bold">
                          #{String(prop.id).slice(0, 8)}
                        </td>
                        <td className="text-slate-700">
                          <span className="badge badge-neutral">{prop.cycle_length}-Way Swap</span>
                        </td>
                        <td className="max-w-xs truncate text-slate-600">
                          {prop.participants?.map((p) => p.student_name || p.student?.first_name || 'Student').join(', ')}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              allAccepted ? 'badge-success' : 'badge-pending'
                            }`}
                          >
                            {acceptedParts} / {totalParts} Accepted
                          </span>
                        </td>
                        <td className="text-slate-500 text-xs">
                          {prop.expires_at ? new Date(prop.expires_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <StatusBadge status={prop.status} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleOpenReview(prop)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                          >
                            Review & Authorize
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review & Action Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Review Proposal #{String(selectedProposal.id).slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedProposal.cycle_length}-Party Rotation Cycle
                </p>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Eligibility Banner */}
              {selectedProposal.participants?.every((p) => p.accepted) ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Ready for Approval:</strong> All {selectedProposal.cycle_length} participants have formally accepted this room exchange. Approving will atomically swap bed allocations.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Pending Participants:</strong> One or more participants have not yet accepted. Full acceptance is strictly required before warden approval is permitted.
                  </span>
                </div>
              )}

              {/* Participants Move Inspection Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Participant Allocations & Rotation Flow
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {selectedProposal.participants?.map((p, idx) => (
                    <div key={p.id || idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {p.student_name || p.student?.first_name 
                            ? `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim()
                            : 'Student'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.student_email || p.student?.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {p.current_bed_label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                          {p.proposed_bed_label}
                        </span>
                      </div>

                      <div>
                        {p.accepted ? (
                          <span className="badge badge-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        ) : p.declined ? (
                          <span className="badge badge-danger">Declined</span>
                        ) : (
                          <span className="badge badge-pending flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warden Official Remarks / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Verified room inspect and occupancy criteria; authorized swap."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('REJECT')}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                  >
                    Reject Proposal
                  </button>
                  <button
                    type="button"
                    disabled={
                      !selectedProposal.participants?.every((p) => p.accepted) ||
                      selectedProposal.status !== 'PENDING_APPROVAL'
                    }
                    onClick={() => setActionType('APPROVE')}
                    className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve & Execute Rotation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(actionType)}
        title={actionType === 'APPROVE' ? 'Authorize & Execute Room Rotation?' : 'Reject Proposal?'}
        message={
          actionType === 'APPROVE'
            ? 'Approving will perform an atomic database transaction deallocating all participants from their previous rooms and allocating their new beds simultaneously.'
            : 'Rejecting this proposal will cancel the multi-party cycle and leave all students in their original allocations.'
        }
        confirmLabel={actionType === 'APPROVE' ? 'Execute Swap Now' : 'Confirm Rejection'}
        confirmVariant={actionType === 'APPROVE' ? 'primary' : 'danger'}
        onConfirm={handleExecuteDecision}
        onCancel={() => setActionType(null)}
      />
    </AppLayout>
  );
};

export default WardenApprovalQueuePage;
