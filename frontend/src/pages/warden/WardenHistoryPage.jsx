/**
 * Module: frontend/src/pages/warden/WardenHistoryPage.jsx
 *
 * Work / Purpose:
 *   Warden transfer history page showing completed swap records and audit details.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  User
} from 'lucide-react';

export const WardenHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState('ALL');

  const fetchHistory = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.getApprovalRecords();
      setHistory(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(false);
  }, []);

  useRealtimeSync(() => {
    fetchHistory(true);
  }, { pollIntervalMs: 6000 });

  const formatDateTime = (rawDate) => {
    if (!rawDate) return { date: 'N/A', time: '' };
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return { date: 'N/A', time: '' };

    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return { date: dateStr, time: timeStr };
  };

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.remarks || '').toLowerCase().includes(q) ||
      (item.proposal_reference || '').toLowerCase().includes(q) ||
      String(item.proposal || '').toLowerCase().includes(q);
    const matchesDecision = filterDecision === 'ALL' || item.decision === filterDecision;
    return matchesSearch && matchesDecision;
  });

  return (
    <AppLayout
      pageTitle="Approval Decision History"
      pageDescription="Complete chronological ledger of all multi-party exchange proposals authorized or rejected by hostel authorities."
    >
      <div className="space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by proposal ID, ref code, or remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            >
              <option value="ALL">All Decisions</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading history records...</div>
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No Decision Records Found"
              description="No approval or rejection entries match your search criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Proposal Ref</th>
                    <th>Decision</th>
                    <th>Warden Remarks</th>
                    <th>Authorizer</th>
                    <th className="text-right">Timestamp (Date &amp; Time)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((rec) => {
                    const rawDate = rec.decided_at || rec.created_at || rec.timestamp;
                    const { date, time } = formatDateTime(rawDate);

                    return (
                      <tr key={rec.id}>
                        <td className="font-mono text-slate-500 font-semibold">
                          #{String(rec.id).slice(0, 8)}
                        </td>
                        <td className="font-mono text-blue-700 font-semibold">
                          {rec.proposal_reference || (rec.proposal ? `#${String(rec.proposal).slice(0, 8)}` : 'N/A')}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              rec.decision === 'APPROVED' ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {rec.decision === 'APPROVED' ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="max-w-md text-slate-700">
                          {rec.remarks || <span className="text-slate-400 italic">No remarks recorded</span>}
                        </td>
                        <td className="text-slate-600">
                          {rec.approver_name || rec.approver_email || 'Warden Authority'}
                        </td>
                        <td className="text-right text-xs">
                          <div className="inline-flex flex-col items-end">
                            <span className="font-semibold text-slate-800">{date}</span>
                            {time && (
                              <span className="text-[11px] font-mono text-[#f78c30] font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-[#f78c30]" />
                                {time}
                              </span>
                            )}
                          </div>
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
    </AppLayout>
  );
};

export default WardenHistoryPage;
