/**
 * Module: frontend/src/pages/super_admin/SuperAdminAuditPage.jsx
 *
 * Work / Purpose:
 *   Super Admin full security audit log viewer tracking identity provisioning and account state changes.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  Shield,
  Clock,
  User,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export const SuperAdminAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs(false);
  }, [actionFilter]);

  useRealtimeSync(() => {
    fetchLogs(true);
  }, { pollIntervalMs: 6000 });

  const fetchLogs = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (search) params.search = search;

      const data = await api.getSuperAdminAuditLogs(params);
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (data?.results) {
        setLogs(data.results);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes('SUSPEND') || action.includes('REVOKE')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">{action}</span>;
    }
    if (action.includes('AUTHORIZED') || action.includes('ACTIVATED') || action.includes('APPROVED')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{action}</span>;
    }
    if (action.includes('OTP') || action.includes('INVITATION')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
  };

  return (
    <AppLayout
      pageTitle="Security & Authorization Audit Ledger"
      pageDescription="Immutable append-only record of all identity provisions, OTP verifications, session revocations, and privileged operations."
    >
      <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/super-admin/dashboard"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#f78c30] shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Security &amp; Authorization Audit Ledger
            </h1>
            <p className="text-xs text-slate-500">
              Immutable append-only record of all identity provisions, OTP verifications, session revocations, and privileged operations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, user or action..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400 font-medium"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
            className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="">All Security & Audit Actions</option>
            <option value="EXCHANGE_EXECUTED">Room Swap Executed (Warden Approved)</option>
            <option value="PROPOSAL_REJECTED">Proposal Declined / Rejected</option>
            <option value="EXCHANGE_REQUEST_CREATED">Exchange Request Created</option>
            <option value="IDENTITY_AUTHORIZED">Identity Authorized</option>
            <option value="OTP_REQUESTED">OTP Requested</option>
            <option value="OTP_VERIFIED">OTP Verified</option>
            <option value="ACCOUNT_ACTIVATED">Account Activated</option>
            <option value="INVITATION_RESENT">Invitation Resent</option>
            <option value="ACCOUNT_SUSPENDED">Account Suspended</option>
            <option value="ACCOUNT_REACTIVATED">Account Reactivated</option>
            <option value="ACCOUNT_REVOKED">Account Revoked</option>
            <option value="LOGIN">User Login</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP / User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#f78c30] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-orange-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {entry.created_at && !isNaN(new Date(entry.created_at).getTime())
                        ? new Date(entry.created_at).toLocaleString()
                        : 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(entry.action)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {entry.description}
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {entry.user_email || entry.user_name || 'System / Unauthenticated Challenge'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {entry.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminAuditPage;
