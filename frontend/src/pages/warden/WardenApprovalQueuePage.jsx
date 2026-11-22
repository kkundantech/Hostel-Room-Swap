/**
 * Module: frontend/src/pages/warden/WardenApprovalQueuePage.jsx
 *
 * Work / Purpose:
 *   Warden approval queue console for inspecting both multi-party exchange proposals
 *   and direct/vacant room change requests, enabling atomic bed assignments and approvals.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/components/warden/WardenDashboardModals.jsx
 *   - frontend/src/services/api.js
 *   - frontend/src/utils/realtimeSync.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { formatDateSafe } from '../../utils/dateUtils';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { WardenDashboardModals } from '../../components/warden/WardenDashboardModals';
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
  Users,
  Bed,
  Layers,
  Sparkles,
  ArrowLeftRight,
  Check
} from 'lucide-react';

export const WardenApprovalQueuePage = () => {
  const [loading, setLoading] = useState(true);
  const [queueTab, setQueueTab] = useState('ALL'); // 'ALL' | 'DIRECT' | 'CYCLES'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('ALL');

  // Raw data from backend
  const [proposals, setProposals] = useState([]);
  const [directRequests, setDirectRequests] = useState([]);
  const [vacantBeds, setVacantBeds] = useState([]);

  // Action / Inspection state
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState(null);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [selectedProposalForView, setSelectedProposalForView] = useState(null);
  const [selectedRequestForView, setSelectedRequestForView] = useState(null);
  const [selectedTargetBedId, setSelectedTargetBedId] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchQueueData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [queueRes, reqRes, bedsRes] = await Promise.allSettled([
        api.getApprovalQueue(),
        api.getExchangeRequests(),
        api.getVacantBeds(),
      ]);

      if (queueRes.status === 'fulfilled') {
        const qList = queueRes.value?.results || (Array.isArray(queueRes.value) ? queueRes.value : []);
        setProposals(qList);
      }

      if (reqRes.status === 'fulfilled') {
        const rList = reqRes.value?.results || (Array.isArray(reqRes.value) ? reqRes.value : []);
        // Only keep OPEN requests (awaiting warden action or matching)
        const openReqs = rList.filter((r) => r.status === 'OPEN');
        setDirectRequests(openReqs);
      }

      if (bedsRes.status === 'fulfilled') {
        const bList = bedsRes.value?.results || (Array.isArray(bedsRes.value) ? bedsRes.value : []);
        setVacantBeds(bList);
      }
    } catch (err) {
      console.error('Error fetching approval queue data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData(false);
  }, []);

  useRealtimeSync(() => {
    fetchQueueData(true);
  }, { pollIntervalMs: 6000 });

  // Map proposals into unified queue items
  const mappedProposals = proposals.map((p) => {
    const firstPart = p.participants?.[0];
    const totalParts = p.participants?.length || 0;
    const acceptedParts = p.participants?.filter((part) => part.accepted).length || 0;
    const allAccepted = totalParts > 0 && acceptedParts === totalParts;

    return {
      id: `prop-${p.id}`,
      backendId: p.id,
      itemType: 'CYCLE_PROPOSAL',
      isProposal: true,
      refCode: p.reference_code || `#CYCLE-${p.id}`,
      studentName: firstPart
        ? `${firstPart.student?.first_name || ''} ${firstPart.student?.last_name || ''}`.trim() || firstPart.student?.email || 'Student'
        : 'Student Cycle',
      regNo: firstPart?.student?.registration_number || firstPart?.student?.student_profile?.registration_number || 'Cycle',
      avatar: '/images/student_user.jpg',
      currentRoom: firstPart?.current_bed_label || 'Current Bed',
      requestedRoom: firstPart?.proposed_bed_label || 'Target Bed',
      requestedRoomType: `${p.cycle_length || 2}-Way Rotation`,
      cycleLength: p.cycle_length || 2,
      type: p.cycle_length === 2 ? 'Direct Swap' : `${p.cycle_length}-Way Cycle`,
      status: p.status,
      allAccepted,
      acceptedCount: acceptedParts,
      totalCount: totalParts,
      createdAt: p.created_at,
      expiresAt: p.expires_at,
      raw: p,
    };
  });

  // Map direct exchange requests into unified queue items
  const mappedDirectRequests = directRequests.map((r) => {
    const studentName = r.student ? `${r.student.first_name || ''} ${r.student.last_name || ''}`.trim() || r.student.email : 'Student';
    const regNo = r.student?.registration_number || r.student?.student_profile?.registration_number || r.student?.username || 'N/A';

    return {
      id: `req-${r.id}`,
      backendId: r.id,
      itemType: 'DIRECT_REQUEST',
      isProposal: false,
      refCode: `#RS-${r.id}`,
      studentName: studentName,
      regNo: regNo,
      avatar: '/images/student_user.jpg',
      currentRoom: r.current_bed_label || 'Current Bed',
      requestedRoom: r.preferred_hostel_name || 'Open Preference',
      requestedRoomType: r.reason || 'Vacant Room / Swap Request',
      cycleLength: 1,
      type: 'Direct / Vacant Room',
      status: 'OPEN_REQUEST',
      allAccepted: true, // student initiated the request
      acceptedCount: 1,
      totalCount: 1,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      raw: r,
    };
  });

  // Combine both sources
  const allQueueItems = [...mappedProposals, ...mappedDirectRequests];

  // Tab counts: Direct includes 1-way direct vacant requests + 2-way direct swaps
  const countAll = allQueueItems.length;
  const countDirect = allQueueItems.filter((i) => i.itemType === 'DIRECT_REQUEST' || i.cycleLength === 2).length;
  const countCycles = allQueueItems.filter((i) => i.itemType === 'CYCLE_PROPOSAL' && i.cycleLength > 2).length;

  // Filter queue items
  const filteredItems = allQueueItems.filter((item) => {
    // 1. Tab filter
    if (queueTab === 'DIRECT' && item.itemType !== 'DIRECT_REQUEST' && item.cycleLength !== 2) return false;
    if (queueTab === 'CYCLES' && (item.itemType === 'DIRECT_REQUEST' || item.cycleLength === 2)) return false;

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'READY_APPROVAL' && !item.allAccepted) return false;
      if (statusFilter === 'OPEN_REQUEST' && item.itemType !== 'DIRECT_REQUEST') return false;
    }

    // 3. Cycle filter
    if (cycleFilter !== 'ALL') {
      if (cycleFilter === '1' && item.itemType !== 'DIRECT_REQUEST') return false;
      if (cycleFilter !== '1' && (item.itemType === 'DIRECT_REQUEST' || String(item.cycleLength) !== String(cycleFilter))) return false;
    }

    // 4. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const refMatch = String(item.refCode || '').toLowerCase().includes(q);
      const nameMatch = String(item.studentName || '').toLowerCase().includes(q);
      const regMatch = String(item.regNo || '').toLowerCase().includes(q);
      const curMatch = String(item.currentRoom || '').toLowerCase().includes(q);
      const reqMatch = String(item.requestedRoom || '').toLowerCase().includes(q);
      const reasonMatch = String(item.requestedRoomType || '').toLowerCase().includes(q);

      let partsMatch = false;
      if (item.isProposal && item.raw?.participants) {
        partsMatch = item.raw.participants.some((part) => {
          const pName = (part.student_name || part.student?.first_name || part.student_email || '').toLowerCase();
          const pBed = (part.current_bed_label || part.proposed_bed_label || '').toLowerCase();
          return pName.includes(q) || pBed.includes(q);
        });
      }

      if (!refMatch && !nameMatch && !regMatch && !curMatch && !reqMatch && !reasonMatch && !partsMatch) return false;
    }

    return true;
  });

  const handleOpenApproveModal = (item) => {
    setSelectedRequestForApprove(item);
    setApproveRemarks('Approved by hostel warden');
    if (!item.isProposal && item.raw?.preferred_bed) {
      setSelectedTargetBedId(String(item.raw.preferred_bed));
    } else if (!item.isProposal && vacantBeds.length > 0) {
      setSelectedTargetBedId(String(vacantBeds[0].id));
    } else {
      setSelectedTargetBedId('');
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequestForApprove) return;
    setSubmittingAction(true);
    try {
      if (selectedRequestForApprove.isProposal) {
        await api.approveProposal(selectedRequestForApprove.backendId, approveRemarks || 'Approved by hostel warden');
        setActionSuccessMessage(`Authorized and executed swap cycle #${selectedRequestForApprove.backendId}!`);
      } else {
        await api.approveExchangeRequest(selectedRequestForApprove.backendId, {
          target_bed_id: selectedTargetBedId,
          remarks: approveRemarks || 'Approved by hostel warden',
        });
        setActionSuccessMessage(`Successfully allocated vacant bed for ${selectedRequestForApprove.studentName}!`);
      }
      setSelectedRequestForApprove(null);
      setSelectedTargetBedId('');
      setApproveRemarks('');
      setTimeout(() => setActionSuccessMessage(''), 4000);
      window.dispatchEvent(new Event('refresh-counts'));
      fetchQueueData(true);
    } catch (err) {
      alert('Approval error: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequestForReject) return;
    setSubmittingAction(true);
    try {
      if (selectedRequestForReject.isProposal) {
        await api.rejectProposal(selectedRequestForReject.backendId, rejectReason || 'Administrative decision');
      } else {
        await api.rejectExchangeRequest(selectedRequestForReject.backendId, rejectReason || 'Disapproved by hostel warden');
      }
      setActionSuccessMessage(`Declined request for ${selectedRequestForReject.studentName}.`);
      setSelectedRequestForReject(null);
      setRejectReason('');
      setTimeout(() => setActionSuccessMessage(''), 4000);
      window.dispatchEvent(new Event('refresh-counts'));
      fetchQueueData(true);
    } catch (err) {
      alert('Reject error: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Warden Approval Queue"
      pageDescription="Inspect student room requests, vacant bed re-allocations, and multi-party cycle proposals with real-time atomic execution."
    >
      <div className="space-y-6">
        {/* Action feedback banner */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              onClick={() => setActionSuccessMessage('')}
              className="text-xs text-emerald-600 hover:text-emerald-900 underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setQueueTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${queueTab === 'ALL'
              ? 'bg-[#f78c30] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Requests &amp; Swaps</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${queueTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {countAll}
            </span>
          </button>

          <button
            onClick={() => setQueueTab('DIRECT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${queueTab === 'DIRECT'
              ? 'bg-[#f78c30] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <Bed className="w-4 h-4" />
            <span>Direct &amp; Vacant Room Requests</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${queueTab === 'DIRECT' ? 'bg-white/20 text-white' : 'bg-orange-100 text-[#f78c30]'}`}>
              {countDirect}
            </span>
          </button>

          <button
            onClick={() => setQueueTab('CYCLES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${queueTab === 'CYCLES'
              ? 'bg-[#f78c30] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Multi-Party Cycle Swaps</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${queueTab === 'CYCLES' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
              {countCycles}
            </span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ref ID, student name, registration number, bed, or reason..."
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
                <option value="ALL">All Items</option>
                <option value="READY_APPROVAL">Ready for Approval</option>
                <option value="OPEN_REQUEST">Open Resident Requests</option>
              </select>
            </div>

            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
            >
              <option value="ALL">All Swap Sizes</option>
              <option value="1">Direct / Vacant Request</option>
              <option value="2">2-Way (Direct Swap)</option>
              <option value="3">3-Way Cycle</option>
              <option value="4">4-Way Cycle</option>
              <option value="5">5-Way Cycle</option>
            </select>

            <span className="text-xs text-slate-500 font-semibold px-2">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Unified Queue Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#f78c30] border-t-transparent rounded-full animate-spin" />
              <span>Loading warden approval queue...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Items Awaiting Action"
              description="There are currently no active exchange requests or unanimously accepted swap proposals matching your selected filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Request Type</th>
                    <th>Resident / Initiator</th>
                    <th>Current Bed</th>
                    <th>Requested Space / Chain</th>
                    <th>Status &amp; Verification</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isProposal = item.isProposal;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        {/* Ref Code */}
                        <td className="font-mono text-slate-900 font-bold text-xs">
                          {item.refCode}
                        </td>

                        {/* Request Type */}
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${!isProposal
                              ? 'bg-orange-50 text-[#f78c30] border border-orange-200'
                              : item.cycleLength === 2
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                          >
                            {item.type}
                          </span>
                        </td>

                        {/* Student / Initiator */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.avatar}
                              alt={item.studentName}
                              loading="lazy"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{item.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Reg: {item.regNo}</div>
                            </div>
                          </div>
                        </td>

                        {/* Current Bed */}
                        <td className="font-mono text-xs text-slate-700 font-medium">
                          {item.currentRoom}
                        </td>

                        {/* Requested Room / Chain */}
                        <td className="max-w-xs">
                          <div className="text-xs font-semibold text-slate-800">
                            {item.requestedRoom}
                          </div>
                          {item.requestedRoomType && (
                            <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                              "{item.requestedRoomType}"
                            </div>
                          )}
                        </td>

                        {/* Status & Verification */}
                        <td>
                          {isProposal ? (
                            <span
                              className={`badge ${item.allAccepted ? 'badge-success' : 'badge-pending'
                                }`}
                            >
                              {item.acceptedCount} / {item.totalCount} Accepted
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Policy Verified</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary Action Button */}
                            <button
                              onClick={() => handleOpenApproveModal(item)}
                              disabled={isProposal && !item.allAccepted}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shadow-xs flex items-center gap-1 ${isProposal && !item.allAccepted
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-[#f78c30] hover:bg-[#e27518] text-white'
                                }`}
                              title={isProposal ? 'Review & Authorize Cycle' : 'Approve and allocate vacant bed'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isProposal ? 'Authorize' : 'Approve & Assign Bed'}</span>
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => setSelectedRequestForReject(item)}
                              className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition"
                            >
                              Reject
                            </button>

                            {/* View / Inspect Button */}
                            <button
                              onClick={() => {
                                if (isProposal) {
                                  setSelectedProposalForView({
                                    id: item.backendId,
                                    type: item.type,
                                    status: item.allAccepted ? 'Ready for Approval' : 'Awaiting Students',
                                    statusColor: item.allAccepted ? 'emerald' : 'amber',
                                    dotColor: item.allAccepted ? 'bg-emerald-500' : 'bg-amber-500',
                                    chain: (item.raw.participants || []).map((p) => p.student?.first_name || p.student_email || 'Student').join(' → '),
                                    rooms: (item.raw.participants || []).map((p) => p.current_bed_label || 'Bed').join(' · '),
                                    studentCount: item.cycleLength,
                                    date: formatDateSafe(item.createdAt, 'Today'),
                                    roomImages: ['/images/hostel_room_view.jpg', '/images/hostel_room_view.jpg'],
                                    raw: item.raw,
                                  });
                                } else {
                                  setSelectedRequestForView(item);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                            >
                              Inspect
                            </button>
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

      {/* Unified Modals */}
      <WardenDashboardModals
        selectedRequestForApprove={selectedRequestForApprove}
        setSelectedRequestForApprove={setSelectedRequestForApprove}
        handleApproveConfirm={handleApproveConfirm}
        selectedRequestForReject={selectedRequestForReject}
        setSelectedRequestForReject={setSelectedRequestForReject}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        handleRejectConfirm={handleRejectConfirm}
        selectedProposalForView={selectedProposalForView}
        setSelectedProposalForView={setSelectedProposalForView}
        selectedRequestForView={selectedRequestForView}
        setSelectedRequestForView={setSelectedRequestForView}
        vacantBeds={vacantBeds}
        selectedTargetBedId={selectedTargetBedId}
        setSelectedTargetBedId={setSelectedTargetBedId}
        approveRemarks={approveRemarks}
        setApproveRemarks={setApproveRemarks}
        submittingAction={submittingAction}
        onAuthorizeProposal={() => {
          if (selectedProposalForView?.raw) {
            handleOpenApproveModal({
              id: `prop-${selectedProposalForView.id}`,
              backendId: selectedProposalForView.id,
              isProposal: true,
              studentName: selectedProposalForView.chain?.split(' → ')[0] || 'Student',
              regNo: 'Cycle',
              currentRoom: selectedProposalForView.rooms?.split(' · ')[0] || 'Current Bed',
              requestedRoom: selectedProposalForView.type,
              type: selectedProposalForView.type,
            });
          }
          setSelectedProposalForView(null);
        }}
      />
    </AppLayout>
  );
};

export default WardenApprovalQueuePage;
