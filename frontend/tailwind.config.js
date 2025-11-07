/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink': '#0B1220',
        'primary': '#335CFF',
        'primary-hover': '#284BE0',
        'focus-ring': '#AECBFF',
      },
      borderRadius: {
        'card': '24px',
        'button': '14px',
        'pill': '12px',
      },
      animation: {
        'in': 'fadeIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-from-bottom-2': 'slideInFromBottom2 0.3s ease-out',
        'slide-in-from-bottom-4': 'slideInFromBottom4 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromBottom2: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromBottom4: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}

