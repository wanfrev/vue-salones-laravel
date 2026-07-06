/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'navy-main': '#2F4156',
        'navy-dark': '#1a2a3a',
        'teal-accent': '#567CB0',
        'sky-light': '#C9D9E6',
        'beige-bg': '#F5EFEB',
        'beige-dark': '#E8E0DB',
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}