/**
 * Module: frontend/src/components/layout/navConfig.jsx
 *
 * Work / Purpose:
 *   Modular role-based navigation and badge configuration helper supplying menu items for Student, Warden, Admin, and Executive layouts.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/components/layout/AdminLayout.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/components/layout/ExecutiveLayout.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
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
  FileText,
  PlayCircle,
  Crown,
  Users,
  UserCheck,
  UserPlus,
  Bell,
  Bed,
  RotateCw,
  Home,
  User,
  Link2,
  Database,
  Mail,
  KeyRound,
  Shield,
} from 'lucide-react';

export const getRoleNavItems = ({
  isStudent,
  isWarden,
  isChiefWarden,
  isSuperAdmin,
  isAdmin,
  isDean,
  unreadNotificationsCount,
  pendingProposalsCount,
  pendingApprovalsCount,
}) => {
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

export const getAdminNavSections = ({
  isSuperAdmin,
  adminPendingRequestsCount,
  pendingProposalsCount,
  pendingApprovalsCount,
}) => [
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

export const getRoleBadge = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <span className="badge bg-orange-100 text-orange-900 border border-orange-300 font-bold">Super Administrator</span>;
    case 'STUDENT':
      return <span className="badge bg-orange-50 text-[#e27518] border border-orange-200 font-semibold">Student</span>;
    case 'WARDEN':
      return <span className="badge bg-amber-50 text-amber-800 border border-amber-200 font-semibold">Hostel Warden</span>;
    case 'CHIEF_WARDEN':
      return <span className="badge bg-orange-50 text-[#c15510] border border-orange-200 font-semibold">Chief Warden</span>;
    case 'HOSTEL_ADMIN':
      return <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">Hostel Administrator</span>;
    case 'DEAN':
      return <span className="badge bg-slate-100 text-slate-800 border border-slate-300 font-semibold">Dean of Student Welfare</span>;
    default:
      return <span className="badge badge-neutral">{role}</span>;
  }
};
