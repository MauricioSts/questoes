import type { Config } from "tailwindcss";

// Todas as cores de "chassi" e de acento agora vêm de CSS vars em canais RGB
// (r g b) definidas por [data-theme] em index.css → o app inteiro re-tematiza
// (Grimório/Neon) só trocando o atributo data-theme na raiz, mantendo o layout.
const ch = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: ch("--brand-50"),
          100: ch("--brand-100"),
          200: ch("--brand-200"),
          300: ch("--brand-300"),
          400: ch("--brand-400"),
          500: ch("--brand-500"),
          600: ch("--brand-600"),
          700: ch("--brand-700"),
          800: "#2C2260",
          900: "#1C1840",
          ink: ch("--ink"),
        },
        surface: ch("--surface"),
        surface2: ch("--surface-2"),
        flame: {
          from: "#FF8A3D",
          to: "#FF4D6D",
          text: ch("--flame-text"),
        },
        success: {
          from: ch("--success-from"),
          to: "#17B26A",
          soft: ch("--success-soft"),
        },
        danger: {
          from: ch("--danger-from"),
          soft: ch("--danger-soft"),
        },
        cyan: {
          from: ch("--cyan-from"),
          to: ch("--cyan-to"),
        },
        muted: ch("--muted"),
        faint: ch("--faint"),
        hair: ch("--hair"),
      },
      fontFamily: {
        // display = fonte de destaque do tema (Cormorant no Grimório, Chakra no Neon)
        display: ["var(--display)", '"Bricolage Grotesque"', "serif"],
        brand: ["var(--brandFont)", "serif"],
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
