// Esqueleto humanoide e biblioteca de clipes (lib/rig). O mesmo esqueleto serve aos
// heróis e aos vilões (golems de papel): muda só a pele desenhada em cada osso, então
// um soco do vilão é o mesmo soco do herói, espelhado.
import type { Clip, Osso, Pose } from "../../../lib/rig";

// Pés no chão = origem. Quadril 80 acima; tronco sobe 50; braços penduram do ombro.
export const OSSOS: Osso[] = [
  { nome: "quadril", pai: null, x: 0, y: -80 },
  { nome: "tronco", pai: "quadril", x: 0, y: 0 },
  { nome: "cabeca", pai: "tronco", x: 0, y: -50 },
  { nome: "capa", pai: "tronco", x: 0, y: -46 },
  { nome: "bracoT", pai: "tronco", x: 3, y: -44 },
  { nome: "anteT", pai: "bracoT", x: 0, y: 24 },
  { nome: "maoT", pai: "anteT", x: 0, y: 22 },
  { nome: "bracoF", pai: "tronco", x: -3, y: -44 },
  { nome: "anteF", pai: "bracoF", x: 0, y: 24 },
  { nome: "maoF", pai: "anteF", x: 0, y: 22 },
  { nome: "coxaT", pai: "quadril", x: 4, y: 2 },
  { nome: "canelaT", pai: "coxaT", x: 0, y: 38 },
  { nome: "peT", pai: "canelaT", x: 0, y: 36 },
  { nome: "coxaF", pai: "quadril", x: -4, y: 2 },
  { nome: "canelaF", pai: "coxaF", x: 0, y: 38 },
  { nome: "peF", pai: "canelaF", x: 0, y: 36 },
];

// Ordem de desenho (virado para a direita, 3/4): o lado de trás atrás do tronco.
export const ORDEM = [
  "capa",
  "bracoT",
  "anteT",
  "maoT",
  "coxaT",
  "canelaT",
  "peT",
  "quadril",
  "coxaF",
  "canelaF",
  "peF",
  "tronco",
  "cabeca",
  "bracoF",
  "anteF",
  "maoF",
] as const;
export type Parte = (typeof ORDEM)[number];

const com = (base: Pose, extra: Pose): Pose => ({ ...base, ...extra });

// Guarda de luta: pernas afastadas, joelhos dobrados, punhos na altura do peito.
export const GUARDA: Pose = {
  y: 5,
  tronco: 6,
  cabeca: -4,
  bracoF: -35,
  anteF: -105,
  bracoT: -18,
  anteT: -112,
  coxaF: -20,
  canelaF: 24,
  peF: -4,
  coxaT: 16,
  canelaT: 20,
  peT: -8,
};

// Vilão parado: sem guarda, braços soltos, balançando.
export const SOLTO: Pose = {
  y: 2,
  tronco: 2,
  bracoF: -14,
  anteF: -28,
  bracoT: 16,
  anteT: -22,
  coxaF: -10,
  canelaF: 10,
  coxaT: 10,
  canelaT: 8,
};

