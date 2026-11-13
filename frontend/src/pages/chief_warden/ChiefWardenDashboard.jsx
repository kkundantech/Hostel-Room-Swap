/**
 * Module: frontend/src/pages/chief_warden/ChiefWardenDashboard.jsx
 *
 * Work / Purpose:
 *   Chief Warden oversight dashboard aggregating multi-hostel occupancy, proposals, and transfer activity.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/EmptyState.jsx
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Crown,
  Building,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck2,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';

export const ChiefWardenDashboard = () => {
  const [queue, setQueue] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [queueRes, hostelRes, histRes] = await Promise.allSettled([
        api.getApprovalQueue(),
        api.getHostels(),
        api.getApprovalRecords(),
      ]);

      if (queueRes.status === 'fulfilled') setQueue(queueRes.value.results || queueRes.value || []);
      if (hostelRes.status === 'fulfilled') setHostels(hostelRes.value.results || hostelRes.value || []);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.results || histRes.value || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalBeds = hostels.reduce((acc, h) => acc + (h.total_beds || 0), 0);
  const occupiedBeds = hostels.reduce((acc, h) => acc + (h.occupied_beds || 0), 0);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const pendingCount = queue.filter((p) => p.status === 'PENDING_APPROVAL').length;

  return (
    <AppLayout
      pageTitle="Chief Warden Executive Portal"
      pageDescription="Campus-wide oversight of cross-hostel exchange proposals, high-level approvals, and hostel occupancy balance."
      actionButton={
        <Link
          to="/chief-warden/queue"
          className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Crown className="w-4 h-4" />
          <span>Cross-Hostel Queue ({pendingCount})</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="app-card p-4">
            <span className="text-xs text-slate-500">Cross-Hostel Pending Review</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Ready for high-level authorization</p>
          </div>

          <div className="app-card p-4">
            <span className="text-xs text-slate-500">Active Campus Hostels</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{hostels.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">BH1, GH1 and campus halls</p>
          </div>

          <div className="app-card p-4">
            <span className="text-xs text-slate-500">Campus Occupancy</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{occupancyPct}%</div>
            <p className="text-[11px] text-slate-400 mt-1">{occupiedBeds} occupied of {totalBeds} total beds</p>
          </div>

          <div className="app-card p-4">
            <span className="text-xs text-slate-500">Total Transfers Logged</span>
            <div className="text-2xl font-bold text-purple-600 mt-1">{history.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Historical transfer ledger entries</p>
          </div>
        </div>

        {/* Priority Approval Queue */}
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-600" />
                <span>Cross-Hostel Approval Queue</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposals connecting students across different hostel buildings requiring chief authority sign-off.
              </p>
            </div>
            <Link
              to="/chief-warden/queue"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Full Queue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {queue.length === 0 ? (
            <EmptyState
              icon={Crown}
              title="No Pending Cross-Hostel Proposals"
              description="There are currently no proposals awaiting chief warden approval."
            />
          ) : (
            <div className="space-y-3">
              {queue.slice(0, 3).map((prop) => (
                <div
                  key={prop.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        Proposal #{String(prop.id).slice(0, 8)}
                      </span>
                      <span className="badge badge-neutral">{prop.cycle_length}-Party Cycle</span>
                      <StatusBadge status={prop.status} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Participants:{' '}
                      <span className="font-medium text-slate-700">
                        {prop.participants?.map((p) => p.student_name || p.student?.first_name || 'Student').join(', ')}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/chief-warden/queue"
                    className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Inspect & Authorize</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campus Hostel Overview Table */}
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Campus Hostel Occupancy Summary</span>
            </h3>
            <Link
              to="/chief-warden/occupancy"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Bed Layout Grid</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Code</th>
                  <th>Total Beds</th>
                  <th>Occupied Beds</th>
                  <th>Vacant Beds</th>
                  <th>Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map((h) => {
                  const pct = h.total_beds > 0 ? Math.round((h.occupied_beds / h.total_beds) * 100) : 0;
                  return (
                    <tr key={h.id}>
                      <td className="font-semibold text-slate-900">{h.name}</td>
                      <td className="font-mono text-slate-500">{h.code}</td>
                      <td>{h.total_beds}</td>
                      <td className="font-semibold text-emerald-700">{h.occupied_beds}</td>
                      <td className="font-semibold text-blue-700">{h.vacant_beds}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-700">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChiefWardenDashboard;
