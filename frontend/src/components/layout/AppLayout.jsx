/**
 * Module: frontend/src/components/layout/AppLayout.jsx
 *
 * Work / Purpose:
 *   Responsive layout coordinator polling live notification/proposal/approval counts and delegating UI framing to role-specific layout shells.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/admin/AdminAuditPage.jsx
 *   - frontend/src/pages/admin/AdminAuthorizedStudentsPage.jsx
 *   - frontend/src/pages/admin/AdminAuthorizedWardensPage.jsx
 *   - frontend/src/pages/admin/AdminDashboard.jsx
 *   - frontend/src/pages/admin/AdminHostelsRoomsPage.jsx
 *   - frontend/src/pages/admin/AdminIntegrationsPage.jsx
 *   - frontend/src/pages/admin/AdminMatchingPage.jsx
 *   - frontend/src/pages/admin/AdminPoliciesPage.jsx
 *   - frontend/src/pages/admin/AdminProposalsPage.jsx
 *   - frontend/src/pages/admin/AdminReportsPage.jsx
 *   - frontend/src/pages/admin/AdminRequestsPage.jsx
 *   - frontend/src/pages/chief_warden/ChiefWardenDashboard.jsx
 *   - frontend/src/pages/dean/DeanDashboard.jsx
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *   - frontend/src/pages/student/StudentHistoryPage.jsx
 *   - frontend/src/pages/student/StudentProposalsPage.jsx
 *   - frontend/src/pages/student/StudentRequestsPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminAddAdminPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminAddStudentPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminAddWardenPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminAuditPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminDashboard.jsx
 *   - frontend/src/pages/super_admin/SuperAdminUsersPage.jsx
 *   - frontend/src/pages/transfers/TransfersPage.jsx
 *   - frontend/src/pages/warden/WardenApprovalQueuePage.jsx
 *   - frontend/src/pages/warden/WardenDashboard.jsx
 *   - frontend/src/pages/warden/WardenHistoryPage.jsx
 *   - frontend/src/pages/warden/WardenNotificationsPage.jsx
 *   - frontend/src/pages/warden/WardenOccupancyPage.jsx
 *   - frontend/src/pages/warden/WardenPoliciesPage.jsx
 *   - frontend/src/pages/warden/WardenProfilePage.jsx
 *   - frontend/src/pages/warden/WardenProposalsPage.jsx
 *   - frontend/src/pages/warden/WardenReportsPage.jsx
 *   - frontend/src/pages/warden/WardenRoomsPage.jsx
 *   - frontend/src/pages/warden/WardenStudentsPage.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AdminLayout.jsx
 *   - frontend/src/components/layout/ExecutiveLayout.jsx
 *   - frontend/src/components/layout/StudentLayout.jsx
 *   - frontend/src/components/layout/WardenLayout.jsx
 *   - frontend/src/components/layout/navConfig.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/services/api.js
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getRoleNavItems } from './navConfig';
import StudentLayout from './StudentLayout';
import WardenLayout from './WardenLayout';
import AdminLayout from './AdminLayout';
import ExecutiveLayout from './ExecutiveLayout';

export const AppLayout = ({ children, pageTitle, pageDescription, actionButton }) => {
  const { user, logout, isSuperAdmin, isStudent, isWarden, isChiefWarden, isAdmin, isDean } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [adminPendingRequestsCount, setAdminPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchCounts = async () => {
      try {
        const notifRes = await api.getUnreadNotificationCount();
        if (isMounted) setUnreadNotificationsCount(notifRes.data?.unread_count || 0);

        if (isStudent) {
          const propRes = await api.getPendingProposalCount();
          if (isMounted) setPendingProposalsCount(propRes.data?.pending_count || 0);
        }

        if (isWarden) {
          const appRes = await api.getApprovalQueue({ status: 'pending' });
          const appList = appRes.data?.results || appRes.data || [];
          if (isMounted) setPendingApprovalsCount(Array.isArray(appList) ? appList.length : 0);
        }

        if (isAdmin) {
          const [propRes, reqRes, appRes] = await Promise.all([
            api.getProposals({ status: 'pending' }),
            api.getExchangeRequests({ status: 'open' }),
            api.getApprovalQueue({ status: 'pending' }),
          ]);
          if (isMounted) {
            const pList = propRes.data?.results || propRes.data || [];
            const rList = reqRes.data?.results || reqRes.data || [];
            const aList = appRes.data?.results || appRes.data || [];
            setPendingProposalsCount(Array.isArray(pList) ? pList.length : 0);
            setAdminPendingRequestsCount(Array.isArray(rList) ? rList.length : 0);
            setPendingApprovalsCount(Array.isArray(aList) ? aList.length : 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch badge counts', err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);

    const handleRefreshCounts = () => fetchCounts();
    window.addEventListener('refresh-counts', handleRefreshCounts);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('refresh-counts', handleRefreshCounts);
    };
  }, [user, isStudent, isWarden, isAdmin, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path) => {
    if (path === '/student' || path === '/warden') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = getRoleNavItems({
    isStudent,
    isWarden,
    isChiefWarden,
    isSuperAdmin,
    isAdmin,
    isDean,
    unreadNotificationsCount,
    pendingProposalsCount,
    pendingApprovalsCount,
  });

  if (isStudent) {
    return (
      <StudentLayout
        user={user}
        navItems={navItems}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        unreadNotificationsCount={unreadNotificationsCount}
        isActive={isActive}
        handleNavClick={handleNavClick}
        handleLogout={handleLogout}
      >
        {children}
      </StudentLayout>
    );
  }

  if (isWarden) {
    return (
      <WardenLayout
        user={user}
        navItems={navItems}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        unreadNotificationsCount={unreadNotificationsCount}
        isActive={isActive}
        handleNavClick={handleNavClick}
        handleLogout={handleLogout}
      >
        {children}
      </WardenLayout>
    );
  }

  if (isAdmin || isSuperAdmin) {
    return (
      <AdminLayout
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        actionButton={actionButton}
        user={user}
        isSuperAdmin={isSuperAdmin}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        unreadNotificationsCount={unreadNotificationsCount}
        pendingProposalsCount={pendingProposalsCount}
        pendingApprovalsCount={pendingApprovalsCount}
        adminPendingRequestsCount={adminPendingRequestsCount}
        handleNavClick={handleNavClick}
        handleLogout={handleLogout}
      >
        {children}
      </AdminLayout>
    );
  }

  return (
    <ExecutiveLayout
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      actionButton={actionButton}
      user={user}
      navItems={navItems}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isActive={isActive}
      handleNavClick={handleNavClick}
      handleLogout={handleLogout}
    >
      {children}
    </ExecutiveLayout>
  );
};

export default AppLayout;
