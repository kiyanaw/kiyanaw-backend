/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ki-blue': '#1E3A8A',
        'ki-accent': '#3B82F6',
        'issue-red': '#EF4444',
        'issue-yellow': '#F59E0B',
        'issue-green': '#10B981',
      },
      fontFamily: {
        sans: ['Roboto', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 