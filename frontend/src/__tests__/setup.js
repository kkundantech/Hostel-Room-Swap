/**
 * Module: frontend/src/__tests__/setup.js
 *
 * Work / Purpose:
 *   Vitest global DOM assertion setup importing jest-dom matchers for React component unit tests.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/vite.config.js (Vitest setupFiles)
 *   - frontend/src/__tests__/core.test.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - @testing-library/jest-dom (npm package)
 */

import '@testing-library/jest-dom/vitest';

