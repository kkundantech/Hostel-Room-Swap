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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
