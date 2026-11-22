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
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 20px rgba(247, 140, 48, 0.35)',
        'lpu': '0 8px 24px -4px rgba(247, 140, 48, 0.3)',
        'card-hover': '0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 2s infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
