/**
 * Module: frontend/src/pages/admin/AdminAuthorizedWardensPage.jsx
 *
 * Work / Purpose:
 *   Hostel Admin authorized warden roster page for provisioning wardens and block assignments.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ShieldCheck,
  Search,
  Filter,
  UserPlus,
  Upload,
  CheckCircle2,
  Clock,
  Ban,
  Building,
  Crown,
  X,
  AlertCircle,
  Trash2,
  Edit2,
  RefreshCw,
} from 'lucide-react';

export const AdminAuthorizedWardensPage = () => {
  const [wardens, setWardens] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regFilter, setRegFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [selectedWarden, setSelectedWarden] = useState(null);

  // Add Form
  const [formData, setFormData] = useState({
    warden_id: '',
    email: '',
    full_name: '',
    role: 'WARDEN',
    phone: '',
    assigned_hostels: [],
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV Import
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const [wardensRes, hostelsRes] = await Promise.allSettled([
        api.getAuthorizedWardens(),
        api.getHostels(),
      ]);

      if (wardensRes.status === 'fulfilled') {
        setWardens(wardensRes.value.results || wardensRes.value || []);
      }
      if (hostelsRes.status === 'fulfilled') {
        setHostels(hostelsRes.value.results || hostelsRes.value || []);
      }
    } catch (err) {
      console.error('Failed to load wardens or hostels:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  useRealtimeSync(() => {
    fetchData(true);
  }, { pollIntervalMs: 5000 });

  const handleCreateWarden = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.warden_id.trim()) {
      setFormError('Warden/Employee ID is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Official institutional email is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createAuthorizedWarden({
        ...formData,
        warden_id: formData.warden_id.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
      });
      setShowAddModal(false);
      setFormData({
        warden_id: '',
        email: '',
        full_name: '',
        role: 'WARDEN',
        phone: '',
        assigned_hostels: [],
      });
      fetchData();
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.warden_id?.[0] ||
        err.response?.data?.email?.[0] ||
        'Failed to pre-authorize warden.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (wardenId, newStatus) => {
    try {
      await api.updateAuthorizedWarden(wardenId, { authorization_status: newStatus });
      fetchData();
    } catch (err) {
      alert('Failed to update warden authorization status.');
    }
  };

  const handleUpdateScope = async (e) => {
    e.preventDefault();
    if (!selectedWarden) return;

    try {
      setSubmitting(true);
      await api.updateAuthorizedWarden(selectedWarden.id, {
        assigned_hostels: selectedWarden.assigned_hostels,
        role: selectedWarden.role,
      });
      setShowScopeModal(false);
      setSelectedWarden(null);
      fetchData();
    } catch (err) {
      alert('Failed to update hostel scope.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (wardenId, wId) => {
    if (!window.confirm(`Are you sure you want to remove pre-authorization for Warden ${wId}?`)) return;
    try {
      await api.deleteAuthorizedWarden(wardenId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove authorization.');
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    setImportResult(null);
    if (!csvText.trim()) {
      alert('Please enter or paste CSV content.');
      return;
    }

    try {
      setImporting(true);
      const res = await api.importAuthorizedWardens({ csv_text: csvText });
      setImportResult(res);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to import CSV roster.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file);
  };

  // Filter list
  const filteredWardens = wardens.filter((w) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (w.warden_id || '').toLowerCase().includes(q) ||
      (w.email || '').toLowerCase().includes(q) ||
      (w.full_name || '').toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || w.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || w.authorization_status === statusFilter;
    const matchesReg =
      regFilter === 'ALL' ||
      (regFilter === 'REGISTERED' && w.is_registered) ||
      (regFilter === 'PENDING' && !w.is_registered);

    return matchesSearch && matchesRole && matchesStatus && matchesReg;
  });

  const totalCount = wardens.length;
  const registeredCount = wardens.filter((w) => w.is_registered).length;
  const chiefCount = wardens.filter((w) => w.role === 'CHIEF_WARDEN').length;
  const activeCount = wardens.filter((w) => w.authorization_status === 'ACTIVE').length;

  return (
    <AppLayout
      pageTitle="Authorized Wardens Roster"
      pageDescription="Official pre-authorized warden directory governing assigned hostel scopes, approval permissions, and dedicated OTP registration."
      actionButton={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Authorize Warden</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Wardens</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Authorized hostel officers</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Registered Accounts</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{registeredCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Verified with official OTP & password</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Chief Wardens</span>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Crown className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-700">{chiefCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Universal cross-hostel scope</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Active Authorizations</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Building className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Currently permitted to log in & approve</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Warden ID, official email, or full name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="ALL">All Roles</option>
                <option value="WARDEN">Hostel Warden</option>
                <option value="CHIEF_WARDEN">Chief Warden</option>
              </select>
            </div>

            <select
              value={regFilter}
              onChange={(e) => setRegFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Account States</option>
              <option value="REGISTERED">Registered</option>
              <option value="PENDING">Pending Signup</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#f78c30]/25 transition shrink-0 ml-auto active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Warden</span>
            </button>
          </div>
        </div>

        {/* Wardens Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading authorized wardens...</div>
          ) : filteredWardens.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Authorized Wardens"
              description="No warden records matched your search or filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Warden ID</th>
                    <th>Official Name & Email</th>
                    <th>Role</th>
                    <th>Assigned Hostel Scope</th>
                    <th>Registration</th>
                    <th>Authorization</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWardens.map((w) => (
                    <tr key={w.id}>
                      <td className="font-mono font-bold text-slate-900">{w.warden_id}</td>
                      <td>
                        <div className="font-semibold text-slate-900">{w.full_name || '—'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{w.email}</div>
                      </td>
                      <td>
                        {w.role === 'CHIEF_WARDEN' ? (
                          <span className="badge bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-max">
                            <Crown className="w-3 h-3" />
                            Chief Warden
                          </span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                            Hostel Warden
                          </span>
                        )}
                      </td>
                      <td>
                        {w.role === 'CHIEF_WARDEN' ? (
                          <span className="text-xs font-semibold text-purple-700">
                            Universal (All Campus Hostels)
                          </span>
                        ) : w.assigned_hostel_details && w.assigned_hostel_details.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {w.assigned_hostel_details.map((h) => (
                              <span
                                key={h.code}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  h.category === 'BOYS'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {h.code} ({h.name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-rose-600 italic">No Hostels Assigned</span>
                        )}
                      </td>
                      <td>
                        {w.is_registered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending OTP
                          </span>
                        )}
                      </td>
                      <td>
                        {w.authorization_status === 'ACTIVE' && (
                          <span className="badge badge-success">Active</span>
                        )}
                        {w.authorization_status === 'SUSPENDED' && (
                          <span className="badge badge-warning">Suspended</span>
                        )}
                        {w.authorization_status === 'REVOKED' && (
                          <span className="badge badge-error">Revoked</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedWarden({
                                ...w,
                                assigned_hostels: w.assigned_hostels || [],
                              });
                              setShowScopeModal(true);
                            }}
                            title="Edit Hostel Scope"
                            className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {w.authorization_status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(w.id, 'SUSPENDED')}
                              title="Suspend Authorization"
                              className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(w.id, 'ACTIVE')}
                              title="Reactivate Authorization"
                              className="p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(w.id, w.warden_id)}
                            title="Remove / Delete Warden"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Warden Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100/80 text-[#f78c30] flex items-center justify-center shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Authorize New Warden</h3>
                  <p className="text-xs text-slate-500">Pre-authorize institutional warden ID and hostel scope</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWarden} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warden / Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="W106"
                    value={formData.warden_id}
                    onChange={(e) => setFormData({ ...formData, warden_id: e.target.value.toUpperCase() })}
                    className="input-field font-mono uppercase tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="warden@hostel.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. Rajesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-field font-medium cursor-pointer"
                  >
                    <option value="WARDEN">Hostel Warden</option>
                    <option value="CHIEF_WARDEN">Chief Warden</option>
                  </select>
                </div>
              </div>

              {formData.role !== 'CHIEF_WARDEN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assigned Hostel Scope (Server Enforced)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 max-h-40 overflow-y-auto">
                    {hostels.map((h) => {
                      const checked = formData.assigned_hostels.includes(h.id);
                      return (
                        <label
                          key={h.id}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            checked
                              ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assigned_hostels: [...formData.assigned_hostels, h.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assigned_hostels: formData.assigned_hostels.filter((id) => id !== h.id),
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-[#f78c30] focus:ring-[#f78c30]"
                          />
                          <span className="font-bold">{h.code}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {h.hostel_category || h.category || h.name || 'Hostel'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 mt-6 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submitting ? 'Authorizing...' : 'Authorize Warden'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bulk Import Authorized Wardens</h3>
                  <p className="text-[11px] text-slate-500">Upload CSV file or paste formatted CSV content</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importResult.detail}</span>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-[11px] text-rose-700 pt-1">
                    <strong>Warnings:</strong>
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleImportCsv} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Paste CSV Data
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`warden_id,email,full_name,role,phone,hostel_codes\nW107,warden.bh2@hostel.edu,Sunil Verma,WARDEN,+91-9876543210,BH1\nCW2,chief.warden2@hostel.edu,Dr. Meenakshi,CHIEF_WARDEN,,BH1,GH1`}
                  className="input-field font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supported columns: warden_id, email, full_name, role (WARDEN/CHIEF_WARDEN), phone, hostel_codes (comma-separated e.g. "BH1,GH1").
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {importing ? 'Importing...' : 'Run CSV Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scope Modal */}
      {showScopeModal && selectedWarden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manage Hostel Scope</h3>
                  <p className="text-[11px] text-slate-500">Warden: {selectedWarden.warden_id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScopeModal(false);
                  setSelectedWarden(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateScope} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Role
                </label>
                <select
                  value={selectedWarden.role}
                  onChange={(e) =>
                    setSelectedWarden({ ...selectedWarden, role: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="WARDEN">Hostel Warden (Assigned Scope)</option>
                  <option value="CHIEF_WARDEN">Chief Warden (Universal Campus Scope)</option>
                </select>
              </div>

              {selectedWarden.role !== 'CHIEF_WARDEN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authorized Hostels
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {hostels.map((h) => {
                      const checked = (selectedWarden.assigned_hostels || []).includes(h.id);
                      return (
                        <label key={h.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const curr = selectedWarden.assigned_hostels || [];
                              if (e.target.checked) {
                                setSelectedWarden({
                                  ...selectedWarden,
                                  assigned_hostels: [...curr, h.id],
                                });
                              } else {
                                setSelectedWarden({
                                  ...selectedWarden,
                                  assigned_hostels: curr.filter((id) => id !== h.id),
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-bold">{h.code}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {h.hostel_category || h.category || h.name || 'Hostel'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScopeModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? 'Updating...' : 'Save Scope'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminAuthorizedWardensPage;
