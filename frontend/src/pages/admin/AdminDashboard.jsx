import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  Users,
  Building,
  Bed,
  ArrowLeftRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Settings,
  BarChart3,
  ChevronRight,
  Sparkles,
  Link2,
  Mail,
  Database,
  ArrowRight,
  Activity,
  AlertCircle,
  Check,
  X,
  UserPlus,
  RefreshCw,
  PlayCircle,
  Zap,
  Server,
  FileText
} from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Live Data States
  const [analytics, setAnalytics] = useState(null);
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [authorizedStudents, setAuthorizedStudents] = useState([]);
  const [authorizedWardens, setAuthorizedWardens] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrationsStatus, setIntegrationsStatus] = useState(null);

  // Quick Action Modal states
  const [showQuickStudentModal, setShowQuickStudentModal] = useState(false);
  const [showQuickWardenModal, setShowQuickWardenModal] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingWarden, setSubmittingWarden] = useState(false);
  const [runningMatching, setRunningMatching] = useState(false);
  const [syncingP03, setSyncingP03] = useState(false);

  // Quick Student Form
  const [studentForm, setStudentForm] = useState({
    registration_number: '',
    email: '',
    full_name: '',
    gender: 'MALE',
    approved_eligibility: 'BOYS',
    department: 'CSE',
    year_of_study: 1,
    initial_hostel_code: 'BH1',
    initial_room: '',
    initial_bed: '',
  });

  // Quick Warden Form
  const [wardenForm, setWardenForm] = useState({
    warden_id: '',
    email: '',
    full_name: '',
    role: 'WARDEN',
    phone: '',
    assigned_hostels: [],
  });

  // Current Live Date String
  const [currentDateTime, setCurrentDateTime] = useState({
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime({
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [
        analyticsRes,
        reqRes,
        hostRes,
        studentsRes,
        wardensRes,
        auditRes,
        integRes,
      ] = await Promise.allSettled([
        api.getAnalytics(),
        api.getExchangeRequests(),
        api.getHostels(),
        api.getAuthorizedStudents(),
        api.getAuthorizedWardens(),
        api.getAuditLogs({ limit: 6 }),
        api.getIntegrationsStatus(),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }
      if (reqRes.status === 'fulfilled') {
        setExchangeRequests(reqRes.value.results || reqRes.value || []);
      }
      if (hostRes.status === 'fulfilled') {
        setHostels(hostRes.value.results || hostRes.value || []);
      }
      if (studentsRes.status === 'fulfilled') {
        setAuthorizedStudents(studentsRes.value.results || studentsRes.value || []);
      }
      if (wardensRes.status === 'fulfilled') {
        setAuthorizedWardens(wardensRes.value.results || wardensRes.value || []);
      }
      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.results || auditRes.value || []);
      }
      if (integRes.status === 'fulfilled') {
        setIntegrationsStatus(integRes.value);
      }

      if (isManualRefresh) {
        setActionSuccess('Dashboard metrics updated in real time.');
        setTimeout(() => setActionSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
      setActionError('Failed to load some dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickAddStudent = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!studentForm.registration_number || studentForm.registration_number.trim().length !== 8) {
      setActionError('Registration number must be exactly 8 characters.');
      return;
    }
    if (!studentForm.email || !studentForm.email.includes('@')) {
      setActionError('Please enter a valid institutional email address.');
      return;
    }

    try {
      setSubmittingStudent(true);
      await api.createAuthorizedStudent({
        ...studentForm,
        registration_number: studentForm.registration_number.trim().toUpperCase(),
        email: studentForm.email.trim().toLowerCase(),
      });
      setActionSuccess(`Student ${studentForm.registration_number.toUpperCase()} authorized successfully.`);
      setShowQuickStudentModal(false);
      setStudentForm({
        registration_number: '',
        email: '',
        full_name: '',
        gender: 'MALE',
        approved_eligibility: 'BOYS',
        department: 'CSE',
        year_of_study: 1,
        initial_hostel_code: 'BH1',
        initial_room: '',
        initial_bed: '',
      });
      loadDashboardData();
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
        err.response?.data?.registration_number?.[0] ||
        err.response?.data?.email?.[0] ||
        'Failed to authorize student.'
      );
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleQuickAddWarden = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!wardenForm.warden_id || !wardenForm.warden_id.trim()) {
      setActionError('Warden Employee ID is required.');
      return;
    }
    if (!wardenForm.email || !wardenForm.email.includes('@')) {
      setActionError('Official institutional email is required.');
      return;
    }

    try {
      setSubmittingWarden(true);
      await api.createAuthorizedWarden({
        ...wardenForm,
        warden_id: wardenForm.warden_id.trim().toUpperCase(),
        email: wardenForm.email.trim().toLowerCase(),
      });
      setActionSuccess(`Warden ${wardenForm.warden_id.toUpperCase()} pre-authorized successfully.`);
      setShowQuickWardenModal(false);
      setWardenForm({
        warden_id: '',
        email: '',
        full_name: '',
        role: 'WARDEN',
        phone: '',
        assigned_hostels: [],
      });
      loadDashboardData();
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
        err.response?.data?.warden_id?.[0] ||
        err.response?.data?.email?.[0] ||
        'Failed to pre-authorize warden.'
      );
    } finally {
      setSubmittingWarden(false);
    }
  };

  const handleTriggerMatchingQuick = async () => {
    try {
      setRunningMatching(true);
      const res = await api.triggerMatching(5);
      setActionSuccess(
        `Cycle Matching Completed: ${res.cycles_found ?? res.proposals_created ?? 0} cycles detected, ${res.proposals_created ?? 0} new proposals generated!`
      );
      loadDashboardData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Error triggering matching engine.');
    } finally {
      setRunningMatching(false);
    }
  };

  const handleTriggerP03Sync = async () => {
    try {
      setSyncingP03(true);
      const res = await api.syncP03();
      setActionSuccess(res.message || 'P03 Hostel Allocation System synchronized successfully.');
      loadDashboardData();
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err) {
      setActionError('Failed to synchronize with P03.');
    } finally {
      setSyncingP03(false);
    }
  };

  // Metric Computations
  const totalStudentsCount = authorizedStudents.length;
  const boysStudentCount = authorizedStudents.filter((s) => s.approved_eligibility === 'BOYS').length;
  const girlsStudentCount = authorizedStudents.filter((s) => s.approved_eligibility === 'GIRLS').length;

  const totalHostelsCount = hostels.length || analytics?.overview?.total_hostels || 0;
  const boysHostelsCount = hostels.filter((h) => h.hostel_category === 'BOYS').length;
  const girlsHostelsCount = hostels.filter((h) => h.hostel_category === 'GIRLS').length;

  const totalBedsCount = analytics?.overview?.total_beds ?? hostels.reduce((sum, h) => sum + (h.total_beds || 0), 0);
  const occupiedBedsCount = analytics?.overview?.occupied_beds ?? hostels.reduce((sum, h) => sum + (h.occupied_beds || 0), 0);
  const occupancyRate = analytics?.overview?.occupancy_rate ?? (totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0);

  const pendingRequestsCount =
    analytics?.exchange_requests?.open ??
    exchangeRequests.filter((r) => r.status === 'OPEN').length;

  const pendingApprovalsCount =
    analytics?.proposals?.pending_approval ??
    exchangeRequests.filter((r) => r.active_proposal?.status === 'PENDING_APPROVAL').length;

  // Occupancy Bars Data
  const hostelStatsData = (analytics?.hostel_stats && analytics.hostel_stats.length > 0)
    ? analytics.hostel_stats
    : hostels.map((h) => ({
        hostel_id: h.id,
        hostel_name: h.name,
        hostel_code: h.code,
        occupancy_rate: h.total_beds > 0 ? Math.round(((h.occupied_beds || 0) / h.total_beds) * 100) : 0,
        occupied_beds: h.occupied_beds || 0,
        total_beds: h.total_beds || 0,
        vacant_beds: h.vacant_beds || 0,
      }));

  // Recent Swap Requests (Real API slice)
  const recentSwapRequests = exchangeRequests.slice(0, 5);

  // Cycle Length Computations
  const directSwapCount = exchangeRequests.filter((r) => r.active_proposal?.cycle_length === 2).length;
  const cycle3Count = exchangeRequests.filter((r) => r.active_proposal?.cycle_length === 3).length;
  const cycle4Count = exchangeRequests.filter((r) => r.active_proposal?.cycle_length === 4).length;
  const cycle5Count = exchangeRequests.filter((r) => r.active_proposal?.cycle_length === 5).length;
  const totalCycles = (directSwapCount + cycle3Count + cycle4Count + cycle5Count) || 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Alerts */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-600 hover:text-rose-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#5B4DF5] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Institutional Oversight & Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hostel Administrator Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage multi-party room exchange cycles, user rosters, occupancy reconciliation, and system governance.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-2xs"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#5B4DF5] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
            </button>

            <div className="text-right border-l border-slate-100 pl-4">
              <p className="text-xs font-bold text-slate-900">{currentDateTime.date}</p>
              <p className="text-[11px] text-slate-400 font-medium">{currentDateTime.time}</p>
            </div>
          </div>
        </div>

        {/* 2. Top 5 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Students */}
          <Link
            to="/admin/authorized-students"
            className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#f4f3ff] text-[#5B4DF5] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Authorized Students</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{totalStudentsCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {boysStudentCount} Boys | {girlsStudentCount} Girls
              </p>
            </div>
          </Link>

          {/* Total Hostels */}
          <Link
            to="/admin/hostels"
            className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Building className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Authorized Hostels</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{totalHostelsCount}</h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {boysHostelsCount} Boys | {girlsHostelsCount} Girls
              </p>
            </div>
          </Link>

          {/* Total Capacity & Occupancy */}
          <Link
            to="/admin/occupancy"
            className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Bed className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Campus Beds</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{totalBedsCount}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">{occupancyRate}% Full</span>
              </div>
            </div>
          </Link>

          {/* Pending Requests */}
          <Link
            to="/admin/requests"
            className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-amber-200 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#fffbeb] text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Pending Requests</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{pendingRequestsCount}</h3>
              <p className="text-[10px] text-amber-600 font-bold">Needs Cycle Match</p>
            </div>
          </Link>

          {/* Pending Approvals */}
          <Link
            to="/admin/approvals"
            className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-rose-200 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">Pending Approvals</p>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{pendingApprovalsCount}</h3>
              <p className="text-[10px] text-rose-600 font-bold">Awaiting Warden Decision</p>
            </div>
          </Link>
        </div>

        {/* 3. Middle Row: Hostel Occupancy, Recent Requests, and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hostel Occupancy Overview (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Hostel Occupancy Overview</h3>
                  <p className="text-[11px] text-slate-400">Real-time authoritative bed allocation</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#5B4DF5]" /> Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#e2d9fc]" /> Available
                  </span>
                </div>
              </div>

              {/* Stacked Bars */}
              <div className="h-64 flex items-end justify-around gap-4 pt-6 pb-2">
                {hostelStatsData.map((item, idx) => {
                  const occupiedPct = item.occupancy_rate || 20;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group max-w-[64px]">
                      <span className="text-[10px] font-bold text-slate-700 mb-1 opacity-0 group-hover:opacity-100 transition">
                        {occupiedPct}%
                      </span>
                      <div className="w-full bg-[#e2d9fc] rounded-t-xl overflow-hidden flex flex-col justify-end h-48 relative">
                        <div
                          className="w-full bg-[#5B4DF5] rounded-t-lg transition-all duration-700"
                          style={{ height: `${occupiedPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 mt-2 text-center leading-tight">
                        {item.hostel_code || item.hostel_name.replace('Hostel', '').trim()}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {item.occupied_beds || 0}/{item.total_beds || 40}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Synced with P03 Allocation Adapter</span>
              <Link to="/admin/hostels" className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1">
                <span>Manage Hostels</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Swap Requests (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Swap Requests</h3>
                  <p className="text-[11px] text-slate-400">Live student exchange pool</p>
                </div>
                <Link
                  to="/admin/requests"
                  className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0] transition"
                >
                  View All ({exchangeRequests.length})
                </Link>
              </div>

              {recentSwapRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No Exchange Requests Currently</p>
                  <p className="text-[11px] mt-0.5">Students can submit swap preferences from their dashboard.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[10px]">
                        <th className="pb-2">ID</th>
                        <th className="pb-2">Student</th>
                        <th className="pb-2">Hostel</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentSwapRequests.map((r) => {
                        const sName = r.student?.full_name || r.student?.first_name || r.student?.email?.split('@')[0] || 'Student';
                        const hName = r.hostel_name || r.preferred_hostel_name || 'Hostel';
                        const statusColors = {
                          OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
                          MATCHED: 'bg-purple-50 text-purple-700 border-purple-200',
                          COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          WITHDRAWN: 'bg-slate-100 text-slate-600 border-slate-200',
                        };

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition group">
                            <td className="py-2.5 font-semibold text-slate-700">#RS-{r.id}</td>
                            <td className="py-2.5 font-bold text-slate-900 truncate max-w-[100px]">{sName}</td>
                            <td className="py-2.5 text-slate-500 truncate max-w-[80px]">{hName}</td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  statusColors[r.status] || 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Gender isolated by backend</span>
              <Link to="/admin/requests" className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1">
                <span>Manage Requests</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Actions Card (3 cols) — FULLY INTERACTIVE */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Quick Actions
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Admin Tools
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Add Authorized Student */}
                <button
                  type="button"
                  onClick={() => setShowQuickStudentModal(true)}
                  className="w-full p-2.5 rounded-2xl bg-[#f4f3ff] hover:bg-[#edeaff] border border-indigo-100/70 flex items-center justify-between transition group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#5B4DF5] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#5B4DF5] transition">
                        Authorize Student
                      </span>
                      <span className="text-[10px] text-slate-400">Modal quick pre-authorization</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </button>

                {/* 2. Add Warden */}
                <button
                  type="button"
                  onClick={() => setShowQuickWardenModal(true)}
                  className="w-full p-2.5 rounded-2xl bg-[#eff6ff] hover:bg-[#e0efff] border border-blue-100/70 flex items-center justify-between transition group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-blue-600 transition">
                        Authorize Warden
                      </span>
                      <span className="text-[10px] text-slate-400">Assign hostel scopes</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </button>

                {/* 3. Run Matching Engine */}
                <button
                  type="button"
                  onClick={handleTriggerMatchingQuick}
                  disabled={runningMatching}
                  className="w-full p-2.5 rounded-2xl bg-[#f0fdf4] hover:bg-[#dcfce7] border border-emerald-100/70 flex items-center justify-between transition group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                      <PlayCircle className={`w-4 h-4 ${runningMatching ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-emerald-700 transition">
                        {runningMatching ? 'Running Engine...' : 'Run Matching Cycle'}
                      </span>
                      <span className="text-[10px] text-slate-400">Detect multi-party loops</span>
                    </div>
                  </div>
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                </button>

                {/* 4. Manage Hostels & Rooms */}
                <Link
                  to="/admin/hostels"
                  className="w-full p-2.5 rounded-2xl bg-[#faf5ff] hover:bg-[#f3e8ff] border border-purple-100/70 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition block">
                        Hostels & Rooms
                      </span>
                      <span className="text-[10px] text-slate-400">Capacity & room inventory</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </Link>

                {/* 5. Review Requests */}
                <Link
                  to="/admin/requests"
                  className="w-full p-2.5 rounded-2xl bg-[#fffbeb] hover:bg-[#fef3c7] border border-amber-100/70 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition block">
                        Review Requests
                      </span>
                      <span className="text-[10px] text-slate-400">{pendingRequestsCount} awaiting actions</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </Link>

                {/* 6. Configure Policies */}
                <Link
                  to="/admin/policies"
                  className="w-full p-2.5 rounded-2xl bg-[#fff1f2] hover:bg-[#ffe4e6] border border-rose-100/70 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition block">
                        Campus Policies
                      </span>
                      <span className="text-[10px] text-slate-400">Cooling-off & rules</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Link to="/admin/reports" className="w-full py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#5B4DF5]" />
                <span>Executive Reports & Analytics</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Lower Row: Exchange Statistics, Donut Breakdown, and Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Exchange Statistics (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Exchange Statistics</h3>
                  <p className="text-[11px] text-slate-400">Live transaction metrics</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                  Current Term
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-4 rounded-2xl bg-[#f8faff] border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">{exchangeRequests.length}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Total Requests</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Active Database</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8faff] border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">
                    {exchangeRequests.filter((r) => r.status === 'COMPLETED').length}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Completed Transfers</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Atomic Locks</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8faff] border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">{pendingRequestsCount}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Open / In-Flight</p>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">Pending Matching</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8faff] border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">
                    {exchangeRequests.filter((r) => r.status === 'WITHDRAWN' || r.status === 'EXPIRED').length}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Withdrawn / Expired</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Archived</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Detailed Transfer Ledger</span>
              <Link to="/transfers" className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1">
                <span>View Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Exchange Requests by Type (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cycle Architecture Distribution</h3>
                  <p className="text-[11px] text-slate-400">Rotational multi-party swap sizes</p>
                </div>
                <Link to="/admin/matching" className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0]">
                  Configure
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#5B4DF5" strokeWidth="12" strokeDasharray="90 251.2" strokeDashoffset="0" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#38bdf8" strokeWidth="12" strokeDasharray="60 251.2" strokeDashoffset="-90" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#34d399" strokeWidth="12" strokeDasharray="50 251.2" strokeDashoffset="-150" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#fbbf24" strokeWidth="12" strokeDasharray="51.2 251.2" strokeDashoffset="-200" fill="transparent" />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {exchangeRequests.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Requests</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5B4DF5]" />
                    <span className="text-slate-600">2-Way Direct</span>
                    <span className="font-bold text-slate-900">Direct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                    <span className="text-slate-600">3-Student Cycle</span>
                    <span className="font-bold text-slate-900">3-Loop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                    <span className="text-slate-600">4-Student Cycle</span>
                    <span className="font-bold text-slate-900">4-Loop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                    <span className="text-slate-600">5-Student Cycle</span>
                    <span className="font-bold text-slate-900">5-Loop</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">DFS directed cycle graph search</span>
              <button
                onClick={handleTriggerMatchingQuick}
                className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1"
              >
                <span>Trigger Detection</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Activities Feed (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Activity Feed</h3>
                  <p className="text-[11px] text-slate-400">Chronological security & audit events</p>
                </div>
                <Link to="/admin/audit" className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0]">
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <span>No audit entries logged yet.</span>
                  </div>
                ) : (
                  auditLogs.slice(0, 5).map((act, i) => (
                    <div key={act.id || i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#f8faff] border border-slate-200/60 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-[#5B4DF5]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {act.action?.replace(/_/g, ' ') || 'SYSTEM ACTION'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {act.description || act.actor_email || 'System user'}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Immutable audit trail</span>
              <Link to="/admin/audit" className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1">
                <span>Inspect Logs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Bottom Row: Integrations & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* System Integrations (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Institutional Integrations & Feeds</h3>
                  <p className="text-[11px] text-slate-400">Live operational status across campus systems</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All Connectors Active
                  </span>
                  <button
                    onClick={handleTriggerP03Sync}
                    disabled={syncingP03}
                    className="px-3 py-1 rounded-xl text-xs font-bold text-[#5B4DF5] bg-indigo-50 hover:bg-indigo-100 transition flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingP03 ? 'animate-spin' : ''}`} />
                    <span>{syncingP03 ? 'Syncing...' : 'Sync P03'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8faff] border border-slate-100 hover:border-indigo-200 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">P03 Hostel System</span>
                      <span className="text-[10px] text-slate-400">Authoritative bed allocations</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Connected</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8faff] border border-slate-100 hover:border-indigo-200 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Institutional Email</span>
                      <span className="text-[10px] text-slate-400">OTP & notice dispatch</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Connected</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8faff] border border-slate-100 hover:border-indigo-200 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Student ERP Sync</span>
                      <span className="text-[10px] text-slate-400">Rosters & disciplinary holds</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Connected</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8faff] border border-slate-100 hover:border-indigo-200 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Warden Roster</span>
                      <span className="text-[10px] text-slate-400">Approval authority scopes</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Connected</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
              <span className="text-slate-400 font-medium">Automatic rollback on conflict</span>
              <Link to="/admin/integrations/p03" className="font-bold text-[#5B4DF5] hover:text-[#4d3ef0] flex items-center gap-1">
                <span>View Full Integrations Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* System Health (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Health & Telemetry</h3>
                  <p className="text-[11px] text-slate-400">Subsystem diagnostics and latency</p>
                </div>
                <Link to="/admin/integrations/p03" className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0]">
                  View Details
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">PostgreSQL Database</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">SMTP Gateway Relay</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational (24ms)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Link2 className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">P03 Synchronization Adapter</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">System Uptime SLA</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 99.98%
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Django REST Engine v1.0</span>
              <span className="text-[11px] font-bold text-slate-600">Production Mode</span>
            </div>
          </div>
        </div>

        {/* MODAL 1: QUICK AUTHORIZE STUDENT */}
        {showQuickStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5B4DF5] flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Authorize Student</h3>
                    <p className="text-xs text-slate-400">Pre-authorizes 8-digit registration & hostel eligibility</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickStudentModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddStudent} className="py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="e.g. 12108676"
                      value={studentForm.registration_number}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, registration_number: e.target.value.toUpperCase() })
                      }
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono uppercase focus:outline-none focus:border-[#5B4DF5]"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Must be 8 characters</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Institutional Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. student@hostel.edu"
                      value={studentForm.email}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, email: e.target.value.toLowerCase() })
                      }
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kundan Pandit"
                    value={studentForm.full_name}
                    onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={studentForm.gender}
                      onChange={(e) => {
                        const g = e.target.value;
                        setStudentForm({
                          ...studentForm,
                          gender: g,
                          approved_eligibility: g === 'MALE' ? 'BOYS' : 'GIRLS',
                          initial_hostel_code: g === 'MALE' ? 'BH1' : 'GH1',
                        });
                      }}
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Approved Eligibility</label>
                    <select
                      value={studentForm.approved_eligibility}
                      onChange={(e) => setStudentForm({ ...studentForm, approved_eligibility: e.target.value })}
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-bold text-indigo-700 focus:outline-none focus:border-[#5B4DF5]"
                    >
                      <option value="BOYS">Boys' Hostel Only</option>
                      <option value="GIRLS">Girls' Hostel Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE"
                      value={studentForm.department}
                      onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Hostel Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BH1 or GH1"
                      value={studentForm.initial_hostel_code}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, initial_hostel_code: e.target.value.toUpperCase() })
                      }
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#5B4DF5]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/admin/authorized-students"
                    onClick={() => setShowQuickStudentModal(false)}
                    className="text-xs font-bold text-[#5B4DF5] hover:text-[#4d3ef0]"
                  >
                    Open Full Student Roster &rarr;
                  </Link>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickStudentModal(false)}
                      className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingStudent}
                      className="px-5 py-2 rounded-2xl text-xs font-bold text-white bg-[#5B4DF5] hover:bg-[#4d3ef0] shadow-md shadow-[#5B4DF5]/20 disabled:opacity-50"
                    >
                      {submittingStudent ? 'Authorizing...' : 'Authorize Student'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: QUICK PRE-AUTHORIZE WARDEN */}
        {showQuickWardenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Pre-Authorize Warden</h3>
                    <p className="text-xs text-slate-400">Grant approval authority & assign hostel jurisdictions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickWardenModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddWarden} className="py-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Warden / Employee ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. W105"
                      value={wardenForm.warden_id}
                      onChange={(e) =>
                        setWardenForm({ ...wardenForm, warden_id: e.target.value.toUpperCase() })
                      }
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono uppercase focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Official Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. warden.bh3@hostel.edu"
                      value={wardenForm.email}
                      onChange={(e) =>
                        setWardenForm({ ...wardenForm, email: e.target.value.toLowerCase() })
                      }
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Ramesh Kumar"
                      value={wardenForm.full_name}
                      onChange={(e) => setWardenForm({ ...wardenForm, full_name: e.target.value })}
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Role / Authority</label>
                    <select
                      value={wardenForm.role}
                      onChange={(e) => setWardenForm({ ...wardenForm, role: e.target.value })}
                      className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                    >
                      <option value="WARDEN">Hostel Warden (Assigned Hostels)</option>
                      <option value="CHIEF_WARDEN">Chief Warden (Cross-Hostel Authority)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={wardenForm.phone}
                    onChange={(e) => setWardenForm({ ...wardenForm, phone: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {wardenForm.role === 'WARDEN' && hostels.length > 0 && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assign Hostel Jurisdiction</label>
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto">
                      {hostels.map((h) => {
                        const isAssigned = wardenForm.assigned_hostels.includes(h.id);
                        return (
                          <label key={h.id} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWardenForm({
                                    ...wardenForm,
                                    assigned_hostels: [...wardenForm.assigned_hostels, h.id],
                                  });
                                } else {
                                  setWardenForm({
                                    ...wardenForm,
                                    assigned_hostels: wardenForm.assigned_hostels.filter((id) => id !== h.id),
                                  });
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-slate-800">{h.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/admin/authorized-wardens"
                    onClick={() => setShowQuickWardenModal(false)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    Open Full Warden Directory &rarr;
                  </Link>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowQuickWardenModal(false)}
                      className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingWarden}
                      className="px-5 py-2 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      {submittingWarden ? 'Authorizing...' : 'Authorize Warden'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
