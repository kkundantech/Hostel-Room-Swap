/**
 * Module: frontend/src/components/layout/ExecutiveLayout.jsx
 *
 * Work / Purpose:
 *   Dedicated executive oversight layout shell used by Chief Warden and Dean portals.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/components/layout/AppLayout.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/NotificationsPopover.jsx
 *   - frontend/src/components/layout/navConfig.jsx
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { NotificationsPopover } from '../common/NotificationsPopover';
import { getRoleBadge } from './navConfig';

export const ExecutiveLayout = ({
  children,
  pageTitle,
  pageDescription,
  actionButton,
  user,
  navItems,
  sidebarOpen,
  setSidebarOpen,
  isActive,
  handleNavClick,
  handleLogout,
}) => {
  const location = useLocation();
  const sidebarScrollRef = React.useRef(null);

  // Preserve and restore exact scroll position across route changes
  React.useLayoutEffect(() => {
    const saved = sessionStorage.getItem('executive_sidebar_scroll');
    if (saved !== null && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = Number(saved);
    }
  }, [location.pathname]);

  const handleSidebarScroll = (e) => {
    sessionStorage.setItem('executive_sidebar_scroll', String(e.currentTarget.scrollTop));
  };

  const handleLinkClick = () => {
    if (sidebarScrollRef.current) {
      sessionStorage.setItem('executive_sidebar_scroll', String(sidebarScrollRef.current.scrollTop));
    }
    handleNavClick?.();
  };

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
            ? 'w-64 min-w-[16rem] max-w-[16rem] translate-x-0 opacity-100 shadow-xl md:shadow-none'
            : 'w-0 min-w-0 max-w-0 -translate-x-full md:translate-x-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
        }`}
      >
        <div
          ref={sidebarScrollRef}
          onScroll={handleSidebarScroll}
          className="w-64 min-w-[16rem] flex flex-col h-full justify-between overflow-y-auto overscroll-contain sidebar-scroll"
        >
          <div>
            {/* Brand Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src="/images/lpu_university.jpg"
                  alt="Lovely Professional University"
                  loading="lazy"
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer md:hidden"
                title="Close menu"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 mx-3 my-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f78c30]/20 border border-[#f78c30]/40 flex items-center justify-center text-[#f78c30] font-semibold text-xs shrink-0">
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
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/25'
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
              title={sidebarOpen ? 'Hide menu options (3 lines)' : 'Show all menu options (3 lines)'}
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
            {getRoleBadge(user?.role)}
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

export default ExecutiveLayout;
