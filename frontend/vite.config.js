/**
 * Module: frontend/vite.config.js
 *
 * Work / Purpose:
 *   Vite build and dev-server configuration setting up React plugin, /api proxy to Django backend, and manual vendor code-splitting chunks.
 *
 * Connected Modules (Used By / Consumers):
 *   - Vite / Tailwind CSS / PostCSS build toolchain (frontend/package.json scripts)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - @vitejs (npm package)
 *   - vite (npm package)
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
  },
})
