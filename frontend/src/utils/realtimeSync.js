/**
 * Module: frontend/src/utils/realtimeSync.js
 *
 * Work / Purpose:
 *   Cross-role real-time synchronization utility for RoomSwap.
 *   Enables instantaneous cross-tab and cross-role UI propagation whenever an action
 *   (swap request, proposal response, warden approval/rejection, matching trigger, identity update)
 *   occurs across Student, Warden, Admin, and Super Admin dashboards.
 *
 * Capabilities:
 *   - Modern BroadcastChannel ('roomswap_channel') for zero-latency multi-tab updates
 *   - Window CustomEvent ('roomswap-realtime-update') for same-window component reactivity
 *   - LocalStorage event fallback for cross-context synchronization
 *   - React hook `useRealtimeSync` with:
 *       * Debounced background refreshing
 *       * Window focus & visibilitychange revalidation
 *       * Configurable silent background polling (default 7s) for cross-device updates
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/services/api.js
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *   - frontend/src/pages/warden/WardenDashboard.jsx
 *   - frontend/src/pages/warden/WardenApprovalQueuePage.jsx
 *   - frontend/src/pages/admin/AdminDashboard.jsx
 *   - frontend/src/pages/admin/AdminRequestsPage.jsx
 *   - frontend/src/pages/admin/AdminProposalsPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminDashboard.jsx
 *   - frontend/src/pages/admin/AdminAuditPage.jsx
 *   - frontend/src/pages/super_admin/SuperAdminAuditPage.jsx
 */

import { useEffect, useRef, useCallback } from 'react';

const CHANNEL_NAME = 'roomswap_realtime_channel';
const LOCAL_STORAGE_KEY = 'roomswap_realtime_sync_ping';

// Singleton BroadcastChannel instance
let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new window.BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

/**
 * Emit a real-time notification across all active tabs, components, and roles.
 * @param {string} entity - Name of the entity / event (e.g. 'PROPOSAL_APPROVED', 'REQUEST_CREATED')
 * @param {object} payload - Optional event metadata
 */
export const notifyRealtimeUpdate = (entity = 'GENERAL', payload = {}) => {
  if (typeof window === 'undefined') return;

  const eventData = {
    entity,
    payload,
    timestamp: Date.now(),
  };

  // 1. Broadcast to other browser tabs
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(eventData);
    }
  } catch (err) {
    console.debug('BroadcastChannel post error:', err);
  }

  // 2. Dispatch local DOM custom event for current window components
  try {
    if (typeof window !== 'undefined' && 'CustomEvent' in window) {
      window.dispatchEvent(
        new window.CustomEvent('roomswap-realtime-update', { detail: eventData })
      );
      window.dispatchEvent(new Event('refresh-counts'));
    }
  } catch (err) {
    console.debug('CustomEvent dispatch error:', err);
  }

  // 3. Fallback using localStorage storage event for older browsers / isolated tabs
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(eventData));
  } catch {
    // Ignore storage quota / incognito errors
  }
};

/**
 * React hook to keep a component/dashboard synchronized with real-time updates.
 *
 * @param {Function} refreshCallback - Function to call when data changes (e.g. fetchDashboardData)
 * @param {object} options
 * @param {number} options.pollIntervalMs - Silent background polling interval in ms (default: 7000)
 * @param {boolean} options.enablePolling - Whether periodic polling is enabled (default: true)
 * @param {boolean} options.revalidateOnFocus - Whether to refresh when tab regains focus (default: true)
 */
export const useRealtimeSync = (
  refreshCallback,
  {
    pollIntervalMs = 7000,
    enablePolling = true,
    revalidateOnFocus = true,
  } = {}
) => {
  const callbackRef = useRef(refreshCallback);
  callbackRef.current = refreshCallback;

  const lastInvokedRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Debounced execution to prevent flood when multiple events fire simultaneously
  const triggerRefresh = useCallback((immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const now = Date.now();
    const timeSinceLast = now - lastInvokedRef.current;

    if (immediate || timeSinceLast > 1000) {
      lastInvokedRef.current = now;
      if (typeof callbackRef.current === 'function') {
        callbackRef.current();
      }
    } else {
      debounceTimerRef.current = setTimeout(() => {
        lastInvokedRef.current = Date.now();
        if (typeof callbackRef.current === 'function') {
          callbackRef.current();
        }
      }, 500);
    }
  }, []);

  useEffect(() => {
    // 1. Listen for DOM custom event in current tab
    const handleCustomEvent = (event) => {
      triggerRefresh(false);
    };

    window.addEventListener('roomswap-realtime-update', handleCustomEvent);
    window.addEventListener('refresh-counts', handleCustomEvent);

    // 2. Listen for BroadcastChannel messages from other tabs
    let localBC = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBC = new window.BroadcastChannel(CHANNEL_NAME);
        localBC.onmessage = () => {
          triggerRefresh(false);
        };
      }
    } catch {
      localBC = null;
    }

    // 3. Listen for localStorage changes from other tabs
    const handleStorage = (event) => {
      if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
        triggerRefresh(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Tab visibility change & focus revalidation
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && revalidateOnFocus) {
        triggerRefresh(true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 5. Background polling while page is visible
    let pollTimer = null;
    if (enablePolling && pollIntervalMs > 0) {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          if (typeof callbackRef.current === 'function') {
            callbackRef.current();
          }
        }
      }, pollIntervalMs);
    }

    return () => {
      window.removeEventListener('roomswap-realtime-update', handleCustomEvent);
      window.removeEventListener('refresh-counts', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);

      if (localBC) {
        try {
          localBC.close();
        } catch {
          // ignore
        }
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [triggerRefresh, enablePolling, pollIntervalMs, revalidateOnFocus]);
};

export default {
  notifyRealtimeUpdate,
  useRealtimeSync,
};
