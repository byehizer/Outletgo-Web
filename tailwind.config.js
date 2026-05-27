/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2B8FD4',
          dark: '#1A3F7A',
          light: '#5AAEE0',
          'bg-dark': '#0D1F3C',
          'bg-light': '#E8F4FD',
        },
        success: {
          DEFAULT: '#22c55e',
          'bg-dark': '#052e16',
          'bg-light': '#f0fdf4',
        },
        warning: {
          DEFAULT: '#f59e0b',
          'bg-dark': '#451a03',
          'bg-light': '#fffbeb',
        },
        danger: {
          DEFAULT: '#ef4444',
          'bg-dark': '#450a0a',
          'bg-light': '#fef2f2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'display-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'display-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
