/**
 * Module: frontend/src/components/student/StudentInfoModals.jsx
 *
 * Work / Purpose:
 *   Modular student informational modals covering current hostel room details, policy notices, notifications feed, and profile settings.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { X, Bed, Volume2, Bell } from 'lucide-react';
import { formatDateSafe } from '../../utils/dateUtils';

export const StudentInfoModals = ({
  showHostelModal,
  setShowHostelModal,
  showNoticesModal,
  setShowNoticesModal,
  showNotificationsModal,
  setShowNotificationsModal,
  showProfileModal,
  setShowProfileModal,
  allocation,
  studentName,
  studentRoll,
  user,
  notificationsList,
  handleMarkNotificationRead,
  handleMarkAllNotificationsRead,
}) => {
  return (
    <>
      {/* Hostel Room Details Modal */}
      {showHostelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hostel Allocation Details
                </h3>
                <p className="text-xs text-slate-400">Lovely Professional University Residential Services</p>
              </div>
              <button
                onClick={() => setShowHostelModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allocation ? (
              <div className="py-4 space-y-4">
                <img
                  src="/images/hostel_room_view.jpg"
                  alt="Room View"
                  loading="lazy"
                  className="w-full h-44 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Block</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {allocation.bed?.block_name || allocation.bed?.hostel_name || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-500">Hostel Residential Complex</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bed Number</span>
                    <p className="font-bold text-[#f78c30] mt-0.5">
                      Room {allocation.bed?.room_number || 'N/A'} (Bed {allocation.bed?.bed_number || 'A'})
                    </p>
                    <p className="text-[10px] text-slate-500">Active Allocation</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">Current Room Occupancy:</span>
                  <p className="text-slate-600">Resident: {studentName} ({user?.email || 'student@lpu.in'})</p>
                  <p className="text-slate-600">Disciplinary Standing: <span className="font-semibold text-emerald-700">Clear</span></p>
                  <p className="text-slate-600">Hostel Fee Clearance: <span className="font-semibold text-emerald-700">Verified</span></p>
                </div>
              </div>
            ) : (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bed className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Active Allocation</h4>
                <p className="text-xs text-slate-500 mt-1">
                  You currently have no hostel room allocated.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowHostelModal(false)}
                className="px-5 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Important Notices Modal */}
      {showNoticesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-rose-600" />
                <span>Hostel Policy &amp; Important Notices</span>
              </h3>
              <button
                onClick={() => setShowNoticesModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold block">1. Semester Start Cooling-Off Period:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Room exchange requests are strictly not allowed within the first 30 days of the academic semester start to ensure initial check-in stability.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold block">2. Gender Isolation Policy:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Cross-gender swaps are strictly prevented by campus hostel bylaws. All requests remain isolated within authorized respective hostels.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold block">3. Multi-Party Atomic Execution:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Cycles are executed atomically only after unanimous student agreement and final warden authorization.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowNoticesModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold transition hover:bg-slate-900"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#f78c30] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Notifications</h3>
                  <p className="text-[11px] text-slate-400">Updates on room requests, proposals &amp; approvals</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {notificationsList.some((n) => !n.is_read) && (
              <div className="py-2.5 px-1 flex justify-end shrink-0">
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs font-bold text-[#f78c30] hover:text-[#e27518] transition"
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="py-3 space-y-2.5 overflow-y-auto flex-1">
              {notificationsList.length > 0 ? (
                notificationsList.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkNotificationRead(n.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                      n.is_read
                        ? 'bg-slate-50/70 border-slate-100 text-slate-600'
                        : 'bg-orange-50/70 border-orange-100 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${!n.is_read ? 'text-[#f78c30]' : 'text-slate-700'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateSafe(n.created_at, 'Recently')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f78c30]"></span>
                        <span className="text-[10px] font-semibold text-[#f78c30]">Unread (click to mark read)</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">You are all caught up!</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Profile Settings</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src="/images/student_user.jpg"
                  alt="Student"
                  loading="lazy"
                  className="w-12 h-12 rounded-full object-cover border-2 border-orange-100 shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{studentName}</p>
                  <p className="text-xs text-slate-400">Registration: {studentRoll}</p>
                  <p className="text-xs text-[#f78c30] font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Role</span>
                  <p className="font-bold text-slate-800 mt-0.5">Hostel Resident</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Academic Year</span>
                  <p className="font-bold text-slate-800 mt-0.5">Year 3 (B.Tech CSE)</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Fee Clearance</span>
                  <p className="font-bold text-emerald-600 mt-0.5">Verified</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Disciplinary</span>
                  <p className="font-bold text-emerald-600 mt-0.5">Clean Record</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentInfoModals;
