// Formas dos golpes, desenhadas à mão em canvas 2D. Tudo é procedural: nenhuma imagem dos
// jogos. Cada função desenha centrada na origem, num raio `s`, já girada pelo chamador.
import type { Forma } from "./tipos";

type G = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function estrelaPath(g: G, pontas: number, r: number, ri: number) {
  g.beginPath();
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i * Math.PI) / pontas - Math.PI / 2;
    const rr = i % 2 ? ri : r;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
}

const DESENHOS: Record<Forma, (g: G, s: number, c: string, c2: string, t: number) => void> = {
  orbe(g, s, c, c2) {
    const gr = g.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s);
    gr.addColorStop(0, c2);
    gr.addColorStop(0.55, c);
    gr.addColorStop(1, c);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, s, 0, TAU);
    g.fill();
  },
  faisca(g, s, c) {
    g.fillStyle = c;
    estrelaPath(g, 4, s, s * 0.22);
    g.fill();
  },
  brilho(g, s, c, c2) {
    g.fillStyle = c2;
    estrelaPath(g, 4, s, s * 0.16);
    g.fill();
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s * 0.18, 0, TAU);
    g.fill();
  },
  estrela(g, s, c, c2) {
    g.fillStyle = c;
    estrelaPath(g, 5, s, s * 0.45);
    g.fill();
    g.fillStyle = c2;
    estrelaPath(g, 5, s * 0.45, s * 0.2);
    g.fill();
  },
  lamina(g, s, c, c2) {
    // crescente: dois arcos
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s, -1.25, 1.25);
    g.arc(-s * 0.45, 0, s * 0.82, 1.05, -1.05, true);
    g.closePath();
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.08);
    g.beginPath();
    g.arc(0, 0, s * 0.96, -1.1, 1.1);
    g.stroke();
  },
  folha(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(-s, 0);
    g.quadraticCurveTo(0, -s * 0.75, s, 0);
    g.quadraticCurveTo(0, s * 0.75, -s, 0);
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.09);
    g.beginPath();
    g.moveTo(-s * 0.85, 0);
    g.lineTo(s * 0.85, 0);
    g.stroke();
  },
  petala(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, s);
    g.bezierCurveTo(s * 0.9, s * 0.2, s * 0.6, -s, 0, -s * 0.55);
    g.bezierCurveTo(-s * 0.6, -s, -s * 0.9, s * 0.2, 0, s);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.ellipse(0, s * 0.1, s * 0.18, s * 0.45, 0, 0, TAU);
    g.fill();
  },
  osso(g, s, c, c2) {
    g.fillStyle = c;
    g.fillRect(-s * 0.7, -s * 0.16, s * 1.4, s * 0.32);
    for (const x of [-0.75, 0.75])
      for (const y of [-0.2, 0.2]) {
        g.beginPath();
        g.arc(x * s, y * s, s * 0.24, 0, TAU);
        g.fill();
      }
    g.fillStyle = c2;
    g.fillRect(-s * 0.6, -s * 0.05, s * 1.2, s * 0.08);
  },
  pedra(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    const pts = [[-1, -0.3], [-0.5, -0.9], [0.4, -0.85], [1, -0.2], [0.75, 0.7], [-0.2, 0.95], [-0.9, 0.5]];
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
    g.closePath();
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.moveTo(-0.5 * s, -0.9 * s);
    g.lineTo(0.4 * s, -0.85 * s);
    g.lineTo(0.1 * s, -0.2 * s);
    g.lineTo(-0.6 * s, -0.25 * s);
    g.closePath();
    g.fill();
  },
  gota(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(s, 0);
    g.bezierCurveTo(s * 0.2, -s * 0.2, -s * 0.2, -s * 0.7, -s * 0.55, -s * 0.5);
    g.arc(-s * 0.45, 0, s * 0.5, -Math.PI / 2, Math.PI / 2, true);
    g.bezierCurveTo(-s * 0.2, s * 0.7, s * 0.2, s * 0.2, s, 0);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.arc(-s * 0.55, -s * 0.15, s * 0.14, 0, TAU);
    g.fill();
  },
  bolha(g, s, c, c2) {
    g.strokeStyle = c;
    g.lineWidth = Math.max(1, s * 0.14);
    g.beginPath();
    g.arc(0, 0, s, 0, TAU);
    g.stroke();
    g.fillStyle = c2;
    g.globalAlpha *= 0.35;
    g.fill();
    g.globalAlpha /= 0.35;
    g.beginPath();
    g.arc(-s * 0.35, -s * 0.35, s * 0.2, 0, TAU);
    g.fill();
  },
  nota(g, s, c) {
    g.fillStyle = c;
    g.strokeStyle = c;
    g.lineWidth = Math.max(1, s * 0.16);
    g.beginPath();
    g.ellipse(-s * 0.3, s * 0.55, s * 0.36, s * 0.26, -0.4, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(s * 0.04, s * 0.5);
    g.lineTo(s * 0.04, -s * 0.85);
    g.quadraticCurveTo(s * 0.5, -s * 0.6, s * 0.6, -s * 0.2);
    g.stroke();
  },
  coracao(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, s * 0.9);
    g.bezierCurveTo(-s * 1.2, 0, -s * 0.6, -s * 1, 0, -s * 0.35);
    g.bezierCurveTo(s * 0.6, -s * 1, s * 1.2, 0, 0, s * 0.9);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.arc(-s * 0.4, -s * 0.35, s * 0.16, 0, TAU);
    g.fill();
  },
  agulha(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(-s, -s * 0.16);
    g.lineTo(-s * 0.8, 0);
    g.lineTo(-s, s * 0.16);
    g.closePath();
    g.fill();
    g.fillStyle = c2;
    g.fillRect(-s * 0.2, -s * 0.04, s, s * 0.08);
  },
  chama(g, s, c, c2, t) {
    const w = Math.sin(t * 0.02) * s * 0.12;
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, -s + w);
    g.bezierCurveTo(s * 0.75, -s * 0.2, s * 0.7, s * 0.8, 0, s);
    g.bezierCurveTo(-s * 0.7, s * 0.8, -s * 0.75, -s * 0.2, 0, -s + w);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.moveTo(0, -s * 0.25 - w);
    g.bezierCurveTo(s * 0.4, s * 0.15, s * 0.35, s * 0.8, 0, s * 0.85);
    g.bezierCurveTo(-s * 0.35, s * 0.8, -s * 0.4, s * 0.15, 0, -s * 0.25 - w);
    g.fill();
  },
  anel(g, s, c) {
    g.strokeStyle = c;
    g.lineWidth = Math.max(1.2, s * 0.16);
    g.beginPath();
    g.arc(0, 0, s, 0, TAU);
    g.stroke();
  },
  pena(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(-s, 0);
    g.quadraticCurveTo(-s * 0.1, -s * 0.55, s, -s * 0.05);
    g.quadraticCurveTo(-s * 0.1, s * 0.4, -s, 0);
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.07);
    g.beginPath();
    g.moveTo(-s * 1.1, s * 0.05);
    g.lineTo(s, -s * 0.05);
    g.stroke();
  },
  moeda(g, s, c, c2, t) {
    const sx = Math.abs(Math.cos(t * 0.012)) * 0.8 + 0.2;
    g.scale(sx, 1);
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s, 0, TAU);
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.14);
    g.beginPath();
    g.arc(0, 0, s * 0.65, 0, TAU);
    g.stroke();
  },
  teia(g, s, c) {
    g.strokeStyle = c;
    g.lineWidth = Math.max(1, s * 0.05);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      g.stroke();
    }
    for (const r of [0.35, 0.65, 0.95]) {
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i * TAU) / 8;
        g.lineTo(Math.cos(a) * s * r, Math.sin(a) * s * r);
      }
      g.stroke();
    }
  },
  cristal(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, -s);
    g.lineTo(s * 0.45, 0);
    g.lineTo(0, s);
    g.lineTo(-s * 0.45, 0);
    g.closePath();
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.moveTo(0, -s);
    g.lineTo(s * 0.45, 0);
    g.lineTo(0, 0);
    g.closePath();
    g.fill();
  },
  z(g, s, c) {
    g.strokeStyle = c;
    g.lineWidth = Math.max(1.5, s * 0.24);
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(-s * 0.6, -s * 0.6);
    g.lineTo(s * 0.6, -s * 0.6);
    g.lineTo(-s * 0.6, s * 0.6);
    g.lineTo(s * 0.6, s * 0.6);
    g.stroke();
  },
  engrenagem(g, s, c, c2) {
    g.fillStyle = c;
    estrelaPath(g, 8, s, s * 0.78);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.arc(0, 0, s * 0.32, 0, TAU);
    g.fill();
  },
  carta(g, s, c, c2) {
    g.fillStyle = "#fff";
    g.fillRect(-s * 0.62, -s, s * 1.24, s * 2);
    g.strokeStyle = c;
    g.lineWidth = Math.max(1, s * 0.1);
    g.strokeRect(-s * 0.62, -s, s * 1.24, s * 2);
    g.fillStyle = c2;
    estrelaPath(g, 4, s * 0.5, s * 0.15);
    g.fill();
  },
  ovo(g, s, c, c2) {
    g.fillStyle = c2;
    g.beginPath();
    g.ellipse(0, s * 0.1, s * 0.75, s, 0, 0, TAU);
    g.fill();
    g.fillStyle = c;
    for (const [x, y] of [[-0.3, -0.2], [0.3, 0.3], [-0.1, 0.6]]) {
      g.beginPath();
      g.arc(x * s, y * s, s * 0.17, 0, TAU);
      g.fill();
    }
  },
  semente(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.62, 0, 0, TAU);
    g.fill();
    g.fillStyle = c2;
    g.beginPath();
    g.ellipse(-s * 0.3, -s * 0.15, s * 0.3, s * 0.15, 0, 0, TAU);
    g.fill();
  },
  fumaca(g, s, c) {
    g.fillStyle = c;
    for (const [x, y, r] of [[-0.45, 0.1, 0.55], [0.1, -0.25, 0.6], [0.45, 0.15, 0.5], [0, 0.3, 0.5]]) {
      g.beginPath();
      g.arc(x * s, y * s, r * s, 0, TAU);
      g.fill();
    }
  },
  punho(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.roundRect(-s * 0.7, -s * 0.6, s * 1.4, s * 1.2, s * 0.35);
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.1);
    for (const y of [-0.3, 0, 0.3]) {
      g.beginPath();
      g.moveTo(s * 0.1, y * s);
      g.lineTo(s * 0.65, y * s);
      g.stroke();
    }
  },
  garra(g, s, c) {
    g.strokeStyle = c;
    g.lineCap = "round";
    g.lineWidth = Math.max(1.5, s * 0.16);
    for (const o of [-0.45, 0, 0.45]) {
      g.beginPath();
      g.moveTo(-s * 0.8 + o * s * 0.4, -s * 0.9 + o * s);
      g.quadraticCurveTo(o * s, o * s * 0.5, s * 0.8 + o * s * 0.4, s * 0.9 + o * s);
      g.stroke();
    }
  },
  caveira(g, s, c, c2) {
    g.fillStyle = c2;
    g.beginPath();
    g.arc(0, -s * 0.15, s * 0.75, 0, TAU);
    g.fill();
    g.fillRect(-s * 0.4, s * 0.3, s * 0.8, s * 0.45);
    g.fillStyle = c;
    for (const x of [-0.3, 0.3]) {
      g.beginPath();
      g.arc(x * s, -s * 0.15, s * 0.2, 0, TAU);
      g.fill();
    }
  },
  seta(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, -s);
    g.lineTo(s * 0.8, 0);
    g.lineTo(s * 0.32, 0);
    g.lineTo(s * 0.32, s);
    g.lineTo(-s * 0.32, s);
    g.lineTo(-s * 0.32, 0);
    g.lineTo(-s * 0.8, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.1);
    g.stroke();
  },
  poeira(g, s, c) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s, 0, TAU);
    g.fill();
  },
  estilhaco(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(-s * 0.6, -s * 0.5);
    g.lineTo(-s * 0.3, s * 0.6);
    g.closePath();
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = 1;
    g.stroke();
  },
  olho(g, s, c, c2) {
    g.fillStyle = c2;
    g.beginPath();
    g.moveTo(-s, 0);
    g.quadraticCurveTo(0, -s * 0.9, s, 0);
    g.quadraticCurveTo(0, s * 0.9, -s, 0);
    g.fill();
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s * 0.38, 0, TAU);
    g.fill();
  },
  hexagono(g, s, c, c2) {
    g.beginPath();
    for (let i = 0; i < 6; i++) g.lineTo(Math.cos((i * TAU) / 6) * s, Math.sin((i * TAU) / 6) * s);
    g.closePath();
    g.fillStyle = c;
    g.globalAlpha *= 0.35;
    g.fill();
    g.globalAlpha /= 0.35;
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.1);
    g.stroke();
  },
  lua(g, s, c) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, s, 0.6, TAU - 0.6);
    g.arc(s * 0.45, 0, s * 0.72, TAU - 1.0, 1.0, true);
    g.fill();
  },
  presente(g, s, c, c2) {
    g.fillStyle = c;
    g.fillRect(-s * 0.75, -s * 0.5, s * 1.5, s * 1.3);
    g.fillStyle = c2;
    g.fillRect(-s * 0.14, -s * 0.5, s * 0.28, s * 1.3);
    g.fillRect(-s * 0.85, -s * 0.72, s * 1.7, s * 0.3);
    g.beginPath();
    g.ellipse(-s * 0.3, -s * 0.85, s * 0.3, s * 0.16, -0.5, 0, TAU);
    g.ellipse(s * 0.3, -s * 0.85, s * 0.3, s * 0.16, 0.5, 0, TAU);
    g.fill();
  },
  concha(g, s, c, c2) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, s * 0.7);
    g.arc(0, s * 0.7, s * 1.25, -Math.PI * 0.82, -Math.PI * 0.18);
    g.closePath();
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = Math.max(1, s * 0.08);
    for (let i = 1; i < 5; i++) {
      const a = -Math.PI * 0.82 + (i * Math.PI * 0.64) / 5;
      g.beginPath();
      g.moveTo(0, s * 0.7);
      g.lineTo(Math.cos(a) * s * 1.2, s * 0.7 + Math.sin(a) * s * 1.2);
      g.stroke();
    }
  },
};

export function desenharForma(g: G, forma: Forma, s: number, c: string, c2: string, t: number) {
  if (s <= 0.2) return;
  DESENHOS[forma](g, s, c, c2, t);
}

export const FORMAS = Object.keys(DESENHOS) as Forma[];

// Halo pré-desenhado por cor (gradiente radial), desenhado com "lighter": brilho barato,
// sem shadowBlur (que derruba o fps no celular).
const halos = new Map<string, HTMLCanvasElement>();
export function halo(cor: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  let h = halos.get(cor);
  if (!h) {
    h = document.createElement("canvas");
    h.width = h.height = 64;
    const g = h.getContext("2d");
    if (!g) return null;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, cor);
    gr.addColorStop(0.35, cor + "88");
    gr.addColorStop(1, cor + "00");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    halos.set(cor, h);
  }
  return h;
}
