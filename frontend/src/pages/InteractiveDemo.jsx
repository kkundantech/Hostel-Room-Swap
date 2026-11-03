import React, { useState } from 'react';
import { api } from '../services/api';
import { CycleGraphVisualizer } from '../components/CycleGraphVisualizer';
import { 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  GitFork, 
  Database, 
  ArrowRight,
  AlertTriangle,
  Lock,
  Sparkles
} from 'lucide-react';

export const InteractiveDemo = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [log, setLog] = useState([
    'System initialized with 4 eligible students in Boys Hostel 1: Arjun, Rahul, Vikram, Aditya.',
    'Allocated beds: 101-A, 101-B, 102-A, 102-B.',
  ]);
  const [running, setRunning] = useState(false);
  const [simulatedCycle, setSimulatedCycle] = useState([
    {
      student_name: 'Arjun Verma',
      student_email: 'student1@hostel.edu',
      current_bed_label: 'BH1/A/101/A',
      proposed_bed_label: 'BH1/A/101/B',
      accepted: false,
      declined: false,
    },
    {
      student_name: 'Rahul Singh',
      student_email: 'student2@hostel.edu',
      current_bed_label: 'BH1/A/101/B',
      proposed_bed_label: 'BH1/A/102/A',
      accepted: false,
      declined: false,
    },
    {
      student_name: 'Vikram Patel',
      student_email: 'student3@hostel.edu',
      current_bed_label: 'BH1/A/102/A',
      proposed_bed_label: 'BH1/A/102/B',
      accepted: false,
      declined: false,
    },
    {
      student_name: 'Aditya Sharma',
      student_email: 'student4@hostel.edu',
      current_bed_label: 'BH1/A/102/B',
      proposed_bed_label: 'BH1/A/101/A',
      accepted: false,
      declined: false,
    },
  ]);
  const [proposalStatus, setProposalStatus] = useState('PENDING_ACCEPTANCE');

  const addLog = (msg) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const step1_runMatching = async () => {
    setRunning(true);
    addLog('Building directed compatibility graph G=(V,E)...');
    addLog('Evaluating edges with gender restrictions, fee clearance, and bed availability...');
    setTimeout(() => {
      addLog('Simple cycle detected: Arjun -> Rahul -> Vikram -> Aditya -> Arjun (Cycle length: 4)');
      addLog('Generated ExchangeProposal EX-2026-ROTATION (Status: PENDING_ACCEPTANCE)');
      setCurrentStep(2);
      setRunning(false);
    }, 800);
  };

  const step2_allAccept = () => {
    setRunning(true);
    addLog('Student 1 (Arjun) accepted proposed bed BH1/A/101/B');
    addLog('Student 2 (Rahul) accepted proposed bed BH1/A/102/A');
    addLog('Student 3 (Vikram) accepted proposed bed BH1/A/102/B');
    addLog('Student 4 (Aditya) accepted proposed bed BH1/A/101/A');
    
    setSimulatedCycle((prev) => prev.map((p) => ({ ...p, accepted: true })));
    setProposalStatus('PENDING_APPROVAL');
    addLog('All 4 participants accepted! Proposal forwarded to Warden Approval Queue.');
    setCurrentStep(3);
    setRunning(false);
  };

  const step3_wardenApprove = () => {
    setRunning(true);
    addLog('Warden Rajesh Kumar submitted approval for EX-2026-ROTATION.');
    addLog('Acquiring PostgreSQL SELECT FOR UPDATE locks on beds and proposal row...');
    addLog('PHASE 1: Deactivated 4 existing allocations atomically (freed all beds).');
    addLog('PHASE 2: Created 4 new active allocations for target beds.');
    addLog('Generated 4 permanent TransferRecord entries in immutable ledger.');
    addLog('Audited event LOGGED: PROPOSAL_APPROVED_AND_EXECUTED.');
    addLog('transaction.on_commit() triggered: Email dispatching complete.');

    setProposalStatus('COMPLETED');
    setCurrentStep(4);
    setRunning(false);
  };

  const resetTour = () => {
    setCurrentStep(1);
    setProposalStatus('PENDING_ACCEPTANCE');
    setSimulatedCycle((prev) => prev.map((p) => ({ ...p, accepted: false, declined: false })));
    setLog([
      'Demo reset: 4 eligible students ready in Boys Hostel 1.',
      'Allocations: 101-A, 101-B, 102-A, 102-B.',
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
            Automated Acceptance Scenario
          </span>
          <h1 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
            4-Student Multi-Party Rotation Tour
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Step-by-step walkthrough of the master project acceptance test scenario with live cycle graph animation.
          </p>
        </div>

        <button
          onClick={resetTour}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Reset Demo
        </button>
      </div>

      {/* Steps Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border transition ${
          currentStep >= 1 ? 'border-brand-500/50 bg-brand-50/50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400">STAGE 1</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Graph Cycle Search</h4>
          <p className="text-xs text-slate-500 mt-0.5">Detects 4-way rotation</p>
        </div>

        <div className={`p-4 rounded-2xl border transition ${
          currentStep >= 2 ? 'border-brand-500/50 bg-brand-50/50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400">STAGE 2</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Student Acceptances</h4>
          <p className="text-xs text-slate-500 mt-0.5">All 4 students confirm</p>
        </div>

        <div className={`p-4 rounded-2xl border transition ${
          currentStep >= 3 ? 'border-brand-500/50 bg-brand-50/50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400">STAGE 3</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Warden Authorization</h4>
          <p className="text-xs text-slate-500 mt-0.5">Two-phase atomic swap</p>
        </div>

        <div className={`p-4 rounded-2xl border transition ${
          currentStep >= 4 ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'
        }`}>
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">STAGE 4</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Transfer & Audit</h4>
          <p className="text-xs text-slate-500 mt-0.5">Immutable records verified</p>
        </div>
      </div>

      {/* Cycle Graph Component */}
      <CycleGraphVisualizer
        participants={simulatedCycle}
        cycleLength={4}
        status={proposalStatus}
      />

      {/* Interactive Controller Card */}
      <div className="glass-card p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {currentStep === 1 && 'Step 1: Execute Cycle Detection'}
            {currentStep === 2 && 'Step 2: Collect Mutual Student Acceptances'}
            {currentStep === 3 && 'Step 3: Authorized Warden Approval'}
            {currentStep === 4 && 'Scenario Complete: Reconciled Occupancy'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentStep === 1 && 'Run the DFS cycle algorithm to find the 4-student closed loop.'}
            {currentStep === 2 && 'Simulate all four students consenting to the proposed swap.'}
            {currentStep === 3 && 'Execute row-level locking and atomic occupancy updates.'}
            {currentStep === 4 && 'All allocations swapped atomically. Transfer records and audit entries are permanent.'}
          </p>
        </div>

        <div>
          {currentStep === 1 && (
            <button
              onClick={step1_runMatching}
              disabled={running}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/25 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Detect 4-Way Rotation</span>
            </button>
          )}

          {currentStep === 2 && (
            <button
              onClick={step2_allAccept}
              disabled={running}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept as All 4 Students</span>
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={step3_wardenApprove}
              disabled={running}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve as Warden</span>
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={resetTour}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Restart Tour</span>
            </button>
          )}
        </div>
      </div>

      {/* Execution Console Terminal Log */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-brand-400">
          <span className="font-bold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backend Execution Console & Audit Feed
          </span>
          <span className="text-[11px] text-slate-500 font-mono">PostgreSQL Atomic Transactions</span>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
          {log.map((line, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-brand-500 select-none mr-2">➜</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractiveDemo;
