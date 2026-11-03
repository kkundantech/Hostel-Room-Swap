import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import InteractiveDemo from './pages/InteractiveDemo';

// OTP Activation Pages
import ActivateAccountPage from './pages/auth/ActivateAccountPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';
import SetPasswordPage from './pages/auth/SetPasswordPage';

// Super Admin Pages
import SuperAdminDashboard from './pages/super_admin/SuperAdminDashboard';
import SuperAdminUsersPage from './pages/super_admin/SuperAdminUsersPage';
import SuperAdminAddStudentPage from './pages/super_admin/SuperAdminAddStudentPage';
import SuperAdminAddWardenPage from './pages/super_admin/SuperAdminAddWardenPage';
import SuperAdminAddAdminPage from './pages/super_admin/SuperAdminAddAdminPage';
import SuperAdminAuditPage from './pages/super_admin/SuperAdminAuditPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentRequestsPage from './pages/student/StudentRequestsPage';
import StudentProposalsPage from './pages/student/StudentProposalsPage';
import StudentHistoryPage from './pages/student/StudentHistoryPage';

// Warden Pages
import WardenDashboard from './pages/warden/WardenDashboard';
import WardenApprovalQueuePage from './pages/warden/WardenApprovalQueuePage';
import WardenOccupancyPage from './pages/warden/WardenOccupancyPage';
import WardenHistoryPage from './pages/warden/WardenHistoryPage';
import WardenRoomsPage from './pages/warden/WardenRoomsPage';
import WardenProposalsPage from './pages/warden/WardenProposalsPage';
import WardenPoliciesPage from './pages/warden/WardenPoliciesPage';
import WardenNotificationsPage from './pages/warden/WardenNotificationsPage';
import WardenReportsPage from './pages/warden/WardenReportsPage';
import WardenStudentsPage from './pages/warden/WardenStudentsPage';
import WardenProfilePage from './pages/warden/WardenProfilePage';

// Chief Warden Pages
import ChiefWardenDashboard from './pages/chief_warden/ChiefWardenDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRequestsPage from './pages/admin/AdminRequestsPage';
import AdminProposalsPage from './pages/admin/AdminProposalsPage';
import AdminMatchingPage from './pages/admin/AdminMatchingPage';
import AdminPoliciesPage from './pages/admin/AdminPoliciesPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminAuthorizedStudentsPage from './pages/admin/AdminAuthorizedStudentsPage';
import AdminAuthorizedWardensPage from './pages/admin/AdminAuthorizedWardensPage';
import AdminHostelsRoomsPage from './pages/admin/AdminHostelsRoomsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminIntegrationsPage from './pages/admin/AdminIntegrationsPage';

// Dean Pages
import DeanDashboard from './pages/dean/DeanDashboard';

// Shared Pages
import TransfersPage from './pages/transfers/TransfersPage';
import ErrorBoundary from './components/common/ErrorBoundary';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/demo" element={<InteractiveDemo />} />

              {/* Centralized OTP Authorization & Activation Public Routes */}
              <Route path="/activate-account" element={<ActivateAccountPage />} />
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
          </ErrorBoundary>
        </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
