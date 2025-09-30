/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./script.js",
    "./treebot.js",
    "./news-loader.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        accent: '#4ECDC4'
      }
    }
  },
  plugins: []
}