import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileCheck2,
  ArrowRight,
  Download,
  Search,
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const TransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await api.getTransfers();
      setTransfers(res.results || res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filteredTransfers = transfers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.student_email || '').toLowerCase().includes(q) ||
      (t.from_bed_label || '').toLowerCase().includes(q) ||
      (t.to_bed_label || '').toLowerCase().includes(q) ||
      (t.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout
      pageTitle="Permanent Transfer Ledger"
      pageDescription="Authoritative records of completed room exchanges executed with ACID two-phase allocations and warden approval."
      actionButton={
        <a
          href={api.getExportTransfersCSVUrl()}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Ledger CSV</span>
        </a>
      }
    >
      <div className="space-y-6">
        {/* Search bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, bed label, or transfer ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredTransfers.length} transfer record{filteredTransfers.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Ledger Table */}
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading ledger...</div>
          ) : filteredTransfers.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No Transfer Records Found"
              description="No room transfers have been completed matching your search. Records are automatically written when a warden authorizes a proposal."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Transfer Ref</th>
                    <th>Proposal</th>
                    <th>Student Participant</th>
                    <th>Bed Rotation (From &rarr; To)</th>
                    <th>Execution Date</th>
                    <th>Status</th>
                    <th className="text-right">Transfer Letter</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-slate-900 font-bold">
                        #{String(t.id).slice(0, 8)}
                      </td>
                      <td className="font-mono text-blue-700 text-xs">
                        {t.proposal ? `#${String(t.proposal).slice(0, 8)}` : 'Manual'}
                      </td>
                      <td className="text-slate-800">
                        <div className="font-semibold text-xs">{t.student_name || 'Student'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{t.student_email || t.student?.email}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {t.from_bed_label}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-blue-700 bg-blue-50 font-bold px-2 py-0.5 rounded border border-blue-200">
                            {t.to_bed_label}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-500 text-xs">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-success flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>COMPLETED</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <a
                          href={api.downloadTransferLetter(t.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>PDF Letter</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TransfersPage;
