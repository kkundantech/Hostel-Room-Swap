import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  ArrowLeftRight,
  Building,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const REPORT_CATEGORIES = [
  {
    id: 'EXCHANGE_REQUESTS',
    label: 'Exchange Requests Report',
    description: 'Volume, status progression, target preferences, and expiration trends.',
    icon: ArrowLeftRight,
  },
  {
    id: 'COMPLETED_TRANSFERS',
    label: 'Completed Transfers Ledger',
    description: 'Authoritative student bed exchanges executed atomically via transactional locks.',
    icon: CheckCircle2,
  },
  {
    id: 'HOSTEL_OCCUPANCY',
    label: 'Hostel Occupancy & Capacity',
    description: 'Live bed counts, occupied capacity, maintenance hold, and P03 sync freshness.',
    icon: Building,
  },
  {
    id: 'CYCLE_ANALYTICS',
    label: 'Multi-Party Cycle Analytics',
    description: 'Direct swap vs 3, 4, 5-cycle distribution, acceptance rates, and completion velocity.',
    icon: RotateCcw,
  },
  {
    id: 'APPROVAL_PERFORMANCE',
    label: 'Approval SLA & Performance',
    description: 'Turnaround duration, pending approvals by age, and warden approval throughput.',
    icon: Clock,
  },
  {
    id: 'ELIGIBILITY_VALIDATION',
    label: 'Eligibility & Validation Audit',
    description: 'Disciplinary blocks, gender/hostel boundary checks, cooling-off flags, and stale data.',
    icon: Shield,
  },
  {
    id: 'USER_AUTHORIZATION',
    label: 'User Roster & Authorization',
    description: 'Authorized students, active registrations, pre-approved wardens, and revocation state.',
    icon: Users,
  },
  {
    id: 'AUDIT',
    label: 'System Audit Logs',
    description: 'Immutable trail of administrative overrides, policy updates, and security events.',
    icon: FileText,
  },
];

export const AdminReportsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('EXCHANGE_REQUESTS');
  const [dateRange, setDateRange] = useState('30D');
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [hostels, setHostels] = useState([]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Load hostels for filter
  useEffect(() => {
    api.getHostels().then((res) => {
      setHostels(res.results || res || []);
    }).catch(console.error);
  }, []);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.generateAdminReport({
        category: selectedCategory,
        date_range: dateRange,
        hostel_id: hostelFilter === 'ALL' ? null : hostelFilter,
      });
      setReportData(res);
      setFeedback({ type: 'success', message: 'Report generated successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateReport();
  }, [selectedCategory, dateRange]);

  const handlePrint = () => {
    window.print();
  };

  const currentCategoryMeta = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <AppLayout
      pageTitle="System Reports & Governance Exports"
      pageDescription="Reliable reporting for administrative operations, multi-party exchange activity, warden approvals, and authoritative occupancy."
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
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="font-bold text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Category Picker (Horizontal scrollable or grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {REPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-600/30'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:border-purple-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {cat.label.replace(' Report', '').replace(' Ledger', '')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter and Control Ribbon */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              {currentCategoryMeta && <currentCategoryMeta.icon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{currentCategoryMeta?.label}</h3>
              <p className="text-xs text-slate-500">{currentCategoryMeta?.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
                <option value="90D">Last 90 Days</option>
                <option value="SEMESTER">Current Academic Semester</option>
                <option value="ALL">All Recorded Time</option>
              </select>
            </div>

            {/* Hostel Scope Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Hostels Scope</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print / PDF</span>
            </button>

            {/* Export CSV Button */}
            <a
              href={api.getReportExportCSVUrl(selectedCategory, dateRange)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Report Preview Section */}
        {loading ? (
          <div className="app-card p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span>Compiling report analytics and authoritative data...</span>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Metrics KPI Cards */}
            {reportData.summary_metrics && Object.keys(reportData.summary_metrics).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {Object.entries(reportData.summary_metrics).map(([key, val]) => (
                  <div key={key} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">
                      {typeof val === 'number' && key.includes('rate') ? `${val}%` : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Records Data Table Preview */}
            <div className="app-card overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Report Preview Records ({reportData.records?.length || 0})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Showing latest matching records for {dateRange} timeframe
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Generated: {new Date(reportData.generated_at).toLocaleTimeString()}
                </div>
              </div>

              {(!reportData.records || reportData.records.length === 0) ? (
                <EmptyState
                  icon={FileText}
                  title="No Records Found"
                  description="No historical entries match this report category and selected timeframe."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="app-table">
                    <thead>
                      <tr>
                        {Object.keys(reportData.records[0] || {}).map((col) => (
                          <th key={col} className="capitalize">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.records.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          {Object.entries(row).map(([k, v], cellIdx) => (
                            <td key={cellIdx} className="text-xs">
                              {typeof v === 'boolean' ? (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    v
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {v ? 'Yes' : 'No'}
                                </span>
                              ) : (
                                <span className={k.includes('id') || k.includes('code') ? 'font-mono text-purple-800 font-semibold' : 'text-slate-700'}>
                                  {String(v ?? '—')}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default AdminReportsPage;
