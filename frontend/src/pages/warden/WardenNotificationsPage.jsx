/**
 * Module: frontend/src/pages/warden/WardenNotificationsPage.jsx
 *
 * Work / Purpose:
 *   Warden and Administrator notifications center displaying operational alerts,
 *   real-time student room change requests, swap proposals, and approval reminders.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx (routed for /warden/notifications and /admin/notifications)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - frontend/src/services/api.js
 *   - frontend/src/utils/realtimeSync.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  Bell,
  CheckCircle2,
  Clock,
  Check,
  FileCheck2,
  ArrowLeftRight,
  Shield,
  Info,
  Calendar,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Inbox,
  X
} from 'lucide-react';

export const WardenNotificationsPage = () => {
  const navigate = useNavigate();
  const { user, isWarden, isAdmin, isSuperAdmin } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchNotifications = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.getNotifications().catch(() => null);
      if (res && (res.results || Array.isArray(res))) {
        const list = res.results || res;
        setNotifications(list);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      if (!isSilent) setNotifications([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);
  }, []);

  // Real-time synchronization
  useRealtimeSync(() => {
    fetchNotifications(true);
  }, { pollIntervalMs: 6000 });

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationRead(id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event('refresh-counts'));
      window.dispatchEvent(new Event('realtime-sync'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead().catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('refresh-counts'));
      window.dispatchEvent(new Event('realtime-sync'));
      setActionSuccess('All notifications marked as read.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }

    // Role-tailored destination routing
    if (notif.related_type === 'ExchangeRequest') {
      if (isWarden) {
        navigate('/warden/approvals');
      } else {
        navigate('/admin/requests');
      }
    } else if (notif.related_type === 'ExchangeProposal') {
      if (isWarden) {
        navigate('/warden/approvals');
      } else {
        navigate('/admin/proposals');
      }
    } else if (notif.related_type === 'TransferRecord') {
      if (isWarden) {
        navigate('/warden/history');
      } else {
        navigate('/admin/audit');
      }
    }
  };

  const isActionRequired = (n) => {
    const type = n.notif_type || n.type || '';
    return (
      type === 'APPROVAL_NEEDED' ||
      type === 'APPROVAL' ||
      n.related_type === 'ExchangeRequest' ||
      n.related_type === 'ExchangeProposal'
    );
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'APPROVAL') return isActionRequired(n);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const approvalCount = notifications.filter((n) => isActionRequired(n) && !n.is_read).length;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: 'Recent', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: String(dateStr), time: '' };
      const date = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return { date, time };
    } catch {
      return { date: String(dateStr), time: '' };
    }
  };

  const getNotifConfig = (n) => {
    const type = n.notif_type || n.type || '';
    const relType = n.related_type || '';

    if (relType === 'ExchangeRequest' || type === 'APPROVAL_NEEDED') {
      return {
        icon: <FileCheck2 className="w-5 h-5 text-amber-600" />,
        iconBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
        badge: 'Room Change Request',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        actionLabel: isWarden ? 'Review in Approval Queue' : 'Open in Admin Requests'
      };
    }
    if (relType === 'ExchangeProposal' || type.includes('PROPOSAL')) {
      return {
        icon: <ArrowLeftRight className="w-5 h-5 text-[#f78c30]" />,
        iconBg: 'bg-orange-50 text-[#f78c30] border-orange-200/80',
        badge: 'Cycle Swap Proposal',
        badgeColor: 'bg-orange-100 text-orange-950 border-orange-300',
        actionLabel: isWarden ? 'Inspect Swap Proposal' : 'View in Matching Queue'
      };
    }
    if (type.includes('COMPLETED') || type.includes('APPROVED')) {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        badge: 'Allocation Transfer Executed',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        actionLabel: 'View Transfer Record'
      };
    }
    return {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      badge: 'System Notice',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      actionLabel: null
    };
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1300px] mx-auto">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess('')}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Console */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f78c30] uppercase tracking-wider mb-1">
              <Bell className="w-4 h-4" />
              <span>{isWarden ? 'Hostel Warden Operations' : 'Campus Administration Console'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Notifications & Action Alerts</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-xs">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Real-time alert dispatcher for student room change requests, cycle swap matching events, and administrative authorizations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition border flex items-center gap-2 cursor-pointer ${
                unreadCount === 0
                  ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#f4f7fb] hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'ALL', label: `All Alerts (${notifications.length})` },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'APPROVAL', label: `Action Required (${approvalCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#f78c30] text-white shadow-md shadow-[#f78c30]/20'
                    : 'bg-[#f4f7fb] text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#f78c30]" />
            <span>Auto-synced with live university exchange engine</span>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          {loading && notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-[#f78c30] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold">Loading real-time notifications...</p>
            </div>
          ) : filteredNotifs.length > 0 ? (
            filteredNotifs.map((n) => {
              const isUnread = !n.is_read;
              const meta = getNotifConfig(n);
              const { date, time } = formatDateTime(n.created_at);

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 rounded-2xl transition-all border flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                    isUnread
                      ? 'bg-gradient-to-r from-orange-50/40 via-white to-amber-50/30 border-orange-200/90 shadow-2xs hover:shadow-xs'
                      : 'bg-white border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Icon Container */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.iconBg}`}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.badgeColor}`}>
                          {meta.badge}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            New
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 ml-auto md:ml-0">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{date}</span>
                          {time && (
                            <>
                              <span>•</span>
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{time}</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {meta.actionLabel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(n);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#f78c30] bg-orange-50 hover:bg-orange-100/80 border border-orange-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{meta.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(n.id);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                        title="Mark this alert as read"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm font-bold text-slate-600">No alerts found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {filter === 'UNREAD'
                  ? 'You are all caught up with unread notifications.'
                  : filter === 'APPROVAL'
                  ? 'No action required items currently awaiting your review.'
                  : 'Your notification inbox is currently clear.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default WardenNotificationsPage;
