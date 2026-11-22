/**
 * Module: frontend/src/utils/dateUtils.js
 *
 * Work / Purpose:
 *   Safe date and time formatting utilities that protect against null, undefined,
 *   malformed ISO strings, and unparseable values, preventing "Invalid Date" UI errors.
 */

export function isValidDate(val) {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export function formatDateSafe(val, fallback = 'N/A', options = {}) {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatDateTimeSafe(val, fallback = 'N/A', options = {}) {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function formatTimeSafe(val, fallback = '', options = {}) {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  });
}

export function splitDateTimeSafe(val, fallbackDate = 'N/A', fallbackTime = '') {
  if (!val) return { date: fallbackDate, time: fallbackTime };
  const d = new Date(val);
  if (isNaN(d.getTime())) return { date: fallbackDate, time: fallbackTime };

  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return { date, time };
}
