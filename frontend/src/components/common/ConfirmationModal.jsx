/**
 * Module: frontend/src/components/common/ConfirmationModal.jsx
 *
 * Work / Purpose:
 *   Reusable confirmation dialog component for destructive or state-changing user actions.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/pages/student/StudentDashboard.jsx
 *   - frontend/src/pages/student/StudentProposalsPage.jsx
 *   - frontend/src/pages/student/StudentRequestsPage.jsx
 *   - frontend/src/pages/warden/WardenApprovalQueuePage.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  confirmVariant = 'primary',
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleCancel = onCancel || onClose;
  const isDangerous = isDanger || confirmVariant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full shrink-0 ${isDangerous ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
