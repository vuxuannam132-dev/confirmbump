/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        youth: {
          red: '#DC2626',      // Đỏ đoàn trường
          redDark: '#B91C1C',
          blue: '#2563EB',     // Xanh dương thanh niên
          blueDark: '#1D4ED8',
          yellow: '#EAB308',   // Vàng tươi
          yellowDark: '#CA8A04',
          grayLight: '#F8FAFC'
        }
      }
    },
  },
  plugins: [],
}
