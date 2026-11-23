/**
 * Module: frontend/src/pages/auth/ActivateAccountPage.jsx
 *
 * Work / Purpose:
 *   OTP-based account activation entry page for pre-authorized students and wardens.
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
  Bed,
  User,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const ActivateAccountPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [institutionId, setInstitutionId] = useState(
    searchParams.get('id') || searchParams.get('identifier') || ''
  );
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerateOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedId = institutionId.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedId) {
      setError('Please enter your Registration No. or Staff ID.');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your university email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.requestActivationOtp({
        institution_id: trimmedId,
        email: trimmedEmail,
      });

      const confirmation =
        res.detail ||
        `Verification OTP sent to ${res.masked_email || trimmedEmail}`;
      setSuccessMsg(confirmation);

      setTimeout(() => {
        const detectedRole = res.role || 'STUDENT';
        const queryParams = new URLSearchParams({
          identifier: trimmedId,
          email: trimmedEmail,
          role: detectedRole,
        });
        if (res.dev_otp) {
          queryParams.set('dev_otp', res.dev_otp);
        }
        navigate(`/verify-otp?${queryParams.toString()}`);
      }, 350);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.institution_id?.[0] ||
        err.response?.data?.email?.[0] ||
        'Unable to generate OTP. Please verify your ID and email.';
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
            <Bed className="w-5 h-5" />
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

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#f78c30] bg-white border border-slate-200/80 shadow-2xs px-4 py-2 rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center py-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {/* Header Icon & Title */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#f78c30] mx-auto mb-3.5 shadow-2xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Activate Account
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Enter your university details to receive your OTP code
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-medium leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleGenerateOtp} className="space-y-4">
            {/* Field 1: ID */}
            <div>
              <label
                htmlFor="activation-id-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Registration No. or Staff ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="activation-id-input"
                  type="text"
                  required
                  value={institutionId}
                  onChange={(e) => {
                    setInstitutionId(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. 12306502"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Field 2: Email */}
            <div>
              <label
                htmlFor="activation-email-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                University Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="activation-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30] transition placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="generate-otp-button"
              disabled={loading}
              className="w-full !mt-5 py-3 px-4 rounded-xl text-xs font-semibold bg-[#f78c30] hover:bg-[#e27518] text-white shadow-md shadow-[#f78c30]/20 hover:shadow-[#f78c30]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have a password?{' '}
              <Link to="/login" className="font-semibold text-[#f78c30] hover:underline ml-0.5">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        &copy; {new Date().getFullYear()} RoomSwap &bull; Lovely Professional University
      </footer>
    </div>
  );
};

export default ActivateAccountPage;
