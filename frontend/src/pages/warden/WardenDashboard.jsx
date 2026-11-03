import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Users,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  FileText,
  ArrowLeftRight,
  RotateCw,
  Search,
  Check,
  X,
  Calendar,
  Layers,
  Sparkles,
  Bed,
  CheckSquare,
  Square
} from 'lucide-react';

export const WardenDashboard = () => {
  const { user } = useAuth();

  // State from backend
  const [queue, setQueue] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Queue tab filter
  const [queueTab, setQueueTab] = useState('ALL');

  // Selected checkboxes
  const [selectedRequests, setSelectedRequests] = useState([]);

  // Modals state
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState(null);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [selectedProposalForView, setSelectedProposalForView] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [rooms, setRooms] = useState([]);

  // Queue items from backend
  const [requestQueueItems, setRequestQueueItems] = useState([]);

  // Recent proposals from backend
  const [proposalCards, setProposalCards] = useState([]);

  // Recent Approvals / Transfers
  const [recentTransfersList, setRecentTransfersList] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [queueRes, hostelRes, transRes, propRes, roomRes, reqRes] = await Promise.allSettled([
        api.getApprovalQueue(),
        api.getHostels(),
        api.getTransfers(),
        api.getProposals(),
        api.getRooms(),
        api.getExchangeRequests(),
      ]);

      const allQueueItems = [];
      const seenIds = new Set();

      const processProposalItem = (item, defaultStatus = 'PENDING_APPROVAL') => {
        if (!item || !item.id || seenIds.has(`prop-${item.id}`)) return;
        seenIds.add(`prop-${item.id}`);
        const firstPart = item.participants?.[0];
        const secondPart = item.participants?.[1];
        const studentName = firstPart
          ? `${firstPart.student?.first_name || ''} ${firstPart.student?.last_name || ''}`.trim() || firstPart.student?.email || firstPart.student_email
          : 'Student';
        const regNo = firstPart?.student?.registration_number || firstPart?.student?.student_profile?.registration_number || firstPart?.student?.username || 'N/A';

        allQueueItems.push({
          id: `prop-${item.id}`,
          backendId: item.id,
          isProposal: true,
          studentName: studentName,
          regNo: regNo,
          avatar: '/images/student_user.jpg',
          currentRoom: firstPart?.current_bed_label || 'Current Bed',
          currentRoomType: 'Allocated Bed',
          requestedRoom: firstPart?.proposed_bed_label || (secondPart ? secondPart.current_bed_label : 'Target Bed'),
          requestedRoomType: `${item.cycle_length || 2}-Way Swap`,
          type: item.cycle_length === 2 ? 'Direct' : `${item.cycle_length}-Way`,
          typeColor: item.cycle_length === 2 ? 'blue' : item.cycle_length === 3 ? 'amber' : 'purple',
          eligibility: 'Eligible',
          policyCheck: item.status === 'PENDING_APPROVAL' ? 'Ready to Approve' : 'Awaiting Students',
          status: item.status || defaultStatus,
          proposal: item,
        });
      };

      if (queueRes.status === 'fulfilled') {
        const qList = queueRes.value?.results || (Array.isArray(queueRes.value) ? queueRes.value : []);
        setQueue(qList);
        qList.forEach((item) => processProposalItem(item, 'PENDING_APPROVAL'));
      }

      if (propRes.status === 'fulfilled') {
        const pList = propRes.value?.results || (Array.isArray(propRes.value) ? propRes.value : []);
        pList.forEach((item) => {
          if (item.status === 'PENDING_APPROVAL' || item.status === 'PENDING_ACCEPTANCE') {
            processProposalItem(item, item.status);
          }
        });

        const mappedProps = pList.map((p) => {
          const isPendingReview = p.status === 'PENDING_APPROVAL';
          const isPendingAcceptance = p.status === 'PENDING_ACCEPTANCE';
          return {
            id: p.id,
            type: p.cycle_length === 2 ? 'Direct Swap' : `${p.cycle_length}-Way Swap`,
            status: isPendingReview ? 'Ready for Approval' : isPendingAcceptance ? 'Awaiting Students' : p.status,
            statusColor: isPendingReview ? 'emerald' : isPendingAcceptance ? 'amber' : 'blue',
            dotColor: isPendingReview ? 'bg-emerald-500' : isPendingAcceptance ? 'bg-amber-500' : 'bg-blue-500',
            chain: (p.participants || []).map((part) => part.student?.first_name || part.student?.full_name || part.student_email?.split('@')[0] || 'Student').join(' → '),
            rooms: (p.participants || []).map((part) => part.current_bed_label || 'Bed').join(' · '),
            studentCount: p.cycle_length || (p.participants ? p.participants.length : 2),
            date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Today',
            roomImages: ['/images/hostel_room_view.jpg', '/images/hostel_room_view.jpg'],
            raw: p,
          };
        });
        setProposalCards(mappedProps);
      }

      if (reqRes.status === 'fulfilled') {
        const rList = reqRes.value?.results || (Array.isArray(reqRes.value) ? reqRes.value : []);
        rList.forEach((req) => {
          if (req.status === 'OPEN' && !seenIds.has(`req-${req.id}`)) {
            seenIds.add(`req-${req.id}`);
            allQueueItems.push({
              id: `req-${req.id}`,
              backendId: req.id,
              isProposal: false,
              studentName: req.student ? `${req.student.first_name || ''} ${req.student.last_name || ''}`.trim() || req.student.email : 'Student',
              regNo: req.student?.registration_number || req.student?.student_profile?.registration_number || req.student?.username || 'N/A',
              avatar: '/images/student_user.jpg',
              currentRoom: req.current_bed_label || 'Current Bed',
              currentRoomType: 'Allocated Bed',
              requestedRoom: req.preferred_hostel_name || 'Open Preference',
              requestedRoomType: req.reason || 'Swap Request',
              type: 'Direct',
              typeColor: 'blue',
              eligibility: req.is_eligible ? 'Eligible' : 'Under Review',
              policyCheck: 'Open Request',
              status: 'OPEN_REQUEST',
              requestObj: req,
            });
          }
        });
      }

      setRequestQueueItems(allQueueItems);

      if (hostelRes.status === 'fulfilled') {
        setHostels(hostelRes.value?.results || hostelRes.value || []);
      }

      if (transRes.status === 'fulfilled') {
        const tList = transRes.value?.results || transRes.value || [];
        setTransfers(tList);
        const mappedTrans = tList.map((t) => ({
          date: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent',
          student: t.student_name || t.student?.email || 'Resident Student',
          type: t.cycle_length === 2 ? 'Direct' : `${t.cycle_length || 2}-Way`,
          typeColor: 'blue',
          status: t.status || 'Completed',
        }));
        setRecentTransfersList(mappedTrans);
      }

      if (roomRes.status === 'fulfilled') {
        setRooms(roomRes.value?.results || roomRes.value || []);
      }
    } catch (err) {
      console.error('Error loading warden data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter queue by tab
  const filteredQueue = requestQueueItems.filter((item) => {
    if (queueTab === 'ALL') return true;
    if (queueTab === 'DIRECT') return item.type === 'Direct';
    if (queueTab === '3WAY') return item.type === '3-Way';
    if (queueTab === '4WAY') return item.type === '4-Way';
    if (queueTab === '5WAY') return item.type === '5-Way';
    return true;
  });

  const assignedHostel = hostels[0] || null;
  const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.occupied_count || 0), 0);
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const maintenanceRooms = rooms.filter((r) => !r.is_active).length;
  const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const strokeDashoffset = totalBeds > 0 ? 251.2 - (251.2 * occupancyPercentage) / 100 : 251.2;

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredQueue.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredQueue.map((item) => item.id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter((item) => item !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequestForApprove) return;
    try {
      if (selectedRequestForApprove.backendId) {
        await api.approveProposal(selectedRequestForApprove.backendId);
      }
      setActionSuccessMessage(`Successfully authorized room transfer for ${selectedRequestForApprove.studentName}!`);
      setSelectedRequestForApprove(null);
      setTimeout(() => setActionSuccessMessage(''), 3000);
      window.dispatchEvent(new Event('refresh-counts'));
      fetchDashboardData();
    } catch (err) {
      alert('Approval error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequestForReject) return;
    try {
      if (selectedRequestForReject.backendId) {
        await api.rejectProposal(selectedRequestForReject.backendId, rejectReason || 'Administrative decision');
      }
      setActionSuccessMessage(`Rejected request for ${selectedRequestForReject.studentName}.`);
      setSelectedRequestForReject(null);
      setRejectReason('');
      setTimeout(() => setActionSuccessMessage(''), 3000);
      window.dispatchEvent(new Event('refresh-counts'));
      fetchDashboardData();
    } catch (err) {
      alert('Reject error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Action feedback notification alert */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage('')} className="p-1 hover:bg-emerald-100 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. HERO BANNER */}
        <div
          className="rounded-3xl overflow-hidden shadow-sm relative min-h-[175px] sm:min-h-[195px] flex items-center justify-between p-6 sm:p-8 text-white bg-cover bg-center border border-slate-200/50"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.85) 40%, rgba(15, 23, 42, 0.3) 70%, transparent 100%), url('/images/lpu_panoramic_campus.jpg')`,
          }}
        >
          {/* Left Text Content */}
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2 drop-shadow-sm">
              <span>Welcome, Warden Sir</span>
              <span className="text-2xl sm:text-3xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1">
              Manage hostel room exchange requests efficiently for {assignedHostel?.name || assignedHostel?.code || 'your assigned hostel'}.
            </p>
            <p className="text-[11px] sm:text-xs text-slate-300/90 font-serif italic mt-3 tracking-wider">
              &ldquo;Safe Campus. Happy Students. Better Living.&rdquo;
            </p>
          </div>

          {/* Right Emblem Badge */}
          <div className="hidden md:flex relative z-10 items-center gap-3.5 bg-black/40 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl shadow-lg">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-sm tracking-widest shadow-md border-2 border-white/40 shrink-0">
              {assignedHostel?.code || 'LPU'}
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-wide leading-tight">
                {assignedHostel?.name || assignedHostel?.code || 'HOSTEL WARDEN'}
              </p>
              <p className="text-slate-300 text-[11px] font-medium">
                Authorized Warden Portal
              </p>
            </div>
          </div>
        </div>

        {/* 2. TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Pending Approvals */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-[#f4f3ff] text-[#5B4DF5] flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Pending Approvals</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {requestQueueItems.length}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Requests to review</p>
            </div>
          </div>

          {/* Card 2: Active Proposals */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-blue-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Active Proposals</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {proposalCards.length}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Multi-party swap chains
              </p>
            </div>
          </div>

          {/* Card 3: Approved / Transfers */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Approved Transfers</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{recentTransfersList.length}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Room transfers completed</p>
            </div>
          </div>

          {/* Card 4: Total Rooms */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-[#fffbeb] text-amber-500 flex items-center justify-center shrink-0">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Rooms</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{rooms.length}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Configured by Admin</p>
            </div>
          </div>

          {/* Card 5: Current Occupancy */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf2f8] text-rose-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Current Occupancy</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{occupiedBeds} / {totalBeds}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#5B4DF5] h-full rounded-full" style={{ width: `${occupancyPercentage}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-600">{occupancyPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAIN SECTION: 2-COLUMN GRID (Left ~65%, Right ~35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Request Approval Queue + Recent Swap Proposals */}
          <div className="lg:col-span-8 space-y-6">

            {/* A. REQUEST APPROVAL QUEUE */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">
                  Request Approval Queue
                </h3>
                <Link
                  to="/warden/approvals"
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Filter Tabs matching reference mockup */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {[
                  { id: 'ALL', label: `All Requests (${requestQueueItems.length})` },
                  { id: 'DIRECT', label: `Direct Swap (${requestQueueItems.filter((i) => i.type === 'Direct').length})` },
                  { id: '3WAY', label: `3-Way (${requestQueueItems.filter((i) => i.type === '3-Way').length})` },
                  { id: '4WAY', label: `4-Way (${requestQueueItems.filter((i) => i.type === '4-Way').length})` },
                  { id: '5WAY', label: `5-Way (${requestQueueItems.filter((i) => i.type === '5-Way').length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setQueueTab(tab.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                      queueTab === tab.id
                        ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Approval Queue Table */}
              <div className="overflow-x-auto">
                {filteredQueue.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center mx-auto mb-2.5 border border-indigo-100">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Pending Approval Requests</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      The approval queue is clear. Incoming room exchange requests from students will appear here for verification and authorization.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                        <th className="py-3 px-2 w-8">
                          <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600">
                            {selectedRequests.length === filteredQueue.length && filteredQueue.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-[#5B4DF5]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-3">Student Details</th>
                        <th className="py-3 px-3">Current Room</th>
                        <th className="py-3 px-2 text-center"></th>
                        <th className="py-3 px-3">Requested Room/Swap</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Eligibility</th>
                        <th className="py-3 px-3">Policy Check</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQueue.map((item) => {
                        const isSelected = selectedRequests.includes(item.id);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition group">
                            {/* Checkbox */}
                            <td className="py-3.5 px-2">
                              <button
                                onClick={() => handleToggleSelect(item.id)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#5B4DF5]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Student Details */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={item.avatar}
                                  alt={item.studentName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                                <div>
                                  <p className="font-bold text-slate-900 leading-tight">
                                    {item.studentName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    Reg. {item.regNo}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Current Room */}
                            <td className="py-3.5 px-3">
                              <p className="font-bold text-slate-900">{item.currentRoom}</p>
                              <p className="text-[10px] text-slate-400">{item.currentRoomType}</p>
                            </td>

                            {/* Swap Arrow Icon */}
                            <td className="py-3.5 px-2 text-center text-slate-400 font-bold">
                              ⮂
                            </td>

                            {/* Requested Room */}
                            <td className="py-3.5 px-3">
                              <p className="font-bold text-slate-900">{item.requestedRoom}</p>
                              <p className="text-[10px] text-slate-400">{item.requestedRoomType}</p>
                            </td>

                            {/* Type */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.type === 'Direct'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                    : item.type === '3-Way'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : item.type === '4-Way'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {item.type}
                              </span>
                            </td>

                            {/* Eligibility */}
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.eligibility === 'Eligible'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {item.eligibility}
                              </span>
                            </td>

                            {/* Policy Check */}
                            <td className="py-3.5 px-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.policyCheck}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === 'PENDING_APPROVAL' ? (
                                  <>
                                    <button
                                      onClick={() => setSelectedRequestForApprove(item)}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-[11px] font-bold transition shadow-xs"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setSelectedRequestForReject(item)}
                                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (item.proposal) {
                                        setSelectedProposalForView({
                                          id: item.proposal.id,
                                          type: item.type === 'Direct' ? 'Direct Swap' : `${item.type} Swap`,
                                          status: item.status === 'PENDING_APPROVAL' ? 'Ready for Approval' : 'Awaiting Students',
                                          statusColor: 'amber',
                                          dotColor: 'bg-amber-500',
                                          chain: (item.proposal.participants || []).map((p) => p.student?.first_name || p.student_email || 'Student').join(' → '),
                                          rooms: (item.proposal.participants || []).map((p) => p.current_bed_label || 'Bed').join(' · '),
                                          studentCount: item.proposal.cycle_length || 2,
                                          date: 'Active',
                                          roomImages: ['/images/hostel_room_view.jpg', '/images/hostel_room_view.jpg'],
                                          raw: item.proposal,
                                        });
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                                  >
                                    {item.proposal ? 'View Proposal' : 'View Request'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* B. RECENT SWAP PROPOSALS */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">
                  Recent Swap Proposals
                </h3>
                <Link
                  to="/warden/proposals"
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {proposalCards.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5B4DF5] flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Active Swap Proposals</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Multi-party swap proposals generated by the algorithmic cycle solver will appear here for review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {proposalCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#5B4DF5]/40 hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${card.dotColor}`} />
                            <span className="text-xs font-bold text-slate-900">{card.type}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              card.status === 'Pending'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}
                          >
                            {card.status}
                          </span>
                        </div>

                        {/* Chain of Room Thumbnails with Arrows */}
                        <div className="flex items-center justify-between my-3 gap-1 overflow-x-auto py-1">
                          {card.roomImages.map((imgSrc, idx) => (
                            <React.Fragment key={idx}>
                              <img
                                src={imgSrc}
                                alt="Room"
                                className="w-11 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              {idx < card.roomImages.length - 1 && (
                                <span className="text-slate-300 font-black text-xs shrink-0">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Rotation Chain Text */}
                        <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                          {card.chain}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                          {card.rooms}
                        </p>

                        {/* Card Metadata */}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mt-3 pt-2.5 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{card.studentCount} Students</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{card.date}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
                        <button
                          onClick={() => setSelectedProposalForView(card)}
                          className="w-full py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition text-center"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setSelectedProposalForView(card)}
                          className="w-full py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition text-center shadow-xs"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Hostel Occupancy + Recent Approvals / Transfers */}
          <div className="lg:col-span-4 space-y-6">

            {/* A. HOSTEL OCCUPANCY */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Occupancy ({assignedHostel?.name || assignedHostel?.code || 'Hostel'})
                </h3>
                <Link
                  to="/warden/occupancy"
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Circular Donut Gauge + Legend */}
              <div className="flex items-center justify-between py-2">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f1f5f9"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#5B4DF5"
                      strokeWidth="10"
                      strokeDasharray="251.2"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-slate-900 leading-tight">{occupiedBeds} / {totalBeds}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{occupancyPercentage}% Full</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF5]" />
                      <span className="text-slate-600 font-medium text-[11px]">Occupied</span>
                    </div>
                    <span className="font-black text-slate-900">{occupiedBeds}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span className="text-slate-600 font-medium text-[11px]">Vacant</span>
                    </div>
                    <span className="font-black text-slate-900">{vacantBeds}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="text-slate-600 font-medium text-[11px]">Maintenance</span>
                    </div>
                    <span className="font-black text-slate-900">{maintenanceRooms}</span>
                  </div>
                </div>
              </div>

              {/* Floor-wise Occupancy preview */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Live Room Count
                  </p>
                  <Link to="/warden/rooms" className="text-[10px] font-bold text-[#5B4DF5] hover:underline flex items-center gap-0.5">
                    <span>Manage Rooms</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
                {rooms.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    0 rooms configured in this hostel. Admin adds rooms in the Admin Portal.
                  </p>
                ) : (
                  <div className="text-xs text-slate-600 font-medium">
                    {rooms.length} room{rooms.length === 1 ? '' : 's'} active across floors.
                  </div>
                )}
              </div>
            </div>

            {/* B. RECENT APPROVALS / TRANSFERS */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Recent Approvals / Transfers
                </h3>
                <Link
                  to="/warden/history"
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                {recentTransfersList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    No completed room transfers recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[10px]">
                        <th className="py-2.5 px-2">Date</th>
                        <th className="py-2.5 px-2">Student</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTransfersList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-2 text-[10px] text-slate-400 font-medium">{item.date}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">{item.student}</td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                item.type === 'Direct'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                  : item.type === '3-Way'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL 1: Confirm Approval Modal */}
      {selectedRequestForApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Authorize Room Transfer</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={selectedRequestForApprove.avatar}
                  alt={selectedRequestForApprove.studentName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedRequestForApprove.studentName}</p>
                  <p className="text-[11px] text-slate-400">Registration No: {selectedRequestForApprove.regNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-semibold">Current Room:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedRequestForApprove.currentRoom}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Approved Room:</span>
                  <p className="font-bold text-[#5B4DF5] mt-0.5">{selectedRequestForApprove.requestedRoom}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Atomic Rotation Security:</span>
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  Both bed de-allocations and new bed assignments will execute atomically with institutional transfer letter generation.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForApprove(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                className="px-5 py-2.5 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-md shadow-[#5B4DF5]/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Execute Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject Reason Modal */}
      {selectedRequestForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject Room Request</span>
              </h3>
              <button
                onClick={() => setSelectedRequestForReject(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Rejecting transfer request for <span className="font-bold text-slate-900">{selectedRequestForReject.studentName}</span> ({selectedRequestForReject.currentRoom} ⮂ {selectedRequestForReject.requestedRoom}).
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Rejection:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Specify institutional policy reason (e.g. Block restriction, Room maintenance, Disciplinary pending)..."
                  rows={3}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedRequestForReject(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-500/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Proposal Details / Review Modal */}
      {selectedProposalForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${selectedProposalForView.dotColor}`} />
                <h3 className="text-base font-bold text-slate-900">{selectedProposalForView.type}</h3>
              </div>
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs">
                <span className="font-bold text-slate-900 block mb-1">Cycle Rotation Chain:</span>
                <p className="font-mono text-[#5B4DF5] font-bold">{selectedProposalForView.chain}</p>
                <p className="text-[11px] text-slate-500 mt-1">Rooms: {selectedProposalForView.rooms}</p>
              </div>

              {/* Room Previews */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Connected Room Previews:</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {selectedProposalForView.roomImages.slice(0, 3).map((img, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-slate-200">
                      <img src={img} alt="Room" className="w-full h-16 object-cover" />
                      <p className="text-[9px] text-center font-bold text-slate-600 py-1 bg-slate-50">Room {i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Participants:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedProposalForView.studentCount} Students Accepted</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Created Date:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedProposalForView.date}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Proposal approved and executed atomically!');
                  setSelectedProposalForView(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-xs"
              >
                Authorize Cycle
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
};

export default WardenDashboard;
