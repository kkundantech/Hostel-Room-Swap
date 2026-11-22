/**
 * Module: frontend/src/pages/LandingPage.jsx
 *
 * Work / Purpose:
 *   Pixel-matched public landing page for the LPU Hostel Room Exchange platform.
 *   Recreates the exact visual SaaS design reference:
 *     - Floating rounded-full glassmorphic navbar with active state indicator
 *     - Cinematic LPU sunset campus background
 *     - Bold gradient typography with custom orange swoosh accent under "at LPU"
 *     - Interactive trust badges and gradient CTA buttons
 *     - Stacked floating information cards ("Multi-Way Cycle Match", "100% Policy Enforced")
 *     - Fluid bottom wave curve and horizontal feature highlight strip
 *     - Preserves all modals, routing, and backend integrations
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/auth/StudentRegisterModal.jsx
 *   - frontend/src/components/auth/WardenRegisterModal.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentRegisterModal } from '../components/auth/StudentRegisterModal';
import { WardenRegisterModal } from '../components/auth/WardenRegisterModal';
import {
  Bed as BedIcon,
  CheckCircle2,
  Users,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  GitFork,
  FileText,
  RotateCw,
  GraduationCap,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal States
  const [showStudentSignup, setShowStudentSignup] = useState(false);
  const [showWardenSignup, setShowWardenSignup] = useState(false);

  // Navigation & Scroll States
  const [activeNav, setActiveNav] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Stats from backend (fallback to defaults if pending)
  const [stats, setStats] = useState({
    totalBeds: 80,
    totalHostels: 2,
    activeRequests: 0,
    completedExchanges: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.getAnalytics();
        if (res.overview) {
          setStats({
            totalBeds: res.overview.total_beds || 80,
            totalHostels: res.overview.total_hostels || 2,
            activeRequests: res.exchange_requests?.open || 0,
            completedExchanges: res.transfers?.total || 0,
          });
        }
      } catch (e) {
        // Fallback default stats
      }
    };
    loadStats();
  }, []);

  // Scroll spy to highlight active nav link and header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ['home', 'features', 'how-it-works', 'about'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNav(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setActiveNav(sectionId);
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#fed7aa] selection:text-black relative">

      {/* =========================================================================
          1. FLOATING NAVBAR (Pixel-Matched to Reference Image)
          Rounded-full pill container floating over the top hero
          ========================================================================= */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 transition-all duration-300 pointer-events-none">
        <div
          className={`max-w-7xl mx-auto rounded-full px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between pointer-events-auto transition-all duration-300 ${
            isScrolled
              ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-900/5 border border-slate-200/90'
              : 'bg-white/90 backdrop-blur-md shadow-md shadow-slate-900/5 border border-white/80'
          }`}
        >
          {/* Logo & Platform Title */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#f78c30] flex items-center justify-center text-white shadow-md shadow-[#f78c30]/30 group-hover:scale-105 transition-transform">
              <BedIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold text-[#0f172a] tracking-tight leading-none">
                  RoomSwap
                </span>
              </div>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
                LPU Hostel Room Exchange Platform
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Pixel-matched with active orange indicator) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, 'home')}
              className={`relative py-1 transition-colors ${
                activeNav === 'home' ? 'text-[#f78c30] font-bold' : 'text-slate-600 hover:text-[#f78c30]'
              }`}
            >
              <span>Home</span>
              {activeNav === 'home' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f78c30] rounded-full mx-auto" />
              )}
            </a>

            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className={`relative py-1 transition-colors ${
                activeNav === 'features' ? 'text-[#f78c30] font-bold' : 'text-slate-600 hover:text-[#f78c30]'
              }`}
            >
              <span>Features</span>
              {activeNav === 'features' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f78c30] rounded-full mx-auto" />
              )}
            </a>

            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className={`relative py-1 transition-colors ${
                activeNav === 'how-it-works' ? 'text-[#f78c30] font-bold' : 'text-slate-600 hover:text-[#f78c30]'
              }`}
            >
              <span>How It Works</span>
              {activeNav === 'how-it-works' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f78c30] rounded-full mx-auto" />
              )}
            </a>

            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className={`relative py-1 transition-colors ${
                activeNav === 'about' ? 'text-[#f78c30] font-bold' : 'text-slate-600 hover:text-[#f78c30]'
              }`}
            >
              <span>About</span>
              {activeNav === 'about' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f78c30] rounded-full mx-auto" />
              )}
            </a>
          </nav>

          {/* Right Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-[#f78c30] hover:bg-orange-50 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Card */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-7xl mx-auto mt-2 px-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-slate-200/90 space-y-3">
              <a
                href="#home"
                onClick={(e) => scrollToSection(e, 'home')}
                className={`block px-4 py-2 rounded-xl text-sm font-bold ${
                  activeNav === 'home' ? 'bg-orange-50 text-[#f78c30]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Home
              </a>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, 'features')}
                className={`block px-4 py-2 rounded-xl text-sm font-bold ${
                  activeNav === 'features' ? 'bg-orange-50 text-[#f78c30]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, 'how-it-works')}
                className={`block px-4 py-2 rounded-xl text-sm font-bold ${
                  activeNav === 'how-it-works' ? 'bg-orange-50 text-[#f78c30]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                How It Works
              </a>
              <a
                href="#about"
                onClick={(e) => scrollToSection(e, 'about')}
                className={`block px-4 py-2 rounded-xl text-sm font-bold ${
                  activeNav === 'about' ? 'bg-orange-50 text-[#f78c30]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                About
              </a>
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] text-white text-xs font-bold text-center shadow-md shadow-[#f78c30]/25"
                >
                  Sign In to RoomSwap
                </Link>
                <Link
                  to="/activate-account"
                  className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold text-center border border-slate-200"
                >
                  Activate Account
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. CINEMATIC HERO SECTION (Pixel-Matched to Reference Image)
          LPU Sunset Campus Gate + Building Tower background with left gradient
          ========================================================================= */}
      <section id="home" className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 overflow-hidden isolate">
        {/* Cinematic LPU Sunset Campus Gate Background Photo */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/images/lpu_sunset_gate.jpg"
            alt="Lovely Professional University Sunset Campus"
            className="w-full h-full object-cover object-right lg:object-center filter brightness-[0.98] contrast-[1.03]"
          />

          {/* Left Contrast Gradient: ensures absolute headline readability while keeping sunset tower vibrant on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 via-45% to-white/10 lg:via-40% lg:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/30" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left Column: Heading, Badges & CTAs */}
            <div className="lg:col-span-8 space-y-6 pt-4 sm:pt-6">

              {/* 1. Official Pill Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fff4eb] border border-[#fddbb7] text-[#c15510] text-xs font-bold shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#f78c30]" />
                <span>Official &middot; Secure &middot; LPU Verified Platform</span>
              </div>

              {/* 2. Main Headline with Orange Gradient & Curved Swoosh Accent */}
              <h1 className="text-4xl sm:text-6xl lg:text-[66px] font-black text-[#0f172a] tracking-tight leading-[1.08]">
                Find Your <br />
                <span className="bg-gradient-to-r from-[#f78c30] via-[#f99b4a] to-[#fb923c] bg-clip-text text-transparent drop-shadow-xs">
                  Better Space
                </span> <br />
                <span className="relative inline-block mt-0.5">
                  at LPU
                  {/* Exact curved orange brush swoosh matching reference image */}
                  <svg
                    className="absolute -bottom-2.5 sm:-bottom-3 left-0 w-full h-4 sm:h-5 text-[#f78c30] pointer-events-none overflow-visible"
                    viewBox="0 0 160 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 14 C40 18, 100 17, 155 4"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18 17 C55 20, 110 18, 145 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </svg>
                </span>
              </h1>

              {/* 3. Supporting Description */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-700 font-medium max-w-xl leading-relaxed pt-1">
                A trusted, graph-powered platform for LPU students and wardens to manage hostel room exchanges the right way.
              </p>

              {/* 4. The Two Attractive CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/login"
                  className="px-7 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#f78c30] to-[#f99b4a] hover:from-[#e27518] hover:to-[#f78c30] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#f78c30]/25 hover:shadow-xl hover:shadow-[#f78c30]/35 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Sign In to RoomSwap</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/activate-account"
                  className="px-7 py-3.5 sm:py-4 rounded-full bg-white/95 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#f78c30]" />
                  <span>Activate Account</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Fluid Organic Wave Graphic (Pixel-Matched to Reference Curve & Orange Sweep) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative block w-full h-12 sm:h-20 lg:h-24 text-white preserve-3d"
            preserveAspectRatio="none"
          >
            {/* Orange swoop accent on right edge */}
            <path
              d="M1040 55 C1180 85, 1340 25, 1440 0 L1440 120 L1040 120 Z"
              fill="#f78c30"
              opacity="0.95"
            />
            <path
              d="M1120 40 C1220 70, 1360 15, 1440 0 L1440 120 L1120 120 Z"
              fill="#e27518"
              opacity="0.4"
            />
            {/* White wave base */}
            <path
              d="M0 45 C320 100, 720 15, 1100 70 C1240 95, 1350 75, 1440 55 L1440 120 L0 120 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* =========================================================================
          3. HORIZONTAL FEATURE HIGHLIGHT SECTION (Pixel-Matched to Reference)
          4-Column glassmorphic card strip with icons and dividers
          ========================================================================= */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 mb-20">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

          {/* 1. Official LPU Channel */}
          <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-3 first:pt-0 first:px-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100/90 flex items-center justify-center text-[#f78c30] shrink-0 shadow-xs">
              <BedIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Official LPU Channel
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                All room changes in one platform
              </p>
            </div>
          </div>

          {/* 2. Policy Compliant */}
          <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Policy Compliant
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Eligibility and hostel rules validated
              </p>
            </div>
          </div>

          {/* 3. Direct & Multi-Party Swaps */}
          <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/90 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
              <RotateCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Direct &amp; Multi-Party Swaps
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Support for 2&ndash;5 person exchanges
              </p>
            </div>
          </div>

          {/* 4. Complete Audit Trail */}
          <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/90 flex items-center justify-center text-purple-600 shrink-0 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                Complete Audit Trail
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Every transfer is recorded
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FEATURES SECTION (Platform Capabilities)
          ========================================================================= */}
      <section id="features" className="py-20 bg-white border-y border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f78c30] bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200/80">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Engineered for Seamless Hostel Operations
            </h2>
            <p className="text-sm text-slate-500">
              Discover how Lovely Professional University’s smart matching engine automates room rotations with zero conflict.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-interactive p-7 rounded-3xl border border-slate-200/80 bg-slate-50/50 hover:bg-white space-y-3 shadow-xs hover:shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-[#f78c30] flex items-center justify-center shadow-xs">
                <GitFork className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Party Cycle Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Breaks the bottleneck of 1-to-1 trades. Traverses directed preference graphs to discover 3-way, 4-way, and 5-way room rotations automatically.
              </p>
            </div>

            <div className="card-interactive p-7 rounded-3xl border border-slate-200/80 bg-slate-50/50 hover:bg-white space-y-3 shadow-xs hover:shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Pre-Flight Policy Checks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically verifies fee clearance, disciplinary status, active allocations, and cooling-off timers before requests enter matching.
              </p>
            </div>

            <div className="card-interactive p-7 rounded-3xl border border-slate-200/80 bg-slate-50/50 hover:bg-white space-y-3 shadow-xs hover:shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Two-Phase Atomic Swaps</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Executed within transactional database locks. Previous beds are deallocated simultaneously before target beds are assigned, ensuring zero collisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW IT WORKS SECTION (Simple 4-Step Process)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-slate-50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f78c30] bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200/80">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How RoomSwap Works at LPU
            </h2>
            <p className="text-sm text-slate-500">
              Clear, transparent steps from preference submission to warden sign-off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-interactive bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 text-xs relative shadow-xs hover:shadow-xl">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Submit Preference</h4>
              <p className="text-slate-500 leading-relaxed">
                Choose your target hostel or select &ldquo;Any Compatible Hostel&rdquo; to maximize your rotation chances.
              </p>
            </div>

            <div className="card-interactive bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 text-xs relative shadow-xs hover:shadow-xl">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Engine Matches Cycles</h4>
              <p className="text-slate-500 leading-relaxed">
                The DFS cycle detector discovers optimal direct and multi-party loops adhering to gender and block constraints.
              </p>
            </div>

            <div className="card-interactive bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 text-xs relative shadow-xs hover:shadow-xl">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900">Student Consensus</h4>
              <p className="text-slate-500 leading-relaxed">
                Every participant reviews their proposed target bed and accepts the exchange proposal.
              </p>
            </div>

            <div className="card-interactive bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 text-xs relative shadow-xs hover:shadow-xl">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-[#f78c30] to-[#f99b4a] text-white font-black text-sm flex items-center justify-center font-mono shadow-xs">
                4
              </div>
              <h4 className="text-sm font-bold text-slate-900">Warden Approval</h4>
              <p className="text-slate-500 leading-relaxed">
                Hostel warden inspects participant acceptance and 1-click executes the atomic room swap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. ABOUT SECTION (Campus Housing Division & Panoramic Showcase)
          ========================================================================= */}
      <section id="about" className="py-20 bg-white border-t border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f78c30] bg-orange-50 px-3.5 py-1 rounded-full border border-orange-200/80">
                Campus Housing Division
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Lovely Professional University Hostel Management
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hostel life at LPU accommodates thousands of students across modern residential blocks. RoomSwap provides an official, transparent digital bridge between students seeking compatible living environments and wardens maintaining strict occupancy safety.
              </p>
            </div>

            {/* LPU Residential Life Card */}
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative group">
              <div className="aspect-[16/10] relative">
                <img
                  src="/images/lpu_panoramic_campus.jpg"
                  alt="Lovely Professional University Panoramic Campus"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f78c30]/90 backdrop-blur-md text-xs font-semibold text-white w-fit mb-2 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Official University Portal</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    Lovely Professional University Campus
                  </h3>
                  <p className="text-xs text-slate-200 mt-1 max-w-md">
                    Seamless hostel accommodation management ensuring academic comfort, safety, and transparent administrative oversight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FOOTER
          ========================================================================= */}
      <footer className="bg-[#0f172a] text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f78c30] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#f78c30]/30">
              <BedIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">RoomSwap</span>
              <span className="text-[11px] text-slate-500">
                Lovely Professional University Hostel Exchange Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="hover:text-white transition">Home</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition">Features</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-white transition">Workflow</a>
            <Link to="/activate-account" className="hover:text-white transition">Activate Account</Link>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
          </div>

          <div className="text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} Lovely Professional University. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Student Registration Modal */}
      <StudentRegisterModal
        isOpen={showStudentSignup}
        onClose={() => setShowStudentSignup(false)}
        onSuccess={() => {
          setShowStudentSignup(false);
          navigate('/login');
        }}
      />

      {/* Warden Registration Modal */}
      <WardenRegisterModal
        isOpen={showWardenSignup}
        onClose={() => setShowWardenSignup(false)}
        onSuccess={() => {
          setShowWardenSignup(false);
          navigate('/login');
        }}
      />
    </div>
  );
};

export default LandingPage;
