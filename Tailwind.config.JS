/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0a0a',
          900: '#121212',
          800: '#1a1a1a',
          700: '#242424',
          600: '#333333',
        },
        board: {
          light: '#efefe9',
          dark: '#161616',
        },
        silver: {
          400: '#c9c9c9',
          300: '#dcdcdc',
          200: '#eeeeee',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 50px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
};
