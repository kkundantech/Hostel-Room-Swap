import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const StudentProposalsPage = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Decision Modal State
  const [actionProposal, setActionProposal] = useState(null); // { id, accepted }

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await api.getProposals();
      setProposals(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleProposalDecision = async () => {
    if (!actionProposal) return;
    try {
      await api.respondToProposal(
        actionProposal.id,
        actionProposal.accepted,
        actionProposal.accepted ? 'Accepted by student' : 'Declined by student'
      );
      setActionProposal(null);
      fetchProposals();
    } catch (err) {
      alert('Error updating proposal response: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTION_REQUIRED') {
      if (p.status !== 'PENDING_ACCEPTANCE') return false;
      const myPart = p.participants?.find(
        (part) => part.student?.id === user?.id || part.student_email === user?.email
      );
      return myPart && !myPart.accepted && !myPart.declined;
    }
    return p.status === statusFilter;
  });

  return (
    <AppLayout
      pageTitle="Exchange Proposals"
      pageDescription="Review multi-party cycle proposals involving your room. Once all participants accept, the proposal is forwarded to the hostel warden for final atomic approval."
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
              <option value="ALL">All Proposals</option>
              <option value="ACTION_REQUIRED">Awaiting My Decision</option>
              <option value="PENDING_ACCEPTANCE">Pending All Responses</option>
              <option value="PENDING_APPROVAL">Awaiting Warden Approval</option>
              <option value="APPROVED">Approved & Completed</option>
              <option value="REJECTED">Declined / Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredProposals.length} proposal{filteredProposals.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading proposals...</div>
        ) : filteredProposals.length === 0 ? (
          <EmptyState
            icon={GitFork}
            title="No Matching Proposals"
            description="No multi-party exchange proposals match the selected filter. Proposals appear once compatible matching cycles are formed."
          />
        ) : (
          <div className="space-y-6">
            {filteredProposals.map((prop) => {
              const myPart = prop.participants?.find(
                (p) => p.student?.id === user?.id || p.student_email === user?.email
              );
              const hasResponded = myPart?.accepted || myPart?.declined;
              const isActionRequired = prop.status === 'PENDING_ACCEPTANCE' && !hasResponded;

              return (
                <div
                  key={prop.id}
                  className={`app-card overflow-hidden border ${
                    isActionRequired ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-slate-200'
                  }`}
                >
                  {/* Proposal Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                        <GitFork className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            Proposal #{String(prop.id).slice(0, 8)}
                          </span>
                          <span className="badge badge-neutral">
                            {prop.cycle_length}-Party Cycle
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Created {new Date(prop.created_at).toLocaleString()} &middot; Expires{' '}
                          {prop.expires_at ? new Date(prop.expires_at).toLocaleString() : 'in 48 hours'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={prop.status} />
                    </div>
                  </div>

                  {/* Action Banner for Current Student */}
                  {isActionRequired && (
                    <div className="p-4 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-blue-900">
                          Your Decision is Required on This Rotation
                        </h4>
                        <p className="text-xs text-blue-700 mt-0.5">
                          You are offered to move from{' '}
                          <span className="font-semibold">{myPart?.current_bed_label}</span> into{' '}
                          <span className="font-bold underline">{myPart?.proposed_bed_label}</span>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActionProposal({ id: prop.id, accepted: false })}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 transition"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => setActionProposal({ id: prop.id, accepted: true })}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Move</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Participants Track */}
                  <div className="p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Participants & Movement Steps
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {prop.participants?.map((p, idx) => {
                        const isMe =
                          p.student?.id === user?.id || p.student_email === user?.email;

                        return (
                          <div
                            key={p.id || idx}
                            className={`p-3.5 rounded-xl border text-xs relative ${
                              isMe
                                ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-[10px] text-slate-400 font-bold">
                                STEP {idx + 1} {isMe && '(YOU)'}
                              </span>
                              {p.accepted ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                                </span>
                              ) : p.declined ? (
                                <span className="text-rose-600 font-semibold text-[11px]">
                                  Declined
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-1 text-[11px]">
                                  <Clock className="w-3.5 h-3.5" /> Pending
                                </span>
                              )}
                            </div>

                            <div className="font-semibold text-slate-800 truncate">
                              {p.student_name || p.student?.first_name 
                                ? `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim()
                                : 'Student Participant'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mb-3">
                              {p.student_email || p.student?.email}
                            </div>

                            <div className="p-2 rounded bg-white border border-slate-200 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between text-slate-500">
                                <span>Vacates:</span>
                                <span className="font-mono font-medium text-slate-700">
                                  {p.current_bed_label}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-blue-700 font-semibold">
                                <span>Receives:</span>
                                <span className="font-mono">{p.proposed_bed_label}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(actionProposal)}
        title={actionProposal?.accepted ? 'Accept Exchange Proposal?' : 'Decline Exchange Proposal?'}
        message={
          actionProposal?.accepted
            ? 'By accepting, you confirm your readiness to move into the proposed bed. Once all participants accept, the proposal is forwarded to the warden for final atomic approval.'
            : 'If you decline, this multi-party proposal cycle will be cancelled and all participants will remain in their current beds.'
        }
        confirmLabel={actionProposal?.accepted ? 'Confirm Acceptance' : 'Decline Proposal'}
        confirmVariant={actionProposal?.accepted ? 'primary' : 'danger'}
        onConfirm={handleProposalDecision}
        onCancel={() => setActionProposal(null)}
      />
    </AppLayout>
  );
};

export default StudentProposalsPage;
