/**
 * Module: frontend/src/App.jsx
 *
 * Work / Purpose:
 *   Root React application defining AuthProvider, ErrorBoundary, lazy-loaded portal routes, and role-based ProtectedRoute guards.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/main.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/Navbar.jsx
 *   - frontend/src/components/common/ErrorBoundary.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/pages/InteractiveDemo.jsx
 *   - frontend/src/pages/LandingPage.jsx
 *   - frontend/src/pages/LoginPage.jsx
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
 *   - frontend/src/pages/auth/ActivateAccountPage.jsx
 *   - frontend/src/pages/auth/SetPasswordPage.jsx
 *   - frontend/src/pages/auth/VerifyOtpPage.jsx
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
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy-loaded Route Modules with Automatic Deployment Chunk Retry & Recovery
const InteractiveDemo = lazyWithRetry(() => import('./pages/InteractiveDemo'));

// OTP Activation Pages
const ActivateAccountPage = lazyWithRetry(() => import('./pages/auth/ActivateAccountPage'));
const VerifyOtpPage = lazyWithRetry(() => import('./pages/auth/VerifyOtpPage'));
const SetPasswordPage = lazyWithRetry(() => import('./pages/auth/SetPasswordPage'));

// Super Admin Pages
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/super_admin/SuperAdminDashboard'));
const SuperAdminUsersPage = lazyWithRetry(() => import('./pages/super_admin/SuperAdminUsersPage'));
const SuperAdminAddStudentPage = lazyWithRetry(() => import('./pages/super_admin/SuperAdminAddStudentPage'));
const SuperAdminAddWardenPage = lazyWithRetry(() => import('./pages/super_admin/SuperAdminAddWardenPage'));
const SuperAdminAddAdminPage = lazyWithRetry(() => import('./pages/super_admin/SuperAdminAddAdminPage'));
const SuperAdminAuditPage = lazyWithRetry(() => import('./pages/super_admin/SuperAdminAuditPage'));

// Student Pages
const StudentDashboard = lazyWithRetry(() => import('./pages/student/StudentDashboard'));
const StudentRequestsPage = lazyWithRetry(() => import('./pages/student/StudentRequestsPage'));
const StudentProposalsPage = lazyWithRetry(() => import('./pages/student/StudentProposalsPage'));
const StudentHistoryPage = lazyWithRetry(() => import('./pages/student/StudentHistoryPage'));

// Warden Pages
const WardenDashboard = lazyWithRetry(() => import('./pages/warden/WardenDashboard'));
const WardenApprovalQueuePage = lazyWithRetry(() => import('./pages/warden/WardenApprovalQueuePage'));
const WardenOccupancyPage = lazyWithRetry(() => import('./pages/warden/WardenOccupancyPage'));
const WardenHistoryPage = lazyWithRetry(() => import('./pages/warden/WardenHistoryPage'));
const WardenRoomsPage = lazyWithRetry(() => import('./pages/warden/WardenRoomsPage'));
const WardenProposalsPage = lazyWithRetry(() => import('./pages/warden/WardenProposalsPage'));
const WardenPoliciesPage = lazyWithRetry(() => import('./pages/warden/WardenPoliciesPage'));
const WardenNotificationsPage = lazyWithRetry(() => import('./pages/warden/WardenNotificationsPage'));
const WardenReportsPage = lazyWithRetry(() => import('./pages/warden/WardenReportsPage'));
const WardenStudentsPage = lazyWithRetry(() => import('./pages/warden/WardenStudentsPage'));
const WardenProfilePage = lazyWithRetry(() => import('./pages/warden/WardenProfilePage'));

// Chief Warden Pages
const ChiefWardenDashboard = lazyWithRetry(() => import('./pages/chief_warden/ChiefWardenDashboard'));

// Admin Pages
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const AdminRequestsPage = lazyWithRetry(() => import('./pages/admin/AdminRequestsPage'));
const AdminProposalsPage = lazyWithRetry(() => import('./pages/admin/AdminProposalsPage'));
const AdminMatchingPage = lazyWithRetry(() => import('./pages/admin/AdminMatchingPage'));
const AdminPoliciesPage = lazyWithRetry(() => import('./pages/admin/AdminPoliciesPage'));
const AdminAuditPage = lazyWithRetry(() => import('./pages/admin/AdminAuditPage'));
const AdminAuthorizedStudentsPage = lazyWithRetry(() => import('./pages/admin/AdminAuthorizedStudentsPage'));
const AdminAuthorizedWardensPage = lazyWithRetry(() => import('./pages/admin/AdminAuthorizedWardensPage'));
const AdminHostelsRoomsPage = lazyWithRetry(() => import('./pages/admin/AdminHostelsRoomsPage'));
const AdminReportsPage = lazyWithRetry(() => import('./pages/admin/AdminReportsPage'));
const AdminIntegrationsPage = lazyWithRetry(() => import('./pages/admin/AdminIntegrationsPage'));

// Dean & Shared Pages
const DeanDashboard = lazyWithRetry(() => import('./pages/dean/DeanDashboard'));
const TransfersPage = lazyWithRetry(() => import('./pages/transfers/TransfersPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 border-4 border-[#f78c30] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin has full privileged access to all features and views across the website
  if (user.role === 'SUPER_ADMIN' || user.is_super_admin) {
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to default page for their role
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    if (user.role === 'WARDEN') return <Navigate to="/warden" replace />;
    if (user.role === 'CHIEF_WARDEN') return <Navigate to="/chief-warden" replace />;
    if (user.role === 'DEAN') return <Navigate to="/dean" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/demo" element={<InteractiveDemo />} />

                  {/* Centralized OTP Authorization & Activation Public Routes */}
                  <Route path="/activate-account" element={<ActivateAccountPage />} />
                  <Route path="/activate" element={<ActivateAccountPage />} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/set-password" element={<SetPasswordPage />} />

                  {/* Student Routes */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/requests"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentRequestsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/proposals"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentProposalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/history"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/rooms"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard initialTab="rooms" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard initialTab="notifications" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/hostel-info"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard initialTab="hostel-info" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/student/profile"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentDashboard initialTab="profile" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Warden Routes */}
                  <Route
                    path="/warden"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/approvals"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenApprovalQueuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/occupancy"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenOccupancyPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/history"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/proposals"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenProposalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/rooms"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenRoomsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/policies"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenPoliciesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenNotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/reports"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/students"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenStudentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/warden/profile"
                    element={
                      <ProtectedRoute allowedRoles={['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Chief Warden Routes */}
                  <Route
                    path="/chief-warden"
                    element={
                      <ProtectedRoute allowedRoles={['CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <ChiefWardenDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chief-warden/queue"
                    element={
                      <ProtectedRoute allowedRoles={['CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenApprovalQueuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chief-warden/occupancy"
                    element={
                      <ProtectedRoute allowedRoles={['CHIEF_WARDEN', 'HOSTEL_ADMIN']}>
                        <WardenOccupancyPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Hostel Administrator Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/requests"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminRequestsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/proposals"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminProposalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/matching"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminMatchingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/policies"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminPoliciesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminAuditPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/authorized-students"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminAuthorizedStudentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/authorized-wardens"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminAuthorizedWardensPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/hostels"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminHostelsRoomsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/rooms"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminHostelsRoomsPage initialTab="rooms" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN', 'CHIEF_WARDEN']}>
                        <WardenNotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/occupancy"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminHostelsRoomsPage initialTab="hostels" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/approvals"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminRequestsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/integrations"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminIntegrationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/integrations/p03"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminIntegrationsPage initialTab="p03" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/integrations/email"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminIntegrationsPage initialTab="email" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/integrations/sync"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN']}>
                        <AdminIntegrationsPage initialTab="sync" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Dean of Student Welfare Routes */}
                  <Route
                    path="/dean"
                    element={
                      <ProtectedRoute allowedRoles={['DEAN', 'HOSTEL_ADMIN']}>
                        <DeanDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dean/hostels"
                    element={
                      <ProtectedRoute allowedRoles={['DEAN', 'HOSTEL_ADMIN']}>
                        <WardenOccupancyPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dean/reports"
                    element={
                      <ProtectedRoute allowedRoles={['DEAN', 'HOSTEL_ADMIN']}>
                        <TransfersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Shared Transfers Ledger */}
                  <Route
                    path="/transfers"
                    element={
                      <ProtectedRoute allowedRoles={['HOSTEL_ADMIN', 'CHIEF_WARDEN', 'WARDEN', 'DEAN']}>
                        <TransfersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Super Admin Routes */}
                  <Route
                    path="/super-admin"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminUsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/users/add-student"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminAddStudentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/users/add-warden"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminAddWardenPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/users/add-admin"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminAddAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/super-admin/audit-logs"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <SuperAdminAuditPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
