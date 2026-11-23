/**
 * Module: frontend/src/pages/super_admin/SuperAdminAddWardenPage.jsx
 *
 * Work / Purpose:
 *   Super Admin form page for pre-authorizing new warden/chief-warden identities and hostel scopes.
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
  Building,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Check,
} from 'lucide-react';

export const SuperAdminAddWardenPage = () => {
  const navigate = useNavigate();

  const [hostels, setHostels] = useState([]);
  const [formData, setFormData] = useState({
    warden_id: '',
    full_name: '',
    email: '',
    role: 'WARDEN',
    assigned_hostel_ids: [],
    permissions: ['APPROVE_ROOM_EXCHANGES', 'MANAGE_ROOM_MAINTENANCE', 'VIEW_OCCUPANCY_GRID'],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const data = await api.getHostels();
      if (Array.isArray(data)) {
        setHostels(data);
      } else if (data?.results) {
        setHostels(data.results);
      }
    } catch (err) {
      console.error('Failed to load hostels:', err);
    }
  };

  const availablePermissions = [
    { key: 'APPROVE_ROOM_EXCHANGES', label: 'Review & Approve Room Exchange Proposals' },
    { key: 'MANAGE_ROOM_MAINTENANCE', label: 'Toggle Room Maintenance Holds' },
    { key: 'VIEW_OCCUPANCY_GRID', label: 'Access Interactive Floorplan & Bed Grid' },
    { key: 'VIEW_STUDENT_PROFILES', label: 'Inspect Student Verification & Allocation Details' },
    { key: 'GENERATE_WARDEN_REPORTS', label: 'Export Warden Occupancy & Movement Reports' },
  ];

  const toggleHostel = (h) => {
    const code = h.code || String(h.id);
    const strId = String(h.id);
    setFormData((prev) => {
      const exists = prev.assigned_hostel_ids.includes(code) || prev.assigned_hostel_ids.includes(strId);
      return {
        ...prev,
        assigned_hostel_ids: exists
          ? prev.assigned_hostel_ids.filter((id) => id !== code && id !== strId)
          : [...prev.assigned_hostel_ids, code],
      };
    });
  };

  const togglePermission = (permKey) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permKey)
          : [...prev.permissions, permKey],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.assigned_hostel_ids.length === 0 && formData.role === 'WARDEN') {
      setError('Please assign at least one hostel to the Warden.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.addWardenIdentity(formData);
      setSuccess(`Warden ${res.institution_id} (${res.name}) authorized successfully. Status: INVITED.`);
      setFormData({
        warden_id: '',
        full_name: '',
        email: '',
        role: 'WARDEN',
        assigned_hostel_ids: [],
        permissions: ['APPROVE_ROOM_EXCHANGES', 'MANAGE_ROOM_MAINTENANCE', 'VIEW_OCCUPANCY_GRID'],
      });
    } catch (err) {
      const msg =
        err.response?.data?.warden_id?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Failed to authorize warden identity.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Authorize Warden Identity"
      pageDescription="Provision official institutional Wardens with assigned hostel scopes and governance privileges."
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
              Authorize Warden Identity
            </h1>
            <p className="text-xs text-slate-500">
              Provision official institutional Wardens with assigned hostel scopes and governance privileges.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
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
            {/* Warden ID */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Official Warden / Staff ID *
              </label>
              <input
                type="text"
                required
                value={formData.warden_id}
                onChange={(e) => setFormData({ ...formData, warden_id: e.target.value.toUpperCase() })}
                placeholder="e.g. W101 or CW1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Institutional staff identifier.</span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Full Official Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Dr. Harpreet Singh"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                placeholder="warden.bh1@hostel.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Verification OTP will be dispatched to this official email address.
              </span>
            </div>

            {/* Role */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Role Classification</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    formData.role === 'WARDEN'
                      ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs">Hostel Warden</div>
                    <div className="text-[10px] text-slate-500 font-normal">Manages assigned hostel scope</div>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="WARDEN"
                    checked={formData.role === 'WARDEN'}
                    onChange={() => setFormData({ ...formData, role: 'WARDEN' })}
                    className="hidden"
                  />
                </label>

                <label
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    formData.role === 'CHIEF_WARDEN'
                      ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs">Chief Warden</div>
                    <div className="text-[10px] text-slate-500 font-normal">Cross-hostel approval authority</div>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    value="CHIEF_WARDEN"
                    checked={formData.role === 'CHIEF_WARDEN'}
                    onChange={() => setFormData({ ...formData, role: 'CHIEF_WARDEN' })}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Assigned Hostels Multi-Select */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Assigned Hostel Scope *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {hostels.map((h) => {
                const isSelected = formData.assigned_hostel_ids.includes(String(h.id)) || formData.assigned_hostel_ids.includes(h.code);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHostel(h)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 text-amber-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{h.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Code: {h.code} &bull; {h.hostel_category}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                        isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Approved Permissions Checklist */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Approved Permissions
            </label>
            <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 bg-slate-50">
              {availablePermissions.map((perm) => {
                const isChecked = formData.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white cursor-pointer transition select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                        isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
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
              id="authorize-warden-btn"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Building className="w-4 h-4" />
                  <span>Authorize Warden</span>
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

export default SuperAdminAddWardenPage;
