/**
 * Module: frontend/src/pages/super_admin/SuperAdminAddAdminPage.jsx
 *
 * Work / Purpose:
 *   Super Admin form page for provisioning administrative and dean accounts.
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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
  Lock,
} from 'lucide-react';

export const SuperAdminAddAdminPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    staff_id: '',
    full_name: '',
    email: '',
    role: 'HOSTEL_ADMIN',
    permissions: [
      'MANAGE_STUDENT_RECORDS',
      'MANAGE_WARDEN_RECORDS',
      'MANAGE_HOSTELS_ROOMS',
      'REVIEW_EXCHANGE_REQUESTS',
      'VIEW_AUDIT_LOGS',
    ],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const adminPermissions = [
    { key: 'MANAGE_STUDENT_RECORDS', label: 'View & Manage Student Authorized Records' },
    { key: 'MANAGE_WARDEN_RECORDS', label: 'View & Manage Warden Authorized Records' },
    { key: 'MANAGE_HOSTELS_ROOMS', label: 'Configure Hostels, Blocks, and Room Inventories' },
    { key: 'REVIEW_EXCHANGE_REQUESTS', label: 'Review & Supervise Exchange Requests' },
    { key: 'RUN_MATCHING_ENGINE', label: 'Execute Cycle Matching Engine Runs' },
    { key: 'VIEW_AUDIT_LOGS', label: 'Inspect Administrative Audit Logs' },
  ];

  const togglePermission = (key) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.addAdminIdentity(formData);
      setSuccess(`Administrator ${res.institution_id} (${res.name}) authorized successfully.`);
      setFormData({
        staff_id: '',
        full_name: '',
        email: '',
        role: 'HOSTEL_ADMIN',
        permissions: [
          'MANAGE_STUDENT_RECORDS',
          'MANAGE_WARDEN_RECORDS',
          'MANAGE_HOSTELS_ROOMS',
          'REVIEW_EXCHANGE_REQUESTS',
          'VIEW_AUDIT_LOGS',
        ],
      });
    } catch (err) {
      const msg =
        err.response?.data?.staff_id?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Failed to authorize administrator identity.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Authorize Administrator Identity"
      pageDescription="Only Super Administrators can authorize new Admins. Institutional privileges and role scopes are enforced."
    >
      <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/super-admin/users"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#f78c30] shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Authorize Administrator Identity
            </h1>
            <p className="text-xs text-slate-500">
              Only Super Administrators can authorize new Admins. Least-privilege permissions are enforced.
            </p>
          </div>
        </div>
      </div>

      {/* Security Governance Notice */}
      <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-0.5">
          <div className="font-bold">Privilege Separation Enforcement</div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Normal Admins can never authorize or elevate other Admins or Super Admins.
            The authorized admin must verify their identity via a 6-digit OTP delivered to their official email before creating their own password.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Staff ID */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Authorized Staff / Admin ID *
              </label>
              <input
                type="text"
                required
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value.toUpperCase() })}
                placeholder="e.g. ADM101 or SA002"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Unique administrative identifier.</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Rajat Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Official Email */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">
                Official Institutional Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="admin.kumar@hostel.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Verification OTP will be dispatched to this official institutional email address.
              </span>
            </div>

            {/* Administrative Level */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Administrative Level</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    formData.role === 'HOSTEL_ADMIN'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs">Hostel Administrator</div>
                    <div className="text-[10px] text-slate-500 font-normal">Standard administrative scope</div>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="HOSTEL_ADMIN"
                    checked={formData.role === 'HOSTEL_ADMIN'}
                    onChange={() => setFormData({ ...formData, role: 'HOSTEL_ADMIN' })}
                    className="hidden"
                  />
                </label>

                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    formData.role === 'SUPER_ADMIN'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs">Super Administrator</div>
                    <div className="text-[10px] text-slate-500 font-normal">Highest privilege authorization</div>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="SUPER_ADMIN"
                    checked={formData.role === 'SUPER_ADMIN'}
                    onChange={() => setFormData({ ...formData, role: 'SUPER_ADMIN' })}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Granular Permissions */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Explicit Least-Privilege Permissions
            </label>
            <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 bg-slate-50">
              {adminPermissions.map((perm) => {
                const isChecked = formData.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white cursor-pointer transition select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="text-xs font-medium text-slate-800">{perm.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              to="/super-admin/users"
              className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              id="authorize-admin-btn"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Administrator</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminAddAdminPage;
