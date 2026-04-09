/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#060606",
          900: "#0c0c0c",
          850: "#111111",
          800: "#171717",
        },
        accent: {
          500: "#ff8a1a",
          400: "#ff9d3f",
          300: "#ffc07a",
        },
      },
      boxShadow: {
        "accent-glow": "0 10px 26px rgba(255,138,26,0.34)",
      },
    },
  },
  plugins: [],
};
