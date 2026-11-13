/**
 * Module: frontend/src/pages/student/StudentRequestsPage.jsx
 *
 * Work / Purpose:
 *   Dedicated Student page for viewing, creating, filtering, and withdrawing personal room exchange requests.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/ConfirmationModal.jsx
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import {
  ArrowLeftRight,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ShieldCheck
} from 'lucide-react';

export const StudentRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Withdraw Modal
  const [requestToWithdraw, setRequestToWithdraw] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [reqData, hostelData, allocData] = await Promise.allSettled([
        api.getExchangeRequests(),
        api.getHostels(),
        api.getMyAllocation(),
      ]);

      if (reqData.status === 'fulfilled') {
        setRequests(reqData.value.results || reqData.value || []);
      }
      if (hostelData.status === 'fulfilled') {
        setHostels(hostelData.value.results || hostelData.value || []);
      }
      if (allocData.status === 'fulfilled') {
        setAllocation(allocData.value);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      await api.createExchangeRequest({
        preferred_hostel: selectedHostel || null,
        reason: reason.trim(),
      });
      setFormSuccess('Request created successfully.');
      setTimeout(() => {
        setShowCreateModal(false);
        setReason('');
        setFormSuccess('');
      }, 1000);
      fetchRequests();
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Error submitting request. Please check policy rules.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!requestToWithdraw) return;
    try {
      await api.withdrawExchangeRequest(requestToWithdraw.id);
      setRequestToWithdraw(null);
      fetchRequests();
    } catch (err) {
      alert('Error withdrawing request: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.preferred_hostel_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout
      pageTitle="My Exchange Requests"
      pageDescription="Manage and track your room exchange requests. Open requests participate in automatic matching cycle runs."
      actionButton={
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Request</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason or hostel preference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="MATCHED">Matched</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading your requests...</div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No Exchange Requests Found"
              description={
                searchQuery || statusFilter !== 'ALL'
                  ? 'No requests match your current filters. Try resetting the filter.'
                  : 'You have not submitted any room exchange requests yet.'
              }
              actionLabel="Create Request"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Current Bed</th>
                    <th>Target Preference</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th>Created</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="font-mono text-slate-500 font-semibold">
                        #{String(req.id).slice(0, 8)}
                      </td>
                      <td className="font-medium text-slate-900">
                        {allocation ? allocation.bed?.full_label || allocation.bed_label : 'Current Bed'}
                      </td>
                      <td className="text-slate-800">
                        {req.preferred_hostel_name ? (
                          <span className="font-semibold text-blue-700">{req.preferred_hostel_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">Any Compatible Hostel</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate text-slate-600" title={req.reason}>
                        {req.reason || 'None specified'}
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="text-slate-500">
                        {req.expires_at ? new Date(req.expires_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-slate-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        {req.status === 'OPEN' ? (
                          <button
                            onClick={() => setRequestToWithdraw(req)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                          >
                            Withdraw
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                New Room Exchange Request
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block">Your Current Room:</span>
                <span className="text-slate-800 font-mono mt-0.5 block">
                  {allocation ? allocation.bed?.full_label || allocation.bed_label : 'Current Bed Assigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Target Hostel
                </label>
                <select
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Any Compatible Hostel (Recommended)</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecting "Any Compatible Hostel" allows 2-way, 3-way, 4-way, and 5-way matching rotations across all eligible student requests.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Exchange
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you wish to exchange rooms..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Withdrawal */}
      <ConfirmationModal
        isOpen={Boolean(requestToWithdraw)}
        title="Withdraw Exchange Request?"
        message="Are you sure you want to withdraw this exchange request? You will be removed from pending matching cycles."
        confirmLabel="Confirm Withdrawal"
        confirmVariant="danger"
        onConfirm={handleWithdraw}
        onCancel={() => setRequestToWithdraw(null)}
      />
    </AppLayout>
  );
};

export default StudentRequestsPage;
