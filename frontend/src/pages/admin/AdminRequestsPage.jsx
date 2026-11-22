/**
 * Module: frontend/src/pages/admin/AdminRequestsPage.jsx
 *
 * Work / Purpose:
 *   Hostel Admin console for searching, filtering, inspecting, and managing campus-wide student exchange requests.
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
import { formatDateSafe, formatDateTimeSafe } from '../../utils/dateUtils';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ArrowLeftRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
  Building,
  UserCheck,
  ShieldCheck,
  Send,
  Eye,
  X,
  FileText,
  Users,
  ChevronRight,
  Shield,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const AdminRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal & Selection
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Action form state
  const [actionRemarks, setActionRemarks] = useState('');
  const [assignedWardenEmail, setAssignedWardenEmail] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [reqRes, hostRes, wardenRes] = await Promise.allSettled([
        api.getExchangeRequests(),
        api.getHostels(),
        api.getAuthorizedWardens(),
      ]);

      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value.results || reqRes.value || []);
      }
      if (hostRes.status === 'fulfilled') {
        setHostels(hostRes.value.results || hostRes.value || []);
      }
      if (wardenRes.status === 'fulfilled') {
        setWardens(wardenRes.value.results || wardenRes.value || []);
      }
    } catch (err) {
      console.error('Failed to load exchange requests data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  useRealtimeSync(() => {
    fetchData(true);
  }, { pollIntervalMs: 6000 });

  // Summary Metrics calculations
  const totalOpen = requests.filter((r) => r.status === 'OPEN').length;
  const awaitingStudentAction = requests.filter(
    (r) => r.status === 'MATCHED' && r.active_proposal && r.active_proposal.status === 'PENDING_ACCEPTANCE'
  ).length;
  const awaitingWardenApproval = requests.filter(
    (r) => (r.status === 'MATCHED' && r.active_proposal && r.active_proposal.status === 'PENDING_APPROVAL') ||
           r.status === 'PENDING_APPROVAL'
  ).length;
  const totalCompleted = requests.filter((r) => r.status === 'COMPLETED').length;
  const totalExpiredWithdrawn = requests.filter(
    (r) => r.status === 'EXPIRED' || r.status === 'WITHDRAWN' || r.status === 'CANCELLED'
  ).length;
  const totalActiveProposals = requests.filter((r) => r.status === 'MATCHED').length;

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const studentName = r.student?.full_name || r.student?.first_name || '';
    const studentEmail = r.student?.email || '';
    const hostelName = r.hostel_name || r.preferred_hostel_name || '';
    const reason = r.reason || '';
    const refCode = r.active_proposal?.reference_code || `RS-${r.id}`;

    const matchesSearch =
      studentName.toLowerCase().includes(q) ||
      studentEmail.toLowerCase().includes(q) ||
      hostelName.toLowerCase().includes(q) ||
      reason.toLowerCase().includes(q) ||
      refCode.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter ||
      (statusFilter === 'PENDING_APPROVAL' && r.active_proposal?.status === 'PENDING_APPROVAL');

    const matchesHostel =
      hostelFilter === 'ALL' ||
      (r.hostel_name && r.hostel_name.toLowerCase().includes(hostelFilter.toLowerCase())) ||
      (r.preferred_hostel_name && r.preferred_hostel_name.toLowerCase().includes(hostelFilter.toLowerCase()));

    const cycleLength = r.active_proposal?.cycle_length || 0;
    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'DIRECT' && cycleLength === 2) ||
      (typeFilter === 'CYCLE' && cycleLength >= 3) ||
      (typeFilter === 'UNMATCHED' && !r.active_proposal);

    return matchesSearch && matchesStatus && matchesHostel && matchesType;
  });

  const handleOpenDetail = (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
    setActionFeedback(null);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      await api.assignExchangeRequest(selectedRequest.id, {
        assigned_to: assignedWardenEmail,
        notes: assignmentNote,
        timestamp: new Date().toISOString(),
      });
      setActionFeedback({ type: 'success', message: 'Request assigned successfully to warden for review.' });
      setShowAssignModal(false);
      fetchData();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !internalNote.trim()) return;
    try {
      setActionLoading(true);
      await api.addRequestReviewNote(selectedRequest.id, internalNote.trim());
      setInternalNote('');
      setActionFeedback({ type: 'success', message: 'Internal review note recorded successfully.' });
      fetchData();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveProposal = async () => {
    if (!selectedRequest?.active_proposal?.id) return;
    try {
      setActionLoading(true);
      await api.approveProposal(selectedRequest.active_proposal.id, actionRemarks);
      setActionFeedback({ type: 'success', message: 'Proposal approved and room allocations atomically executed!' });
      setShowApproveModal(false);
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.detail || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!selectedRequest?.active_proposal?.id || !actionRemarks.trim()) return;
    try {
      setActionLoading(true);
      await api.rejectProposal(selectedRequest.active_proposal.id, actionRemarks);
      setActionFeedback({ type: 'success', message: 'Proposal rejected and participants notified.' });
      setShowRejectModal(false);
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.detail || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Review Pending Requests"
      pageDescription="Centralized monitoring of room exchange requests, multi-party proposal cycles, participant acceptances, and administrative workflows."
    >
      <div className="space-y-6">
        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="font-bold text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* 6 Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Newly Submitted</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-900">{totalOpen}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">Open</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Awaiting matching cycle</span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Awaiting Student</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-[#e27518]">{awaitingStudentAction}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-[#e27518] font-bold">Voting</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Participant acceptance</span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Proposals</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-purple-700">{totalActiveProposals}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold">In-Flight</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Matched cycles</span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ready for Approval</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600">{awaitingWardenApproval}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">Warden</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">100% accepted cycles</span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed Swaps</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600">{totalCompleted}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">Executed</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Authoritative transfers</span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expired / Closed</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-500">{totalExpiredWithdrawn}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">Archived</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Withdrawn / timed-out</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, hostel, or proposal code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open (Newly Submitted)</option>
                <option value="MATCHED">Matched in Proposal</option>
                <option value="PENDING_APPROVAL">Ready for Approval</option>
                <option value="COMPLETED">Completed Transfers</option>
                <option value="WITHDRAWN">Withdrawn</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="ALL">All Exchange Types</option>
                <option value="DIRECT">Direct Swap (2)</option>
                <option value="CYCLE">Multi-Party Cycle (3–5)</option>
                <option value="UNMATCHED">Unmatched Pool</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading exchange requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No Exchange Requests Match Filter"
              description="Try adjusting your status, hostel, or search query parameters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Student</th>
                    <th>Current Bed</th>
                    <th>Preferred Target</th>
                    <th>Type</th>
                    <th>Eligibility</th>
                    <th>Acceptance Progress</th>
                    <th>Workflow Status</th>
                    <th>Assigned Warden</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const studentName = req.student?.full_name || req.student?.first_name || 'Student';
                    const studentEmail = req.student?.email || 'N/A';
                    const isMatched = req.status === 'MATCHED' && req.active_proposal;
                    const cycleLen = req.active_proposal?.cycle_length || 0;
                    const acceptedCount = req.active_proposal?.accepted_count || 0;
                    const totalParts = req.active_proposal?.total_participants || cycleLen;
                    const assignedWarden = req.last_validation?.assigned_warden || 'Pending Scope Routing';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Request ID */}
                        <td className="font-mono text-xs font-bold text-purple-700">
                          #RS-{req.id}
                        </td>

                        {/* Student Details */}
                        <td>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{studentName}</div>
                            <div className="text-[11px] text-slate-400">{studentEmail}</div>
                          </div>
                        </td>

                        {/* Current Bed */}
                        <td>
                          <div className="text-xs font-medium text-slate-700">
                            {req.hostel_name || 'BH'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {req.current_bed_label || 'Bed A'}
                          </div>
                        </td>

                        {/* Preferred Destination */}
                        <td>
                          {req.preferred_hostel_name ? (
                            <span className="text-xs text-slate-700 font-medium">
                              {req.preferred_hostel_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Open to any room</span>
                          )}
                        </td>

                        {/* Type */}
                        <td>
                          {isMatched ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cycleLen === 2
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {cycleLen === 2 ? 'Direct Swap' : `${cycleLen}-Cycle`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">Single</span>
                          )}
                        </td>

                        {/* Eligibility */}
                        <td>
                          {req.is_eligible ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              <span>Hold / Ineligible</span>
                            </span>
                          )}
                        </td>

                        {/* Acceptance Progress */}
                        <td>
                          {isMatched ? (
                            <div className="w-28 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                                <span>{acceptedCount}/{totalParts} Accepted</span>
                                <span>{Math.round((acceptedCount / (totalParts || 1)) * 100)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    acceptedCount === totalParts ? 'bg-emerald-500' : 'bg-purple-600'
                                  }`}
                                  style={{ width: `${(acceptedCount / (totalParts || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">N/A</span>
                          )}
                        </td>

                        {/* Workflow Status */}
                        <td>
                          <StatusBadge status={req.status} />
                        </td>

                        {/* Assigned Warden */}
                        <td>
                          <span className="text-[11px] text-slate-600 font-medium">
                            {assignedWarden}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <button
                            onClick={() => handleOpenDetail(req)}
                            className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 hover:border-purple-300 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            <span>Review</span>
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

      {/* DETAIL INSPECTION MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md p-5 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  #{selectedRequest.id}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Request Details</span>
                    <StatusBadge status={selectedRequest.status} />
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submitted on {formatDateSafe(selectedRequest.created_at, 'Recently')} • {selectedRequest.days_remaining ?? 14} days validity remaining
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-secondary text-xs flex items-center gap-1 py-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Assign Warden</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1: Student and Room Details */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Student & Authoritative Allocation</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Student Name</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRequest.student?.full_name || selectedRequest.student?.first_name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Institutional Email</span>
                    <span className="font-mono text-slate-700">{selectedRequest.student?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Current Hostel & Bed</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRequest.hostel_name || 'Hostel'} — {selectedRequest.current_bed_label}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Preferred Target</span>
                    <span className="font-medium text-purple-700">
                      {selectedRequest.preferred_hostel_name || 'Flexible (Any Compatible Room)'}
                    </span>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-400 block text-[10px]">Stated Reason:</span>
                    <p className="text-slate-600 italic mt-0.5">"{selectedRequest.reason}"</p>
                  </div>
                )}
              </div>

              {/* Section 2: Eligibility Validation Checklist */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Backend Eligibility & Governance Verification</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-900 text-[11px]">Hostel Eligibility</div>
                      <div className="text-[10px] text-emerald-700">Policy verified</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-900 text-[11px]">Account Status</div>
                      <div className="text-[10px] text-emerald-700">Active student</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-900 text-[11px]">Cooling-Off Window</div>
                      <div className="text-[10px] text-emerald-700">&gt; 30 days clear</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-900 text-[11px]">Fee & Conduct Clearance</div>
                      <div className="text-[10px] text-emerald-700">No disciplinary holds</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Proposal Details & Multi-Party Rotation Cycle */}
              {selectedRequest.active_proposal ? (
                <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Matched Proposal Cycle: {selectedRequest.active_proposal.reference_code}</span>
                      </h4>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        {selectedRequest.active_proposal.cycle_length}-Party rotation •{' '}
                        {selectedRequest.active_proposal.accepted_count} of{' '}
                        {selectedRequest.active_proposal.total_participants} participants accepted
                      </p>
                    </div>

                    {selectedRequest.active_proposal.status === 'PENDING_APPROVAL' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="btn-danger text-xs py-1 px-3"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setShowApproveModal(true)}
                          className="btn-primary text-xs py-1 px-3.5"
                        >
                          Approve & Execute
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Participants breakdown */}
                  <div className="space-y-2 mt-3">
                    {selectedRequest.active_proposal.participants?.map((p, idx) => (
                      <div
                        key={p.id}
                        className="bg-white rounded-lg p-3 border border-purple-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800">{p.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.student_email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {p.current_bed}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-mono text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                            {p.proposed_bed}
                          </span>
                        </div>

                        <div>
                          {p.accepted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Accepted
                            </span>
                          ) : p.declined ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <Ban className="w-3 h-3" />
                              Declined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Awaiting
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  This request is currently in the matchmaking pool awaiting an optimal direct swap or multi-party cycle.
                </div>
              )}

              {/* Section 4: Internal Review Notes */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Administrative Review Notes & Audit Trail</span>
                </h4>
                {selectedRequest.last_validation?.admin_notes?.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {selectedRequest.last_validation.admin_notes.map((n, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700">{n.author}</span>
                          <span>{formatDateTimeSafe(n.timestamp, 'Recently')}</span>
                        </div>
                        <p className="text-slate-600">{n.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">No administrative notes recorded yet.</p>
                )}

                <form onSubmit={handleAddInternalNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an internal note or review comment..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="input-field text-xs py-1.5"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !internalNote.trim()}
                    className="btn-secondary text-xs flex items-center gap-1 py-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Note</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN WARDEN MODAL */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Assign Request for Warden Review</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select an authorized warden with jurisdiction over this hostel to review and approve the request.
            </p>

            <form onSubmit={handleAssign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Warden</label>
                <select
                  value={assignedWardenEmail}
                  onChange={(e) => setAssignedWardenEmail(e.target.value)}
                  className="input-field text-xs"
                  required
                >
                  <option value="">Select a Warden...</option>
                  {wardens.map((w) => (
                    <option key={w.id} value={w.email}>
                      {w.full_name} ({w.email}) • {w.assigned_hostels?.join(', ') || 'Campus Scope'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Instructions / Note</label>
                <textarea
                  rows={3}
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Please verify medical certificate or room inspection report before approving..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !assignedWardenEmail}
                  className="btn-primary text-xs"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE PROPOSAL MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Confirm Final Approval & Room Execution</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              All participants have accepted this proposal. Approving will atomically transfer student bed allocations in the database with row locking.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Remarks</label>
              <textarea
                rows={3}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="e.g. Approved in accordance with semester room exchange policy."
                className="input-field text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveProposal}
                disabled={actionLoading}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                {actionLoading ? 'Executing...' : 'Approve & Execute Swap'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PROPOSAL MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>Reject Proposal</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Rejection will cancel this multi-party cycle and return all participants to their original room allocations.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="State the institutional reason for rejecting this room exchange..."
                className="input-field text-xs resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectProposal}
                disabled={actionLoading || !actionRemarks.trim()}
                className="btn-danger text-xs"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminRequestsPage;
