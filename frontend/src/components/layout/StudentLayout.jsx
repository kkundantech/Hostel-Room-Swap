/**
 * Module: frontend/src/components/layout/StudentLayout.jsx
 *
 * Work / Purpose:
 *   Dedicated Student portal layout shell with responsive sidebar, mobile drawer, top profile bar, and LPU Orange accents.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/components/layout/AppLayout.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';

export const StudentLayout = ({
  children,
  user,
  navItems,
  sidebarOpen,
  setSidebarOpen,
  userDropdownOpen,
  setUserDropdownOpen,
  unreadNotificationsCount,
  isActive,
  handleNavClick,
  handleLogout,
}) => {
  const studentName = (user?.first_name || user?.last_name)
    ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    : (user?.email?.split('@')[0] || 'Student Resident');
  const studentRoll = user?.registration_number || user?.student_profile?.roll_number || 'Student';

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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f78c30] to-[#f9a154] flex items-center justify-center text-white shadow-md shadow-[#f78c30]/25 shrink-0">
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
                <Menu className="w-5 h-5 hidden sm:block text-slate-500 hover:text-[#f78c30]" />
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
                        ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/25'
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
                          active ? 'bg-white text-[#f78c30]' : 'bg-rose-500 text-white'
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
                placeholder="Search rooms, blocks, or preferences..."
                className="w-full bg-[#f4f7fb] border border-slate-200/70 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] text-slate-700 placeholder-slate-400 transition"
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
                  className="w-10 h-10 rounded-full object-cover border-2 border-orange-100 shadow-xs shrink-0"
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
};

export default StudentLayout;
