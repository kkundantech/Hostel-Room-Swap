/**
 * Module: frontend/src/pages/admin/AdminAuthorizedStudentsPage.jsx
 *
 * Work / Purpose:
 *   Hostel Admin authorized student roster page for pre-authorizing students via single entry or bulk upload.
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
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Upload,
  CheckCircle2,
  Clock,
  Ban,
  ShieldAlert,
  Building,
  GraduationCap,
  X,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  RefreshCw,
} from 'lucide-react';

export const AdminAuthorizedStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regFilter, setRegFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditEligibilityModal, setShowEditEligibilityModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    registration_number: '',
    email: '',
    full_name: '',
    gender: 'MALE',
    approved_eligibility: 'BOYS',
    department: 'CSE',
    year_of_study: 1,
    initial_hostel_code: 'BH1',
    initial_room: '101',
    initial_bed: 'A',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchStudents = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await api.getAuthorizedStudents();
      setStudents(res.results || res || []);
    } catch (err) {
      console.error('Failed to fetch authorized students:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents(false);
    const interval = setInterval(() => {
      fetchStudents(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.registration_number || formData.registration_number.length !== 8) {
      setFormError('Registration number must be exactly 8 digits.');
      return;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setFormError('Please enter a valid university institutional email.');
      return;
    }

    try {
      setSubmitting(true);
      await api.createAuthorizedStudent({
        ...formData,
        registration_number: formData.registration_number.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
      });
      setShowAddModal(false);
      setFormData({
        registration_number: '',
        email: '',
        full_name: '',
        gender: 'MALE',
        approved_eligibility: 'BOYS',
        department: 'CSE',
        year_of_study: 1,
        initial_hostel_code: 'BH1',
        initial_room: '',
        initial_bed: '',
      });
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.registration_number?.[0] || 'Failed to authorize student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (studentId, newStatus) => {
    try {
      await api.updateAuthorizedStudent(studentId, { authorization_status: newStatus });
      fetchStudents();
    } catch (err) {
      alert('Failed to update student authorization status.');
    }
  };

  const handleUpdateEligibility = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setSubmitting(true);
      await api.updateAuthorizedStudent(selectedStudent.id, {
        approved_eligibility: selectedStudent.approved_eligibility,
      });
      setShowEditEligibilityModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      alert('Failed to update eligibility classification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (studentId, regNo) => {
    if (!window.confirm(`Are you sure you want to remove authorization for student ${regNo}?`)) return;
    try {
      await api.deleteAuthorizedStudent(studentId);
      fetchStudents();
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
      const res = await api.importAuthorizedStudents({ csv_text: csvText });
      setImportResult(res);
      fetchStudents();
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
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.registration_number || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.full_name || '').toLowerCase().includes(q);
    const matchesEligibility = eligibilityFilter === 'ALL' || s.approved_eligibility === eligibilityFilter;
    const matchesStatus = statusFilter === 'ALL' || s.authorization_status === statusFilter;
    const matchesReg =
      regFilter === 'ALL' ||
      (regFilter === 'REGISTERED' && s.is_registered) ||
      (regFilter === 'PENDING' && !s.is_registered);

    return matchesSearch && matchesEligibility && matchesStatus && matchesReg;
  });

  const totalCount = students.length;
  const registeredCount = students.filter((s) => s.is_registered).length;
  const boysCount = students.filter((s) => s.approved_eligibility === 'BOYS').length;
  const girlsCount = students.filter((s) => s.approved_eligibility === 'GIRLS').length;

  return (
    <AppLayout
      pageTitle="Authorized Students Roster"
      pageDescription="Authoritative university student roster pre-authorizing 8-digit registration numbers, emails, and gender-based hostel eligibility."
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
            <span>Authorize Student</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Authorized</span>
              <span className="p-1.5 rounded-lg bg-orange-50 text-[#f78c30]">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Pre-authorized student profiles</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Registered Accounts</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{registeredCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Completed OTP + password verification</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Boys' Hostel Eligibility</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Building className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700">{boysCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Enforced access to boys' blocks</p>
          </div>

          <div className="app-card p-4">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Girls' Hostel Eligibility</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <Building className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">{girlsCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Enforced access to girls' blocks</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by 8-digit reg no, email, or full name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/25 focus:border-[#f78c30]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={eligibilityFilter}
                onChange={(e) => setEligibilityFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/25"
              >
                <option value="ALL">All Eligibilities</option>
                <option value="BOYS">Boys' Hostel</option>
                <option value="GIRLS">Girls' Hostel</option>
              </select>
            </div>

            <select
              value={regFilter}
              onChange={(e) => setRegFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/25"
            >
              <option value="ALL">All Account States</option>
              <option value="REGISTERED">Registered</option>
              <option value="PENDING">Pending Signup</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#f78c30]/25"
            >
              <option value="ALL">All Authorizations</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
            </select>

            <button
              onClick={() => fetchStudents(false)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition ml-auto"
              title="Refresh roster status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#f78c30] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#f78c30] hover:bg-[#4C28DF] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Student</span>
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading authorized roster...</div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Authorized Students"
              description="No student records matched your search or filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Student Name & Email</th>
                    <th>Gender</th>
                    <th>Hostel Eligibility</th>
                    <th>Pre-Allocated Bed</th>
                    <th>Registration</th>
                    <th>Authorization</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono font-bold text-slate-900">{s.registration_number}</td>
                      <td>
                        <div className="font-semibold text-slate-900">{s.full_name || '—'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 font-medium">
                          {s.gender === 'MALE' ? 'Male' : s.gender === 'FEMALE' ? 'Female' : 'Other'}
                        </span>
                      </td>
                      <td>
                        {s.approved_eligibility === 'BOYS' ? (
                          <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
                            Boys' Hostel
                          </span>
                        ) : (
                          <span className="badge bg-rose-50 text-rose-700 border border-rose-200">
                            Girls' Hostel
                          </span>
                        )}
                      </td>
                      <td>
                        {s.initial_hostel_code ? (
                          <span className="text-xs font-mono font-medium text-slate-700">
                            {s.initial_hostel_code}-{s.initial_room || '?'}-{s.initial_bed || '?'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td>
                        {s.is_registered ? (
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
                        {s.authorization_status === 'ACTIVE' && (
                          <span className="badge badge-success">Active</span>
                        )}
                        {s.authorization_status === 'SUSPENDED' && (
                          <span className="badge badge-warning">Suspended</span>
                        )}
                        {s.authorization_status === 'REVOKED' && (
                          <span className="badge badge-error">Revoked</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStudent(s);
                              setShowEditEligibilityModal(true);
                            }}
                            title="Edit Approved Eligibility"
                            className="p-1 rounded-md text-slate-500 hover:text-[#f78c30] hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {s.authorization_status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(s.id, 'SUSPENDED')}
                              title="Suspend Authorization"
                              className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(s.id, 'ACTIVE')}
                              title="Reactivate Authorization"
                              className="p-1 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(s.id, s.registration_number)}
                            title="Remove / Delete Student"
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

      {/* Manual Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f78c30] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authorize New Student</h3>
                  <p className="text-[11px] text-slate-500">Add student to institutional pre-approved roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration No (8 digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    placeholder="12345678"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value.replace(/\D/g, '') })}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    University Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@hostel.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => {
                      const g = e.target.value;
                      setFormData({
                        ...formData,
                        gender: g,
                        approved_eligibility: g === 'FEMALE' ? 'GIRLS' : 'BOYS',
                      });
                    }}
                    className="input-field"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approved Eligibility *
                  </label>
                  <select
                    value={formData.approved_eligibility}
                    onChange={(e) => setFormData({ ...formData, approved_eligibility: e.target.value })}
                    className="input-field"
                  >
                    <option value="BOYS">Boys' Hostel</option>
                    <option value="GIRLS">Girls' Hostel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel</label>
                  <input
                    type="text"
                    placeholder="BH1"
                    value={formData.initial_hostel_code}
                    onChange={(e) => setFormData({ ...formData, initial_hostel_code: e.target.value })}
                    className="input-field uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    placeholder="101"
                    value={formData.initial_room}
                    onChange={(e) => setFormData({ ...formData, initial_room: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bed</label>
                  <input
                    type="text"
                    placeholder="A"
                    value={formData.initial_bed}
                    onChange={(e) => setFormData({ ...formData, initial_bed: e.target.value })}
                    className="input-field uppercase"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : 'Authorize Student'}
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
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f78c30] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bulk Import Authorized Students</h3>
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
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#e27518] hover:file:bg-orange-100 cursor-pointer"
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
                  placeholder={`registration_number,email,full_name,gender,approved_eligibility,department,year_of_study,initial_hostel_code,initial_room,initial_bed\n12345698,rahul.new@hostel.edu,Rahul Sharma,MALE,BOYS,CSE,2,BH1,202,A\n12345699,priya.new@hostel.edu,Priya Patel,FEMALE,GIRLS,ECE,1,GH1,105,B`}
                  className="input-field font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supported columns: registration_number, email, full_name, gender (MALE/FEMALE), approved_eligibility (BOYS/GIRLS), department, year_of_study, initial_hostel_code, initial_room, initial_bed.
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

      {/* Edit Eligibility Classification Modal */}
      {showEditEligibilityModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f78c30] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Update Eligibility Policy</h3>
                  <p className="text-[11px] text-slate-500">Student: {selectedStudent.registration_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditEligibilityModal(false);
                  setSelectedStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <p className="font-semibold">Institutional Policy Notice:</p>
              <p className="text-[11px] mt-0.5">
                Modifying a student's eligibility determines which hostel categories (Boys vs Girls), rooms, and room exchange requests they can browse and participate in.
              </p>
            </div>

            <form onSubmit={handleUpdateEligibility} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Hostel Eligibility
                </label>
                <select
                  value={selectedStudent.approved_eligibility}
                  onChange={(e) =>
                    setSelectedStudent({ ...selectedStudent, approved_eligibility: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="BOYS">Boys' Hostel (BH)</option>
                  <option value="GIRLS">Girls' Hostel (GH)</option>
                  <option value="SPECIAL_APPROVAL">Special Approval Scope</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditEligibilityModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminAuthorizedStudentsPage;
