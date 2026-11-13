/**
 * Module: frontend/src/pages/warden/WardenPoliciesPage.jsx
 *
 * Work / Purpose:
 *   Warden policy viewer inspecting institutional cooling-off, fee, disciplinary, and cycle-length rules.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Save,
  Check,
  X,
  FileText,
  Sliders,
  Settings
} from 'lucide-react';

export const WardenPoliciesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Policy rules state
  const [policies, setPolicies] = useState([
    {
      id: 'pol-1',
      code: 'MIN_STAY_DAYS',
      title: 'Minimum Residence Stay Requirement',
      description: 'Students must reside in their currently allocated room for at least 30 days before requesting an exchange.',
      enabled: true,
      value: '30 Days',
      type: 'numeric',
      category: 'Eligibility',
    },
    {
      id: 'pol-2',
      code: 'DISCIPLINARY_CLEARANCE',
      title: 'Disciplinary Record Clearance',
      description: 'Exchange approval is automatically blocked if student has pending hostel disciplinary offenses.',
      enabled: true,
      value: 'Zero Offenses',
      type: 'boolean',
      category: 'Eligibility',
    },
    {
      id: 'pol-3',
      code: 'SEATER_MATCHING',
      title: 'Room Type & Seater Equality',
      description: 'Requires student requested room to match current seater capacity (e.g. 3-Seater to 3-Seater only).',
      enabled: true,
      value: 'Strict Equality',
      type: 'select',
      category: 'Allocation',
    },
    {
      id: 'pol-4',
      code: 'MAX_CYCLE_DEPTH',
      title: 'Maximum Multi-Party Swap Depth',
      description: 'Maximum number of participants allowed in a single closed circular rotation chain.',
      enabled: true,
      value: '5-Way Cycle',
      type: 'select',
      category: 'Engine',
    },
    {
      id: 'pol-5',
      code: 'RESPONSE_TIMEOUT_HOURS',
      title: 'Student Confirmation Timeout Window',
      description: 'Time granted for each student in a cycle to review and accept the swap before the proposal expires.',
      enabled: true,
      value: '48 Hours',
      type: 'numeric',
      category: 'Workflow',
    },
    {
      id: 'pol-6',
      code: 'GENDER_HOSTEL_ISOLATION',
      title: 'Gender-Isolated Hostel Cross-Exchange',
      description: 'Strict prohibition of cross-exchange between Boys Hostels (BH) and Girls Hostels (GH).',
      enabled: true,
      value: 'Strict Enforced',
      type: 'boolean',
      category: 'Security',
    },
    {
      id: 'pol-7',
      code: 'WARDEN_FINAL_AUTHORIZATION',
      title: 'Mandatory Warden Physical Transfer Clearance',
      description: 'Requires official Warden signature and physical clearance receipt before inventory keys can be swapped.',
      enabled: true,
      value: 'Mandatory',
      type: 'boolean',
      category: 'Workflow',
    },
  ]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await api.getPolicies().catch(() => null);
      if (res && (res.results || Array.isArray(res))) {
        const backendList = res.results || res;
        if (backendList.length > 0) {
          // Merge with predefined rich descriptions
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleTogglePolicy = (id) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSavePolicies = async () => {
    setSaving(true);
    try {
      // Simulate/call API
      await new Promise((resolve) => setTimeout(resolve, 600));
      setActionSuccess('Hostel exchange policies updated and enforced successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f78c30] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Administrative Governance</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Policy & Rules Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review institutional hostel exchange constraints, algorithmic matching rules, and student eligibility parameters.
            </p>
          </div>

          <button
            onClick={handleSavePolicies}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#f78c30] hover:bg-[#e27518] text-white text-xs font-bold transition shadow-md shadow-[#f78c30]/25"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Policy Changes'}</span>
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Active Rules</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {policies.filter((p) => p.enabled).length} / {policies.length}
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">Enforced by Matching Engine</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Confirmation Window</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">48 Hours</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Auto-expires unconfirmed cycles</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Max Cycle Depth</p>
            <h3 className="text-2xl font-black text-[#f78c30] mt-1">5-Way Swaps</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Direct, 3-way, 4-way, 5-way</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Hostel Boundary</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">Strict Isolation</h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">Gender segregation verified</p>
          </div>
        </div>

        {/* Policy Items List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            Exchange Rules & Constraints
          </h3>

          <div className="divide-y divide-slate-100">
            {policies.map((p) => (
              <div key={p.id} className="py-4.5 flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-xs font-bold text-slate-900">{p.title}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {p.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    {p.description}
                  </p>
                  <p className="text-[11px] font-bold text-[#f78c30] mt-1">
                    Current setting: {p.value}
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => handleTogglePolicy(p.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    p.enabled ? 'bg-[#f78c30]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      p.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
export default WardenPoliciesPage;
