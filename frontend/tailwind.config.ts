// /geoconverter/frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, screens: { xl: "1200px" } },
    extend: {
      colors: {
        brand: {
          50: "#eaf7ff",
          100: "#d5efff",
          200: "#a6dcff",
          300: "#74c8ff",
          400: "#46b6fb",
          500: "#1ea5f0", // основной
          600: "#1289cc",
          700: "#0f6ea4",
          800: "#0e5a85",
          900: "#0d496b",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.06)",
      },
      keyframes: {
        borderRun: {
          "0%": { "background-size": "0% 2px, 2px 0%, 0% 2px, 2px 0%" },
          "25%": { "background-size": "100% 2px, 2px 0%, 0% 2px, 2px 0%" },
          "50%": { "background-size": "100% 2px, 2px 100%, 0% 2px, 2px 0%" },
          "75%": { "background-size": "100% 2px, 2px 100%, 100% 2px, 2px 0%" },
          "100%": { "background-size": "100% 2px, 2px 100%, 100% 2px, 2px 100%" },
        },
      },
      animation: {
        borderRun: "borderRun 1.6s ease-in-out forwards",
      },
    },
  },
  // Авто-тёмная тема по системе
  darkMode: "media",
  plugins: [],
} satisfies Config;
