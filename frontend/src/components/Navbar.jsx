import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  ArrowLeftRight, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  ClipboardList,
  Menu,
  X
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isStudent, isWarden, isChiefWarden, isAdmin, isDean, isStaff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // On authenticated dashboard routes, AppLayout handles navigation via the role sidebar
  const isDashboardRoute =
    location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/warden') ||
    location.pathname.startsWith('/chief-warden') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/dean') ||
    location.pathname === '/transfers';

  const isAuthOrLanding = 
    location.pathname === '/' || 
    location.pathname === '/login' ||
    location.pathname === '/activate-account' ||
    location.pathname === '/verify-otp' ||
    location.pathname === '/set-password';

  if (isDashboardRoute || isAuthOrLanding) {
    return null;
  }

  return (
    <>
      <nav className="glass-nav sticky top-0 z-40 w-full transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-accent-600 dark:from-white dark:via-brand-400 dark:to-accent-400 bg-clip-text text-transparent">
                    HostelSwap
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
                    Multi-Party Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5">
              {user ? (
                <>
                  {isStudent && (
                    <>
                      <Link
                        to="/student"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/student')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Student Portal
                      </Link>
                      <Link
                        to="/student/requests"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/student/requests')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        My Requests & Proposals
                      </Link>
                    </>
                  )}

                  {(isWarden || isChiefWarden) && (
                    <>
                      <Link
                        to="/warden"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/warden')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Approval Queue
                      </Link>
                      <Link
                        to="/hostels/matrix"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/hostels/matrix')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Bed Matrix
                      </Link>
                    </>
                  )}

                  {(isAdmin || isDean) && (
                    <>
                      <Link
                        to="/admin"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/admin')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Control Center
                      </Link>
                      <Link
                        to="/analytics"
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                          isActive('/analytics')
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Analytics & KPIs
                      </Link>
                    </>
                  )}

                  <Link
                    to="/transfers"
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                      isActive('/transfers')
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Transfer Ledger
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Overview
                  </Link>
                  <Link
                    to="/demo"
                    className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Interactive Flow
                  </Link>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">

              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {user.first_name || user.email.split('@')[0]}
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/25 transition"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-slate-900">
            {user ? (
              <>
                {isStudent && (
                  <>
                    <Link
                      to="/student"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Student Portal
                    </Link>
                    <Link
                      to="/student/requests"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      My Requests & Proposals
                    </Link>
                  </>
                )}
                {isWarden && (
                  <Link
                    to="/warden"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Warden Approval Queue
                  </Link>
                )}
                {(isAdmin || isDean) && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Admin Control Center
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Analytics
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-brand-600"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
