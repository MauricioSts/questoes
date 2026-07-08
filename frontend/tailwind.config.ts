import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F1F0FA",
          100: "#E9E7F8",
          200: "#D6D0F5",
          300: "#B9AEF0",
          400: "#8B7CF6",
          500: "#5B4FE0",
          600: "#4A3DB0",
          700: "#332A6E",
          800: "#2C2260",
          900: "#1C1840",
          ink: "#1B1738",
        },
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
        muted: "#7A76A0",
        faint: "#9C98B8",
        hair: "#EAE7F7",
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