export const CLIPES = {
  guarda: {
    dur: 1500,
    loop: true,
    quadros: [
      { t: 0, pose: GUARDA },
      {
        t: 0.5,
        pose: com(GUARDA, { y: 8, tronco: 9, sy: 0.985, bracoF: -31, anteF: -110, bracoT: -15, coxaF: -22, canelaF: 30, coxaT: 18, canelaT: 27 }),
      },
    ],
  },
  solto: {
    dur: 1900,
    loop: true,
    quadros: [
      { t: 0, pose: SOLTO },
      { t: 0.5, pose: com(SOLTO, { y: 4, tronco: -3, bracoF: -22, anteF: -40, bracoT: 22, anteT: -14, sy: 0.98 }) },
    ],
  },
  corre: {
    dur: 440,
    loop: true,
    quadros: [
      { t: 0, pose: { tronco: 18, cabeca: -12, coxaF: -52, canelaF: 26, peF: -10, coxaT: 42, canelaT: 72, bracoF: 48, anteF: -72, bracoT: -52, anteT: -82, y: 2 }, s: "linear" },
      { t: 0.25, pose: { tronco: 18, cabeca: -12, coxaF: -6, canelaF: 64, coxaT: -2, canelaT: 22, bracoF: 0, anteF: -78, bracoT: 0, anteT: -80, y: -9 }, s: "linear" },
      { t: 0.5, pose: { tronco: 18, cabeca: -12, coxaF: 42, canelaF: 72, coxaT: -52, canelaT: 26, peT: -10, bracoF: -52, anteF: -82, bracoT: 48, anteT: -72, y: 2 }, s: "linear" },
      { t: 0.75, pose: { tronco: 18, cabeca: -12, coxaF: -2, canelaF: 22, coxaT: -6, canelaT: 64, bracoF: 0, anteF: -80, bracoT: 0, anteT: -78, y: -9 }, s: "linear" },
    ],
  },
  soco: {
    dur: 520,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.3, pose: com(GUARDA, { tronco: -8, bracoF: 28, anteF: -128, x: -8 }), s: "sai" },
      {
        t: 0.45,
        pose: { tronco: 24, cabeca: 6, bracoF: -94, anteF: -3, bracoT: 12, anteT: -112, coxaF: -32, canelaF: 14, coxaT: 30, canelaT: 12, peT: -14, x: 16, y: 4 },
        s: "entra",
      },
      { t: 0.72, pose: { tronco: 22, cabeca: 6, bracoF: -92, anteF: -6, bracoT: 12, anteT: -112, coxaF: -32, canelaF: 14, coxaT: 30, canelaT: 12, x: 16, y: 4 } },
      { t: 1, pose: GUARDA },
    ],
  },
  gancho: {
    dur: 560,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.3, pose: com(GUARDA, { y: 16, tronco: 20, bracoT: 30, anteT: -40, coxaF: -40, canelaF: 60, coxaT: 20, canelaT: 50 }), s: "sai" },
      { t: 0.48, pose: { y: -14, tronco: -10, cabeca: -14, bracoT: -165, anteT: -30, bracoF: -30, anteF: -110, coxaF: -30, canelaF: 20, coxaT: 20, canelaT: 30, x: 12 }, s: "entra" },
      { t: 0.75, pose: { y: -10, tronco: -8, cabeca: -12, bracoT: -160, anteT: -30, bracoF: -30, anteF: -110, coxaF: -28, canelaF: 22, coxaT: 18, canelaT: 30, x: 12 } },
      { t: 1, pose: GUARDA },
    ],
  },
  chute: {
    dur: 620,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.3, pose: com(GUARDA, { tronco: -8, coxaF: -60, canelaF: 110, y: 0 }), s: "sai" },
      { t: 0.5, pose: { tronco: -24, cabeca: -6, coxaF: -102, canelaF: -4, peF: -20, coxaT: 10, canelaT: 6, bracoF: 24, anteF: -100, bracoT: -44, anteT: -90, x: 12, y: 2 }, s: "entra" },
      { t: 0.75, pose: { tronco: -22, cabeca: -6, coxaF: -98, canelaF: -2, peF: -20, coxaT: 10, canelaT: 6, bracoF: 24, anteF: -100, bracoT: -44, anteT: -90, x: 12, y: 2 } },
      { t: 1, pose: GUARDA },
    ],
  },
  tiro: {
    dur: 640,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.28, pose: com(GUARDA, { tronco: -6, bracoF: -30, anteF: -145, maoF: 20 }), s: "sai" },
      { t: 0.45, pose: { tronco: 10, cabeca: 2, bracoF: -96, anteF: 2, maoF: -30, bracoT: 34, anteT: -60, coxaF: -26, canelaF: 18, coxaT: 22, canelaT: 16, x: 4, y: 4 }, s: "entra" },
      { t: 0.8, pose: { tronco: 8, cabeca: 2, bracoF: -94, anteF: 0, maoF: -30, bracoT: 34, anteT: -60, coxaF: -26, canelaF: 18, coxaT: 22, canelaT: 16, x: 4, y: 4 } },
      { t: 1, pose: GUARDA },
    ],
  },
  duplo: {
    // as duas mãos para a frente (rajada, magia)
    dur: 700,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.3, pose: com(GUARDA, { tronco: -10, bracoF: 30, anteF: -140, bracoT: 40, anteT: -140, y: 10, coxaF: -30, canelaF: 40 }), s: "sai" },
      { t: 0.45, pose: { tronco: 16, cabeca: 4, bracoF: -88, anteF: -4, bracoT: -80, anteT: -8, coxaF: -34, canelaF: 16, coxaT: 30, canelaT: 14, x: 10, y: 4 }, s: "entra" },
      { t: 0.8, pose: { tronco: 14, cabeca: 4, bracoF: -86, anteF: -4, bracoT: -78, anteT: -8, coxaF: -34, canelaF: 16, coxaT: 30, canelaT: 14, x: 10, y: 4 } },
      { t: 1, pose: GUARDA },
    ],
  },
  agacha: {
    dur: 240,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 1, pose: { y: 22, tronco: 26, cabeca: -18, coxaF: -58, canelaF: 96, coxaT: -26, canelaT: 90, bracoF: 30, anteF: -60, bracoT: 44, anteT: -50 }, s: "sai" },
    ],
  },
  noAr: {
    dur: 400,
    quadros: [
      { t: 0, pose: { tronco: 6, coxaF: -70, canelaF: 100, coxaT: -20, canelaT: 110, bracoF: -150, anteF: -20, bracoT: -130, anteT: -20, cabeca: -6 } },
      { t: 1, pose: { tronco: 10, coxaF: -60, canelaF: 90, coxaT: -10, canelaT: 100, bracoF: -140, anteF: -30, bracoT: -120, anteT: -30, cabeca: -4 } },
    ],
  },
  voadora: {
    // chute voador: perna da frente esticada, corpo deitado
    dur: 300,
    quadros: [
      { t: 0, pose: { tronco: 6, coxaF: -70, canelaF: 100, coxaT: -20, canelaT: 110, bracoF: -150, bracoT: -130 } },
      { t: 1, pose: { rot: 18, tronco: -30, cabeca: -10, coxaF: -110, canelaF: -2, peF: -20, coxaT: -30, canelaT: 110, bracoF: 40, anteF: -80, bracoT: -60, anteT: -60 }, s: "sai" },
    ],
  },
  cambalhota: {
    dur: 520,
    quadros: [
      { t: 0, pose: { rot: 0, tronco: 30, coxaF: -100, canelaF: 130, coxaT: -90, canelaT: 130, bracoF: -40, anteF: -80, bracoT: -40, anteT: -80, cabeca: 30 } },
      { t: 0.5, pose: { rot: -180, tronco: 30, coxaF: -110, canelaF: 140, coxaT: -100, canelaT: 140, bracoF: -40, anteF: -80, bracoT: -40, anteT: -80, cabeca: 30 }, s: "linear" },
      { t: 1, pose: { rot: -360, tronco: 30, coxaF: -100, canelaF: 130, coxaT: -90, canelaT: 130, bracoF: -40, anteF: -80, bracoT: -40, anteT: -80, cabeca: 30 }, s: "linear" },
    ],
  },
  dano: {
    dur: 520,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.14, pose: { tronco: -30, cabeca: -26, bracoF: 34, anteF: -40, bracoT: 44, anteT: -30, x: -26, y: 2, coxaF: -30, canelaF: 12, coxaT: 26, canelaT: 32 }, s: "sai" },
      { t: 0.45, pose: { tronco: -14, cabeca: -10, bracoF: 10, anteF: -70, bracoT: 20, anteT: -80, x: -30, y: 6, coxaF: -24, canelaF: 26, coxaT: 20, canelaT: 26 } },
      { t: 1, pose: com(GUARDA, { x: -30 }) },
    ],
  },
  desmaio: {
    dur: 1300,
    quadros: [
      { t: 0, pose: GUARDA },
      { t: 0.15, pose: { tronco: -30, cabeca: -26, bracoF: 34, anteF: -40, bracoT: 44, anteT: -30, x: -24, coxaF: -30, canelaF: 12, coxaT: 26, canelaT: 32 }, s: "sai" },
      { t: 0.5, pose: { y: 36, x: -24, coxaF: -88, canelaF: 124, coxaT: -62, canelaT: 128, tronco: 28, cabeca: 34, bracoF: 14, anteF: -8, bracoT: 12, anteT: -8 }, s: "entra" },
      { t: 1, pose: { rot: -88, x: -44, y: -6, tronco: 4, cabeca: 16, bracoF: -150, anteF: -10, bracoT: -170, anteT: -4, coxaF: -6, canelaF: 8, coxaT: 6, canelaT: 6 }, s: "mola" },
    ],
  },
  vitoria: {
    dur: 1100,
    loop: true,
    quadros: [
      { t: 0, pose: com(GUARDA, { y: 6, bracoF: -168, anteF: -12 }) },
      { t: 0.3, pose: { y: -34, tronco: -4, cabeca: -12, bracoF: -172, anteF: -6, bracoT: 22, anteT: -110, coxaF: -40, canelaF: 70, coxaT: 10, canelaT: 80 }, s: "sai" },
      { t: 0.6, pose: com(GUARDA, { y: 8, bracoF: -165, anteF: -14, sy: 0.96 }), s: "entra" },
    ],
  },
  pancada: {
    // os dois braços para o alto e para baixo (vilão com raiva / chefe)
    dur: 820,
    quadros: [
      { t: 0, pose: SOLTO },
      { t: 0.4, pose: { tronco: -14, cabeca: -10, bracoF: -172, anteF: -20, bracoT: -162, anteT: -24, y: -8, coxaF: -20, canelaF: 20, coxaT: 16, canelaT: 18 }, s: "sai" },
      { t: 0.58, pose: { tronco: 34, cabeca: 10, bracoF: -64, anteF: 0, bracoT: -54, anteT: 0, y: 14, x: 10, coxaF: -40, canelaF: 50, coxaT: 30, canelaT: 40 }, s: "entra" },
      { t: 0.8, pose: { tronco: 32, cabeca: 10, bracoF: -62, anteF: 0, bracoT: -52, anteT: 0, y: 14, x: 10, coxaF: -40, canelaF: 50, coxaT: 30, canelaT: 40 } },
      { t: 1, pose: SOLTO },
    ],
  },
  foge: {
    dur: 420,
    loop: true,
    quadros: [
      { t: 0, pose: { tronco: 20, coxaF: -52, canelaF: 26, coxaT: 42, canelaT: 72, bracoF: 60, anteF: -20, bracoT: -60, anteT: -20, y: 2 }, s: "linear" },
      { t: 0.5, pose: { tronco: 20, coxaF: 42, canelaF: 72, coxaT: -52, canelaT: 26, bracoF: -60, anteF: -20, bracoT: 60, anteT: -20, y: -8 }, s: "linear" },
    ],
  },
  encolhe: {
    // capturado: encolhe girando para dentro do orbe
    dur: 600,
    quadros: [
      { t: 0, pose: SOLTO },
      { t: 1, pose: { ...SOLTO, rot: 200, sy: 0.05, y: -60 }, s: "entra" },
    ],
  },
} satisfies Record<string, Clip>;

export type NomeClipe = keyof typeof CLIPES;

// Instante de impacto de cada golpe (fração do clipe): é quando o outro sente.
export const IMPACTO: Partial<Record<NomeClipe, number>> = {
  soco: 0.45,
  gancho: 0.48,
  chute: 0.5,
  tiro: 0.45,
  duplo: 0.45,
  pancada: 0.58,
};
