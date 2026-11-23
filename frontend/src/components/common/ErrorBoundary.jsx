/**
 * Module: frontend/src/components/common/ErrorBoundary.jsx
 *
 * Work / Purpose:
 *   React ErrorBoundary catching uncaught UI rendering exceptions with recovery reload controls.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - lucide-react (npm package)
 *   - react (npm package)
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { isChunkLoadError } from '../../utils/lazyWithRetry';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error:', error, errorInfo);

    // If caused by a new production deployment changing chunk hashes, auto-reload once to refresh cache
    if (isChunkLoadError(error)) {
      const lastAutoReload = window.sessionStorage.getItem('eb_chunk_auto_reload');
      const now = Date.now();
      if (!lastAutoReload || now - parseInt(lastAutoReload, 10) > 10000) {
        window.sessionStorage.setItem('eb_chunk_auto_reload', now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-lg text-center space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${isChunk ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
              {isChunk ? <Sparkles className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isChunk ? 'New Update Available' : 'Something went wrong'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isChunk
                  ? 'A newer version of the platform has been deployed. Please reload to load the latest features and updates.'
                  : (this.state.error?.message || 'An unexpected rendering error occurred.')}
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isChunk ? 'Update & Reload' : 'Reload Page'}</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
