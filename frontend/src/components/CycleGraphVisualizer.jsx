/**
 * Module: frontend/src/components/CycleGraphVisualizer.jsx
 *
 * Work / Purpose:
 *   Visual SVG/node cycle diagram component rendering multi-party room swap participants and directional bed transitions.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/InteractiveDemo.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { ArrowRight, UserCheck, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export const CycleGraphVisualizer = ({ participants = [], cycleLength = 0, status = '' }) => {
  if (!participants || participants.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-white overflow-hidden relative shadow-glass backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
              {cycleLength}-Way Rotation Cycle
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              status === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {status.replace('_', ' ')}
            </span>
          </div>
          <h3 className="text-lg font-semibold mt-1">Multi-Party Room Rotation Plan</h3>
        </div>
        <p className="text-xs text-slate-400 max-w-xs text-right">
          Every participant vacates their bed and moves into their preferred target bed simultaneously upon approval.
        </p>
      </div>

      {/* Rotation Track Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {participants.map((p, idx) => {
          const isAccepted = p.accepted;
          const isDeclined = p.declined;
          const studentName = p.student_name || p.student?.first_name 
            ? `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.trim() 
            : `Student ${idx + 1}`;
          const currentBed = p.current_bed_label || p.current_bed?.full_label || 'Current Bed';
          const proposedBed = p.proposed_bed_label || p.proposed_bed?.full_label || 'Proposed Bed';

          return (
            <div
              key={p.id || idx}
              className={`p-4 rounded-xl border transition-all duration-300 relative ${
                isAccepted
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-500/10'
                  : isDeclined
                  ? 'bg-rose-950/30 border-rose-500/40'
                  : 'bg-slate-800/50 border-slate-700/60'
              }`}
            >
              {/* Step counter */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-400">
                  STEP {idx + 1}
                </span>
                {isAccepted ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                  </span>
                ) : isDeclined ? (
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                    Declined
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Awaiting
                  </span>
                )}
              </div>

              {/* Student details */}
              <div className="mb-4">
                <p className="font-semibold text-slate-100 text-sm truncate">{studentName}</p>
                <p className="text-xs text-slate-400 truncate">{p.student_email || p.student?.email}</p>
              </div>

              {/* Bed movement */}
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-700/50 text-xs">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>From:</span>
                  <span className="font-mono text-slate-200">{currentBed}</span>
                </div>
                <div className="my-1.5 flex justify-center text-brand-400">
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-brand-300 font-semibold flex items-center justify-between">
                  <span>Moves to:</span>
                  <span className="font-mono text-brand-400">{proposedBed}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CycleGraphVisualizer;
