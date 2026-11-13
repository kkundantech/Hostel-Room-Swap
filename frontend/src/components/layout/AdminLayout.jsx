/**
 * Module: frontend/src/components/layout/AdminLayout.jsx
 *
 * Work / Purpose:
 *   Dedicated Admin and Super Admin workspace shell with grouped governance sidebar, live pending counters, and top bar.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/components/layout/AppLayout.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/navConfig.jsx
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { getAdminNavSections, getRoleBadge } from './navConfig';

export const AdminLayout = ({
  children,
  pageTitle,
  pageDescription,
  actionButton,
  user,
  isSuperAdmin,
  sidebarOpen,
  setSidebarOpen,
  userDropdownOpen,
  setUserDropdownOpen,
  unreadNotificationsCount,
  pendingProposalsCount,
  pendingApprovalsCount,
  adminPendingRequestsCount,
  handleNavClick,
  handleLogout,
}) => {
  const location = useLocation();

  const adminNavSections = getAdminNavSections({
    isSuperAdmin,
    adminPendingRequestsCount,
    pendingProposalsCount,
    pendingApprovalsCount,
  });

  const isCurrentActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    if (path === '/super-admin') {
      return location.pathname === '/super-admin' || location.pathname === '/super-admin/dashboard';
    }
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

      {/* Dark Espresso LPU-Themed Admin Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#18110b] text-slate-300 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
          sidebarOpen
            ? 'w-64 translate-x-0 opacity-100 shadow-xl md:shadow-none'
            : 'w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
        }`}
      >
        <div className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll">
          <div>
            {/* Brand Header */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/5">
              <Link to={isSuperAdmin ? '/super-admin' : '/admin'} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f78c30] to-[#f9a154] flex items-center justify-center text-white shadow-md shadow-[#f78c30]/25 shrink-0">
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
                to={isSuperAdmin ? '/super-admin' : '/admin'}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                  (isSuperAdmin ? isCurrentActive('/super-admin') : isCurrentActive('/admin'))
                    ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/30'
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
                      ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/30'
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
                            ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/30'
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
              className="p-2.5 rounded-xl text-slate-600 hover:text-[#f78c30] hover:bg-orange-50/70 border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 group shrink-0"
              title={sidebarOpen ? 'Hide menu options (3 lines)' : 'Show all menu options (3 lines)'}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            </button>
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search students, requests, hostels..."
                className="w-full bg-[#f4f7fb] border border-slate-200/70 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] text-slate-700 placeholder-slate-400 transition"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Role badge */}
            <div className="hidden md:block">
              {getRoleBadge(user?.role)}
            </div>

            {/* Notifications */}
            <Link
              to={isSuperAdmin ? '/super-admin/audit-logs' : '/admin/audit'}
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f78c30] to-[#f9a154] border-2 border-orange-200 shadow-xs flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {user?.first_name ? user.first_name[0] : (isSuperAdmin ? 'SA' : 'A')}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (isSuperAdmin ? 'Super Administrator' : 'Admin')}
                  </p>
                  <p className="text-[10px] text-[#f78c30] font-bold uppercase tracking-wider">
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
                    <div className="mt-1">{getRoleBadge(user?.role)}</div>
                  </div>
                  {isSuperAdmin && (
                    <div className="py-1 border-b border-slate-100">
                      <Link
                        to="/super-admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f78c30] flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Super Admin Overview</span>
                      </Link>
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f78c30] flex items-center gap-2"
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
};

export default AdminLayout;
