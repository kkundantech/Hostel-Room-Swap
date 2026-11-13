/**
 * Module: frontend/src/pages/student/StudentHistoryPage.jsx
 *
 * Work / Purpose:
 *   Dedicated Student page displaying completed room transfers and downloadable official transfer confirmation letters.
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
  FileCheck2,
  ArrowRight,
  FileText,
  Calendar,
  CheckCircle2,
  Download
} from 'lucide-react';

export const StudentHistoryPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppLayout
      pageTitle="Transfer History & Letters"
      pageDescription="Official records of completed room exchanges. Download verified PDF transfer authorization letters for hostel office verification."
    >
      <div className="space-y-6">
        <div className="app-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading transfer history...</div>
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No Transfer Records Found"
              description="You have not participated in any completed room exchanges yet. When a proposal is approved by the warden, your official transfer record and PDF letter will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Transfer Ref</th>
                    <th>Previous Bed</th>
                    <th>Assigned Bed</th>
                    <th>Proposal</th>
                    <th>Completed Date</th>
                    <th>Warden Verified</th>
                    <th className="text-right">Transfer Letter</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-slate-500 font-semibold">
                        #{String(t.id).slice(0, 8)}
                      </td>
                      <td className="font-medium text-slate-700">
                        {t.from_bed_label}
                      </td>
                      <td className="font-semibold text-blue-700">
                        {t.to_bed_label}
                      </td>
                      <td className="font-mono text-slate-500 text-xs">
                        {t.proposal ? `#${String(t.proposal).slice(0, 8)}` : 'Manual Transfer'}
                      </td>
                      <td className="text-slate-500">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge badge-success flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved</span>
                        </span>
                      </td>
                      <td className="text-right">
                        <a
                          href={api.downloadTransferLetter(t.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
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

export default StudentHistoryPage;
