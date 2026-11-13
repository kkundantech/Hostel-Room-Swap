/**
 * Module: frontend/src/pages/admin/AdminPoliciesPage.jsx
 *
 * Work / Purpose:
 *   Hostel Admin policy governance page for viewing and updating platform exchange PolicyRule parameters.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  Clock,
  Layers,
  Sparkles,
  Search,
  Filter,
  History,
  Play,
  X,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  Building
} from 'lucide-react';

export const AdminPoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals & Active Selections
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Edit form state
  const [proposedValue, setProposedValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await api.getPolicies();
      setPolicies(res.results || res || []);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // Helper to categorize policy rules
  const getPolicyCategory = (key) => {
    if (key.includes('COOLING')) return 'Cooling-Off';
    if (key.includes('FEE')) return 'Fee Clearance';
    if (key.includes('DISCIPLINARY')) return 'Disciplinary Holds';
    if (key.includes('EXPIRY') || key.includes('VALIDITY')) return 'Expiry Windows';
    if (key.includes('CYCLE')) return 'Cycle Sizes';
    if (key.includes('WARDEN') || key.includes('CROSS')) return 'Approval Permissions';
    if (key.includes('ELIGIBILITY') || key.includes('GENDER')) return 'Hostel Eligibility';
    return 'General Governance';
  };

  const filteredPolicies = policies.filter((p) => {
    const q = searchQuery.toLowerCase();
    const category = getPolicyCategory(p.key);
    const matchesSearch =
      p.key.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'ALL' || category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenEdit = (policy) => {
    setSelectedPolicy(policy);
    setProposedValue(policy.value);
    setChangeReason('');
    setSimulationResult(null);
    setShowEditModal(true);
  };

  const handleOpenHistory = async (policy) => {
    setSelectedPolicy(policy);
    setShowHistoryModal(true);
    try {
      setHistoryLoading(true);
      const res = await api.getPolicyHistory(policy.id);
      setHistoryList(res.history || []);
    } catch (err) {
      console.error('Failed to fetch policy history:', err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!selectedPolicy) return;
    try {
      setSimulating(true);
      const res = await api.simulatePolicy({
        policy_key: selectedPolicy.key,
        proposed_value: proposedValue,
      });
      setSimulationResult(res);
    } catch (err) {
      setSimulationResult({
        error: true,
        summary: err.response?.data?.error || err.message,
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    if (!changeReason.trim()) {
      alert('A change reason is mandatory to maintain compliance and audit logs.');
      return;
    }

    try {
      setSubmitting(true);
      await api.updatePolicy(selectedPolicy.id, {
        value: String(proposedValue),
        change_reason: changeReason.trim(),
      });
      setFeedback({
        type: 'success',
        text: `Policy ${selectedPolicy.key} updated successfully and audit log created.`,
      });
      setShowEditModal(false);
      fetchPolicies();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Configure Policies & Governance"
      pageDescription="Auditable policy engine for hostel room exchange eligibility, cooling-off windows, fee clearance, and cycle constraints."
    >
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="font-bold text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Active Policies
              </span>
              <span className="text-xl font-black text-slate-900">{policies.length} Rules</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Policy Categories
              </span>
              <span className="text-xl font-black text-slate-900">7 Core Areas</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Enforcement Mode
              </span>
              <span className="text-xl font-black text-emerald-600">Strict Server-Side</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Audit Tracking
              </span>
              <span className="text-xl font-black text-slate-900">Append-Only</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search policy name, key, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="Hostel Eligibility">Hostel Eligibility</option>
              <option value="Cooling-Off">Cooling-Off Period</option>
              <option value="Fee Clearance">Fee Clearance</option>
              <option value="Disciplinary Holds">Disciplinary Holds</option>
              <option value="Expiry Windows">Request & Proposal Expiry</option>
              <option value="Cycle Sizes">Cycle Size Constraints</option>
              <option value="Approval Permissions">Approval Permissions</option>
            </select>
          </div>
        </div>

        {/* Policy Rules Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading policy rules...</span>
            </div>
          ) : filteredPolicies.length === 0 ? (
            <EmptyState
              icon={Settings}
              title="No Policy Rules Match"
              description="No configurable policy rules match your search parameters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Rule Identifier</th>
                    <th>Category</th>
                    <th>Current Value</th>
                    <th>Value Type</th>
                    <th>Scope</th>
                    <th>Status</th>
                    <th>Last Modified</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((p) => {
                    const category = getPolicyCategory(p.key);
                    const isBool = p.value_type === 'BOOLEAN';
                    const boolVal = String(p.value).toLowerCase() === 'true';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div>
                            <span className="font-mono text-xs font-bold text-purple-900 block">
                              {p.key}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {p.description || 'Configurable university governance threshold'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {category}
                          </span>
                        </td>

                        <td>
                          {isBool ? (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                boolVal
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {boolVal ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              <span>{boolVal ? 'True (Enforced)' : 'False (Bypassed)'}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {p.value}
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="font-mono text-[10px] text-slate-500 uppercase">
                            {p.value_type}
                          </span>
                        </td>

                        <td>
                          <span className="text-xs text-slate-600 font-medium">
                            {p.hostel ? `Hostel: ${p.hostel.name}` : 'Global Campus'}
                          </span>
                        </td>

                        <td>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        </td>

                        <td>
                          <span className="text-[11px] text-slate-500">
                            {new Date(p.updated_at).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenHistory(p)}
                              title="View Audit Version History"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 hover:border-purple-300"
                            >
                              <Settings className="w-3 h-3 text-purple-600" />
                              <span>Configure</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT & SIMULATION MODAL */}
      {showEditModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure Policy Rule
                  </h3>
                  <p className="text-[11px] font-mono text-purple-700">{selectedPolicy.key}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Context
                </label>
                <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedPolicy.description || 'University rule strictly enforced before exchange matching and execution.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Policy Value <span className="text-rose-500">*</span>
                </label>
                {selectedPolicy.value_type === 'BOOLEAN' ? (
                  <select
                    value={String(proposedValue).toLowerCase()}
                    onChange={(e) => setProposedValue(e.target.value)}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="true">True (Mandatory Enforcement)</option>
                    <option value="false">False (Bypassed / Not Enforced)</option>
                  </select>
                ) : selectedPolicy.key === 'MAX_CYCLE_LENGTH' ? (
                  <select
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="2">2 Students (Direct Swap Only)</option>
                    <option value="3">3 Students (Direct + 3-Party Cycle)</option>
                    <option value="4">4 Students (Up to 4-Party Cycle)</option>
                    <option value="5">5 Students (Full 5-Party Rotation)</option>
                  </select>
                ) : (
                  <input
                    type={selectedPolicy.value_type === 'INTEGER' ? 'number' : 'text'}
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    className="input-field text-xs font-mono font-bold"
                    required
                  />
                )}
              </div>

              {/* Simulation Test Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="w-full py-2 px-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{simulating ? 'Simulating impact against live requests...' : 'Simulate Rule Impact (Preview)'}</span>
                </button>

                {simulationResult && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-fade-in">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                        Simulation Result:
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          simulationResult.impact_level === 'HIGH'
                            ? 'bg-rose-100 text-rose-700'
                            : simulationResult.impact_level === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {simulationResult.impact_level || 'LOW'} IMPACT
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{simulationResult.summary}</p>
                    {simulationResult.affected_count > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        Affected active records: {simulationResult.affected_count}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Change Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="State the institutional justification for this policy revision..."
                  className="input-field text-xs resize-none"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !changeReason.trim()}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Committing...' : 'Save & Enforce Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Audit Version History
                  </h3>
                  <p className="text-[11px] font-mono text-purple-700">{selectedPolicy.key}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5">
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading audit trail...</div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No revision history recorded for this policy rule yet.
                </div>
              ) : (
                historyList.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700">{entry.changed_by}</span>
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs my-1">
                      <span className="line-through text-slate-400">{entry.old_value || 'Initial'}</span>
                      <ArrowRight className="w-3 h-3 text-purple-500" />
                      <span className="font-bold text-purple-700">{entry.new_value}</span>
                    </div>
                    {entry.change_reason && (
                      <p className="text-slate-600 text-[11px] mt-1 italic">
                        Reason: "{entry.change_reason}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminPoliciesPage;
