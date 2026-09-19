/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./popup.html",
    "./dashboard.html"
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          primary: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
          text: '#F9FAFB',
          muted: '#9CA3AF'
        }
      }
    },
  },
  plugins: [],
}
