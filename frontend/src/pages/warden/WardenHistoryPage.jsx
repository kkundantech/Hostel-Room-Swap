import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  User
} from 'lucide-react';

export const WardenHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getApprovalRecords();
      setHistory(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.remarks || '').toLowerCase().includes(q) ||
      (item.proposal || '').toLowerCase().includes(q);
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
              placeholder="Search by proposal ID or remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    <th className="text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((rec) => (
                    <tr key={rec.id}>
                      <td className="font-mono text-slate-500 font-semibold">
                        #{String(rec.id).slice(0, 8)}
                      </td>
                      <td className="font-mono text-blue-700 font-semibold">
                        #{rec.proposal ? String(rec.proposal).slice(0, 8) : 'N/A'}
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
                      <td className="text-right text-slate-500 text-xs">
                        {new Date(rec.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
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
