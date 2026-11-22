/**
 * Module: frontend/src/context/AuthContext.jsx
 *
 * Work / Purpose:
 *   React authentication context managing JWT tokens, current user profile state, login/logout actions, and role convenience booleans.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *   - frontend/src/components/DemoSwitcherModal.jsx
 *   - frontend/src/components/Navbar.jsx
 *   - frontend/src/components/auth/StudentRegisterModal.jsx
 *   - frontend/src/components/auth/WardenRegisterModal.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/pages/LandingPage.jsx
 *   - frontend/src/pages/LoginPage.jsx
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *   - frontend/src/pages/student/StudentProposalsPage.jsx
 *   - frontend/src/pages/warden/WardenDashboard.jsx
 *   - frontend/src/pages/warden/WardenProfilePage.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/services/api.js
 *   - react (npm package)
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const isDemoMode = Boolean(import.meta.env?.DEV || import.meta.env?.VITE_ENABLE_DEMO === 'true');

export const DEMO_ACCOUNTS = isDemoMode
  ? [
      { role: 'Student 1 (BH1)', regNo: '12345678', email: 'student1@hostel.edu', password: 'Student@123', tag: 'STUDENT', desc: 'Arjun Verma (CS) - Bed 101-A' },
      { role: 'Student 2 (BH1)', regNo: '12101002', email: 'student2@hostel.edu', password: 'Student@123', tag: 'STUDENT', desc: 'Rahul Singh (ECE) - Bed 101-B' },
      { role: 'Student 3 (BH1)', regNo: '12101003', email: 'student3@hostel.edu', password: 'Student@123', tag: 'STUDENT', desc: 'Vikram Patel (MECH) - Bed 102-A' },
      { role: 'Student 4 (BH1)', regNo: '12101004', email: 'student4@hostel.edu', password: 'Student@123', tag: 'STUDENT', desc: 'Aditya Sharma (CS) - Bed 102-B' },
      { role: 'Warden BH1', regNo: 'W101', email: 'warden.bh1@hostel.edu', password: 'Warden@123', tag: 'WARDEN', desc: 'Rajesh Kumar (Boys Hostel 1)' },
      { role: 'Chief Warden', regNo: 'CW1', email: 'chiefwarden@hostel.edu', password: 'Warden@123', tag: 'CHIEF_WARDEN', desc: 'Universal Authority for Cross-Hostel' },
      { role: 'Hostel Admin', regNo: 'ADMIN', email: 'admin@hostel.edu', password: 'Admin@123', tag: 'HOSTEL_ADMIN', desc: 'Platform Administrator' },
      { role: 'Super Admin', regNo: 'SA001', email: 'superadmin@hostel.edu', password: 'SuperAdmin@123', tag: 'SUPER_ADMIN', desc: 'Super Administrator - Centralized OTP & Role Management' },
      { role: 'Dean', regNo: 'DEAN', email: 'dean@hostel.edu', password: 'Dean@123', tag: 'DEAN', desc: 'Executive Reports & Policy Oversight' },
    ]
  : [];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Persistent sidebar state: false by default on initial dashboard landing,
  // stays open across route/function changes once toggled by the user.
  const [sidebarOpen, setSidebarOpenState] = useState(() => {
    return sessionStorage.getItem('roomswap_sidebar_open') === 'true';
  });

  const setSidebarOpen = (valOrFn) => {
    setSidebarOpenState((prev) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      sessionStorage.setItem('roomswap_sidebar_open', String(nextVal));
      return nextVal;
    });
  };

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogout);

    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const token = res.tokens?.access || res.access;
    const refresh = res.tokens?.refresh || res.refresh;
    const userData = res.user;

    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.removeItem('roomswap_sidebar_open');
    setSidebarOpenState(false);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('roomswap_sidebar_open');
    setSidebarOpenState(false);
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.is_super_admin;
  const isStudent = user?.role === 'STUDENT';
  const isWarden = user?.role === 'WARDEN';
  const isChiefWarden = user?.role === 'CHIEF_WARDEN';
  const isAdmin = user?.role === 'HOSTEL_ADMIN' || user?.is_staff || isSuperAdmin;
  const isDean = user?.role === 'DEAN';
  const isStaff = isWarden || isChiefWarden || isAdmin || isDean || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        sidebarOpen,
        setSidebarOpen,
        isSuperAdmin,
        isStudent,
        isWarden,
        isChiefWarden,
        isAdmin,
        isDean,
        isStaff,
        isDemoMode,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
