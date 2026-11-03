import React from 'react';

const STATUS_CONFIG = {
  OPEN: { label: 'Open', className: 'badge-open' },
  MATCHED: { label: 'Matched', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  PENDING_ACCEPTANCE: { label: 'Awaiting Participants', className: 'badge-pending' },
  PENDING_APPROVAL: { label: 'Awaiting Warden Approval', className: 'bg-amber-100 text-amber-800 border border-amber-300' },
  APPROVED: { label: 'Approved', className: 'badge-success' },
  COMPLETED: { label: 'Completed', className: 'badge-success' },
  DECLINED: { label: 'Declined', className: 'badge-danger' },
  REJECTED: { label: 'Rejected', className: 'badge-danger' },
  EXPIRED: { label: 'Expired', className: 'badge-neutral' },
  WITHDRAWN: { label: 'Withdrawn', className: 'badge-neutral' },
  REVERSED: { label: 'Reversed', className: 'badge-neutral' },
};

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    className: 'badge-neutral',
  };

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
