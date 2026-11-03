import React, { useState } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  PlayCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

export const AdminMatchingPage = () => {
  const [maxLength, setMaxLength] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRunMatching = async (e) => {
    e.preventDefault();
    setRunning(true);
    setResult(null);
    setError('');

    try {
      const res = await api.triggerMatching(Number(maxLength));
      setResult(res);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Error executing matching engine.';
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Matching Cycle Engine"
      pageDescription="Configure and execute the graph cycle detection algorithm to match multi-party room exchange requests."
    >
      <div className="space-y-6">
        {/* Runner Control Card */}
        <div className="app-card p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Execute Graph Matching Engine
              </h3>
              <p className="text-xs text-slate-500">
                Traverses open student exchange requests and detects optimal directed cycles from length 2 to {maxLength}.
              </p>
            </div>
          </div>

          <form onSubmit={handleRunMatching} className="mt-5 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Cycle Length ($k$-Way Rotations)
              </label>
              <select
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              >
                <option value={2}>2-Party Direct Swaps Only</option>
                <option value={3}>Up to 3-Party Cycles</option>
                <option value={4}>Up to 4-Party Cycles</option>
                <option value={5}>Up to 5-Party Cycles (Campus Maximum)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Higher lengths unlock complex rotational swaps where students A &rarr; B &rarr; C &rarr; D &rarr; A can satisfy their room preferences simultaneously.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={running}
                className="btn-primary text-xs flex items-center gap-2 px-5 py-2.5 shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{running ? 'Running Graph Traversal...' : 'Trigger Cycle Detection'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Execution Results Card */}
        {result && (
          <div className="app-card p-6 border-emerald-200 bg-emerald-50/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold">Matching Execution Successful</h4>
              </div>
              <span className="badge badge-success">Completed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400">Cycles Discovered</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {result.cycles_found ?? result.proposals_created ?? 0}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400">New Proposals Created</span>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {result.proposals_created ?? 0}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400">Algorithm Status</span>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {result.status || 'Success'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {result.detail || 'Proposals have been generated and dispatched to students for acceptance review.'}
            </p>
          </div>
        )}

        {/* Graph Theory Architectural Card */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Algorithm Architecture & Invariant Guarantees</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Cycle Pruning & Filtering</span>
              </h5>
              <p>
                The matching engine builds a directed preference graph $G = (V, E)$ where nodes represent currently occupied beds. Edges are filtered by:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>Gender-block restrictions (boys blocks $\leftrightarrow$ girls blocks strictly isolated)</li>
                <li>Hostel preference match (exact hostel match or campus-wide wildcard)</li>
                <li>Active student policy clearance (cooling-off, zero disciplinary holds)</li>
                <li>Canonical sorting to prevent duplicate cyclic permutations</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Atomic Multi-Party Execution</span>
              </h5>
              <p>
                When a $k$-way cycle is approved:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>Two-phase atomic database transaction ensures zero transient collision</li>
                <li>Phase 1: Deallocate all participants from their previous beds</li>
                <li>Phase 2: Assign all participants to their new target beds</li>
                <li>Transaction aborts and rolls back completely if any invariant fails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminMatchingPage;
