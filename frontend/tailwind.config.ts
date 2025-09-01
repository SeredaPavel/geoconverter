// /geoconverter/frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 500: "#0ea5e9" } },
    },
  },
  darkMode: "class",
  plugins: [],
} satisfies Config;
