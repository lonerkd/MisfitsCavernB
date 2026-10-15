/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cavern': {
          'bg': '#080808',
          'fg': '#f0ece4',
          'accent': '#ff3c00',
          'muted': 'rgba(255,255,255,0.2)',
          'border': 'rgba(255,255,255,0.04)',
        }
      },
      fontFamily: {
        'display': ['Bebas Neue', 'sans-serif'],
        'mono': ['DM Mono', 'monospace'],
        'serif': ['Cormorant Garamond', 'serif'],
      },
      animation: {
        'slide-up': 'slideUp 1s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'grain': 'grain 0.5s steps(6) infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(36px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        marquee: {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
