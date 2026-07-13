import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Tokens de "chassi" (50/100/ink, surfaces, muted/faint/hair) usam CSS vars
        // em canais RGB → mudam no dark mode e ainda aceitam opacidade (ex.: bg-brand-50/82).
        // Os acentos fortes (200–900, flame, success, danger, cyan) continuam fixos.
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "#D6D0F5",
          300: "#B9AEF0",
          400: "#8B7CF6",
          500: "#5B4FE0",
          600: "#4A3DB0",
          700: "#332A6E",
          800: "#2C2260",
          900: "#1C1840",
          ink: "rgb(var(--ink) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        surface2: "rgb(var(--surface-2) / <alpha-value>)",
        flame: {
          from: "#FF8A3D",
          to: "#FF4D6D",
          text: "#E14A20",
        },
        success: {
          from: "#12995B",
          to: "#17B26A",
          soft: "#E8F7EF",
        },
        danger: {
          from: "#E14A5F",
          soft: "#FDECEF",
        },
        cyan: {
          from: "#7CF5C4",
          to: "#41D0FF",
        },
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        hair: "rgb(var(--hair) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "26px",
      },
    },
  },
  plugins: [],
} satisfies Config;
