/**
 * Module: frontend/src/components/admin/AdminQuickAuthModals.jsx
 *
 * Work / Purpose:
 *   Modular quick-authorization modals for AdminDashboard supporting student and warden identity pre-authorization.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/admin/AdminDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ShieldCheck, X } from 'lucide-react';

export const AdminQuickAuthModals = ({
  showQuickStudentModal,
  setShowQuickStudentModal,
  studentForm,
  setStudentForm,
  handleQuickAddStudent,
  submittingStudent,
  showQuickWardenModal,
  setShowQuickWardenModal,
  wardenForm,
  setWardenForm,
  handleQuickAddWarden,
  submittingWarden,
  hostels,
}) => {
  return (
    <>
      {/* MODAL 1: QUICK AUTHORIZE STUDENT */}
      {showQuickStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Authorize Student</h3>
                  <p className="text-xs text-slate-400">Pre-authorizes 8-digit registration & hostel eligibility</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickStudentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStudent} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="e.g. 12345678"
                    value={studentForm.registration_number}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, registration_number: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono uppercase focus:outline-none focus:border-[#f78c30]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Must be 8 characters</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Institutional Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. student@hostel.edu"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, email: e.target.value.toLowerCase() })
                    }
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={studentForm.full_name}
                  onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => {
                      const g = e.target.value;
                      setStudentForm({
                        ...studentForm,
                        gender: g,
                        approved_eligibility: g === 'MALE' ? 'BOYS' : 'GIRLS',
                        initial_hostel_code: g === 'MALE' ? 'BH1' : 'GH1',
                      });
                    }}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved Eligibility</label>
                  <select
                    value={studentForm.approved_eligibility}
                    onChange={(e) => setStudentForm({ ...studentForm, approved_eligibility: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-bold text-[#e27518] focus:outline-none focus:border-[#f78c30]"
                  >
                    <option value="BOYS">Boys&apos; Hostel Only</option>
                    <option value="GIRLS">Girls&apos; Hostel Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#f78c30]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Hostel Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BH1 or GH1"
                    value={studentForm.initial_hostel_code}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, initial_hostel_code: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#f78c30]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/admin/authorized-students"
                  onClick={() => setShowQuickStudentModal(false)}
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518]"
                >
                  Open Full Student Roster &rarr;
                </Link>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuickStudentModal(false)}
                    className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStudent}
                    className="px-5 py-2 rounded-2xl text-xs font-bold text-white bg-[#f78c30] hover:bg-[#e27518] shadow-md shadow-[#f78c30]/20 disabled:opacity-50"
                  >
                    {submittingStudent ? 'Authorizing...' : 'Authorize Student'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK PRE-AUTHORIZE WARDEN */}
      {showQuickWardenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pre-Authorize Warden</h3>
                  <p className="text-xs text-slate-400">Grant approval authority & assign hostel jurisdictions</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickWardenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddWarden} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Warden / Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. W105"
                    value={wardenForm.warden_id}
                    onChange={(e) =>
                      setWardenForm({ ...wardenForm, warden_id: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-mono uppercase focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. warden.bh3@hostel.edu"
                    value={wardenForm.email}
                    onChange={(e) =>
                      setWardenForm({ ...wardenForm, email: e.target.value.toLowerCase() })
                    }
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={wardenForm.full_name}
                    onChange={(e) => setWardenForm({ ...wardenForm, full_name: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role / Authority</label>
                  <select
                    value={wardenForm.role}
                    onChange={(e) => setWardenForm({ ...wardenForm, role: e.target.value })}
                    className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 font-bold text-blue-700 focus:outline-none focus:border-blue-600"
                  >
                    <option value="WARDEN">Hostel Warden (Assigned Hostels)</option>
                    <option value="CHIEF_WARDEN">Chief Warden (Cross-Hostel Authority)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={wardenForm.phone}
                  onChange={(e) => setWardenForm({ ...wardenForm, phone: e.target.value })}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              {wardenForm.role === 'WARDEN' && hostels.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Hostel Jurisdiction</label>
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto">
                    {hostels.map((h) => {
                      const isAssigned = wardenForm.assigned_hostels.includes(h.id);
                      return (
                        <label key={h.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setWardenForm({
                                  ...wardenForm,
                                  assigned_hostels: [...wardenForm.assigned_hostels, h.id],
                                });
                              } else {
                                setWardenForm({
                                  ...wardenForm,
                                  assigned_hostels: wardenForm.assigned_hostels.filter((id) => id !== h.id),
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-800">{h.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/admin/authorized-wardens"
                  onClick={() => setShowQuickWardenModal(false)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Open Full Warden Directory &rarr;
                </Link>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuickWardenModal(false)}
                    className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWarden}
                    className="px-5 py-2 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {submittingWarden ? 'Authorizing...' : 'Authorize Warden'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminQuickAuthModals;

