/**
 * Module: frontend/src/pages/warden/WardenNotificationsPage.jsx
 *
 * Work / Purpose:
 *   Warden notifications center displaying operational alerts and approval reminders.
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
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  FileCheck2,
  ArrowLeftRight,
  ShieldAlert,
  Info,
  Trash2,
  X
} from 'lucide-react';

export const WardenNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications().catch(() => null);
      if (res && (res.results || Array.isArray(res))) {
        const list = res.results || res;
        setNotifications(list);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event('refresh-counts'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead().catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('refresh-counts'));
      setActionSuccess('All notifications marked as read.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'APPROVAL') return n.type === 'APPROVAL';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
              <Bell className="w-4 h-4" />
              <span>Warden Alert Dispatcher</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Notifications & Alerts
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time administrative feed of student exchange requests, multi-party matching updates, and system notices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllRead}
              className="px-5 py-2.5 rounded-2xl bg-[#f4f7fb] hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80 flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: `All Alerts (${notifications.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'APPROVAL', label: 'Action Required' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition ${
                filter === tab.id
                  ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/20'
                  : 'bg-[#f4f7fb] text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs divide-y divide-slate-100">
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  className={`py-4 px-3 rounded-2xl transition cursor-pointer flex items-start justify-between gap-4 ${
                    isUnread ? 'bg-[#f8faff]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        n.type === 'APPROVAL'
                          ? 'bg-rose-50 text-rose-600'
                          : n.type === 'PROPOSAL'
                          ? 'bg-orange-50 text-[#f78c30]'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {n.type === 'APPROVAL' ? (
                        <FileCheck2 className="w-5 h-5" />
                      ) : n.type === 'PROPOSAL' ? (
                        <ArrowLeftRight className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1.5">
                        {n.created_at}
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-[#f78c30] bg-white border border-orange-200 hover:bg-orange-50 shrink-0"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No notifications in this category</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
export default WardenNotificationsPage;
