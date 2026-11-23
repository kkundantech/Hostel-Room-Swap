/**
 * Module: frontend/src/main.jsx
 *
 * Work / Purpose:
 *   Frontend React DOM entrypoint mounting the root App component into index.html.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/index.html (<script type='module' src='/src/main.jsx'>)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/App.jsx
 *   - react (npm package)
 *   - react-dom (npm package)
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Automatically recover from chunk loading errors when a new deployment publishes new hashes
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'vite_preload_retry';
  const lastReload = window.sessionStorage.getItem(reloadKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    window.sessionStorage.setItem(reloadKey, now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
