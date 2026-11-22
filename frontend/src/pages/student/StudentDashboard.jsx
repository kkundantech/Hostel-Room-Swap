/**
 * Module: frontend/src/pages/student/StudentDashboard.jsx
 *
 * Work / Purpose:
 *   Primary Student portal dashboard orchestrating allocation cards, KPIs, request/proposal tables, and modular student modals.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/ConfirmationModal.jsx
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/components/student/StudentBrowseRoomsModal.jsx
 *   - frontend/src/components/student/StudentCreateRequestModal.jsx
 *   - frontend/src/components/student/StudentInfoModals.jsx
 *   - frontend/src/components/student/StudentProposalModals.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { formatDateSafe } from '../../utils/dateUtils';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import StudentCreateRequestModal from '../../components/student/StudentCreateRequestModal';
import StudentBrowseRoomsModal from '../../components/student/StudentBrowseRoomsModal';
import StudentProposalModals from '../../components/student/StudentProposalModals';
import StudentInfoModals from '../../components/student/StudentInfoModals';
import {
  Building,
  Bed,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  Search,
  RotateCw,
  ArrowLeftRight,
  ChevronRight,
  MoreVertical,
  Volume2,
  Sparkles,
  MapPin,
  Calendar,
  X,
  FileText,
  UserCheck,
  Shield,
  Layers,
  Phone,
  Check,
  Share2,
  Bell,
  Mail,
  User,
  AlertTriangle
} from 'lucide-react';

export const StudentDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data State from Backend
  const [allocation, setAllocation] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [backendRooms, setBackendRooms] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(initialTab === 'rooms');
  const [showHostelModal, setShowHostelModal] = useState(initialTab === 'hostel-info');
  const [showNoticesModal, setShowNoticesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(initialTab === 'notifications');
  const [showProfileModal, setShowProfileModal] = useState(initialTab === 'profile');
  const [selectedProposalForView, setSelectedProposalForView] = useState(null);
  const [selectedProposalForRespond, setSelectedProposalForRespond] = useState(null);

  // Form State
  const [selectedHostel, setSelectedHostel] = useState('');
  const [preferredSeater, setPreferredSeater] = useState('2 Seater');
  const [preferredFloor, setPreferredFloor] = useState('3rd or 4th Floor');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Browse Rooms Search & Filter
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterBlock, setRoomFilterBlock] = useState('ALL');

  // Request Menu state (for 3-dots)
  const [activeRequestMenu, setActiveRequestMenu] = useState(null);

  // Student Profile name & roll number derived strictly from authenticated user
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const studentName = fullName || user?.username || user?.email?.split('@')[0] || 'Student';
  const studentRoll =
    user?.student_profile?.roll_number ||
    user?.registration_number ||
    'Not Assigned';

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [allocRes, eligRes, reqRes, propRes, transRes, hostelRes, roomsRes, notifRes] = await Promise.allSettled([
        api.getMyAllocation(),
        api.validateEligibility(),
        api.getExchangeRequests(),
        api.getProposals(),
        api.getTransfers(),
        api.getHostels(),
        api.getRooms({ is_active: true }),
        api.getNotifications(),
      ]);

      if (allocRes.status === 'fulfilled') setAllocation(allocRes.value);
      if (eligRes.status === 'fulfilled') setEligibility(eligRes.value);
      if (reqRes.status === 'fulfilled') setMyRequests(reqRes.value.results || reqRes.value || []);
      if (propRes.status === 'fulfilled') setProposals(propRes.value.results || propRes.value || []);
      if (transRes.status === 'fulfilled') setTransfers(transRes.value.results || transRes.value || []);
      if (hostelRes.status === 'fulfilled') {
        const list = hostelRes.value.results || hostelRes.value || [];
        setHostels(list);
        if (list.length > 0 && !selectedHostel) setSelectedHostel(list[0].id);
      }
      if (roomsRes.status === 'fulfilled') {
        setBackendRooms(roomsRes.value.results || roomsRes.value || []);
      }
      if (notifRes.status === 'fulfilled') {
        setNotificationsList(notifRes.value.results || notifRes.value || []);
      }
    } catch (err) {
      console.error('Error loading student dashboard data from backend:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  useRealtimeSync(() => {
    loadData(true);
  }, { pollIntervalMs: 6000 });

  useEffect(() => {
    if (initialTab === 'rooms') setShowBrowseModal(true);
    if (initialTab === 'hostel-info') setShowHostelModal(true);
    if (initialTab === 'notifications') setShowNotificationsModal(true);
    if (initialTab === 'profile') setShowProfileModal(true);
  }, [initialTab]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await api.createExchangeRequest({
        preferred_hostel: selectedHostel || null,
        preferred_floor: preferredFloor,
        reason: `${reason.trim()} [Preference: ${preferredSeater}, ${preferredFloor}]`,
      });
      const floorWarn = res?.floor_warning || res?.data?.floor_warning || res?.last_validation?.floor_warning;
      if (floorWarn) {
        setFormSuccess(`Exchange request submitted. Note: ${floorWarn}`);
      } else {
        setFormSuccess('Exchange request submitted successfully to backend!');
      }
      window.dispatchEvent(new Event('refresh-counts'));
      setTimeout(() => {
        setShowCreateModal(false);
        setReason('');
        setFormSuccess('');
      }, 1500);
      loadData();
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.preferred_hostel?.[0] ||
        'Failed to submit request. Please ensure you meet platform policies.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawRequest = async (requestId) => {
    try {
      await api.withdrawExchangeRequest(requestId);
      window.dispatchEvent(new Event('refresh-counts'));
      loadData();
    } catch (err) {
      alert('Failed to withdraw request: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRespondDecision = async (accepted) => {
    if (!selectedProposalForRespond) return;
    try {
      await api.respondToProposal(
        selectedProposalForRespond.id,
        accepted,
        accepted ? 'Accepted by student via dashboard' : 'Declined by student via dashboard'
      );
      setSelectedProposalForRespond(null);
      window.dispatchEvent(new Event('refresh-counts'));
      loadData();
    } catch (err) {
      alert('Error recording decision: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new Event('refresh-counts'));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('refresh-counts'));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleGoAheadWithRoom = (roomItem) => {
    setShowBrowseModal(false);
    if (roomItem) {
      const targetHostel = hostels.find(
        (h) => h.name === roomItem.block || (roomItem.distance && roomItem.distance.includes(h.name)) || (roomItem.block && roomItem.block.includes(h.code))
      );
      if (targetHostel) {
        setSelectedHostel(targetHostel.id);
      }
      if (roomItem.seater) {
        setPreferredSeater(roomItem.seater);
      }
      if (roomItem.floor) {
        const fl = parseInt(roomItem.floor, 10);
        if (fl === 1) setPreferredFloor('Ground Floor');
        else if (fl === 2) setPreferredFloor('2nd Floor');
        else if (fl === 3) setPreferredFloor('3rd Floor');
        else if (fl === 4) setPreferredFloor('4th Floor');
        else setPreferredFloor('Ground Floor');
      } else {
        setPreferredFloor('Ground Floor');
      }
      setReason(`Exchange request for available Room ${roomItem.room} (${roomItem.block || 'Hostel'}).`);
    }
    setShowCreateModal(true);
  };

  // Real backend calculations
  const activeRequests = myRequests.filter((r) => r.status === 'OPEN');
  const closedRequests = myRequests.filter((r) => r.status !== 'OPEN');

  const pendingActionProposals = proposals.filter((p) => {
    if (p.status !== 'PENDING_ACCEPTANCE') return false;
    const myPart = p.participants?.find(
      (part) => part.student?.id === user?.id || part.student_email === user?.email
    );
    return myPart && !myPart.accepted && !myPart.declined;
  });

  // Available Rooms from backend (pure real data, no mock fallbacks)
  const availableRoomsList = backendRooms.map((r) => ({
    id: r.id,
    room: r.room_number,
    block: r.block?.name || r.block_name || (r.block?.hostel?.name || 'Block'),
    seater: `${r.capacity || 2} Seater`,
    floor: `${r.floor || 1}th Floor`,
    type: r.room_type || 'Standard Room',
    distance: `Hostel: ${r.block?.hostel?.name || 'Campus Hostel'}`
  }));

  const availableBlocks = ['ALL', ...new Set(availableRoomsList.map((r) => r.block).filter(Boolean))];

  const filteredRooms = availableRoomsList.filter((r) => {
    const matchesBlock = roomFilterBlock === 'ALL' || r.block === roomFilterBlock;
    const matchesQuery = roomSearchQuery === '' ||
      r.room.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
      r.block.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(roomSearchQuery.toLowerCase());
    return matchesBlock && matchesQuery;
  });

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* 1. HERO BANNER: Welcome Back Hero with Panoramic Sunset Campus */}
        <div
          className="rounded-3xl overflow-hidden shadow-sm relative min-h-[175px] sm:min-h-[195px] flex items-center justify-between p-6 sm:p-8 text-white bg-cover bg-center border border-slate-200/50"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.85) 35%, rgba(15, 23, 42, 0.3) 70%, transparent 100%), url('/images/lpu_panoramic_campus.jpg')`,
          }}
        >
          {/* Left Text Content */}
          <div className="relative z-10 max-w-xl">
            <p className="text-xs sm:text-sm font-medium text-slate-300 tracking-wide">
              Welcome Back,
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5 flex items-center gap-2 drop-shadow-sm">
              <span>{studentName}</span>
              <span className="text-2xl sm:text-3xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1">
              Find a better space, a better you.
            </p>
            <p className="text-[11px] sm:text-xs text-slate-300/90 font-serif italic mt-3 tracking-wider">
              &ldquo;Exchange Rooms. Build Connections. Grow Together.&rdquo;
            </p>
          </div>
        </div>

        {/* 2. TOP METRIC CARDS (4-Column Grid) - Backend-Driven Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: My Requests */}
          <div className="card-interactive bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#fff8f1] text-[#f78c30] flex items-center justify-center shrink-0 shadow-xs">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">My Requests</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {myRequests.length}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {activeRequests.length} active &bull; {closedRequests.length} closed
              </p>
            </div>
          </div>

          {/* Card 2: Swap Proposals */}
          <div className="card-interactive bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#ecfdf5] text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Swap Proposals</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {proposals.length}
              </h3>
              <p className={`text-[10px] font-semibold ${pendingActionProposals.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {pendingActionProposals.length > 0 ? `${pendingActionProposals.length} new proposals` : '0 new proposals'}
              </p>
            </div>
          </div>

          {/* Card 3: Transfer History */}
          <div className="card-interactive bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#fffbeb] text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <RotateCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Transfer History</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {transfers.length}
              </h3>
              <Link to="/student/history" className="text-[10px] text-slate-400 hover:text-[#f78c30] font-medium transition">
                {transfers.length > 0 ? 'View all transfers' : '0 past transfers'}
              </Link>
            </div>
          </div>

          {/* Card 4: My Current Room */}
          <div className="card-interactive bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#eff6ff] text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">My Current Room</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {allocation
                  ? `${allocation.bed?.hostel_code || allocation.bed?.hostel_name || 'Room'} ${allocation.bed?.room_number || allocation.bed_label || ''}`
                  : 'No Room Allocated'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {allocation ? `Block ${allocation.bed?.block_name || 'A'} • ${allocation.bed?.room_type || '3 Seater'}` : 'Not Assigned Yet'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN DASHBOARD CONTENT: 2 COLUMNS (Left: 7 cols, Right: 5 cols on lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* === LEFT COLUMN (7 COLS) === */}
          <div className="lg:col-span-7 space-y-6">

            {/* Find a Room Exchange Banner with 3D Character */}
            <div className="card-interactive bg-gradient-to-br from-white via-white to-orange-50/20 rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left Action Area */}
              <div className="space-y-4 max-w-sm z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cycle Matching Engine Active</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Find a Room Exchange
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Post your request or explore available matches.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] hover:from-[#e27518] hover:to-[#f78c30] text-white text-xs font-bold shadow-md shadow-[#f78c30]/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Exchange Request</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>

                  <button
                    onClick={() => setShowBrowseModal(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-orange-50/60 text-[#f78c30] border border-[#f78c30]/60 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Browse Available Rooms</span>
                  </button>
                </div>
              </div>

              {/* Right 3D Character + Doodle Badge */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="relative w-48 h-48 sm:w-56 sm:h-52 flex items-end justify-center">
                  <img
                    src="/images/student_laptop_3d.jpg"
                    alt="LPU Student"
                    loading="lazy"
                    className="w-48 h-48 sm:w-56 sm:h-52 object-contain mix-blend-multiply z-10"
                  />
                  {/* Decorative Playful Doodle Script */}
                  <div className="absolute top-2 right-0 z-20 text-center pointer-events-none select-none">
                    <p className="font-serif italic text-xs sm:text-sm font-semibold text-slate-700 tracking-wide leading-tight">
                      Same Campus
                    </p>
                    <p className="font-serif italic text-sm sm:text-base font-bold text-slate-800 tracking-wide leading-tight">
                      New Friends
                    </p>
                    <svg className="w-16 h-3 mx-auto text-[#f78c30]/70 mt-0.5" viewBox="0 0 60 12" fill="none">
                      <path d="M2 9 Q 30 -3 58 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Swap Proposals Section */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6 sm:p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Swap Proposals
                  </h3>
                  {pendingActionProposals.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-wide">
                      {pendingActionProposals.length} new
                    </span>
                  )}
                </div>
                <Link
                  to="/student/proposals"
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Proposals List */}
              <div className="space-y-3.5">
                {proposals.length > 0 ? (
                  proposals.slice(0, 3).map((prop) => {
                    const myPart = prop.participants?.find(
                      (p) => p.student?.id === user?.id || p.student_email === user?.email
                    );
                    const isPendingAction = prop.status === 'PENDING_ACCEPTANCE' && myPart && !myPart.accepted && !myPart.declined;

                    return (
                      <div
                        key={prop.id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#f78c30]/40 hover:shadow-xs transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src="/images/hostel_room_view.jpg"
                            alt="Room Preview"
                            loading="lazy"
                            className="w-16 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 tracking-tight">
                                {myPart ? `${myPart.current_bed_label} ↔ ${myPart.proposed_bed_label}` : `Proposal #${String(prop.id).slice(0, 8)}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-50 text-[#f78c30] border-orange-200">
                                {prop.cycle_length === 2 ? 'Direct Swap' : `${prop.cycle_length}-Way Swap`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                              {prop.cycle_length} Students Rotation &bull; Ref: {prop.reference_code || `#${String(prop.id).slice(0, 8)}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              Status: <span className="font-semibold text-slate-700">{prop.status}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateSafe(prop.created_at, 'Recently')}</span>
                          </span>

                          <button
                            onClick={() => setSelectedProposalForView(prop)}
                            className="px-4 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-xs"
                          >
                            View
                          </button>

                          {isPendingAction ? (
                            <button
                              onClick={() => setSelectedProposalForRespond(prop)}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-purple-50/50 text-[#f78c30] border border-[#f78c30] text-xs font-bold transition"
                            >
                              Respond
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500 px-3 py-1 bg-slate-100 rounded-lg">
                              {myPart?.accepted ? 'Accepted' : myPart?.declined ? 'Declined' : prop.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
                    <p className="text-xs font-bold text-slate-700">No Active Swap Proposals</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Proposals will automatically appear when your exchange request matches with other students in a cycle.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 px-4 py-1.5 rounded-xl bg-[#f78c30] text-white text-xs font-bold hover:bg-[#e27518] transition shadow-xs"
                    >
                      + Create Exchange Request
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Recent Activity
                </h3>
                <Link
                  to="/student/history"
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Activity entries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f78c30] shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      Room Exchange Platform Active
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Session 2026-27</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      Policy Eligibility Verified
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Hostel Fees Clear</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      Matching Engine Ready
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cycle Length 2-5</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* === RIGHT COLUMN (5 COLS) === */}
          <div className="lg:col-span-5 space-y-6">

            {/* My Hostel Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  My Hostel Information
                </h3>
                {allocation && (
                  <button
                    onClick={() => setShowHostelModal(true)}
                    className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] flex items-center gap-1 transition"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {allocation ? (
                <div className="flex items-center gap-4">
                  <img
                    src="/images/hostel_room_view.jpg"
                    alt="My Room"
                    loading="lazy"
                    className="w-28 h-24 sm:w-32 sm:h-28 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-xs"
                  />

                  <div className="flex-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Hostel / Block</span>
                      <span className="font-bold text-slate-900">
                        {allocation.bed?.block_name || allocation.bed?.hostel_name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Room No.</span>
                      <span className="font-bold text-slate-900">
                        {allocation.bed?.room_number || allocation.bed_label || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Room Type</span>
                      <span className="font-bold text-slate-900">
                        {allocation.bed?.room_type || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Floor</span>
                      <span className="font-bold text-slate-900">
                        {allocation.bed?.floor !== undefined ? `${allocation.bed.floor}th Floor` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Current Occupancy</span>
                      <span className="font-bold text-slate-900">
                        {allocation.bed?.current_occupancy !== undefined ? `${allocation.bed.current_occupancy} / ${allocation.bed.capacity || 1}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Bed className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Room Allocated</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    You currently have no active hostel room assigned.
                  </p>
                </div>
              )}
            </div>

            {/* My Active Requests Section */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  My Active Requests
                </h3>
                <Link
                  to="/student/requests"
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {myRequests.length > 0 ? (
                  myRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="p-3.5 rounded-2xl bg-slate-50/60 border border-slate-100 flex items-start gap-3 relative">
                      <img
                        src="/images/hostel_room_view.jpg"
                        alt="Request"
                        loading="lazy"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {req.preferred_hostel_name ? `Looking for ${req.preferred_hostel_name}` : 'Campus-Wide Exchange Request'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            req.status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            {req.status === 'OPEN' ? 'Active' : req.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {req.reason || 'Standard room exchange request'}
                        </p>
                        {(req.floor_warning || req.last_validation?.floor_warning) && (
                          <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/90 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">{req.floor_warning || req.last_validation?.floor_warning}</span>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>Posted on {formatDateSafe(req.created_at, 'Recently')}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveRequestMenu(activeRequestMenu === req.id ? null : req.id)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeRequestMenu === req.id && (
                        <div className="absolute right-3 top-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 w-36 text-xs">
                          <button
                            onClick={() => {
                              setActiveRequestMenu(null);
                              setShowBrowseModal(true);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                          >
                            Browse Rooms
                          </button>
                          {req.status === 'OPEN' && (
                            <button
                              onClick={() => {
                                setActiveRequestMenu(null);
                                handleWithdrawRequest(req.id);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-semibold"
                            >
                              Withdraw Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-700">No Active Exchange Requests</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Submit an exchange request specifying your target hostel.</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-2 text-xs font-bold text-[#f78c30] hover:underline"
                    >
                      + Create Request
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">
                Quick Actions
              </h3>

              <div className="grid grid-cols-4 gap-2 text-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-slate-50 transition group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#fff8f1] text-[#f78c30] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Create Request
                  </span>
                </button>

                <button
                  onClick={() => setShowBrowseModal(true)}
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-slate-50 transition group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#eff6ff] text-blue-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Browse Rooms
                  </span>
                </button>

                <Link
                  to="/student/proposals"
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-slate-50 transition group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#ecfdf5] text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    View Proposals
                  </span>
                </Link>

                <Link
                  to="/student/history"
                  className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-slate-50 transition group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#fffbeb] text-amber-500 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Check History
                  </span>
                </Link>
              </div>
            </div>

            {/* Important Notices Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Important Notices
                </h3>
                <button
                  onClick={() => setShowNoticesModal(true)}
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Red Megaphone Notice Box */}
              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-center gap-3 text-rose-800">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <p className="text-[11px] font-semibold leading-relaxed">
                  Room exchange requests are not allowed within first 30 days of semester start (Cooling-off Period).
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ================= MODALS & DRAWERS ================= */}
      <StudentCreateRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRequest}
        formError={formError}
        formSuccess={formSuccess}
        allocation={allocation}
        selectedHostel={selectedHostel}
        setSelectedHostel={setSelectedHostel}
        hostels={hostels}
        preferredSeater={preferredSeater}
        setPreferredSeater={setPreferredSeater}
        preferredFloor={preferredFloor}
        setPreferredFloor={setPreferredFloor}
        reason={reason}
        setReason={setReason}
        submitting={submitting}
      />

      <StudentBrowseRoomsModal
        isOpen={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        roomSearchQuery={roomSearchQuery}
        setRoomSearchQuery={setRoomSearchQuery}
        availableBlocks={availableBlocks}
        roomFilterBlock={roomFilterBlock}
        setRoomFilterBlock={setRoomFilterBlock}
        filteredRooms={filteredRooms}
        onRequestSwap={handleGoAheadWithRoom}
      />

      <StudentProposalModals
        selectedProposalForView={selectedProposalForView}
        setSelectedProposalForView={setSelectedProposalForView}
        selectedProposalForRespond={selectedProposalForRespond}
        setSelectedProposalForRespond={setSelectedProposalForRespond}
        handleRespondDecision={handleRespondDecision}
      />

      <StudentInfoModals
        showHostelModal={showHostelModal}
        setShowHostelModal={setShowHostelModal}
        showNoticesModal={showNoticesModal}
        setShowNoticesModal={setShowNoticesModal}
        showNotificationsModal={showNotificationsModal}
        setShowNotificationsModal={setShowNotificationsModal}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        allocation={allocation}
        studentName={studentName}
        studentRoll={studentRoll}
        user={user}
        notificationsList={notificationsList}
        handleMarkNotificationRead={handleMarkNotificationRead}
        handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

    </AppLayout>
  );
};

export default StudentDashboard;
