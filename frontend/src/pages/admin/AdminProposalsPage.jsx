/**
 * Module: frontend/src/pages/admin/AdminProposalsPage.jsx
 *
 * Work / Purpose:
 *   Hostel Admin proposals monitor for reviewing active cycles, participant statuses, and override/expiry controls.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { formatDateTimeSafe } from '../../utils/dateUtils';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye
} from 'lucide-react';

export const AdminProposalsPage = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [selectedProposal, setSelectedProposal] = useState(null);

  const fetchProposals = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.getProposals();
      setProposals(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals(false);
  }, []);

  useRealtimeSync(() => {
    fetchProposals(true);
  }, { pollIntervalMs: 6000 });

  const filteredProposals = proposals.filter((p) => {
    // Status filter
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

    // Cycle filter
    if (cycleFilter !== 'ALL' && String(p.cycle_length) !== String(cycleFilter)) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idMatch = String(p.id).toLowerCase().includes(q);
      const refMatch = String(p.reference_code || '').toLowerCase().includes(q);
      const partMatch = (p.participants || []).some((part) => {
        const name = (part.student_name || part.student?.first_name || part.student?.full_name || '').toLowerCase();
        const email = (part.student_email || part.student?.email || '').toLowerCase();
        const bed = (part.current_bed_label || part.proposed_bed_label || '').toLowerCase();
        return name.includes(q) || email.includes(q) || bed.includes(q);
      });
      if (!idMatch && !refMatch && !partMatch) return false;
    }

    return true;
  });

  return (
    <AppLayout
      pageTitle="Proposals & Multi-Party Cycles"
      pageDescription="Oversee generated exchange cycles across campus, review participant responses, and monitor expiry windows."
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ref ID, student name, email, or bed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
              >
                <option value="ALL">All Cycle Statuses</option>
                <option value="PENDING_ACCEPTANCE">Pending Student Responses</option>
                <option value="PENDING_APPROVAL">Pending Warden Approval</option>
                <option value="APPROVED">Approved & Executed</option>
                <option value="REJECTED">Declined / Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            >
              <option value="ALL">All Cycle Lengths</option>
              <option value="2">2-Way (Direct)</option>
              <option value="3">3-Way Loop</option>
              <option value="4">4-Way Loop</option>
              <option value="5">5-Way Loop</option>
            </select>

            <span className="text-xs text-slate-500 font-semibold px-2">
              Showing {filteredProposals.length} proposal{filteredProposals.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Proposals Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading proposals...</div>
          ) : filteredProposals.length === 0 ? (
            <EmptyState
              icon={GitFork}
              title="No Proposals Found"
              description="No exchange proposals match the selected status filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Cycle Length</th>
                    <th>Participants</th>
                    <th>Accepted Count</th>
                    <th>Expires At</th>
                    <th>Status</th>
                    <th className="text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map((p) => {
                    const total = p.participants?.length || 0;
                    const accepted = p.participants?.filter((part) => part.accepted).length || 0;

                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-slate-900 font-bold">
                          #{String(p.id).slice(0, 8)}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{p.cycle_length}-Party Cycle</span>
                        </td>
                        <td className="max-w-xs truncate text-slate-600">
                          {p.participants?.map((part) => part.student_name || part.student?.first_name || 'Student').join(', ')}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              accepted === total ? 'badge-success' : 'badge-pending'
                            }`}
                          >
                            {accepted} of {total} accepted
                          </span>
                        </td>
                        <td className="text-slate-500 text-xs">
                          {formatDateTimeSafe(p.expires_at, 'N/A')}
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setSelectedProposal(p)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
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

      {/* Inspect Cycle Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Cycle #{String(selectedProposal.id).slice(0, 8)} Inspection
              </h3>
              <button
                onClick={() => setSelectedProposal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rotation Flow
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {selectedProposal.participants?.map((p, idx) => (
                  <div key={p.id || idx} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {p.student_name || p.student?.first_name || 'Participant'}
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
                        <span className="badge badge-success">Accepted</span>
                      ) : p.declined ? (
                        <span className="badge badge-danger">Declined</span>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedProposal(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminProposalsPage;
