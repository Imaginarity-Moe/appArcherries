/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        archer: {
          50: "#f5f7f1",
          100: "#e6ecd9",
          500: "#6b8e23",
          700: "#4f6b1a",
          900: "#2c3d0e",
        },
      },
    },
  },
  plugins: [],
};
