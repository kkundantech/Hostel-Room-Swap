import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building, Bed as BedIcon, CheckCircle2, User, Layers, RefreshCw } from 'lucide-react';

export const BedMatrixPage = () => {
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const res = await api.getHostels();
      const list = res.results || res || [];
      setHostels(list);
      if (list.length > 0) setSelectedHostel(list[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20">
            Hostel Visualizer
          </span>
          <h1 className="text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
            Occupancy & Bed Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual room layout grid displaying bed occupancy, resident details, and exchange eligibility.
          </p>
        </div>

        {/* Hostel Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800 border border-slate-300/40 dark:border-slate-700/60">
          {hostels.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHostel(h)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedHostel?.id === h.id
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {h.name} ({h.code})
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Blocks and Rooms */}
      {selectedHostel && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedHostel.name} ({selectedHostel.code})
                  </h3>
                  <p className="text-xs text-slate-400">Total 2 Blocks | 20 Rooms | 40 Beds</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Occupied</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-brand-500" />
                  <span>Available for Exchange</span>
                </span>
              </div>
            </div>

            {/* Room Matrix Mock Layout */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {Array.from({ length: 10 }, (_, i) => 101 + i).map((roomNum) => (
                <div
                  key={roomNum}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                      Room {roomNum}
                    </span>
                    <span className="text-[10px] text-slate-400">Block A</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-center">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                        Bed A
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate">Occupied</span>
                    </div>
                    <div className="p-2 rounded-xl bg-brand-100 dark:bg-brand-950/60 border border-brand-300 dark:border-brand-800/60 text-center">
                      <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 block font-mono">
                        Bed B
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate">Occupied</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedMatrixPage;
