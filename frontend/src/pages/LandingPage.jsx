import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentRegisterModal } from '../components/auth/StudentRegisterModal';
import { WardenRegisterModal } from '../components/auth/WardenRegisterModal';
import {
  Building,
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
  Clock,
  Layers,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showStudentSignup, setShowStudentSignup] = useState(false);
  const [showWardenSignup, setShowWardenSignup] = useState(false);
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
        // Fallback demo stats
      }
    };
    loadStats();
  }, []);



  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-800">
      {/* 1. Header Navigation Bar (Pixel-matched to LPU RoomSwap reference) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <BedIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                  RoomSwap
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
                LPU Hostel Room Exchange Platform
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#home"
              className="text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
            >
              Home
            </a>
            <a
              href="#features"
              className="hover:text-indigo-600 transition"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-indigo-600 transition"
            >
              How It Works
            </a>
            <a
              href="#about"
              className="hover:text-indigo-600 transition"
            >
              About
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === 'STUDENT' ? '/student' : user.role === 'WARDEN' ? '/warden' : '/admin'}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Background Campus & Role Cards */}
      <section id="home" className="relative pt-12 pb-24 overflow-hidden isolate">
        {/* Background LPU Sunset Campus Gate Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/images/lpu_sunset_gate.jpg"
            alt="Lovely Professional University Campus Entrance"
            className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.05]"
          />
          {/* Subtle translucent gradient: keeps headline readable on left while sunset gate & tower shine on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 via-transparent to-slate-900/10" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Hero Header Area */}
          <div className="max-w-3xl space-y-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-purple-300 text-purple-800 text-xs font-bold tracking-wide shadow-xs">
              <GraduationCap className="w-4 h-4 text-purple-700" />
              <span>Official &middot; Secure &middot; LPU Verified</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Find Your <br />
              <span className="text-indigo-600">Better Space</span> <br />
              at LPU
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-700 font-medium max-w-xl leading-relaxed">
              A trusted platform for LPU students and wardens to manage hostel room exchanges the right way.
            </p>

            {/* 4 Feature Badges in a Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Policy Validated</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Direct & Multi-Party Swaps</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Fully Transparent</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Official Approval</span>
              </span>
            </div>
            {/* Hero Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                to="/login"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
              >
                <span>Sign In to RoomSwap</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/activate-account"
                className="px-5 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-700 font-bold text-xs sm:text-sm border border-slate-200/80 shadow-xs transition flex items-center gap-2"
              >
                <span>Activate Account</span>
              </Link>
            </div>
          </div>

          {/* Floating Feature Pills Bar (Pixel matched to LPU RoomSwap reference) */}
          <div className="mt-8 pt-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <BedIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Official LPU Channel</h4>
                  <p className="text-[11px] text-slate-500 font-medium">All room changes in one platform</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Policy Compliant</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Eligibility and hostel rules validated</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Direct &amp; Multi-Party Swaps</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Support for 2&ndash;5 person exchanges</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Complete Audit Trail</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Every transfer is recorded</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
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
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <GitFork className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Party Cycle Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Breaks the bottleneck of 1-to-1 trades. Traverses directed preference graphs to discover 3-way, 4-way, and 5-way room rotations automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Pre-Flight Policy Checks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically verifies fee clearance, disciplinary status, active allocations, and cooling-off timers before requests enter matching.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Two-Phase Atomic Swaps</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Executed within transactional database locks. Previous beds are deallocated simultaneously before target beds are assigned, ensuring zero collisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
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
            <div className="app-card p-5 space-y-3 text-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center font-mono">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Submit Preference</h4>
              <p className="text-slate-500">
                Choose your target hostel or select "Any Compatible Hostel" to maximize your rotation chances.
              </p>
            </div>

            <div className="app-card p-5 space-y-3 text-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center font-mono">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Engine Matches Cycles</h4>
              <p className="text-slate-500">
                The DFS cycle detector discovers optimal direct and multi-party loops adhering to gender and block constraints.
              </p>
            </div>

            <div className="app-card p-5 space-y-3 text-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center font-mono">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900">Student Consensus</h4>
              <p className="text-slate-500">
                Every participant reviews their proposed target bed and accepts the exchange proposal.
              </p>
            </div>

            <div className="app-card p-5 space-y-3 text-xs relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center font-mono">
                4
              </div>
              <h4 className="text-sm font-bold text-slate-900">Warden Approval</h4>
              <p className="text-slate-500">
                Hostel warden inspects participant acceptance and 1-click executes the atomic room swap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. About & LPU Campus Housing Statistics */}
      <section id="about" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Campus Housing Division
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Lovely Professional University Hostel Management
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hostel life at LPU accommodates thousands of students across modern residential blocks. RoomSwap provides an official, transparent digital bridge between students seeking compatible living environments and wardens maintaining strict occupancy safety.
              </p>

              <div className="pt-2 grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-medium">Campus Capacity</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">80 Initial Beds</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">BH1 & GH1 Configured</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 font-medium">Cycle Rotation</span>
                  <div className="text-xl font-bold text-indigo-600 mt-0.5">Up to 5-Way</div>
                  <span className="text-[11px] text-slate-500 font-semibold">Graph-Powered</span>
                </div>
              </div>
            </div>

            {/* LPU Residential Life Card */}
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-lg relative group">
              <div className="aspect-[16/10] relative">
                <img
                  src="/images/lpu_panoramic_campus.jpg"
                  alt="Lovely Professional University Campus"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-xs font-semibold text-white w-fit mb-2 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Official University Portal</span>
                  </div>
                  <h3 className="text-lg font-bold">
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

      {/* 7. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              <BedIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">RoomSwap</span>
              <span className="text-[11px] text-slate-500">
                Lovely Professional University Hostel Exchange Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#home" className="hover:text-white transition">Home</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-white transition">Workflow</a>
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
