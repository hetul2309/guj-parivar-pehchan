/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gujarat: {
          primary: '#0D9488',   // Gujarat peacock teal
          dark: '#115E59',
          light: '#CCFBF1',
          saffron: '#EA580C',  // Warm sunset saffron
          gold: '#CA8A04',
          navy: '#0F172A'
        }
      }
    },
  },
  plugins: [],
}
