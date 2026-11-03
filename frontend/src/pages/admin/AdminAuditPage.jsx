import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity
} from 'lucide-react';

export const AdminAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (log.action || '').toLowerCase().includes(q) ||
      (log.actor_email || '').toLowerCase().includes(q) ||
      (log.target_type || '').toLowerCase().includes(q) ||
      (log.ip_address || '').toLowerCase().includes(q);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <AppLayout
      pageTitle="System Audit Logs"
      pageDescription="Tamper-evident chronological log of all security events, approval executions, policy updates, and room allocations."
    >
      <div className="space-y-6">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, actor, target, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="LOGIN">User Logins</option>
              <option value="EXCHANGE_REQUEST_CREATED">Request Created</option>
              <option value="PROPOSAL_CREATED">Proposal Created</option>
              <option value="PROPOSAL_APPROVED">Proposal Approved</option>
              <option value="PROPOSAL_REJECTED">Proposal Rejected</option>
              <option value="POLICY_UPDATED">Policy Updated</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Audit Logs Found"
              description="No audit trail entries match your search criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target Type</th>
                    <th>Target Ref</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-slate-500 text-xs font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-slate-700">
                        <div className="font-medium text-xs">{log.actor_name || 'System User'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.actor_email || 'system'}</div>
                      </td>
                      <td className="text-slate-600 text-xs">
                        {log.target_type || 'N/A'}
                      </td>
                      <td className="font-mono text-blue-700 text-xs font-semibold">
                        {log.target_id ? `#${String(log.target_id).slice(0, 8)}` : '—'}
                      </td>
                      <td className="font-mono text-slate-500 text-xs">
                        {log.ip_address || '127.0.0.1'}
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

export default AdminAuditPage;
