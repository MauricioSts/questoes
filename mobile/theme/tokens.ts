// Tokens dos dois temas, transcritos de frontend/src/index.css.
//
// Os canais RGB ("r g b") alimentam o Tailwind via rgb(var(--x) / <alpha-value>)
// exatamente como no web. Os tokens hex são os do design, usados onde o Tailwind
// não alcança (gradientes, sombras, SVG).
import { vars } from "nativewind";

export type NomeTema = "fantasy" | "cyberpunk";

// Canais RGB: entram no vars() e viram as cores das classes Tailwind.
const CANAIS = {
  fantasy: {
    "--brand-50": "34 26 60",
    "--brand-100": "48 36 73",
    "--brand-200": "91 71 136",
    "--brand-300": "91 71 136",
    "--brand-400": "228 188 69",
    "--brand-500": "201 162 39",
    "--brand-600": "165 133 31",
    "--brand-700": "231 206 134",
    "--ink": "239 230 210",
    "--muted": "176 162 203",
    "--faint": "133 119 153",
    "--hair": "48 36 73",
    "--surface": "26 20 48",
    "--surface-2": "34 26 60",
    "--bg": "18 14 30",
    "--flame-text": "228 188 69",
    "--success-from": "78 143 109",
    "--success-soft": "30 45 37",
    "--danger-from": "201 162 39",
    "--danger-soft": "33 26 20",
    "--cyan-from": "228 188 69",
    "--cyan-to": "201 162 39",
  },
  cyberpunk: {
    "--brand-50": "244 241 255",
    "--brand-100": "235 228 255",
    "--brand-200": "201 188 255",
    "--brand-300": "167 139 250",
    "--brand-400": "255 61 168",
    "--brand-500": "230 0 126",
    "--brand-600": "194 0 107",
    "--brand-700": "194 0 107",
    "--ink": "20 16 58",
    "--muted": "95 85 168",
    "--faint": "139 128 201",
    "--hair": "216 206 255",
    "--surface": "255 255 255",
    "--surface-2": "247 244 255",
    "--bg": "244 241 255",
    "--flame-text": "230 0 126",
    "--success-from": "0 128 111",
    "--success-soft": "217 247 241",
    "--danger-from": "230 0 126",
    "--danger-soft": "255 228 242",
    "--cyan-from": "0 194 255",
    "--cyan-to": "139 92 246",
  },
} as const;

// Tokens hex do design. Ficam fora do vars() porque são consumidos direto em JS
// (gradiente, sombra, props de SVG), não por classe do Tailwind.
export const HEX = {
  fantasy: {
    text: "#EFE6D2",
    dim: "#5C4F7C",
    surface: "#1A1430",
    surface2: "#221A3C",
    bg: "#120E1E",
    line: "#302449",
    lineSoft: "#241B38",
    lineStrong: "#3D2F5C",
    lineHi: "#5B4788",
    accent: "#C9A227",
    accentHi: "#E4BC45",
    accentText: "#E7CE86",
    accentBd: "#5C4620",
    accentBg: "rgba(201,162,39,0.12)",
    good: "#4E8F6D",
    goodText: "#8FCFA9",
    goodBd: "#2C5541",
    goodBg: "rgba(78,143,109,0.12)",
    onAccent: "#1A1206",
    track: "#2A2040",
    trackSoft: "#241B38",
    bar: "#362A52",
    bgGlow: "rgba(201,162,39,0.10)",
    heat: ["#211A38", "rgba(201,162,39,0.28)", "rgba(201,162,39,0.5)", "rgba(201,162,39,0.74)", "#E4BC45"],
    dot: "#2A2144",
    esquema: "dark" as const,
  },
  cyberpunk: {
    text: "#14103A",
    dim: "#B2A8E0",
    surface: "#FFFFFF",
    surface2: "#F7F4FF",
    bg: "#F4F1FF",
    line: "#D8CEFF",
    lineSoft: "#EBE4FF",
    lineStrong: "#C9BCFF",
    lineHi: "#A78BFA",
    accent: "#E6007E",
    accentHi: "#FF3DA8",
    accentText: "#C2006B",
    accentBd: "#FFB3DC",
    accentBg: "rgba(230,0,126,0.10)",
    good: "#00B39A",
    goodText: "#00806F",
    goodBd: "#8DE8DA",
    goodBg: "rgba(0,179,154,0.12)",
    onAccent: "#FFFFFF",
    track: "#EBE4FF",
    trackSoft: "#F1ECFF",
    bar: "#DCD2FF",
    bgGlow: "rgba(139,92,246,0.14)",
    heat: ["#EFE9FF", "rgba(0,194,255,0.45)", "rgba(139,92,246,0.55)", "rgba(230,0,126,0.65)", "#E6007E"],
    dot: "#DED4FF",
    esquema: "light" as const,
  },
};

// Raio de canto: o Fantasy é quase reto (6px), o Cyberpunk é arredondado (14px).
// É o que mais diferencia a silhueta dos dois temas.
export const RAIO = {
  fantasy: { r: 6, sm: 4, chip: 3 },
  cyberpunk: { r: 14, sm: 10, chip: 999 },
};

export const VARS = {
  fantasy: vars(CANAIS.fantasy),
  cyberpunk: vars(CANAIS.cyberpunk),
};
