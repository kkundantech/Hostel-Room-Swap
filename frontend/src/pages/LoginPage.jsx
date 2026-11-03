import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  RotateCw,
  Users,
  AlertCircle,
  Bed as BedIcon,
  Sparkles,
  ShieldCheck,
  Check,
  Building2,
  KeyRound
} from 'lucide-react';

import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Single Unified Input State: Registration Number, Staff ID, or Email
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation & Server feedback
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    setValidationError('');
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setValidationError('');
    setServerError('');

    const trimmed = identifier.trim();

    if (!trimmed) {
      setValidationError('Please enter your Registration Number, Staff ID, or Email.');
      return;
    }

    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const user = await login(trimmed, password);
      // Automatic role-based landing redirection based on authenticated user identity
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (user.role === 'STUDENT') {
        navigate('/student');
      } else if (user.role === 'WARDEN') {
        navigate('/warden');
      } else if (user.role === 'CHIEF_WARDEN') {
        navigate('/chief-warden');
      } else if (user.role === 'DEAN') {
        navigate('/dean');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.registration_number?.[0] ||
        err.response?.data?.identifier?.[0] ||
        'Invalid credentials. Please verify your Registration Number / Email and password.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Background Campus Photograph Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/lpu_login_bg.jpg')`,
        }}
      >
        {/* Subtle gradient vignette to guarantee maximum text contrast while maintaining full photo vibrancy */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent lg:from-white/90 lg:via-white/40 lg:to-transparent" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 w-full px-6 sm:px-12 py-5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#5D38F0] flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <BedIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">
                RoomSwap
              </span>
            </div>
            <span className="text-[11px] text-slate-600 font-semibold tracking-tight block mt-0.5">
              LPU Hostel Room Exchange Platform
            </span>
          </div>
        </Link>

        {/* Back to Home Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#5D38F0] transition bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/80 shadow-xs hover:shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Split Section: Left Showcase & Right Card */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-12 py-4 sm:py-6 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
        {/* Left Column: Campus Messaging & Trust Badges */}
        <div className="flex-1 max-w-xl space-y-7 text-left">
          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.08]">
              A Better <br />
              Hostel Experience <br />
              <span className="text-[#5D38F0]">at LPU</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-lg">
              Exchange rooms the right way &mdash; secure, transparent and officially approved.
            </p>
          </div>

          {/* 4 Feature Items */}
          <div className="space-y-4 max-w-md">
            {/* Feature 1 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-indigo-100 flex items-center justify-center text-[#5D38F0] shadow-2xs shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Official &amp; Secure</h4>
                <p className="text-[11px] text-slate-600 font-medium">LPU verified platform</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-indigo-100 flex items-center justify-center text-[#5D38F0] shadow-2xs shrink-0">
                <RotateCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Direct &amp; Multi-Party Swaps</h4>
                <p className="text-[11px] text-slate-600 font-medium">Find the right match easily</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-indigo-100 flex items-center justify-center text-[#5D38F0] shadow-2xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Policy Compliant</h4>
                <p className="text-[11px] text-slate-600 font-medium">All rules and eligibility checks</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/85 backdrop-blur-md border border-indigo-100 flex items-center justify-center text-[#5D38F0] shadow-2xs shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Transparent Process</h4>
                <p className="text-[11px] text-slate-600 font-medium">From request to approval</p>
              </div>
            </div>
          </div>

          {/* Handwritten Slogan Accent */}
          <div className="inline-block relative pt-2">
            <span className="font-serif italic font-bold text-slate-800 text-sm tracking-wide block rotate-[-2deg]">
              Same Campus, <br />
              <span className="text-[#5D38F0]">New Possibilities</span>
            </span>
            <svg
              className="w-24 h-3 text-[#5D38F0] mt-0.5"
              viewBox="0 0 100 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 9C25 2 70 2 98 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Bottom Floating Pill Container */}
          <div className="pt-2">
            <div className="inline-flex flex-wrap items-center gap-4 sm:gap-6 bg-white/80 backdrop-blur-md rounded-2xl border border-white/70 shadow-sm px-5 py-3 text-xs font-bold text-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5D38F0]" />
                <div className="leading-tight">
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Trusted by</div>
                  <div className="text-slate-900 font-bold">LPU Students</div>
                </div>
              </div>

              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="leading-tight">
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Official</div>
                  <div className="text-slate-900 font-bold">Approval Process</div>
                </div>
              </div>

              <div className="hidden sm:block w-px h-6 bg-slate-200" />

              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <div className="leading-tight">
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Safe &amp;</div>
                  <div className="text-slate-900 font-bold">Transparent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Floating White Login Card */}
        <div className="w-full max-w-[430px] shrink-0 my-4">
          <div className="bg-white rounded-3xl p-8 sm:p-9 shadow-xl shadow-slate-200/50 border border-slate-200/80 relative">
            {/* Top Avatar Circle Badge */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 mx-auto flex items-center justify-center text-[#5B4DF5] shadow-2xs mb-3.5">
              <KeyRound className="w-5 h-5" />
            </div>

            {/* Header Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign In
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Validation & Error Messages */}
            {validationError && (
              <div
                id="login-validation-error"
                className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="font-medium">{validationError}</span>
              </div>
            )}

            {serverError && (
              <div
                id="login-server-error"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{serverError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Identifier */}
              <div>
                <label
                  htmlFor="user-identifier"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Registration No. or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="user-identifier"
                    type="text"
                    required
                    value={identifier}
                    maxLength={60}
                    onChange={handleIdentifierChange}
                    placeholder="e.g. 12306502 or name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] transition placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    id="forgot-password-link"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-medium text-slate-500 hover:text-[#5B4DF5] transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationError('');
                      setServerError('');
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 bg-[#f8f9fc] text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] transition placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="sign-in-button"
                disabled={loading}
                className="w-full !mt-5 py-3 px-4 rounded-xl text-xs font-semibold bg-[#5B4DF5] hover:bg-[#4d3ef0] text-white shadow-md shadow-[#5B4DF5]/20 hover:shadow-[#5B4DF5]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Account Activation Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                First time here?{' '}
                <Link
                  to="/activate-account"
                  id="create-password-otp-link"
                  className="font-semibold text-[#5B4DF5] hover:underline ml-0.5"
                >
                  Activate Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Page Minimal Footer */}
      <footer className="relative z-10 w-full py-3 px-6 text-center text-[11px] text-slate-600 bg-white/70 backdrop-blur-md border-t border-white/60">
        &copy; {new Date().getFullYear()} Lovely Professional University &middot; RoomSwap Campus Housing Division
      </footer>

      {/* Interactive Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSwitchToLogin={() => setShowForgotModal(false)}
      />
    </div>
  );
};

export default LoginPage;
