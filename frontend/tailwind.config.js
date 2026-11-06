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
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bce0fd",
          300: "#8ecdfc",
          400: "#58b0f8",
          500: "#3192f3",
          600: "#1e74e6",
          700: "#175ccf",
          800: "#194ba7",
          900: "#1a4184",
          950: "#142951",
        },
      },
    },
  },
  plugins: [],
};
