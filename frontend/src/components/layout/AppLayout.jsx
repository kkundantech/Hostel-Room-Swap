import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NotificationsPopover } from '../common/NotificationsPopover';
import {
  LayoutDashboard,
  ArrowLeftRight,
  GitFork,
  FileCheck2,
  Building,
  History,
  ShieldCheck,
  Settings,
  BarChart3,
  LogOut,
  Sparkles,
  Menu,
  X,
  PlusCircle,
  FileText,
  PlayCircle,
  Layers,
  Crown,
  Users,
  UserCheck,
  UserPlus,
  Search,
  Bell,
  Bed,
  RotateCw,
  Home,
  User,
  Calendar,
  ChevronDown,
  Link2,
  Database,
  Mail,
  Sliders,
  KeyRound,
  Shield,
  CheckSquare
} from 'lucide-react';

export const AppLayout = ({ children, pageTitle, pageDescription, actionButton }) => {
  const { user, logout, isSuperAdmin, isStudent, isWarden, isChiefWarden, isAdmin, isDean } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [adminPendingRequestsCount, setAdminPendingRequestsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const notifRes = await api.getUnreadNotificationCount().catch(() => ({ unread_count: 0 }));
        if (isMounted) {
          setUnreadNotificationsCount(notifRes?.unread_count || 0);
        }

        if (isStudent) {
          const propRes = await api.getPendingProposalCount().catch(() => ({ pending_count: 0 }));
          if (isMounted) {
            setPendingProposalsCount(propRes?.pending_count || 0);
          }
        }

        if (isWarden || isAdmin) {
          const [queueRes, propRes, reqRes] = await Promise.allSettled([
            api.getApprovalQueue(),
            api.getProposals(),
            api.getExchangeRequests({ status: 'OPEN' }),
          ]);
          if (isMounted) {
            if (queueRes.status === 'fulfilled') {
              const qList = queueRes.value?.results || (Array.isArray(queueRes.value) ? queueRes.value : []);
              setPendingApprovalsCount(qList.length);
            }
            if (propRes.status === 'fulfilled') {
              const pList = propRes.value?.results || (Array.isArray(propRes.value) ? propRes.value : []);
              const pendingCount = pList.filter(
                (p) => p.status === 'PENDING_APPROVAL' || p.status === 'PENDING_ACCEPTANCE'
              ).length;
              setPendingProposalsCount(pendingCount);
            }
            if (reqRes.status === 'fulfilled') {
              const rList = reqRes.value?.results || (Array.isArray(reqRes.value) ? reqRes.value : []);
              setAdminPendingRequestsCount(rList.length);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching badge counts:', err);
      }
    };
    fetchCounts();

    const handleRefresh = () => fetchCounts();
    window.addEventListener('refresh-counts', handleRefresh);
    const interval = setInterval(fetchCounts, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('refresh-counts', handleRefresh);
      clearInterval(interval);
    };
  }, [user, isStudent, isWarden, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/student' && location.pathname === '/student') return true;
    if (path === '/warden' && location.pathname === '/warden') return true;
    if (path !== '/student' && path !== '/warden' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Build role-specific navigation menu
  const getNavItems = () => {
    if (isStudent) {
      return [
        { label: 'Dashboard', path: '/student', icon: Home, badge: null },
        { label: 'My Requests', path: '/student/requests', icon: FileText, badge: null },
        { label: 'Available Rooms', path: '/student/rooms', icon: Bed, badge: null },
        { label: 'Swap Proposals', path: '/student/proposals', icon: ArrowLeftRight, badge: pendingProposalsCount > 0 ? pendingProposalsCount : null },
        { label: 'Transfer History', path: '/student/history', icon: RotateCw, badge: null },
        { label: 'Notifications', path: '/student/notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null },
        { label: 'My Hostel Info', path: '/student/hostel-info', icon: Building, badge: null },
        { label: 'Profile Settings', path: '/student/profile', icon: User, badge: null },
      ];
    }
    if (isWarden) {
      return [
        { label: 'Dashboard', path: '/warden', icon: LayoutDashboard, badge: null },
        { label: 'Request Approvals', path: '/warden/approvals', icon: FileCheck2, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
        { label: 'Swap Proposals', path: '/warden/proposals', icon: ArrowLeftRight, badge: pendingProposalsCount > 0 ? pendingProposalsCount : null },
        { label: 'Room Management', path: '/warden/rooms', icon: Bed, badge: null },
        { label: 'Occupancy View', path: '/warden/occupancy', icon: Users, badge: null },
        { label: 'Transfer History', path: '/warden/history', icon: RotateCw, badge: null },
        { label: 'Policy & Rules', path: '/warden/policies', icon: ShieldCheck, badge: null },
        { label: 'Notifications', path: '/warden/notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null },
        { label: 'Reports', path: '/warden/reports', icon: BarChart3, badge: null },
        { label: 'Students Directory', path: '/warden/students', icon: UserCheck, badge: null },
        { label: 'Profile Settings', path: '/warden/profile', icon: Settings, badge: null },
      ];
    }
    if (isChiefWarden) {
      return [
        { label: 'Overview', path: '/chief-warden', icon: LayoutDashboard },
        { label: 'Cross-Hostel Queue', path: '/chief-warden/queue', icon: Crown },
        { label: 'Campus Occupancy', path: '/chief-warden/occupancy', icon: Building },
        { label: 'Transfer Ledger', path: '/transfers', icon: FileCheck2 },
      ];
    }
    if (isSuperAdmin) {
      return [
        { label: 'Overview', path: '/super-admin', icon: LayoutDashboard },
        { label: 'Authorized Users', path: '/super-admin/users', icon: Users },
        { label: 'Add Student', path: '/super-admin/users/add-student', icon: UserPlus },
        { label: 'Add Warden', path: '/super-admin/users/add-warden', icon: Building },
        { label: 'Add Admin', path: '/super-admin/users/add-admin', icon: ShieldCheck },
        { label: 'Audit Ledger', path: '/super-admin/audit-logs', icon: History },
        { label: 'Admin Portal', path: '/admin', icon: Settings },
      ];
    }
    if (isAdmin) {
      return [
        { label: 'Overview', path: '/admin', icon: LayoutDashboard },
        { label: 'Authorized Students', path: '/admin/authorized-students', icon: Users },
        { label: 'Authorized Wardens', path: '/admin/authorized-wardens', icon: UserCheck },
        { label: 'All Requests', path: '/admin/requests', icon: ArrowLeftRight },
        { label: 'Proposals & Cycles', path: '/admin/proposals', icon: GitFork },
        { label: 'Matching Engine', path: '/admin/matching', icon: PlayCircle },
        { label: 'Policy Configuration', path: '/admin/policies', icon: Settings },
        { label: 'Transfer Ledger', path: '/transfers', icon: FileCheck2 },
        { label: 'Audit Logs', path: '/admin/audit', icon: History },
      ];
    }
    if (isDean) {
      return [
        { label: 'Executive Analytics', path: '/dean', icon: BarChart3 },
        { label: 'Hostel Occupancy', path: '/dean/hostels', icon: Building },
        { label: 'Transfer Reports', path: '/dean/reports', icon: FileText },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return <span className="badge bg-purple-100 text-purple-800 border border-purple-200">Super Administrator</span>;
      case 'STUDENT':
        return <span className="badge bg-purple-50 text-purple-700 border border-purple-200">Student</span>;
      case 'WARDEN':
        return <span className="badge bg-amber-50 text-amber-700 border border-amber-200">Hostel Warden</span>;
      case 'CHIEF_WARDEN':
        return <span className="badge bg-purple-50 text-purple-700 border border-purple-200">Chief Warden</span>;
      case 'HOSTEL_ADMIN':
        return <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Hostel Administrator</span>;
      case 'DEAN':
        return <span className="badge bg-slate-100 text-slate-800 border border-slate-300">Dean of Student Welfare</span>;
      default:
        return <span className="badge badge-neutral">{user?.role}</span>;
    }
  };

  if (isStudent) {
    const studentName = (user?.first_name && user.first_name !== 'Arjun')
      ? `${user.first_name} ${user.last_name}`
      : 'Kundan Pandit';
    const studentRoll = (user?.student_profile?.roll_number && user.student_profile.roll_number !== 'CS2021001')
      ? user.student_profile.roll_number
      : '12108676';

    return (
      <div className="h-screen flex bg-[#f4f7fb] text-slate-800 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Student Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
            sidebarOpen
              ? 'w-64 translate-x-0 opacity-100 shadow-xl md:shadow-none'
              : 'w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
          }`}
        >
          <div className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll-light">
            <div>
              {/* Brand Header */}
              <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100">
                <Link to="/student" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B4DF5] to-[#7B61FF] flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight">
                      RoomSwap
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      LPU Hostel Exchange Platform
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Hide menu options"
                  aria-label="Hide menu"
                >
                  <Menu className="w-5 h-5 hidden sm:block text-slate-500 hover:text-[#5B4DF5]" />
                  <X className="w-5 h-5 sm:hidden block" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1.5">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={handleNavClick}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-150 ${
                        active
                          ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            active ? 'bg-white text-[#5B4DF5]' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Student Main Container */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header */}
          <header className="h-20 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2.5 rounded-xl text-slate-600 hover:text-[#5B4DF5] hover:bg-indigo-50/70 border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 group shrink-0"
                title={sidebarOpen ? "Hide menu options (3 lines)" : "Show all menu options (3 lines)"}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </button>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search rooms, blocks, or preferences..."
                  className="w-full bg-[#f4f7fb] border border-slate-200/70 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] text-slate-700 placeholder-slate-400 transition"
                />
              </div>
            </div>

            {/* Right User Bar */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Link
                to="/student/notifications"
                className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* User Avatar + Details */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 pl-2 py-1 rounded-2xl hover:bg-slate-50 transition text-left"
                >
                  <img
                    src="/images/student_user.jpg"
                    alt="Student Resident"
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0"
                  />
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {studentName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Reg. No. {studentRoll}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <p className="text-xs font-bold text-slate-900">{studentName}</p>
                      <p className="text-[10px] text-slate-400">Reg: {studentRoll}</p>
                    </div>
                    <Link
                      to="/student/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Student Content Body */}
          <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Warden layout (matching reference mockup with white modern aesthetic)
  if (isWarden) {
    return (
      <div className="h-screen flex bg-[#f4f7fb] text-slate-800 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Warden Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
            sidebarOpen
              ? 'w-64 translate-x-0 opacity-100 shadow-xl md:shadow-none'
              : 'w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
          }`}
        >
          <div className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll-light">
            <div>
              {/* Brand Header */}
              <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100">
                <Link to="/warden" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B4DF5] to-[#7B61FF] flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight">
                      RoomSwap
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      LPU Hostel Exchange Platform
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Hide menu options"
                  aria-label="Hide menu"
                >
                  <Menu className="w-5 h-5 hidden sm:block text-slate-500 hover:text-[#5B4DF5]" />
                  <X className="w-5 h-5 sm:hidden block" />
                </button>
              </div>

              {/* Warden Profile Card */}
              <div className="p-3 mx-4 mt-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5">
                <img
                  src="/images/student_user.jpg"
                  alt="Warden"
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.first_name || 'Warden'} {user?.last_name || ''}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {user?.role === 'CHIEF_WARDEN' ? 'Chief Warden' : 'Hostel Warden'}
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={handleNavClick}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 ${
                        active
                          ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            active ? 'bg-white text-[#5B4DF5]' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Card: Lovely Professional University Campus Building */}
            <div className="p-4">
              <div className="rounded-2xl overflow-hidden relative shadow-sm border border-slate-100 aspect-[4/5] flex flex-col justify-end group">
                <img
                  src="/images/lpu_warden_sidebar.jpg"
                  alt="Lovely Professional University"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Warden Main Container */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header */}
          <header className="h-20 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2.5 rounded-xl text-slate-600 hover:text-[#5B4DF5] hover:bg-indigo-50/70 border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 group shrink-0"
                title={sidebarOpen ? "Hide menu options (3 lines)" : "Show all menu options (3 lines)"}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </button>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by student name, reg. no., room no., or proposal ID..."
                  className="w-full bg-[#f4f7fb] border border-slate-200/70 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] text-slate-700 placeholder-slate-400 transition"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Hostel Selector Dropdown Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
                <span>{user?.assigned_hostels?.[0]?.name || user?.assigned_hostels?.[0]?.code || 'Boys Hostel 1'}</span>
              </div>

              {/* Date Pill */}
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 bg-white text-xs font-medium text-slate-600 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              {/* Notifications */}
              <Link
                to="/warden/notifications"
                className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* User Avatar + Details */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 pl-2 py-1 rounded-2xl hover:bg-slate-50 transition text-left"
                >
                  <img
                    src="/images/student_user.jpg"
                    alt="Warden"
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0"
                  />
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Warden'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {user?.assigned_hostels?.[0]?.name || user?.assigned_hostels?.[0]?.code || 'Hostel Authority'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <p className="text-xs font-bold text-slate-900">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Warden'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {user?.assigned_hostels?.[0]?.name || user?.assigned_hostels?.[0]?.code || 'Hostel Authority'}
                      </p>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Warden Content Body */}
          <main className="flex-1 p-6 sm:p-8 max-w-[1450px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Dedicated Admin layout matching the reference mockup with deep-purple sidebar
  if (isAdmin || isSuperAdmin) {
    const adminNavSections = [
      ...(isSuperAdmin
        ? [
            {
              title: 'SUPER ADMIN CONTROLS',
              items: [
                { label: 'Super Admin Overview', path: '/super-admin', icon: ShieldCheck },
                { label: 'Authorized Identities', path: '/super-admin/users', icon: KeyRound },
                { label: 'Security Audit Ledger', path: '/super-admin/audit-logs', icon: History },
                { label: '+ Authorize Student', path: '/super-admin/users/add-student', icon: UserPlus },
                { label: '+ Authorize Warden', path: '/super-admin/users/add-warden', icon: Building },
                { label: '+ Authorize Admin', path: '/super-admin/users/add-admin', icon: Shield },
              ],
            },
          ]
        : []),
      {
        title: 'USER MANAGEMENT',
        items: [
          { label: 'Authorized Students', path: '/admin/authorized-students', icon: Users },
          { label: 'Authorized Wardens', path: '/admin/authorized-wardens', icon: UserCheck },
        ],
      },
      {
        title: 'HOSTEL MANAGEMENT',
        items: [
          { label: 'Hostels Directory', path: '/admin/hostels', icon: Building },
          { label: 'Rooms Inventory', path: '/admin/rooms', icon: Bed },
          { label: 'Occupancy & Capacity', path: '/admin/occupancy', icon: BarChart3 },
        ],
      },
      {
        title: 'EXCHANGE MANAGEMENT',
        items: [
          { label: 'Swap Requests', path: '/admin/requests', icon: ArrowLeftRight, badge: adminPendingRequestsCount > 0 ? adminPendingRequestsCount : null },
          { label: 'Proposals & Cycles', path: '/admin/proposals', icon: GitFork, badge: pendingProposalsCount > 0 ? pendingProposalsCount : null },
          { label: 'Matching Engine', path: '/admin/matching', icon: PlayCircle },
          { label: 'Approvals Queue', path: '/admin/approvals', icon: FileCheck2, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
        ],
      },
      ...(isSuperAdmin
        ? [
            {
              title: 'PORTALS & SIMULATION',
              items: [
                { label: 'Warden Portal & Queue', path: '/warden', icon: FileCheck2 },
                { label: 'Chief Warden Queue', path: '/chief-warden', icon: Crown },
                { label: 'Student Portal View', path: '/student', icon: User },
                { label: 'Dean Analytics', path: '/dean', icon: BarChart3 },
              ],
            },
          ]
        : []),
      {
        title: 'POLICY & SETTINGS',
        items: [
          { label: 'Policies & Rules', path: '/admin/policies', icon: Settings },
          { label: 'Transfer Ledger', path: '/transfers', icon: FileText },
        ],
      },
      {
        title: 'REPORTS',
        items: [
          { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
          { label: 'Audit Logs', path: '/admin/audit', icon: History },
        ],
      },
      {
        title: 'INTEGRATIONS',
        items: [
          { label: 'P03 Integration', path: '/admin/integrations/p03', icon: Link2 },
          { label: 'Email Service', path: '/admin/integrations/email', icon: Mail },
          { label: 'Data Sync', path: '/admin/integrations/sync', icon: Database },
        ],
      },
    ];

    const isCurrentActive = (path) => {
      if (path === '/admin') return location.pathname === '/admin';
      if (path === '/super-admin') return location.pathname === '/super-admin' || location.pathname === '/super-admin/dashboard';
      if (location.pathname === path) return true;
      if (path !== '/admin' && path !== '/super-admin' && location.pathname.startsWith(path)) return true;
      return false;
    };

    return (
      <div className="h-screen flex bg-[#f4f7fb] text-slate-800 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Deep-Purple Admin Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-[#140b2e] text-slate-300 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
            sidebarOpen
              ? 'w-64 translate-x-0 opacity-100 shadow-xl md:shadow-none'
              : 'w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
          }`}
        >
          <div className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll">
            <div>
              {/* Brand Header */}
              <div className="h-20 px-6 flex items-center justify-between border-b border-white/5">
                <Link to={isSuperAdmin ? "/super-admin" : "/admin"} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B4DF5] to-[#7B61FF] flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                    {isSuperAdmin ? <ShieldCheck className="w-5 h-5" /> : <ArrowLeftRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-white tracking-tight block leading-tight">
                      RoomSwap
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {isSuperAdmin ? 'Super Admin Suite' : 'Hostel Room Exchange'}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Hide menu options"
                  aria-label="Hide menu"
                >
                  <Menu className="w-5 h-5 hidden sm:block text-slate-400 hover:text-white" />
                  <X className="w-5 h-5 sm:hidden block" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4 space-y-4">
                {/* Top Dashboard item */}
                <Link
                  to={isSuperAdmin ? "/super-admin" : "/admin"}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                    (isSuperAdmin ? isCurrentActive('/super-admin') : isCurrentActive('/admin'))
                      ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>{isSuperAdmin ? 'Super Admin Overview' : 'Dashboard'}</span>
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/admin"
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                      isCurrentActive('/admin')
                        ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Admin Control Center</span>
                  </Link>
                )}

                {/* Categorized sections */}
                {adminNavSections.map((sec) => (
                  <div key={sec.title} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">
                      {sec.title}
                    </p>
                    {sec.items.map((item) => {
                      const active = isCurrentActive(item.path);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.path}
                          onClick={handleNavClick}
                          className={`flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium transition ${
                            active
                              ? 'bg-[#5B4DF5] text-white shadow-md shadow-[#5B4DF5]/30'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Admin Main Container */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Top Header */}
          <header className="h-20 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            {/* Search Input */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2.5 rounded-xl text-slate-600 hover:text-[#5B4DF5] hover:bg-indigo-50/70 border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 group shrink-0"
                title={sidebarOpen ? "Hide menu options (3 lines)" : "Show all menu options (3 lines)"}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              </button>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search students, requests, hostels..."
                  className="w-full bg-[#f4f7fb] border border-slate-200/70 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] text-slate-700 placeholder-slate-400 transition"
                />
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Role badge */}
              <div className="hidden md:block">
                {getRoleBadge()}
              </div>

              {/* Notifications */}
              <Link
                to={isSuperAdmin ? "/super-admin/audit-logs" : "/admin/audit"}
                className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {unreadNotificationsCount || 5}
                </span>
              </Link>

              {/* User Avatar + Details */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 pl-2 py-1 rounded-2xl hover:bg-slate-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5B4DF5] to-[#7B61FF] border-2 border-indigo-200 shadow-xs flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {user?.first_name ? user.first_name[0] : (isSuperAdmin ? 'SA' : 'A')}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (isSuperAdmin ? 'Super Administrator' : 'Admin')}
                    </p>
                    <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                      {isSuperAdmin ? 'Root System Authority' : 'LPU Administration'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">
                        {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (isSuperAdmin ? 'Super Administrator' : 'Admin')}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                      <div className="mt-1">{getRoleBadge()}</div>
                    </div>
                    {isSuperAdmin && (
                      <div className="py-1 border-b border-slate-100">
                        <Link
                          to="/super-admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Super Admin Overview</span>
                        </Link>
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Admin Control Center</span>
                        </Link>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Admin Content Body */}
          <main className="flex-1 p-6 sm:p-8 max-w-[1550px] w-full mx-auto">
            {(pageTitle || actionButton) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {pageTitle}
                  </h1>
                  {pageDescription && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                      {pageDescription}
                    </p>
                  )}
                </div>
                {actionButton && (
                  <div className="flex items-center gap-2 shrink-0">
                    {actionButton}
                  </div>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Non-student, non-warden, non-admin layout (Chief Warden, Dean)
  return (
    <div className="h-screen flex bg-slate-50 text-slate-800 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
          sidebarOpen
            ? 'w-64 translate-x-0 opacity-100 shadow-xl md:shadow-none'
            : 'w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
        }`}
      >
        <div className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll">
          <div>
            {/* Brand Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src="/images/lpu_university.jpg"
                  alt="Lovely Professional University"
                  className="w-9 h-9 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0"
                />
                <div>
                  <span className="font-bold text-sm text-white tracking-tight block">RoomSwap</span>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                    LPU Housing Division
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Hide menu options"
                aria-label="Hide menu"
              >
                <Menu className="w-5 h-5 hidden sm:block text-slate-400 hover:text-white" />
                <X className="w-5 h-5 sm:hidden block" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 mx-3 my-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-semibold text-xs shrink-0">
                  {user?.first_name ? user.first_name[0] : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Role:</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="px-3 space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Menu
              </p>
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Tools */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 group shrink-0"
              title={sidebarOpen ? "Hide menu options (3 lines)" : "Show all menu options (3 lines)"}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {pageTitle || 'Dashboard'}
              </h1>
              {pageDescription && (
                <p className="text-xs text-slate-500 hidden sm:block">{pageDescription}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actionButton}
            {getRoleBadge()}
            <NotificationsPopover />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
