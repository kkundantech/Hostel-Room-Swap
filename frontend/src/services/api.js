/**
 * Module: frontend/src/services/api.js
 *
 * Work / Purpose:
 *   Configured Axios HTTP client with JWT request/refresh interceptors and typed endpoint helpers for all backend API v1 resources.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/components/auth/ForgotPasswordModal.jsx
 *   - frontend/src/components/auth/StudentRegisterModal.jsx
 *   - frontend/src/components/auth/WardenRegisterModal.jsx
 *   - frontend/src/components/common/NotificationsPopover.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/pages/InteractiveDemo.jsx
 *   - frontend/src/pages/LandingPage.jsx
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
 *   - frontend/src/pages/analytics/AnalyticsPage.jsx
 *   - frontend/src/pages/auth/ActivateAccountPage.jsx
 *   - frontend/src/pages/auth/SetPasswordPage.jsx
 *   - frontend/src/pages/auth/VerifyOtpPage.jsx
 *   - frontend/src/pages/chief_warden/ChiefWardenDashboard.jsx
 *   - frontend/src/pages/dean/DeanDashboard.jsx
 *   - frontend/src/pages/hostels/BedMatrixPage.jsx
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
 *   - axios (npm package)
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic refresh & error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth-logout'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (identifier, password) => {
    const res = await apiClient.post('/auth/login/', {
      registration_number: identifier,
      email: identifier,
      password,
    });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me/');
    return res.data;
  },

  // Hostels & Allocations
  getHostels: async () => (await apiClient.get('/hostels/')).data,
  getHostelDetails: async (id) => (await apiClient.get(`/hostels/${id}/`)).data,
  getRooms: async (params) => (await apiClient.get('/rooms/', { params })).data,
  getMyAllocation: async () => (await apiClient.get('/allocations/me/')).data,
  getAllocations: async (params) => (await apiClient.get('/allocations/', { params })).data,

  // Exchange Requests
  getExchangeRequests: async (params) => (await apiClient.get('/exchange-requests/', { params })).data,
  createExchangeRequest: async (data) => (await apiClient.post('/exchange-requests/', data)).data,
  withdrawExchangeRequest: async (id) => (await apiClient.post(`/exchange-requests/${id}/withdraw/`)).data,
  validateEligibility: async () => (await apiClient.get('/exchange-requests/validate_eligibility/')).data,

  // Proposals & Multi-Party Cycles
  getProposals: async (params) => (await apiClient.get('/proposals/', { params })).data,
  getProposalDetail: async (id) => (await apiClient.get(`/proposals/${id}/`)).data,
  getPendingProposalCount: async () => (await apiClient.get('/proposals/pending-count/')).data,
  respondToProposal: async (id, accepted, note = '') => 
    (await apiClient.post(`/proposals/${id}/respond/`, { accepted, note })).data,

  // Matching Engine
  triggerMatching: async (maxLength = 5) => 
    (await apiClient.post('/matching/run/', { max_length: maxLength })).data,
  getMatchingPreview: async () => (await apiClient.get('/matching/preview/')).data,

  // Approvals (Warden / Chief Warden / Admin)
  getApprovalQueue: async () => (await apiClient.get('/approvals/queue/')).data,
  getApprovalRecords: async (params) => (await apiClient.get('/approval-records/', { params })).data,
  approveProposal: async (proposalId, remarks = '') => 
    (await apiClient.post(`/approvals/${proposalId}/approve/`, { remarks })).data,
  rejectProposal: async (proposalId, reason = '') => 
    (await apiClient.post(`/approvals/${proposalId}/reject/`, { reason })).data,

  // Policies
  getPolicies: async () => (await apiClient.get('/policies/')).data,
  updatePolicy: async (id, data) => (await apiClient.patch(`/policies/${id}/`, data)).data,

  // Notifications
  getNotifications: async () => (await apiClient.get('/notifications/')).data,
  getUnreadNotificationCount: async () => (await apiClient.get('/notifications/unread-count/')).data,
  markNotificationRead: async (id) => (await apiClient.post(`/notifications/${id}/read/`)).data,
  markAllNotificationsRead: async () => (await apiClient.post('/notifications/read-all/')).data,

  // Transfers & Audit
  getTransfers: async (params) => (await apiClient.get('/transfers/', { params })).data,
  downloadTransferLetter: (id) => `${API_BASE}/transfers/${id}/letter/`,
  getExportTransfersCSVUrl: () => `${API_BASE}/transfers/export-csv/`,
  getAuditLogs: async (params) => (await apiClient.get('/audit-logs/', { params })).data,

  // Analytics
  getAnalytics: async () => (await apiClient.get('/admin/analytics/')).data,
  getAnalyticsTrend: async () => (await apiClient.get('/admin/analytics/trend/')).data,

  // Student Registration (OTP + Password)
  studentSignupRequestOtp: async (data) =>
    (await apiClient.post('/auth/student/signup/request-otp/', data)).data,
  studentSignupVerifyOtp: async (data) =>
    (await apiClient.post('/auth/student/signup/verify-otp/', data)).data,
  studentSignupComplete: async (data) =>
    (await apiClient.post('/auth/student/signup/complete/', data)).data,

  // Warden Registration (Dedicated Flow + Scope)
  wardenSignupRequestOtp: async (data) =>
    (await apiClient.post('/auth/warden/signup/request-otp/', data)).data,
  wardenSignupVerifyOtp: async (data) =>
    (await apiClient.post('/auth/warden/signup/verify-otp/', data)).data,
  wardenSignupComplete: async (data) =>
    (await apiClient.post('/auth/warden/signup/complete/', data)).data,

  // Password Reset via OTP
  passwordResetRequestOtp: async (identifier) =>
    (await apiClient.post('/auth/password/request-reset/', { identifier })).data,
  passwordResetVerifyOtp: async (identifier, otp) =>
    (await apiClient.post('/auth/password/verify-reset-otp/', { identifier, otp })).data,
  passwordResetComplete: async (data) =>
    (await apiClient.post('/auth/password/reset/', data)).data,

  // Authorized Rosters (Admin)
  getAuthorizedStudents: async (params) =>
    (await apiClient.get('/admin/authorized-students/', { params })).data,
  createAuthorizedStudent: async (data) =>
    (await apiClient.post('/admin/authorized-students/', data)).data,
  updateAuthorizedStudent: async (id, data) =>
    (await apiClient.patch(`/admin/authorized-students/${id}/`, data)).data,
  deleteAuthorizedStudent: async (id) =>
    (await apiClient.delete(`/admin/authorized-students/${id}/`)).data,
  importAuthorizedStudents: async (payload) =>
    (await apiClient.post('/admin/authorized-students/import/', payload)).data,

  getAuthorizedWardens: async (params) =>
    (await apiClient.get('/admin/authorized-wardens/', { params })).data,
  createAuthorizedWarden: async (data) =>
    (await apiClient.post('/admin/authorized-wardens/', data)).data,
  updateAuthorizedWarden: async (id, data) =>
    (await apiClient.patch(`/admin/authorized-wardens/${id}/`, data)).data,
  deleteAuthorizedWarden: async (id) =>
    (await apiClient.delete(`/admin/authorized-wardens/${id}/`)).data,
  importAuthorizedWardens: async (payload) =>
    (await apiClient.post('/admin/authorized-wardens/import/', payload)).data,

  // Exchange Requests Pool (Gender Isolated)
  browseAvailableRequests: async () =>
    (await apiClient.get('/exchange-requests/browse/')).data,

  // Hostels & Rooms CRUD (Admin)
  createHostel: async (data) => (await apiClient.post('/hostels/', data)).data,
  updateHostel: async (id, data) => (await apiClient.patch(`/hostels/${id}/`, data)).data,
  deleteHostel: async (id) => (await apiClient.delete(`/hostels/${id}/`)).data,
  createRoom: async (data) => (await apiClient.post('/rooms/', data)).data,
  updateRoom: async (id, data) => (await apiClient.patch(`/rooms/${id}/`, data)).data,
  deleteRoom: async (id) => (await apiClient.delete(`/rooms/${id}/`)).data,
  resetRoomInventory: async () => (await apiClient.post('/rooms/reset_inventory/')).data,

  // Integrations & P03
  syncP03: async (data = {}) => (await apiClient.post('/admin/integrations/p03/sync/', data)).data,
  getIntegrationsStatus: async () => (await apiClient.get('/admin/integrations/status/')).data,
  testEmailDispatch: async (data = {}) => (await apiClient.post('/admin/integrations/email/test/', data)).data,
  triggerDataSync: async (data = {}) => (await apiClient.post('/admin/integrations/sync/trigger/', data)).data,
  getIntegrationsLogs: async () => (await apiClient.get('/admin/integrations/logs/')).data,

  // Policies (Admin)
  createPolicy: async (data) => (await apiClient.post('/policies/', data)).data,
  getPolicyHistory: async (id) => (await apiClient.get(`/policies/${id}/history/`)).data,
  simulatePolicy: async (data) => (await apiClient.post('/policies/simulate/', data)).data,

  // Exchange Request Admin Actions
  assignExchangeRequest: async (id, data) => 
    (await apiClient.post(`/exchange-requests/${id}/assign/`, data)).data,
  addRequestReviewNote: async (id, note) => 
    (await apiClient.post(`/exchange-requests/${id}/review-note/`, { note })).data,

  // Reports
  generateAdminReport: async (data) => (await apiClient.post('/admin/reports/', data)).data,
  getReportExportCSVUrl: (category = 'EXCHANGE_REQUESTS', dateRange = '30D') => 
    `${API_BASE}/admin/reports/export-csv/?category=${category}&date_range=${dateRange}`,

  // Centralized OTP Activation Workflow (All Roles)
  requestActivationOtp: async (data) =>
    (await apiClient.post('/activation/request-otp/', data)).data,
  verifyActivationOtp: async (data) =>
    (await apiClient.post('/activation/verify-otp/', data)).data,
  setActivationPassword: async (data) =>
    (await apiClient.post('/activation/set-password/', data)).data,

  // Super Admin Authorized Identities & Role Management
  getAuthorizedIdentities: async (params) =>
    (await apiClient.get('/super-admin/authorized-identities/', { params })).data,
  getAuthorizedIdentity: async (id) =>
    (await apiClient.get(`/super-admin/authorized-identities/${id}/`)).data,
  updateAuthorizedIdentity: async (id, data) =>
    (await apiClient.patch(`/super-admin/authorized-identities/${id}/`, data)).data,
  deleteAuthorizedIdentity: async (id) =>
    (await apiClient.delete(`/super-admin/authorized-identities/${id}/`)).data,
  addStudentIdentity: async (data) =>
    (await apiClient.post('/super-admin/authorized-identities/students/', data)).data,
  addWardenIdentity: async (data) =>
    (await apiClient.post('/super-admin/authorized-identities/wardens/', data)).data,
  addAdminIdentity: async (data) =>
    (await apiClient.post('/super-admin/authorized-identities/admins/', data)).data,
  resendActivationInvitation: async (id) =>
    (await apiClient.post(`/super-admin/authorized-identities/${id}/resend-invitation/`)).data,
  importAuthorizedIdentitiesCSV: async (formData) =>
    (await apiClient.post('/super-admin/authorized-identities/import-csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data,
  suspendAccount: async (id) =>
    (await apiClient.post(`/super-admin/accounts/${id}/suspend/`)).data,
  reactivateAccount: async (id) =>
    (await apiClient.post(`/super-admin/accounts/${id}/reactivate/`)).data,
  revokeAccount: async (id) =>
    (await apiClient.post(`/super-admin/accounts/${id}/revoke/`)).data,
  getSuperAdminAuditLogs: async (params) =>
    (await apiClient.get('/super-admin/audit-logs/', { params })).data,
  getSuperAdminMetrics: async () =>
    (await apiClient.get('/super-admin/metrics/')).data,
};

export default apiClient;
