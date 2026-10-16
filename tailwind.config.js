/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E8281E',
          orange: '#F4570A',
          dark: '#0A0A0A',
          card: '#141414',
          card2: '#1C1C1C',
          border: '#2A2A2A',
          muted: '#3A3A3A',
          text: '#E8E8E8',
          sub: '#9A9A9A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #E8281E 0%, #F4570A 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 40, 30, 0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(232, 40, 30, 0.15)' },
        },
      },
    },
  },
  plugins: [],
}
