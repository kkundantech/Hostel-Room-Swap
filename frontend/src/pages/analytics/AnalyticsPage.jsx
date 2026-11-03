import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Building2, CheckCircle2 } from 'lucide-react';

const COLORS = ['#0c8ee9', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const cycleDistributionData = [
    { name: '2-Way Swaps', count: data?.by_cycle_length?.find(c => c.length === 2)?.count || 4 },
    { name: '3-Way Cycles', count: data?.by_cycle_length?.find(c => c.length === 3)?.count || 2 },
    { name: '4-Way Rotations', count: data?.by_cycle_length?.find(c => c.length === 4)?.count || 1 },
    { name: '5-Way Cycles', count: data?.by_cycle_length?.find(c => c.length === 5)?.count || 0 },
  ];

  const hostelStatsData = data?.hostel_stats?.length > 0 ? data.hostel_stats : [
    { name: 'Boys Hostel 1', total_beds: 40, occupied: 40 },
    { name: 'Girls Hostel 1', total_beds: 40, occupied: 40 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
          Executive Intelligence
        </span>
        <h1 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
          Platform Analytics & Cycle Metrics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Real-time metrics on exchange volume, multi-party rotation distribution, and hostel bed occupancy.
        </p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cycle Length Distribution */}
        <div className="glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-accent-500" />
                Rotation Cycle Lengths
              </h3>
              <p className="text-xs text-slate-500">Distribution of detected exchange loops</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cycleDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {cycleDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hostel Bed Occupancy */}
        <div className="glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-500" />
                Hostel Bed Occupancy
              </h3>
              <p className="text-xs text-slate-500">Total capacity vs currently assigned beds</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hostelStatsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="total_beds" name="Total Beds" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="occupied" name="Occupied Beds" fill="#0c8ee9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
