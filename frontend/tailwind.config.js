/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7c3aed",
          hover:   "#6d28d9",
          light:   "#ede9fe",
        },
      },
      animation: {
        "spin-slow": "spin 1.4s linear infinite",
        "fade-in":   "fadeIn 0.3s ease-out",
        "slide-up":  "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: 0 },              "100%": { opacity: 1 } },
        slideUp: { "0%": { opacity: 0, transform: "translateY(16px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
