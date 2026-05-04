/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2ff',
          100: '#dde5f9',
          200: '#bccbf3',
          300: '#8da5e9',
          400: '#5f7cda',
          500: '#3d5ac8',
          600: '#2d44ad',
          700: '#25368c',
          800: '#1e2b6e',
          900: '#141d4a',
          950: '#0b1130',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
