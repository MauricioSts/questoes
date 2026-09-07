// Porte do tailwind.config.ts do web. As cores continuam vindo de vars em canais
// RGB ("r g b"), agora aplicadas pelo vars() do NativeWind na View raiz em vez de
// um [data-theme] no <html>. Trocar de tema não mexe em layout.
const ch = (name) => `rgb(var(${name}) / <alpha-value>)`;

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./theme/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
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
        bg: ch("--bg"),
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
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "26px",
      },
    },
  },
  plugins: [],
};
