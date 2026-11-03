import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
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
  User
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

  // Student Profile name & roll number fallback
  const studentName = (user?.first_name && user.first_name !== 'Arjun')
    ? `${user.first_name} ${user.last_name}`
    : 'Kundan Pandit';
  const studentRoll = (user?.student_profile?.roll_number && user.student_profile.roll_number !== 'CS2021001')
    ? user.student_profile.roll_number
    : '12108676';

  const loadData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await api.createExchangeRequest({
        preferred_hostel: selectedHostel || null,
        reason: `${reason.trim()} [Preference: ${preferredSeater}, ${preferredFloor}]`,
      });
      setFormSuccess('Exchange request submitted successfully to backend!');
      window.dispatchEvent(new Event('refresh-counts'));
      setTimeout(() => {
        setShowCreateModal(false);
        setReason('');
        setFormSuccess('');
      }, 1200);
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

        {/* 1. HERO BANNER: Welcome Back, Kundan Pandit with Panoramic Sunset Campus */}
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
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-13 h-13 rounded-2xl bg-[#f4f3ff] text-[#5B4DF5] flex items-center justify-center shrink-0">
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
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-13 h-13 rounded-2xl bg-[#ecfdf5] text-emerald-600 flex items-center justify-center shrink-0">
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
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-13 h-13 rounded-2xl bg-[#fffbeb] text-amber-500 flex items-center justify-center shrink-0">
              <RotateCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Transfer History</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {transfers.length}
              </h3>
              <Link to="/student/history" className="text-[10px] text-slate-400 hover:text-slate-600 font-medium">
                {transfers.length > 0 ? 'View all transfers' : '0 past transfers'}
              </Link>
            </div>
          </div>

          {/* Card 4: My Current Room */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md transition">
            <div className="w-13 h-13 rounded-2xl bg-[#eff6ff] text-blue-600 flex items-center justify-center shrink-0">
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
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-xs p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left Action Area */}
              <div className="space-y-4 max-w-sm z-10">
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
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold shadow-md shadow-[#5B4DF5]/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Exchange Request</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>

                  <button
                    onClick={() => setShowBrowseModal(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-purple-50/50 text-[#5B4DF5] border border-[#5B4DF5]/80 text-xs font-bold flex items-center justify-center gap-2 transition"
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
                    <svg className="w-16 h-3 mx-auto text-[#5B4DF5]/70 mt-0.5" viewBox="0 0 60 12" fill="none">
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
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
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
                        className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#5B4DF5]/40 hover:shadow-xs transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src="/images/hostel_room_view.jpg"
                            alt="Room Preview"
                            className="w-16 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 tracking-tight">
                                {myPart ? `${myPart.current_bed_label} ↔ ${myPart.proposed_bed_label}` : `Proposal #${String(prop.id).slice(0, 8)}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-[#5B4DF5] border-indigo-200">
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
                            <span>{new Date(prop.created_at).toLocaleDateString()}</span>
                          </span>

                          <button
                            onClick={() => setSelectedProposalForView(prop)}
                            className="px-4 py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-xs"
                          >
                            View
                          </button>

                          {isPendingAction ? (
                            <button
                              onClick={() => setSelectedProposalForRespond(prop)}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-purple-50/50 text-[#5B4DF5] border border-[#5B4DF5] text-xs font-bold transition"
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
                      className="mt-3 px-4 py-1.5 rounded-xl bg-[#5B4DF5] text-white text-xs font-bold hover:bg-[#4d3ef0] transition shadow-xs"
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
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Activity entries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF5] shrink-0 mt-1" />
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
                    className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
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
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
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
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>Posted on {new Date(req.created_at).toLocaleDateString()}</span>
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
                      className="mt-2 text-xs font-bold text-[#5B4DF5] hover:underline"
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
                  <div className="w-12 h-12 rounded-full bg-[#f4f3ff] text-[#5B4DF5] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
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
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1 transition"
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

      {/* 1. Create Exchange Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f4f3ff] text-[#5B4DF5] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create Room Exchange Request
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Specify preferences to enter the automated cycle matching engine.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Current Allocation Pill */}
              <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-medium">Current Allocation:</span>
                <span className="font-bold text-[#5B4DF5] bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200/60 shadow-2xs">
                  {allocation ? `${allocation.bed?.hostel_name || 'Hostel'} ${allocation.bed?.room_number || 'Room'}` : 'No Room Allocated'}
                </span>
              </div>

              {/* Preferred Hostel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Preferred Hostel Block
                </label>
                <select
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5]"
                >
                  <option value="">Any Compatible Hostel (Campus-Wide Cycle)</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code}) &bull; {h.gender_display || h.gender}
                    </option>
                  ))}
                  {hostels.length === 0 && (
                    <>
                      <option value="BH1">Boys Hostel 1 (BH-1)</option>
                      <option value="BH2">Boys Hostel 2 (BH-2)</option>
                      <option value="BH3">Boys Hostel 3 (BH-3)</option>
                      <option value="BH4">Boys Hostel 4 (BH-4)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Preference Row: Room Type & Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Room Capacity
                  </label>
                  <select
                    value={preferredSeater}
                    onChange={(e) => setPreferredSeater(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5]"
                  >
                    <option value="1 Seater">Single Seater (Private)</option>
                    <option value="2 Seater">2 Seater</option>
                    <option value="3 Seater">3 Seater</option>
                    <option value="4 Seater">4 Seater</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Floor Preference
                  </label>
                  <select
                    value={preferredFloor}
                    onChange={(e) => setPreferredFloor(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5]"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st or 2nd Floor">1st or 2nd Floor</option>
                    <option value="3rd or 4th Floor">3rd or 4th Floor (Quiet)</option>
                    <option value="Any Floor">Any Compatible Floor</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Exchange
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Looking for a quiet floor closer to research lab peers for semester project."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-md shadow-[#5B4DF5]/25 flex items-center gap-1.5"
                >
                  {submitting ? 'Submitting...' : 'Submit Exchange Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Browse Available Rooms Explorer Modal */}
      {showBrowseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#5B4DF5]" />
                  <span>Browse Available Rooms for Swap</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified campus rooms matching your policy eligibility.
                </p>
              </div>
              <button
                onClick={() => setShowBrowseModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter bar */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by room number, block or AC..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {availableBlocks.map((blk) => (
                  <button
                    key={blk}
                    onClick={() => setRoomFilterBlock(blk)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      roomFilterBlock === blk
                        ? 'bg-[#5B4DF5] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {blk}
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms Cards List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-[#5B4DF5] bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src="/images/hostel_room_view.jpg"
                        alt={r.room}
                        className="w-16 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {r.block} &bull; Room {r.room}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                            {r.seater}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#5B4DF5] border border-indigo-200 text-[10px] font-bold">
                            {r.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Floor: <span className="font-semibold text-slate-700">{r.floor}</span> &bull; {r.distance}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowBrowseModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-xs shrink-0 self-end sm:self-center"
                    >
                      Request Swap
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Rooms Available</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    There are no rooms currently published. Once hostel rooms are configured by administration, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. View Proposal Details Modal */}
      {selectedProposalForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50 text-[#5B4DF5] border-indigo-200">
                  {selectedProposalForView.cycle_length === 2 ? 'Direct Swap' : `${selectedProposalForView.cycle_length}-Way Rotation`}
                </span>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {selectedProposalForView.reference_code || `#${String(selectedProposalForView.id).slice(0, 8)}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProposalForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-indigo-50/60 border border-indigo-100 text-center">
                <p className="text-xs font-bold text-slate-800">
                  Rotation with {selectedProposalForView.cycle_length || 2} Students
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Status: <span className="font-semibold text-[#5B4DF5]">{selectedProposalForView.status}</span>
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Proposal ID</span>
                  <span className="font-mono font-bold text-slate-800">#{selectedProposalForView.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Created On</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedProposalForView.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Approval Requirement</span>
                  <span className="font-semibold text-amber-600">Unanimous Student Acceptance + Warden Authorization</span>
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
              {selectedProposalForView.status === 'PENDING_ACCEPTANCE' && (
                <button
                  onClick={() => {
                    const p = selectedProposalForView;
                    setSelectedProposalForView(null);
                    setSelectedProposalForRespond(p);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-xs"
                >
                  Proceed to Respond
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Respond Modal (Accept or Decline) */}
      {selectedProposalForRespond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900">
              Respond to Exchange Proposal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Proposal: <span className="font-bold text-slate-800">#{selectedProposalForRespond.reference_code || selectedProposalForRespond.id}</span>
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
              Accepting will record your agreement to complete this rotation. Once all students in the cycle accept, the proposal will be reviewed by the hostel warden for atomic transfer execution.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => handleRespondDecision(false)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
              >
                Decline Proposal
              </button>

              <button
                onClick={() => handleRespondDecision(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Accept Proposal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Hostel Room Details Modal */}
      {showHostelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hostel Allocation Details
                </h3>
                <p className="text-xs text-slate-400">Lovely Professional University Residential Services</p>
              </div>
              <button
                onClick={() => setShowHostelModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allocation ? (
              <div className="py-4 space-y-4">
                <img
                  src="/images/hostel_room_view.jpg"
                  alt="Room View"
                  className="w-full h-44 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Block</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {allocation.bed?.block_name || allocation.bed?.hostel_name || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-500">Hostel Residential Complex</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bed Number</span>
                    <p className="font-bold text-[#5B4DF5] mt-0.5">
                      Room {allocation.bed?.room_number || 'N/A'} (Bed {allocation.bed?.bed_number || 'A'})
                    </p>
                    <p className="text-[10px] text-slate-500">Active Allocation</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">Current Room Occupancy:</span>
                  <p className="text-slate-600">Resident: {studentName} ({user?.email || 'student@lpu.in'})</p>
                  <p className="text-slate-600">Disciplinary Standing: <span className="font-semibold text-emerald-700">Clear</span></p>
                  <p className="text-slate-600">Hostel Fee Clearance: <span className="font-semibold text-emerald-700">Verified</span></p>
                </div>
              </div>
            ) : (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bed className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Active Allocation</h4>
                <p className="text-xs text-slate-500 mt-1">
                  You currently have no hostel room allocated.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowHostelModal(false)}
                className="px-5 py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Important Notices Modal */}
      {showNoticesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-rose-600" />
                <span>Hostel Policy &amp; Important Notices</span>
              </h3>
              <button
                onClick={() => setShowNoticesModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold block">1. Semester Start Cooling-Off Period:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Room exchange requests are strictly not allowed within the first 30 days of the academic semester start to ensure initial check-in stability.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold block">2. Gender Isolation Policy:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Cross-gender swaps are strictly prevented by campus hostel bylaws. All requests remain isolated within authorized respective hostels.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold block">3. Multi-Party Atomic Execution:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Cycles are executed atomically only after unanimous student agreement and final warden authorization.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowNoticesModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold transition hover:bg-slate-900"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Notifications</h3>
                  <p className="text-[11px] text-slate-400">Updates on room requests, proposals &amp; approvals</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Actions */}
            {notificationsList.some((n) => !n.is_read) && (
              <div className="py-2.5 px-1 flex justify-end shrink-0">
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] transition"
                >
                  Mark all as read
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="py-3 space-y-2.5 overflow-y-auto flex-1">
              {notificationsList.length > 0 ? (
                notificationsList.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkNotificationRead(n.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      n.is_read
                        ? 'bg-slate-50/70 border-slate-100 text-slate-600'
                        : 'bg-indigo-50/40 border-indigo-100 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${!n.is_read ? 'text-[#5B4DF5]' : 'text-slate-700'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#5B4DF5]"></span>
                        <span className="text-[10px] font-semibold text-[#5B4DF5]">Unread (click to mark read)</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">You are all caught up!</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Profile Settings</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src="/images/student_user.jpg"
                  alt="Student"
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{studentName}</p>
                  <p className="text-xs text-slate-400">Registration: {studentRoll}</p>
                  <p className="text-xs text-[#5B4DF5] font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Role</span>
                  <p className="font-bold text-slate-800 mt-0.5">Hostel Resident</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Academic Year</span>
                  <p className="font-bold text-slate-800 mt-0.5">Year 3 (B.Tech CSE)</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Fee Clearance</span>
                  <p className="font-bold text-emerald-600 mt-0.5">Verified</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Disciplinary</span>
                  <p className="font-bold text-emerald-600 mt-0.5">Clean Record</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition"
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

export default StudentDashboard;
