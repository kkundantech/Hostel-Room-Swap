import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Identifier
  const [identifier, setIdentifier] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [cooldown, setCooldown] = useState(60);
  const [verificationToken, setVerificationToken] = useState('');

  // Step 3: Password
  const [newPassword, setNewPassword] = useState('');
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
      setIdentifier('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passwordCriteria = [
    { label: 'At least 12 characters', valid: newPassword.length >= 12 },
    { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'Number (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'Special character (!@#$%^&*)', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const passedCriteriaCount = passwordCriteria.filter((c) => c.valid).length;
  const isPasswordValid = newPassword.length >= 12 && newPassword === confirmPassword;

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please provide your Registration Number, Warden ID, or Email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.passwordResetRequestOtp(cleanId);
      setCountdown(res.expires_in_seconds || 300);
      setCooldown(60);
      setStep(2);
      setSuccess(res.detail || 'Verification code dispatched to your registered institutional email.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.passwordResetVerifyOtp(identifier.trim(), otp.trim());
      setVerificationToken(res.verification_token);
      setStep(3);
      setSuccess('Code verified! Please set your new password.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.passwordResetComplete({
        identifier: identifier.trim(),
        verification_token: verificationToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess('Password reset successfully! Please log in with your new credentials.');
      setTimeout(() => {
        onClose();
        if (onSwitchToLogin) onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.new_password?.[0] || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 relative">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white px-6 py-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-bold">Reset Password</h2>
          <p className="text-purple-200 text-xs mt-0.5">
            Institutional verification with 6-digit OTP code
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
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

          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registration Number, Warden ID, or Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 12345678 or W101 or student@hostel.edu"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  We will send a 6-digit one-time code to the verified institutional email linked to this account.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-1">
                <p className="text-xs text-slate-600">
                  Enter the 6-digit security code sent to your email.
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
                  Expires in:{' '}
                  <strong className="font-mono text-slate-700">
                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-purple-700 hover:text-purple-800 font-medium disabled:opacity-40"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
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
                  className="flex-1 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (Min 12 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  <span>Strength</span>
                  <span className={
                    passedCriteriaCount <= 2 ? 'text-rose-600' :
                    passedCriteriaCount <= 4 ? 'text-amber-600' : 'text-emerald-600'
                  }>
                    {passedCriteriaCount <= 2 ? 'Weak' : passedCriteriaCount <= 4 ? 'Good' : 'Strong'}
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password..."
                  required
                  minLength={12}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Update Password & Log In</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSwitchToLogin) onSwitchToLogin();
              }}
              className="text-xs text-purple-700 hover:text-purple-800 font-semibold"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ForgotPasswordModal };
