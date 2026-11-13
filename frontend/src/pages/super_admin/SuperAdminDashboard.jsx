/**
 * Module: frontend/src/pages/super_admin/SuperAdminDashboard.jsx
 *
 * Work / Purpose:
 *   Super Admin executive dashboard displaying system health metrics, identity authorization counts, and recent audit activity.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Mail,
  UserPlus,
  Building,
  KeyRound,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    total_authorized: 0,
    by_role: { students: 0, wardens: 0, admins: 0 },
    by_status: { active: 0, pending_activation: 0, invited: 0, suspended: 0, revoked: 0 },
    activation_rate: 0,
  });
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, auditsData] = await Promise.all([
        api.getSuperAdminMetrics(),
        api.getSuperAdminAuditLogs({ limit: 6 }),
      ]);
      if (metricsData) setMetrics(metricsData);
      if (Array.isArray(auditsData)) setRecentAudits(auditsData.slice(0, 6));
    } catch (err) {
      console.error('Failed to load Super Admin dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Super Admin Console"
      pageDescription="Centralized security governance, pre-authorized institutional identities, and audit records."
      actionButton={
        <div className="flex items-center gap-2">
          <Link
            to="/super-admin/users/add-student"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#18110b] hover:bg-[#251552] text-white shadow-xs transition flex items-center gap-1.5 active:scale-98"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#f9a154]" />
            <span>+ Authorize Student</span>
          </Link>
          <Link
            to="/super-admin/users/add-warden"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition flex items-center gap-1.5 active:scale-98"
          >
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Authorize Warden</span>
          </Link>
          <Link
            to="/super-admin/users/add-admin"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition flex items-center gap-1.5 active:scale-98"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#f78c30]" />
            <span>+ Authorize Admin</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Authorized */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Authorized</span>
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics.total_authorized}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
              <span className="font-semibold text-slate-700">{metrics.by_role.students} Students</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700">{metrics.by_role.wardens} Wardens</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700">{metrics.by_role.admins} Admins</span>
            </div>
          </div>

          {/* Card 2: Active Accounts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active &amp; Verified</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              {metrics.by_status.active}
            </div>
            <div className="text-[11px] text-emerald-700 mt-2 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics.activation_rate}% verified activation rate</span>
            </div>
          </div>

          {/* Card 3: Pending Activation / Invited */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Activation</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              {metrics.by_status.pending_activation + metrics.by_status.invited}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              {metrics.by_status.pending_activation} in OTP verification &bull; {metrics.by_status.invited} invited
            </div>
          </div>

          {/* Card 4: Suspended & Revoked */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Restricted Accounts</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-600 tracking-tight">
              {metrics.by_status.suspended + metrics.by_status.revoked}
            </div>
            <div className="text-[11px] text-rose-600 mt-2 font-medium">
              {metrics.by_status.suspended} suspended &bull; {metrics.by_status.revoked} revoked access
            </div>
          </div>
        </div>

        {/* Quick Action Workflow Banners */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Identity Provisioning &amp; Role Governance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an institutional group to authorize new identities or review access status.
              </p>
            </div>
            <Link
              to="/super-admin/users"
              className="text-xs font-bold text-[#f78c30] hover:text-[#4323c9] flex items-center gap-1 self-start md:self-auto"
            >
              <span>View All Authorized Accounts</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Student Module Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-orange-300 hover:shadow-xs transition space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-[#f78c30] flex items-center justify-center font-black text-xs">
                    ST
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                    {metrics.by_role.students} Authorized
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Student Authorization</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Authorize student registration numbers and institutional emails. Supports single entry or bulk CSV roster import.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/super-admin/users/add-student"
                  className="w-full py-2.5 px-3 text-center rounded-xl bg-[#18110b] hover:bg-[#251552] text-white text-xs font-bold transition block shadow-xs"
                >
                  Authorize Students
                </Link>
              </div>
            </div>

            {/* Warden Module Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                    WD
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                    {metrics.by_role.wardens} Authorized
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Warden Authorization</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Provision official Warden and Chief Warden accounts with assigned hostel scopes and exchange approval permissions.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/super-admin/users/add-warden"
                  className="w-full py-2.5 px-3 text-center rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition block shadow-2xs"
                >
                  Authorize Wardens
                </Link>
              </div>
            </div>

            {/* Admin Module Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                    AD
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                    {metrics.by_role.admins} Authorized
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Admin Authorization</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Grant administrative privileges with least-privilege scoping. Only Super Admin can authorize institutional Admins.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/super-admin/users/add-admin"
                  className="w-full py-2.5 px-3 text-center rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition block shadow-2xs"
                >
                  Authorize Admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Security Audit Trail Snippet */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Recent Security &amp; Authorization Audit Records
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Append-only tamper-proof log of privileged identity creations, session suspensions, and activations.
              </p>
            </div>
            <Link
              to="/super-admin/audit-logs"
              className="text-xs font-bold text-[#f78c30] hover:text-[#4323c9] flex items-center gap-1"
            >
              <span>View Full Audit Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentAudits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAudits.map((entry) => (
                <div key={entry.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {entry.action}
                    </span>
                    <span className="text-slate-800 font-medium">{entry.description}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminDashboard;
