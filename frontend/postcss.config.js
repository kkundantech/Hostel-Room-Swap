/**
 * Module: frontend/postcss.config.js
 *
 * Work / Purpose:
 *   PostCSS build configuration enabling Tailwind CSS and Autoprefixer processing for Vite.
 *
 * Connected Modules (Used By / Consumers):
 *   - Vite / Tailwind CSS / PostCSS build toolchain (frontend/package.json scripts)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - None (pure configuration / standalone CSS-compatible helpers)
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
