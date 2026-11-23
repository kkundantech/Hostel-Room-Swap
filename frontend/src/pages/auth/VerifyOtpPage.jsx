/**
 * Module: frontend/src/pages/auth/VerifyOtpPage.jsx
 *
 * Work / Purpose:
 *   OTP verification page validating 6-digit one-time codes before password setup.
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

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const identifier = searchParams.get('identifier') || '';
  const email = searchParams.get('email') || '';
  const role = searchParams.get('role') || 'STUDENT';
  const devOtp = searchParams.get('dev_otp') || '';

  const [otp, setOtp] = useState(devOtp || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(15);

  useEffect(() => {
    if (devOtp && !otp) {
      setOtp(devOtp);
    }
  }, [devOtp]);

  // 15-second quick cooldown timer
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
    setError('');
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');

    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.verifyActivationOtp({
        identifier: identifier || email,
        otp: otp.trim(),
      });

      setSuccessMsg(res.detail || 'Code verified successfully! Proceeding to password setup...');

      setTimeout(() => {
        navigate(
          `/set-password?identifier=${encodeURIComponent(identifier || email)}&token=${encodeURIComponent(
            res.verification_token
          )}`
        );
      }, 250);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Verification failed. Please check the 6-digit code or request a new one.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);

    try {
      const res = await api.requestActivationOtp({
        institution_id: identifier,
        email: email,
      });

      if (res.dev_otp) {
        setOtp(res.dev_otp);
      }
      setSuccessMsg(res.detail || 'A fresh verification OTP has been dispatched to your email.');
      setCooldown(15);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Unable to resend OTP at this time. Please wait a moment.';
      setError(msg);
    } finally {
      setResending(false);
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

        <Link
          to="/activate-account"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#f78c30] bg-white border border-slate-200/80 shadow-2xs px-4 py-2 rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change Email</span>
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
              Enter Verification Code
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Enter the 6-digit code sent to{' '}
              <strong className="text-slate-700 font-medium">{email || 'your email'}</strong>
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

          {/* Dev OTP Helper Banner */}
          {devOtp && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Verification Code: <strong className="font-mono text-sm text-amber-800 tracking-widest">{devOtp}</strong></span>
              </div>
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider bg-amber-100/90 px-2.5 py-1 rounded-full">Auto-filled</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {/* 6-Digit Input */}
            <div>
              <div className="relative">
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  required
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="&bull; &bull; &bull; &bull; &bull; &bull;"
                  className="w-full text-center py-3 px-4 tracking-[0.55em] text-2xl font-bold font-mono text-slate-900 rounded-xl border border-slate-200/90 bg-[#f8f9fc] focus:bg-white focus:border-[#f78c30] focus:ring-2 focus:ring-[#f78c30]/20 transition focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between mt-3 px-1 text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Valid for 5 mins</span>
                </span>

                <button
                  type="button"
                  id="resend-otp-btn"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className={`text-xs font-semibold transition flex items-center gap-1 ${
                    cooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-[#f78c30] hover:underline cursor-pointer'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              id="verify-otp-button"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-[#f78c30] hover:bg-[#e27518] text-white shadow-md shadow-[#f78c30]/20 hover:shadow-[#f78c30]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        &copy; {new Date().getFullYear()} RoomSwap &bull; Lovely Professional University
      </footer>
    </div>
  );
};

export default VerifyOtpPage;
