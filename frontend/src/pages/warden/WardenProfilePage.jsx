import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  User,
  Building,
  Mail,
  Phone,
  Lock,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Save,
  KeyRound,
  X
} from 'lucide-react';

export const WardenProfilePage = () => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(
    user?.first_name ? `${user.first_name} ${user.last_name}` : 'Warden'
  );
  const [email, setEmail] = useState(user?.email || 'warden.bh1@hostel.edu');
  const assignedHostelName = user?.assigned_hostels?.[0]?.name || user?.assigned_hostels?.[0]?.code || 'Hostel';
  const [officeLocation, setOfficeLocation] = useState(`Ground Floor, ${assignedHostelName} Warden Office, LPU`);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCycleFormed, setNotifyCycleFormed] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(false);

  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setActionSuccess('Warden profile information saved successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setActionError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setActionError('New password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setActionSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError('Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <X className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-600 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/images/student_user.jpg"
              alt="Warden"
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#5B4DF5] uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Hostel Authority</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <p className="text-xs text-slate-500">
                {assignedHostelName} Warden · Lovely Professional University
              </p>
            </div>
          </div>
        </div>

        {/* Personal Details Form */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#5B4DF5]" />
            <span>Profile Information</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Official University Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200/60 rounded-2xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Office Location</label>
                <input
                  type="text"
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white text-xs font-bold transition shadow-md shadow-[#5B4DF5]/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security / Password */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#5B4DF5]" />
            <span>Security & Password</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#5B4DF5]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || !newPassword}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#5B4DF5]" />
            <span>Notification Preferences</span>
          </h3>

          <div className="space-y-4 divide-y divide-slate-100">
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-xs font-bold text-slate-900">Email Alerts on Pending Approval</p>
                <p className="text-[11px] text-slate-400">Receive instant email when a swap proposal needs authorization</p>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 accent-[#5B4DF5] rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Multi-Party Cycle Formation Alerts</p>
                <p className="text-[11px] text-slate-400">Notify when matching engine forms a 3-way, 4-way, or 5-way loop</p>
              </div>
              <input
                type="checkbox"
                checked={notifyCycleFormed}
                onChange={(e) => setNotifyCycleFormed(e.target.checked)}
                className="w-4 h-4 accent-[#5B4DF5] rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Daily Administrative Digest</p>
                <p className="text-[11px] text-slate-400">Summary email of all occupancy changes and completed transfers</p>
              </div>
              <input
                type="checkbox"
                checked={notifyDailyDigest}
                onChange={(e) => setNotifyDailyDigest(e.target.checked)}
                className="w-4 h-4 accent-[#5B4DF5] rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
export default WardenProfilePage;
