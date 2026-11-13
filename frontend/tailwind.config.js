/**
 * Module: frontend/tailwind.config.js
 *
 * Work / Purpose:
 *   Tailwind CSS theme configuration defining LPU Brand Orange (#f78c30) palette tokens, Inter typography, and custom shadows.
 *
 * Connected Modules (Used By / Consumers):
 *   - Vite / Tailwind CSS / PostCSS build toolchain (frontend/package.json scripts)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - tailwindcss (npm package)
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8f1',
          100: '#feeedb',
          200: '#fddbb7',
          300: '#fbc188',
          400: '#f9a154',
          500: '#f78c30', // Official LPU Brand Orange (#f78c30)
          600: '#e27518',
          700: '#c15510',
          800: '#9a4413',
          900: '#7c3a13',
          950: '#431b07',
        },
        lpu: {
          50: '#fff8f1',
          100: '#feeedb',
          200: '#fddbb7',
          300: '#fbc188',
          400: '#f9a154',
          500: '#f78c30', // Official LPU Brand Orange (#f78c30)
          600: '#e27518',
          700: '#c15510',
          800: '#9a4413',
          900: '#7c3a13',
          950: '#431b07',
        },
        accent: {
          50: '#fff8f1',
          500: '#f78c30',
          600: '#e27518',
          700: '#c15510',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 20px rgba(247, 140, 48, 0.35)',
        'lpu': '0 8px 24px -4px rgba(247, 140, 48, 0.3)',
      }
    },
  },
  plugins: [],
}
