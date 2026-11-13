/**
 * Module: frontend/src/components/auth/WardenRegisterModal.jsx
 *
 * Work / Purpose:
 *   Multi-step warden OTP registration modal verifying authorized warden identity before account activation.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/LandingPage.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/services/api.js
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function WardenRegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Warden credentials
  const [wardenId, setWardenId] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [cooldown, setCooldown] = useState(60);
  const [verificationToken, setVerificationToken] = useState('');

  // Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    let cooldownTimer;
    if (step === 2 && cooldown > 0) {
      cooldownTimer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [step, cooldown]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setSuccess('');
      setWardenId('');
      setEmail('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passwordCriteria = [
    { label: 'At least 12 characters', valid: password.length >= 12 },
    { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'Number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%^&*)', valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const passedCriteriaCount = passwordCriteria.filter((c) => c.valid).length;
  const isPasswordValid = password.length >= 12 && password === confirmPassword;

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanId = wardenId.trim().toUpperCase();
    if (!cleanId) {
      setError('Official Warden/Employee ID is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide your official institutional email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.wardenSignupRequestOtp({
        warden_id: cleanId,
        email: email.trim().toLowerCase(),
      });
      setEmailHint(res.email_hint || email);
      setCountdown(res.expires_in_seconds || 300);
      setCooldown(res.cooldown_seconds || 60);
      setStep(2);
      setSuccess(`6-digit verification code sent to ${res.email_hint || email}.`);
    } catch (err) {
      const msg = err.response?.data?.warden_id?.[0] ||
                  err.response?.data?.email?.[0] ||
                  err.response?.data?.detail ||
                  'Warden authorization verification failed. Ensure your ID is pre-authorized by Hostel Administration.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.wardenSignupVerifyOtp({
        warden_id: wardenId.trim().toUpperCase(),
        otp: otp.trim(),
      });
      setVerificationToken(res.verification_token);
      setStep(3);
      setSuccess('Warden authorization verified! Please create your password.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Password Creation
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.wardenSignupComplete({
        warden_id: wardenId.trim().toUpperCase(),
        verification_token: verificationToken,
        password,
        confirm_password: confirmPassword,
      });

      localStorage.setItem('access_token', res.access);
      localStorage.setItem('refresh_token', res.refresh);
      localStorage.setItem('user', JSON.stringify(res.user));

      setSuccess('Warden registration complete! Redirecting to Warden Portal...');
      setTimeout(() => {
        onClose();
        navigate(res.redirect_url || '/warden');
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.password?.[0] || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Official University Administration</span>
          </div>
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <span>🛡️</span>
            <span>Warden Registration</span>
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Dedicated Verification for Authorized Hostel Wardens & Scope Assignment
          </p>

          {/* Stepper */}
          <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-700/60">
            <div className={`flex items-center space-x-1.5 text-xs font-medium ${step >= 1 ? 'text-white' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>Credentials</span>
            </div>
            <div className={`h-0.5 w-6 ${step >= 2 ? 'bg-amber-400' : 'bg-slate-700'}`} />
            <div className={`flex items-center space-x-1.5 text-xs font-medium ${step >= 2 ? 'text-white' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>OTP Verify</span>
            </div>
            <div className={`h-0.5 w-6 ${step >= 3 ? 'bg-amber-400' : 'bg-slate-700'}`} />
            <div className={`flex items-center space-x-1.5 text-xs font-medium ${step >= 3 ? 'text-white' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>Password</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start space-x-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* STEP 1: Credentials */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-amber-900 text-xs">
                <p className="font-semibold text-amber-950 flex items-center space-x-1.5 mb-1">
                  <span>🔒</span>
                  <span>Pre-authorization Mandate</span>
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Warden registration requires prior institutional authorization by the Hostel Administration. 
                  Privileged roles cannot be self-selected from public forms.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Warden / Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wardenId}
                  onChange={(e) => setWardenId(e.target.value.toUpperCase())}
                  placeholder="e.g. W101, W102, W105"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none font-mono font-medium text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">Authorized employee ID assigned by university administration.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. warden.bh1@hostel.edu"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">Must match pre-authorized email in the Warden roster.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !wardenId.trim() || !email.trim()}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Pre-authorization & Send OTP</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2 text-xl">
                  🔐
                </div>
                <h3 className="text-sm font-bold text-slate-900">Enter Warden Security Code</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dispatched to official institutional email: <br />
                  <strong className="text-purple-700 font-mono">{emailHint}</strong>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800 font-bold"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Expires in: <strong className="font-mono text-slate-700">
                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </strong>
                </span>
                <span className="text-[11px] text-slate-400">5-minute institutional security limit</span>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Verify Security Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Password Creation (Min 12 Chars) */}
          {step === 3 && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700">
                Administrative security requirement: Password must be at least <strong>12 characters long</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password (At least 12 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 12 characters..."
                    required
                    minLength={12}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-medium"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Security Compliance</span>
                  <span className={
                    passedCriteriaCount <= 2 ? 'text-rose-600' :
                    passedCriteriaCount <= 4 ? 'text-amber-600' : 'text-emerald-600'
                  }>
                    {passedCriteriaCount <= 2 ? 'Weak' : passedCriteriaCount <= 4 ? 'Standard' : 'Strong'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passedCriteriaCount <= 2 ? 'bg-rose-500' :
                      passedCriteriaCount <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(passedCriteriaCount / passwordCriteria.length) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1.5">
                  {passwordCriteria.map((crit, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-[10px]">
                      <span className={crit.valid ? 'text-emerald-600' : 'text-slate-400'}>
                        {crit.valid ? '✓' : '•'}
                      </span>
                      <span className={crit.valid ? 'text-slate-800 font-medium' : 'text-slate-500'}>
                        {crit.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password..."
                  required
                  minLength={12}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !isPasswordValid}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Complete Warden Account Setup & Sign In</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer switch to login */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered your Warden credentials?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchToLogin) onSwitchToLogin();
                  else navigate('/login');
                }}
                className="text-purple-700 hover:text-purple-800 font-semibold"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { WardenRegisterModal };
