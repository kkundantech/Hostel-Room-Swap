/**
 * Module: frontend/src/pages/super_admin/SuperAdminUsersPage.jsx
 *
 * Work / Purpose:
 *   Super Admin user governance table for inspecting accounts and executing suspend, reactivate, or revoke actions.
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
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { formatDateSafe, formatDateTimeSafe } from '../../utils/dateUtils';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  RefreshCw,
  Mail,
  Shield,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  RotateCw,
  Eye,
  Edit2,
  MoreVertical,
  X,
  FileText,
  Lock,
  Trash2,
} from 'lucide-react';

export const SuperAdminUsersPage = () => {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Detail & Edit Modals
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', eligibility_classification: '', department: '' });

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState(null); // { action: 'suspend'|'reactivate'|'revoke', identity }

  const fetchIdentities = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.activation_status = statusFilter;
      if (search) params.search = search;

      const data = await api.getAuthorizedIdentities(params);
      if (Array.isArray(data)) {
        setIdentities(data);
      } else if (data && Array.isArray(data.results)) {
        setIdentities(data.results);
      }
    } catch (err) {
      console.error('Failed to load authorized identities:', err);
      if (!isSilent) showFeedback('error', 'Failed to load authorized identities.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentities(false);
  }, [roleFilter, statusFilter]);

  useRealtimeSync(() => {
    fetchIdentities(true);
  }, { pollIntervalMs: 6000 });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIdentities();
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Actions
  const handleResendInvitation = async (identity) => {
    try {
      const res = await api.resendActivationInvitation(identity.id);
      showFeedback('success', res.detail || `Invitation resent. Active Code: ${res.otp || ''}`);
      fetchIdentities();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Failed to resend invitation.');
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { action, identity } = confirmModal;
    setConfirmModal(null);

    try {
      if (action === 'suspend') {
        const res = await api.suspendAccount(identity.id);
        showFeedback('success', res.detail || 'Account suspended and active sessions terminated.');
      } else if (action === 'reactivate') {
        const res = await api.reactivateAccount(identity.id);
        showFeedback('success', res.detail || 'Account reactivated successfully.');
      } else if (action === 'revoke') {
        const res = await api.revokeAccount(identity.id);
        showFeedback('success', res.detail || 'Account access permanently revoked.');
      } else if (action === 'delete') {
        const res = await api.deleteAuthorizedIdentity(identity.id);
        showFeedback('success', res?.detail || `Identity ${identity.institution_id} deleted permanently.`);
      }
      fetchIdentities();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || `Failed to ${action} account.`);
    }
  };

  const handleOpenEdit = (identity) => {
    setSelectedIdentity(identity);
    setEditForm({
      name: identity.name || '',
      eligibility_classification: identity.eligibility_classification || 'BOYS',
      department: identity.department || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedIdentity) return;
    try {
      await api.updateAuthorizedIdentity(selectedIdentity.id, editForm);
      showFeedback('success', 'Identity metadata updated successfully.');
      setShowEditModal(false);
      fetchIdentities();
    } catch (err) {
      showFeedback('error', err.response?.data?.detail || 'Failed to update metadata.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Super Admin</span>;
      case 'HOSTEL_ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hostel Admin</span>;
      case 'WARDEN':
      case 'CHIEF_WARDEN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">{role === 'CHIEF_WARDEN' ? 'Chief Warden' : 'Warden'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Student</span>;
    }
  };

  const getActivationBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active</span>
          </span>
        );
      case 'PENDING_ACTIVATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>OTP Pending</span>
          </span>
        );
      case 'INVITED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#e27518] border border-orange-200">
            <Mail className="w-3 h-3" />
            <span>Invited</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <UserX className="w-3 h-3" />
            <span>Suspended</span>
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3" />
            <span>Revoked</span>
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 bg-slate-100">{status}</span>;
    }
  };

  return (
    <AppLayout
      pageTitle="Authorized Identities & Accounts"
      pageDescription="Pre-authorized university identities eligible for OTP activation, role scopes, and access status."
    >
      <div className="space-y-6 pb-12">
        {/* Top Breadcrumb & Title */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/super-admin/dashboard" className="hover:text-[#f78c30]">Super Admin</Link>
              <span>&bull;</span>
              <span className="text-slate-800">Authorized Identities Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              User Authorization &amp; Account Management
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Pre-authorized university identities eligible for OTP activation, role scopes, and access status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/super-admin/users/add-student"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#f78c30] hover:bg-[#4d2bd4] text-white shadow-xs transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Student</span>
            </Link>
            <Link
              to="/super-admin/users/add-warden"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Building className="w-3.5 h-3.5" />
              <span>+ Add Warden</span>
            </Link>
            <Link
              to="/super-admin/users/add-admin"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>+ Add Admin</span>
            </Link>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`max-w-7xl mx-auto p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="max-w-7xl mx-auto bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Institution ID, Name, or Email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400 font-medium"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="WARDEN">Wardens</option>
              <option value="CHIEF_WARDEN">Chief Wardens</option>
              <option value="HOSTEL_ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by activation status"
              className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_ACTIVATION">OTP Pending</option>
              <option value="INVITED">Invited</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
            </select>

            <button
              type="button"
              onClick={fetchIdentities}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Institution ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Masked Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Scope / Eligibility</th>
                  <th className="py-3 px-4">Activation Status</th>
                  <th className="py-3 px-4">Authorized Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading && identities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#f78c30] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading authorized roster...</span>
                    </td>
                  </tr>
                ) : identities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No authorized identities match your search or filter criteria.
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.masked_email || item.trusted_email}
                    </td>
                    <td className="py-3.5 px-4">
                      {getRoleBadge(item.role)}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      {item.role === 'STUDENT'
                        ? item.eligibility_classification
                        : Array.isArray(item.assigned_hostel_ids) && item.assigned_hostel_ids.length > 0
                        ? item.assigned_hostel_ids.join(', ')
                        : 'All Hostels'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getActivationBadge(item.activation_status)}
                      {item.active_otp && item.activation_status !== 'ACTIVE' && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="font-mono font-bold text-[10px] bg-orange-100 text-[#ea580c] px-1.5 py-0.5 rounded border border-orange-200">
                            OTP: {item.active_otp}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDateSafe(item.created_at, 'Recently')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Details Action */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIdentity(item);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#f78c30] hover:bg-orange-50 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#f78c30] hover:bg-slate-100 transition"
                          title="Edit Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Resend Invitation (if not active or revoked) */}
                        {item.activation_status !== 'ACTIVE' && item.authorization_status !== 'REVOKED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIdentity(item);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#f78c30] hover:bg-orange-50 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#f78c30] hover:bg-slate-100 transition"
                            title="Edit Metadata"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Resend Invitation (if not active or revoked) */}
                          {item.activation_status !== 'ACTIVE' && item.authorization_status !== 'REVOKED' && (
                            <button
                              type="button"
                              onClick={() => handleResendInvitation(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Resend Activation Invite & OTP"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Suspend or Reactivate */}
                          {item.authorization_status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ action: 'suspend', identity: item })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                              title="Suspend Account & Terminate Sessions"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : item.authorization_status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ action: 'reactivate', identity: item })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Reactivate Account"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          ) : null}

                          {/* Revoke Action */}
                          {item.authorization_status !== 'REVOKED' && (
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ action: 'revoke', identity: item })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                              title="Revoke Authorization Permanently"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => setConfirmModal({ action: 'delete', identity: item })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Identity & Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: Details View */}
        {showDetailModal && selectedIdentity && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Identity Verification Record</h3>
                    <span className="text-[11px] font-mono text-slate-500">{selectedIdentity.institution_id}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Full Name</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedIdentity.name}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Role</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedIdentity.role}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Trusted Email</div>
                  <div className="font-mono text-slate-800 mt-0.5">{selectedIdentity.trusted_email}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Activation Status</div>
                  <div className="mt-1">{getActivationBadge(selectedIdentity.activation_status)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Authorized By</div>
                  <div className="font-medium text-slate-700 mt-0.5">{selectedIdentity.created_by_name || 'Super Admin'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Created Date</div>
                  <div className="font-mono text-slate-700 mt-0.5">{formatDateTimeSafe(selectedIdentity.created_at, 'Recently')}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Last Login</div>
                  <div className="font-mono text-slate-700 mt-0.5">
                    {selectedIdentity.last_login_at ? formatDateTimeSafe(selectedIdentity.last_login_at, 'Recently') : 'Not Yet Logged In'}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedIdentity;
                    setShowDetailModal(false);
                    setConfirmModal({ action: 'delete', identity: target });
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Identity</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Edit Metadata */}
        {showEditModal && selectedIdentity && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Edit Permitted Metadata: {selectedIdentity.institution_id}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20"
                  />
                </div>

                {selectedIdentity.role === 'STUDENT' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hostel Eligibility Category</label>
                    <select
                      value={editForm.eligibility_classification}
                      onChange={(e) => setEditForm({ ...editForm, eligibility_classification: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none"
                    >
                      <option value="BOYS">Boys' Hostel (Male)</option>
                      <option value="GIRLS">Girls' Hostel (Female)</option>
                      <option value="COED">Co-ed / Special</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl font-bold bg-[#f78c30] text-white hover:bg-[#4d2bd4]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Confirmation Dialog for Sensitive Operations */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 text-center">
              <div
                className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${confirmModal.action === 'delete' || confirmModal.action === 'revoke'
                  ? 'bg-rose-100 text-rose-700'
                  : confirmModal.action === 'suspend'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}
              >
                {confirmModal.action === 'delete' ? (
                  <Trash2 className="w-6 h-6 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Confirm {confirmModal.action.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to {confirmModal.action} account{' '}
                  <strong className="text-slate-900">{confirmModal.identity.institution_id}</strong>?
                  {confirmModal.action === 'delete' && (
                    <span className="block mt-1 text-rose-700 font-semibold">
                      This will permanently delete this authorized identity and all associated accounts. This action is irreversible.
                    </span>
                  )}
                  {confirmModal.action === 'suspend' && (
                    <span className="block mt-1 text-amber-700 font-medium">
                      This will immediately revoke all active sessions for this user.
                    </span>
                  )}
                  {confirmModal.action === 'revoke' && (
                    <span className="block mt-1 text-rose-700 font-medium">
                      This will permanently invalidate access for this institutional identity.
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-action-btn"
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition ${confirmModal.action === 'delete' || confirmModal.action === 'revoke'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.action === 'suspend'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                  {confirmModal.action === 'delete' ? 'Delete Permanently' : `Confirm ${confirmModal.action}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SuperAdminUsersPage;
