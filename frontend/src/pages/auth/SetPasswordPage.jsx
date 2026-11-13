/**
 * Module: frontend/src/pages/auth/SetPasswordPage.jsx
 *
 * Work / Purpose:
 *   Account activation final step page enforcing strong password setup via verified activation grant.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const SetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const identifier = searchParams.get('identifier') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activatedSuccess, setActivatedSuccess] = useState(null);

  // Password rules validation
  const rules = [
    { label: 'At least 8 characters long', valid: password.length >= 8 },
    { label: 'Contains uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'Contains a number (0-9)', valid: /\d/.test(password) },
    { label: 'Passwords match', valid: password.length > 0 && password === confirmPassword },
  ];

  const allRulesPassed = rules.every((r) => r.valid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing or expired verification grant. Please restart identity verification.');
      return;
    }

    if (!allRulesPassed) {
      setError('Please fulfill all password security rules before proceeding.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.setActivationPassword({
        identifier: identifier,
        verification_token: token,
        password: password,
        confirm_password: confirmPassword,
      });

      setActivatedSuccess(res);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.confirm_password?.[0] ||
        'Failed to set password. Your session may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f78c30] to-[#f9a154] flex items-center justify-center text-white shadow-md shadow-[#f78c30]/25 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-none">
              RoomSwap
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
              Hostel Room Exchange
            </span>
          </div>
        </Link>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center py-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {activatedSuccess ? (
            /* Success View */
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Account Activated!
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your password has been set successfully. You can now sign in to your dashboard.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                <div className="text-slate-400 font-medium text-[11px]">Role</div>
                <div className="font-bold text-[#f78c30] text-sm uppercase">
                  {activatedSuccess.role || 'Authorized Member'}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  ID: {activatedSuccess.institution_id || identifier}
                </div>
              </div>

              <button
                type="button"
                id="sign-in-now-btn"
                onClick={() => navigate(`/login?identifier=${encodeURIComponent(activatedSuccess.institution_id || identifier)}`)}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-[#f78c30] hover:bg-[#e27518] text-white shadow-md shadow-[#f78c30]/20 hover:shadow-[#f78c30]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Password Setup Form */
            <>
              {/* Header Icon & Title */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#f78c30] mx-auto mb-3.5 shadow-2xs">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Set Your Password
                </h1>
                <p className="text-xs text-slate-500 mt-1.5">
                  Choose a secure password for your account
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Field 1: New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Field 2: Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Rules Checklist */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-[11px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Requirements
                  </div>
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] ${
                          rule.valid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {rule.valid ? <Check className="w-2.5 h-2.5" /> : <X className="w-2 h-2" />}
                      </div>
                      <span className={rule.valid ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  id="activate-account-button"
                  disabled={loading || !allRulesPassed}
                  className="w-full !mt-5 py-3 px-4 rounded-xl text-xs font-semibold bg-[#f78c30] hover:bg-[#e27518] text-white shadow-md shadow-[#f78c30]/20 hover:shadow-[#f78c30]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        &copy; {new Date().getFullYear()} RoomSwap &bull; Lovely Professional University
      </footer>
    </div>
  );
};

export default SetPasswordPage;
