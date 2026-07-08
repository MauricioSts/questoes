import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5",
          fg: "#eef2ff",
        },
        acerto: "#16a34a",
        erro: "#dc2626",
      },
    },
  },
  plugins: [],
} satisfies Config;
