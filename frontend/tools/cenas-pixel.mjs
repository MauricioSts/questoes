// Cenas em pixel art quadro a quadro para os golpes sem folha do DP: o mesmo formato do
// Shadow Ball (uma tela do DS por quadro, `ds: true` na receita), mas desenhada por código.
// Nenhum pixel vem dos jogos.
//
// Cada golpe da tabela GOLPES de tools/receitas-pixel.mjs vira uma cena. A receita antiga do
// golpe continua sendo a fonte do tempo (hits, avanço do Pokémon, tremor, escurecimento):
// a cena desenha carga, viagem, impacto e respingo em volta desses instantes, a 20 quadros
// por segundo, com contorno escuro de 1 px, 4 tons + brilho branco e sem antisserrilhado.
//
// Coordenadas em px do DS com origem no meio entre usuário e alvo (player.ts: DS_TELA =
// [132, -64]). A folha "virada" (inimigo atacando) é desenhada com os papéis trocados e girada
// 180°, porque o player gira os quadros de tela: assim o raio continua caindo do céu.
//
// Grava public/fx/Cena-<slug>.png (+ Cena-<slug>-v.png) em PNG indexado e funde no atlas
// com `sobDemanda: true` (sprites/fx.ts só baixa quando o golpe vai tocar).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { GOLPES, receitasPixel } from "./receitas-pixel.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(RAIZ, "public/fx");
const ATLAS = path.join(OUT, "fx-atlas.json");

const FPS = 20;
const TQ = 60 / FPS; // ticks (1/60 s) por quadro
const CW = 352;
const CH = 256;
const CX = CW / 2;
const CY = CH / 2;
const U0 = [-66, 32];
const T0 = [66, -32];

// ---------- cores ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pack = ([r, g, b]) => (((255 << 24) | (r << 16) | (g << 8) | b) >>> 0);
const C = (h) => pack(hex(h));
const escurecer = (h, f) => pack(hex(h).map((v) => Math.round(v * f)));

const PALETA_TIPO = [
  ["#A8A878", "#E8E8D8", "#FFFFFF"],
  ["#F08030", "#FFD27A", "#D83818"],
  ["#6890F0", "#A8D8F8", "#3058C0"],
  ["#F8D030", "#FFF6A8", "#C8A010"],
  ["#78C850", "#C8F0A0", "#408830"],
  ["#98D8D8", "#E0F8F8", "#58A8B8"],
  ["#C03028", "#F08870", "#801810"],
  ["#A040A0", "#D898D8", "#682068"],
  ["#E0C068", "#F0E0A0", "#A88830"],
  ["#A890F0", "#D8D0F8", "#7860C0"],
  ["#F85888", "#FFA8C8", "#C03060"],
  ["#A8B820", "#D8E868", "#708010"],
  ["#B8A038", "#E0D098", "#786820"],
  ["#705898", "#A890C8", "#403060"],
  ["#7038F8", "#A890F8", "#4820B0"],
  ["#705848", "#A09080", "#302820"],
  ["#B8B8D0", "#E8E8F8", "#787898"],
  ["#EE99AC", "#FFD8E4", "#C86880"],
];
// cor de destaque (rastros, faíscas) por tipo
const ACENTO = ["#FFFFFF", "#FFF060", "#FFFFFF", "#FFFFFF", "#F0F870", "#FFFFFF", "#F8D030", "#E870F0", "#886030", "#FFFFFF", "#F8C8F8", "#F8F8A0", "#685818", "#E040C0", "#F86848", "#C02040", "#FFFFFF", "#FFFFFF"];

function paleta(tipo) {
  if (tipo === undefined || tipo === 0)
    return { o: C("#404040"), s: C("#A8A8A0"), b: C("#D8D8D0"), l: C("#F8F8F0"), w: C("#FFFFFF"), a: C("#FFFFFF") };
  const [p, cl, e] = PALETA_TIPO[tipo];
  return { o: escurecer(e, 0.42), s: C(e), b: C(p), l: C(cl), w: C("#FFFFFF"), a: C(ACENTO[tipo]) };
}
const P_FOGO = { o: C("#501008"), s: C("#D83818"), b: C("#F08030"), l: C("#FFD860"), w: C("#FFFFE0"), a: C("#FFF060") };
const P_FUMACA = { o: C("#383838"), s: C("#707070"), b: C("#A0A0A0"), l: C("#D0D0D0"), w: C("#F0F0F0"), a: C("#FFFFFF") };
const P_PEDRA = { o: C("#302010"), s: C("#786820"), b: C("#B8A038"), l: C("#E0D098"), w: C("#F8F0D0"), a: C("#E0D098") };
const P_TERRA = { o: C("#302010"), s: C("#806030"), b: C("#B89058"), l: C("#E0C890"), w: C("#F8F0D0"), a: C("#E0C890") };
const P_MAO = { o: C("#383838"), s: C("#B8B8B8"), b: C("#E8E8E8"), l: C("#FFFFFF"), w: C("#FFFFFF"), a: C("#FFFFFF") };
const P_IMPACTO = { o: C("#584010"), s: C("#F0A000"), b: C("#F8E040"), l: C("#FFF8B0"), w: C("#FFFFFF"), a: C("#FFFFFF") };
const P_CORACAO = { o: C("#601830"), s: C("#D04870"), b: C("#F87098"), l: C("#FFB8D0"), w: C("#FFFFFF"), a: C("#FFFFFF") };
const P_OURO = { o: C("#584000"), s: C("#C08810"), b: C("#F8D030"), l: C("#FFF8A0"), w: C("#FFFFFF"), a: C("#FFFFFF") };
const P_OSSO = { o: C("#504020"), s: C("#D0C098"), b: C("#F0E8D0"), l: C("#FFFFFF"), w: C("#FFFFFF"), a: C("#FFFFFF") };

// ---------- números ----------
const lerp = (a, b, f) => a + (b - a) * f;
const cl01 = (f) => Math.max(0, Math.min(1, f));
const eOut = (f) => 1 - (1 - f) * (1 - f);
const eIn = (f) => f * f;
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
// caminho do usuário ao alvo com arco (para cima)
function caminho(A, B, f, arco = 0) {
  return [lerp(A[0], B[0], f), lerp(A[1], B[1], f) - arco * Math.sin(Math.PI * f)];
}

// ---------- tela ----------
class Tela {
  constructor() {
    this.c = new Uint32Array(CW * CH);
  }
  // pinta um objeto: f(x, y) devolve a cor do pixel (coordenadas da cena, centro do pixel)
  // ou 0. Depois põe contorno de 1 px em volta e cola por cima do que já está na tela.
  obj(x0, y0, x1, y1, f, contorno) {
    const ax = Math.max(0, Math.floor(x0 + CX) - 1);
    const ay = Math.max(0, Math.floor(y0 + CY) - 1);
    const bx = Math.min(CW - 1, Math.ceil(x1 + CX) + 1);
    const by = Math.min(CH - 1, Math.ceil(y1 + CY) + 1);
    if (bx < ax || by < ay) return;
    const w = bx - ax + 1;
    const h = by - ay + 1;
    const tmp = new Uint32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const v = f(ax + x - CX + 0.5, ay + y - CY + 0.5);
        if (v) tmp[y * w + x] = v;
      }
    if (contorno) {
      const marca = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (tmp[y * w + x]) continue;
          if ((x > 0 && tmp[y * w + x - 1]) || (x < w - 1 && tmp[y * w + x + 1]) || (y > 0 && tmp[(y - 1) * w + x]) || (y < h - 1 && tmp[(y + 1) * w + x])) marca.push(y * w + x);
        }
      for (const i of marca) tmp[i] = contorno;
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = tmp[y * w + x];
        if (v) this.c[(ay + y) * CW + ax + x] = v;
      }
  }
  // some em xadrez (o "sumir" dos jogos de DS)
  xadrez(fase = 0) {
    for (let y = 0; y < CH; y++) for (let x = (y + fase) % 2; x < CW; x += 2) this.c[y * CW + x] = 0;
  }
}

// ---------- primitivas ----------
// tom de uma esfera com luz em cima à esquerda (nx, ny dentro do disco unitário)
function tomEsfera(nx, ny, P) {
  const hl = Math.hypot(nx + 0.38, ny + 0.38);
  if (hl < 0.2) return P.w;
  if (hl < 0.58) return P.l;
  if (nx * nx + ny * ny > 0.7) return P.s;
  return P.b;
}

// bola com borda ondulada (wob 0 = círculo)
function bola(q, cx, cy, r, P, o = {}) {
  if (r < 0.6) return;
  const wob = o.wob ?? 0;
  const fase = o.fase ?? 0;
  const lob = o.lobos ?? 7;
  const raio = (a) => r * (1 + wob * (0.6 * Math.sin(lob * a + fase) + 0.4 * Math.sin(3 * a - fase * 1.7)));
  const R = r * (1 + wob) + 1;
  q.obj(cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const rr = raio(Math.atan2(dy, dx));
    const d = Math.hypot(dx, dy);
    if (d > rr) return 0;
    if (o.chapado) return o.chapado;
    if (o.anelEscuro && d > rr - Math.max(1.5, r * 0.18)) return P.s;
    return tomEsfera(dx / rr, dy / rr, P);
  }, o.contorno === false ? 0 : P.o);
}

// elipse girada (rastros, gotas, folhas)
function elipse(q, cx, cy, a, b, ang, P, o = {}) {
  if (a < 0.5 || b < 0.3) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const R = Math.max(a, b) + 1;
  q.obj(cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const u = (dx * ca + dy * sa) / a;
    const v = (-dx * sa + dy * ca) / b;
    const d = u * u + v * v;
    if (d > 1) return 0;
    if (o.chapado) return o.chapado;
    if (o.ponta && u < -0.2) return P.l; // gota: a ponta de trás é mais clara
    return v < -0.25 && d < 0.6 ? P.l : d > 0.65 ? P.s : P.b;
  }, o.contorno === false ? 0 : P.o);
}

// distância de ponto a segmento
function dSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const l2 = vx * vx + vy * vy || 1;
  const t = cl01(((px - ax) * vx + (py - ay) * vy) / l2);
  return [Math.hypot(px - ax - vx * t, py - ay - vy * t), t];
}

// linha grossa por uma polilinha: miolo branco, corpo, borda (raio, feixe, chicote)
function traco(q, pts, larg, P, o = {}) {
  if (pts.length < 2 || larg < 0.4) return;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const m = larg + 2;
  const afina = o.afina ?? 0; // 0..1: quanto a ponta final fica fina
  q.obj(x0 - m, y0 - m, x1 + m, y1 + m, (x, y) => {
    let best = Infinity;
    let at = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [d, t] = dSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < best) {
        best = d;
        at = (i + t) / (pts.length - 1);
      }
    }
    const w = larg * (1 - afina * at);
    if (best > w) return 0;
    const f = best / w;
    if (f < (o.miolo ?? 0.34)) return o.semMiolo ? P.l : P.w;
    if (f < 0.68) return P.l;
    return o.chapado ?? P.b;
  }, o.contorno === false ? 0 : P.o);
}

// anel (onda de choque) achatado em ry
function anel(q, cx, cy, r, esp, P, o = {}) {
  if (r < 1 || esp < 0.4) return;
  const ry = o.ry ?? 0.45;
  q.obj(cx - r - esp, cy - r * ry - esp, cx + r + esp, cy + r * ry + esp, (x, y) => {
    const dx = x - cx;
    const dy = (y - cy) / ry;
    const d = Math.hypot(dx, dy);
    const e = Math.abs(d - r);
    if (e > esp) return 0;
    if (o.so && !o.so(Math.atan2(dy, dx))) return 0;
    return e < esp * 0.4 ? P.w : dy < 0 ? P.l : P.b;
  }, o.contorno === false ? 0 : P.o);
}

// estrela de impacto de n pontas
function estrela(q, cx, cy, rIn, rOut, n, rot, P, o = {}) {
  if (rOut < 1) return;
  q.obj(cx - rOut, cy - rOut, cx + rOut, cy + rOut, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx) - rot;
    const seg = (2 * Math.PI) / n;
    const k = Math.abs((((a % seg) + seg) % seg) / seg - 0.5) * 2; // 1 no meio entre pontas, 0 na ponta
    const lim = lerp(rOut, rIn, k);
    if (d > lim) return 0;
    const f = d / lim;
    if (f < 0.42) return P.w;
    if (f < 0.72) return P.l;
    return o.chapado ?? P.b;
  }, o.contorno === false ? 0 : P.o);
}

// cintilância de 4 pontas (brilho de status)
function cintila(q, cx, cy, r, P) {
  if (r < 1) return;
  q.obj(cx - r, cy - r, cx + r, cy + r, (x, y) => {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    if (dx * dy > r * 0.55 || dx + dy > r + 0.4) return 0;
    return dx + dy < r * 0.45 ? P.w : P.l;
  }, P.o);
}

// meia-lua (corte): arco de raio r entre a0 e a1, mais grosso no meio
function crescente(q, cx, cy, r, larg, a0, a1, P, o = {}) {
  if (larg < 0.5 || a1 <= a0) return;
  const R = r + larg + 1;
  q.obj(cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    let a = Math.atan2(dy, dx);
    while (a < a0) a += 2 * Math.PI;
    if (a > a1) return 0;
    const f = (a - a0) / (a1 - a0);
    const w = larg * Math.sin(Math.PI * f) ** 0.7;
    const d = Math.hypot(dx, dy);
    if (d > r || d < r - w) return 0;
    const g = (r - d) / Math.max(1, w);
    return g < 0.35 ? P.w : g < 0.7 ? P.l : P.b;
  }, o.contorno === false ? 0 : P.o);
}

// polígono preenchido (pedra, mão, chifre); tom pela altura da face
function poligono(q, pts, P, o = {}) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const cy = (y0 + y1) / 2;
  const cx = (x0 + x1) / 2;
  const h = Math.max(1, y1 - y0);
  const w = Math.max(1, x1 - x0);
  q.obj(x0, y0, x1, y1, (x, y) => {
    let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    if (!dentro) return 0;
    const ny = (y - cy) / h;
    const nx = (x - cx) / w;
    if (o.chapado) return o.chapado;
    if (nx + ny < -0.45) return P.w;
    if (nx + ny < -0.1) return P.l;
    if (nx + ny > 0.45) return P.s;
    return P.b;
  }, P.o);
}

// polígono regular irregular (pedra) girado
function pedra(q, cx, cy, r, rot, P, seed = 1) {
  const R = rng(seed);
  const n = 6 + Math.floor(R() * 2);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const rr = r * (0.72 + R() * 0.38);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poligono(q, pts, P);
}

// cone (chifre, broca, pingente) apontando para `ang`
function cone(q, cx, cy, comp, larg, ang, P) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pts = [
    [cx + ca * comp * 0.6, cy + sa * comp * 0.6],
    [cx - ca * comp * 0.4 - sa * larg, cy - sa * comp * 0.4 + ca * larg],
    [cx - ca * comp * 0.5, cy - sa * comp * 0.5],
    [cx - ca * comp * 0.4 + sa * larg, cy - sa * comp * 0.4 - ca * larg],
  ];
  poligono(q, pts, P);
}

// mão: 0 punho, 1 palma aberta
function mao(q, cx, cy, esc, f, P = P_MAO, vira = 1) {
  const s = esc;
  if (f === 0) {
    bola(q, cx, cy, 9 * s, P);
    for (let i = 0; i < 4; i++) bola(q, cx + vira * 7 * s, cy - 6 * s + i * 4 * s, 2.6 * s, P);
    bola(q, cx - vira * 2 * s, cy + 7 * s, 3.2 * s, P);
  } else {
    elipse(q, cx, cy + 2 * s, 8 * s, 9 * s, 0, P);
    for (let i = 0; i < 4; i++) elipse(q, cx - 6 * s + i * 4 * s, cy - 10 * s + Math.abs(i - 1.5) * 1.6 * s, 2 * s, 5.2 * s, 0, P);
    elipse(q, cx + vira * 10 * s, cy + 2 * s, 5 * s, 2.2 * s, -0.5 * vira, P);
  }
}

function coracao(q, cx, cy, r, P = P_CORACAO) {
  q.obj(cx - r * 1.3, cy - r * 1.2, cx + r * 1.3, cy + r * 1.3, (x, y) => {
    const X = (x - cx) / r;
    const Y = -(y - cy) / r;
    const v = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y;
    if (v > 0) return 0;
    return X < -0.2 && Y > 0.2 ? P.l : Y < -0.5 ? P.s : P.b;
  }, P.o);
}

function moeda(q, cx, cy, r, giro, P = P_OURO) {
  const rx = Math.max(1, r * Math.abs(Math.cos(giro)));
  elipse(q, cx, cy, rx, r, 0, P);
  if (rx > 3) bola(q, cx, cy, Math.min(rx, r) * 0.35, P, { chapado: P.s, contorno: false });
}

function osso(q, cx, cy, comp, rot, P = P_OSSO) {
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const a = [cx - ca * comp, cy - sa * comp];
  const b = [cx + ca * comp, cy + sa * comp];
  traco(q, [a, b], comp * 0.18, P, { semMiolo: true });
  for (const [x, y] of [a, b])
    for (const k of [-1, 1]) bola(q, x - sa * k * comp * 0.22, y + ca * k * comp * 0.22, comp * 0.24, P);
}

// relâmpago serrilhado entre dois pontos
function raioZig(q, A, B, larg, P, seed, o = {}) {
  const R = rng(seed);
  const n = o.n ?? 7;
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const amp = o.amp ?? L * 0.12;
  const pts = [A];
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const off = (R() * 2 - 1) * amp * (i % 2 ? 1 : -0.6);
    pts.push([A[0] + dx * f + nx * off, A[1] + dy * f + ny * off]);
  }
  pts.push(B);
  traco(q, pts, larg, P, { miolo: 0.45, afina: o.afina ?? 0.2 });
}

// ---------- efeitos compostos (cada um desenha no quadro em `lt` ticks desde o início) ----------

// energia juntando: rastros entrando + esfera crescendo e pulsando
function fxJuntar(q, at, lt, len, r, P, seed) {
  const f = cl01(lt / len);
  const R = rng(seed);
  for (let i = 0; i < 9; i++) {
    const a0 = R() * Math.PI * 2;
    const atraso = R() * 0.45;
    const g = cl01((f - atraso) / 0.5);
    if (g <= 0 || g >= 1) continue;
    const d = lerp(r * 3.6, r * 0.6, eIn(g));
    elipse(q, at[0] + Math.cos(a0) * d, at[1] + Math.sin(a0) * d, 4.5 - g * 2, 1.4, a0, P, { chapado: P.a });
  }
  const rr = r * (0.25 + 0.75 * eOut(f)) * (1 + 0.08 * Math.sin(lt * 1.3));
  bola(q, at[0], at[1], rr, P, { wob: 0.08, fase: lt * 0.5, anelEscuro: true });
}

// estrela de impacto que estoura em lascas, com anel
function fxImpacto(q, at, lt, r, P, seed, o = {}) {
  const len = o.len ?? 16;
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  const rot = R() * 0.6;
  if (f < 0.55) {
    const g = f / 0.55;
    const rr = r * (g < 0.3 ? lerp(0.3, 1.15, g / 0.3) : lerp(1.15, 0.85, (g - 0.3) / 0.7));
    estrela(q, at[0], at[1], rr * 0.45, rr, o.pontas ?? 8, rot, P);
  }
  if (f > 0.2) {
    const g = (f - 0.2) / 0.8;
    anel(q, at[0], at[1], r * lerp(0.6, 1.9, eOut(g)), Math.max(0.6, 3 * (1 - g)), P, { ry: 0.55 });
  }
  if (f > 0.3) {
    const g = (f - 0.3) / 0.7;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + R();
      const d = r * lerp(0.7, 2.1, eOut(g));
      const s = 3.2 * (1 - g) + 0.6;
      cone(q, at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d, s * 2.4, s * 0.7, a, P);
    }
  }
}

// respingo do Shadow Ball: a bola incha e se parte em gotas que voam e somem
function fxRespingo(q, at, lt, r, P, seed, o = {}) {
  const len = o.len ?? 24;
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  if (f < 0.3) bola(q, at[0], at[1], r * lerp(1, 1.5, f / 0.3), P, { wob: 0.14, fase: lt, anelEscuro: true });
  const n = o.n ?? 11;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const vel = 0.6 + R() * 0.9;
    const tam = r * (0.22 + R() * 0.3);
    const g = cl01((f - 0.12) / 0.88);
    if (g <= 0) continue;
    const d = r * (0.6 + 2.3 * vel * eOut(g));
    const s = tam * (1 - g * 0.75);
    bola(q, at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d + (o.gravidade ? 30 * g * g : 0), s, P, { wob: 0.1, fase: i });
  }
  if (f > 0.15 && f < 0.6) bola(q, at[0], at[1], r * lerp(1.3, 0.4, (f - 0.15) / 0.45), P, { wob: 0.25, fase: lt * 0.7, chapado: P.s });
}

// fumaça/névoa: rolos que crescem, sobem e somem
function fxFumaca(q, at, lt, len, r, P, seed, o = {}) {
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  const n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const d = R() * r * 0.9;
    const atraso = R() * 0.3;
    const g = cl01((f - atraso) / (1 - atraso));
    if (g <= 0) continue;
    const tam = r * (0.35 + R() * 0.25) * (0.4 + 0.8 * eOut(g)) * (g > 0.75 ? 1 - (g - 0.75) * 2.4 : 1);
    bola(q, at[0] + Math.cos(a) * d * (1 + g * 0.5) + (o.vx ?? 0) * g, at[1] + Math.sin(a) * d * 0.6 - (o.sobe ?? 10) * g, tam, P, { wob: 0.12, fase: i + lt * 0.2 });
  }
}

// pedrinhas voando com gravidade
function fxPedras(q, at, lt, len, n, P, seed, o = {}) {
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const vx = (R() * 2 - 1) * (o.abre ?? 2.2);
    const vy = -(1.6 + R() * 2.2) * (o.forca ?? 1);
    const t = lt;
    const x = at[0] + vx * t;
    const y = at[1] + vy * t + 0.11 * t * t;
    const s = (o.tam ?? 4) * (0.6 + R() * 0.7) * (f > 0.8 ? 1 - (f - 0.8) * 3 : 1);
    pedra(q, x, y, s, t * 0.3 * (R() > 0.5 ? 1 : -1), P, seed + i);
  }
}

// faíscas de 4 pontas pipocando em volta
function fxFaiscas(q, at, lt, len, raio, n, P, seed) {
  if (lt < 0 || lt > len) return;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const d = raio * (0.3 + R() * 0.8);
    const t0 = R() * len * 0.6;
    const vida = 6 + R() * 6;
    const g = (lt - t0) / vida;
    if (g < 0 || g > 1) continue;
    cintila(q, at[0] + Math.cos(a) * d * (1 + g * 0.4), at[1] + Math.sin(a) * d * (1 + g * 0.4), 5 * Math.sin(Math.PI * g) + 1, P);
  }
}

// bola de fogo da explosão (cores próprias)
function fxExplosao(q, at, lt, len, r, seed) {
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  const bolhas = 9;
  for (let i = 0; i < bolhas; i++) {
    const a = R() * Math.PI * 2;
    const d = r * R() * 0.8 * eOut(f) + (i === 0 ? 0 : 3);
    const tam = r * (0.35 + R() * 0.3) * (f < 0.25 ? f / 0.25 : 1) * (1 + f * 0.6);
    const P = f < 0.45 ? P_FOGO : f < 0.75 ? { ...P_FOGO, w: P_FOGO.l, l: P_FOGO.b, b: P_FOGO.s } : P_FUMACA;
    bola(q, at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d * 0.8 - f * 10, tam, P, { wob: 0.15, fase: i + lt * 0.3 });
  }
  if (f < 0.3) bola(q, at[0], at[1], r * 0.6 * (1 - f / 0.3) + 2, P_FOGO, { chapado: P_FOGO.w, contorno: false });
}

// rastros de velocidade (investida)
function fxVelocidade(q, de, para, lt, len, P, seed) {
  if (lt < 0 || lt > len) return;
  const R = rng(seed);
  const ang = Math.atan2(para[1] - de[1], para[0] - de[0]);
  const f = lt / len;
  for (let i = 0; i < 6; i++) {
    const off = (R() * 2 - 1) * 22;
    const along = lerp(0.1, 0.85, (f + R() * 0.5) % 1);
    const x = lerp(de[0], para[0], along) - Math.sin(ang) * off;
    const y = lerp(de[1], para[1], along) + Math.cos(ang) * off;
    elipse(q, x, y, 9 * (1 - f * 0.5), 1.2, ang, P, { chapado: P.l });
  }
}

// poeira no chão
function fxPoeira(q, chao, lt, len, P, seed) {
  if (lt < 0 || lt > len) return;
  const f = lt / len;
  const R = rng(seed);
  for (let i = 0; i < 6; i++) {
    const lado = i % 2 ? 1 : -1;
    const d = (8 + R() * 10) + 22 * eOut(f) * (0.6 + R() * 0.6);
    const tam = (3 + R() * 3) * (1 - f * 0.8);
    bola(q, chao[0] + lado * d, chao[1] - f * 5 - R() * 3, tam, P, { wob: 0.1, fase: i });
  }
}

// ---------- peças de projétil ----------
function peca(q, kind, x, y, r, ang, lt, P, seed) {
  switch (kind) {
    case "gota":
      elipse(q, x, y, r * 1.3, r * 0.8, ang, P, { ponta: true });
      break;
    case "pedra":
    case "pedraG":
      pedra(q, x, y, r, lt * 0.35, P_PEDRA, seed);
      break;
    case "vento":
      crescente(q, x - Math.cos(ang) * r, y - Math.sin(ang) * r, r * 1.5, r * 0.75, ang - 1.1, ang + 1.1, P);
      break;
    case "brilho":
      estrela(q, x, y, r * 0.45, r * 1.25, 4, lt * 0.15, P);
      break;
    case "fumaca":
      bola(q, x, y, r, P, { wob: 0.22, fase: lt * 0.6, anelEscuro: true });
      break;
    case "explosao":
      bola(q, x, y, r, P_FOGO, { wob: 0.2, fase: lt * 0.8 });
      break;
    case "chifre":
      cone(q, x, y, r * 2.6, r * 0.7, ang, P);
      break;
    case "moeda":
      moeda(q, x, y, r, lt * 0.5);
      break;
    case "coracao":
      coracao(q, x, y, r);
      break;
    case "osso":
      osso(q, x, y, r * 1.2, lt * 0.5);
      break;
    case "faisca":
      cintila(q, x, y, r * 1.4, P);
      break;
    case "pulso":
      bola(q, x, y, r * (1 + 0.12 * Math.sin(lt * 1.4)), P, { wob: 0.12, fase: lt * 0.9, anelEscuro: true });
      break;
    default:
      bola(q, x, y, r, P, { wob: 0.08, fase: lt * 0.7, anelEscuro: true });
  }
}
const TAM_PECA = { orbe: 9, orbeP: 7, orbeG: 13, gota: 6, pedra: 7, pedraG: 11, vento: 9, brilho: 7, fumaca: 9, explosao: 9, chifre: 6, moeda: 6, coracao: 6, osso: 7, faisca: 5, pulso: 10, coluna: 10, teia: 9, areia: 4 };

// ---------- cenas por modelo ----------
// Cada uma devolve { ev: [[t0, t1, desenhar(q, lt)]...], dur? }. `b` é a receita antiga do
// golpe (tempos), `x` o contexto (U, T, chão, paleta, rng).

const ev = (t0, t1, f) => [t0, t1, f];
const hitsDe = (b, padrao) => (b.hits?.length ? b.hits : padrao);

function auraEv(x, t0, len, P = x.P) {
  return ev(t0, t0 + len, (q, lt) => {
    const f = lt / len;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + lt * 0.15;
      const ph = (lt * 0.9 + i * 3) % 10;
      const y = x.U[1] + 20 - ph * 4;
      const xx = x.U[0] + Math.cos(a) * 24;
      const s = (1 - ph / 10) * 5 * Math.sin(Math.PI * Math.min(1, f * 4, (1 - f) * 4));
      cone(q, xx, y, s * 2.6, s * 0.8, -Math.PI / 2, P);
    }
  });
}

function impactoEv(x, h, r, P = x.P, o = {}) {
  const lista = [ev(h - 1, h + 24, (q, lt) => fxImpacto(q, x.T, lt, r, P, x.seed + h, { len: 24 }))];
  if (o.poeira !== false) lista.push(ev(h, h + 24, (q, lt) => fxPoeira(q, x.chaoT, lt, 24, P_FUMACA, x.seed + h * 3)));
  return lista;
}

const CENAS = {
  contato(x, b, o) {
    const hs = hitsDe(b, [12]);
    const r = o.forte ? 34 : 27;
    const L = [];
    if (o.layersAntes || o.antes) L.push(auraEv(x, 0, (o.antes ?? 12) + 8, o.cor !== undefined ? x.P : P_FOGO));
    if (o.vento) L.push(ev(0, hs[0], (q, lt) => fxVelocidade(q, x.U, x.T, lt, hs[0], x.P, x.seed)));
    hs.forEach((h, i) => {
      L.push(ev(Math.max(0, h - 9), h, (q, lt) => fxVelocidade(q, x.U, x.T, lt, 9, P_MAO, x.seed + i)));
      L.push(...impactoEv(x, h, r * (i === hs.length - 1 ? 1 : 0.85), o.cor !== undefined ? x.P : P_IMPACTO));
      if (o.pedras) L.push(ev(h, h + 28, (q, lt) => fxPedras(q, x.chaoT, lt, 28, 6, P_PEDRA, x.seed + i)));
      if (o.explode) L.push(ev(h, h + 34, (q, lt) => fxExplosao(q, x.T, lt, 34, 30, x.seed + i)));
      L.push(ev(h + 2, h + 28, (q, lt) => fxFaiscas(q, x.T, lt, 26, o.forte ? 40 : 32, o.forte || o.flash ? 9 : 6, P_IMPACTO, x.seed + i * 7)));
    });
    return { ev: L };
  },

  carga(x, b, o) {
    const hs = hitsDe(b, [40]);
    const h = hs[0];
    const P = x.P;
    return {
      ev: [
        ev(0, h - 6, (q, lt) => {
          const f = lt / (h - 6);
          fxJuntar(q, [x.U[0], x.U[1] - 4], lt, h - 10, 16, P, x.seed);
          if (Math.floor(lt / 3) % 2) anel(q, x.U[0], x.U[1] + 24, 30 * (0.5 + f * 0.5), 2, P, { ry: 0.35 });
        }),
        ev(h - 9, h, (q, lt) => fxVelocidade(q, x.U, x.T, lt, 9, P, x.seed)),
        ...impactoEv(x, h, 32, P),
        ev(h + 2, h + 22, (q, lt) => fxFaiscas(q, x.T, lt, 20, 36, 7, P, x.seed + 5)),
      ],
    };
  },

  golpe(x, b, o) {
    const hs = hitsDe(b, [10]);
    const f = o.f ?? 0;
    const L = [];
    hs.forEach((h, i) => {
      const lado = i % 2 ? 1 : -1;
      const de = [x.T[0] + lado * 46, x.T[1] - 26];
      L.push(
        ev(h - 7, h + 8, (q, lt) => {
          const g = cl01(lt / 7);
          const p = caminho(de, x.T, eIn(g));
          const esc = (o.forte ? 1.5 : 1.15) * (lt > 7 ? 1 - (lt - 7) / 12 : lerp(1.5, 1, g));
          mao(q, p[0] - lado * 4, p[1], esc, f, P_MAO, -lado);
        }),
        ...impactoEv(x, h, o.forte ? 28 : 21, P_IMPACTO, { poeira: false }),
      );
      if (o.anel) L.push(ev(h, h + 16, (q, lt) => anel(q, x.T[0], x.T[1], 12 + lt * 2.4, 3 * (1 - lt / 16), x.P, { ry: 0.9 })));
      if (o.coracao) L.push(ev(h, h + 24, (q, lt) => coracao(q, x.T[0] + 14, x.T[1] - 20 - lt, 6 * Math.sin(Math.PI * lt / 24) + 1)));
      if (o.faixa)
        L.push(ev(h - 2, h + 22, (q, lt) => {
          for (const k of [-1, 1]) anel(q, x.T[0], x.T[1] + k * 8, 26 - lt * 0.3, 3, x.P, { ry: 0.3 });
        }));
    });
    return { ev: L };
  },

  palmas(x, b) {
    const h = hitsDe(b, [14])[0];
    return {
      ev: [
        ev(0, h + 6, (q, lt) => {
          const g = eIn(cl01(lt / h));
          for (const k of [-1, 1]) mao(q, x.T[0] + k * lerp(50, 10, g), x.T[1] - 4, 1.4, 1, P_MAO, -k);
        }),
        ...impactoEv(x, h, 30, P_IMPACTO, { poeira: false }),
        ev(h, h + 20, (q, lt) => fxFaiscas(q, x.T, lt, 20, 34, 8, P_IMPACTO, x.seed)),
      ],
    };
  },

  chifre(x, b, o) {
    const hs = hitsDe(b, [12]);
    const esc = o.esc ?? 1;
    const L = [];
    const ang = Math.atan2(x.T[1] - x.U[1], x.T[0] - x.U[0]);
    if (o.broca) {
      const h0 = hs[0];
      L.push(ev(Math.max(0, h0 - 10), h0, (q, lt) => {
        const p = caminho(x.U, x.T, eIn(lt / 10));
        cone(q, p[0], p[1], 26 * esc, 8 * esc, ang, x.P);
      }));
      L.push(ev(h0, h0 + 26, (q, lt) => {
        cone(q, x.T[0] - Math.cos(ang) * 10, x.T[1] - Math.sin(ang) * 10, 26 * esc, 8 * esc * (0.7 + 0.3 * Math.abs(Math.cos(lt * 0.9))), ang, x.P);
        for (let i = 0; i < 4; i++) {
          const a = lt * 0.8 + i * (Math.PI / 2);
          crescente(q, x.T[0], x.T[1], 16 * esc + i, 4, a, a + 1.2, x.P);
        }
        if (lt % 6 < 3) fxImpacto(q, x.T, (lt % 6) + 4, 16 * esc, P_IMPACTO, x.seed + lt);
      }));
      L.push(...impactoEv(x, h0 + 24, 26 * esc, P_IMPACTO));
      return { ev: L };
    }
    const len = o.len ?? 12;
    hs.forEach((h, i) => {
      L.push(ev(Math.max(0, h - len), h + 3, (q, lt) => {
        const g = cl01(lt / len);
        const p = caminho([x.U[0] + 16, x.U[1] - 8], x.T, eIn(g));
        cone(q, p[0], p[1], 24 * esc, 7 * esc, ang, x.P);
        if (g < 1) elipse(q, p[0] - Math.cos(ang) * 18 * esc, p[1] - Math.sin(ang) * 18 * esc, 12 * esc, 2, ang, x.P, { chapado: x.P.l, contorno: false });
      }));
      L.push(...impactoEv(x, h, (o.forte ? 28 : 20) * Math.min(1.3, esc), P_IMPACTO));
    });
    return { ev: L };
  },

  corte(x, b, o) {
    const hs = hitsDe(b, [10]);
    const esc = o.esc ?? 1;
    const L = [];
    hs.forEach((h, i) => {
      const base = i % 2 ? -0.4 : -2.4;
      const arcos = o.garra ? [-9, 0, 9] : [0];
      L.push(ev(h - 4, h + 14, (q, lt) => {
        const g = cl01(lt / 6);
        const some = lt > 8 ? (lt - 8) / 6 : 0;
        for (const off of arcos) {
          const r = 30 * esc;
          const a0 = base + (i % 2 ? 0 : 0);
          const a1 = a0 + 2.2 * g;
          const cx = x.T[0] + off * 0.7 - (i % 2 ? -10 : 10);
          const cy = x.T[1] + off - 6;
          crescente(q, cx, cy, r, (o.garra ? 5 : 9) * esc * (1 - some), a0 + 2.2 * some, a1, x.P);
        }
        if (lt >= 6 && lt < 12) cintila(q, x.T[0] + (i % 2 ? -22 : 22), x.T[1] - 22, 8 * (1 - (lt - 6) / 6) + 2, x.P);
      }));
      if (o.cruz) L.push(ev(h + 2, h + 18, (q, lt) => {
        const g = cl01(lt / 6);
        const some = lt > 8 ? (lt - 8) / 8 : 0;
        crescente(q, x.T[0] - 12, x.T[1] + 4, 32 * esc, 9 * esc * (1 - some), -0.9 + 2.2 * some, -0.9 + 2.2 * g, x.P);
      }));
      L.push(...impactoEv(x, h + 1, 18 * esc, x.P, { poeira: false }));
      if (o.respingo) L.push(ev(h, h + 22, (q, lt) => fxRespingo(q, x.T, lt, 6, paleta(2), x.seed + i, { len: 22, n: 8, gravidade: true })));
    });
    return { ev: L };
  },

  pinca(x, b, o) {
    const h = hitsDe(b, [12])[0];
    const r = o.ohko ? 34 : 26;
    return {
      ev: [
        ev(Math.max(0, h - 10), h + 12, (q, lt) => {
          const g = eIn(cl01(lt / 10));
          const abre = lerp(1.1, 0.15, g);
          crescente(q, x.T[0] - 4, x.T[1], r, 8, -Math.PI / 2 - abre - 1.4, -Math.PI / 2 - abre + 0.4, x.P);
          crescente(q, x.T[0] + 4, x.T[1], r, 8, Math.PI / 2 + abre - 0.4, Math.PI / 2 + abre + 1.4, x.P);
        }),
        ...impactoEv(x, h, o.ohko ? 34 : 24, P_IMPACTO, { poeira: false }),
        ...(o.respingo ? [ev(h, h + 22, (q, lt) => fxRespingo(q, x.T, lt, 6, paleta(2), x.seed, { len: 22, n: 8, gravidade: true }))] : []),
      ],
    };
  },

  chicote(x, b, o) {
    const hs = hitsDe(b, [12]);
    const esc = o.esc ?? 1;
    const L = [];
    hs.forEach((h, i) => {
      L.push(ev(Math.max(0, h - 10), h + 6, (q, lt) => {
        const g = cl01(lt / 10);
        const base = [x.U[0] + 18, x.U[1] - (o.chao ? -18 : 10)];
        const alvo = o.chao ? x.chaoT : x.T;
        const sobe = (o.chao ? 10 : 60) * (1 - g) * (i % 2 ? -0.6 : 1);
        const pts = [];
        for (let k = 0; k <= 10; k++) {
          const s = k / 10;
          const p = caminho(base, alvo, s * (0.4 + 0.6 * eOut(g)), sobe * 1.2 + 8);
          pts.push([p[0], p[1] + Math.sin(s * Math.PI * 2 + lt) * 3 * (1 - g)]);
        }
        traco(q, pts, 4.2 * esc, x.P, { afina: 0.55 });
      }));
      L.push(...impactoEv(x, h, (o.forte ? 26 : 20) * esc, P_IMPACTO, { poeira: !!o.chao }));
      if (o.respingo) L.push(ev(h, h + 22, (q, lt) => fxRespingo(q, x.T, lt, 7, paleta(2), x.seed + i, { len: 22, n: 9, gravidade: true })));
      if (o.faiscas) L.push(ev(h, h + 18, (q, lt) => fxFaiscas(q, x.T, lt, 18, 30, 6, P_IMPACTO, x.seed + i)));
    });
    return { ev: L };
  },

  osso(x, b, o) {
    const hs = hitsDe(b, [14]);
    const L = [];
    hs.forEach((h, i) => {
      L.push(ev(Math.max(0, h - 14), h + (o.volta ? 16 : 2), (q, lt) => {
        const g = lt <= 14 ? eOut(cl01(lt / 14)) : 1 - eIn(cl01((lt - 14) / 16));
        const p = caminho(x.U, x.T, g, 24);
        osso(q, p[0], p[1], 10, lt * 0.55);
      }));
      L.push(...impactoEv(x, h, 22, P_IMPACTO));
    });
    return { ev: L };
  },

  projetil(x, b, o) {
    const kind = o.peca ?? "orbe";
    const hs = hitsDe(b, [20]);
    const len = o.len ?? 14;
    const r = (TAM_PECA[kind] ?? 8) * (o.esc ?? 1);
    const ang = Math.atan2(x.T[1] - x.U[1], x.T[0] - x.U[0]);
    const L = [];
    const boca = [x.U[0] + 18, x.U[1] - 12];
    const t0 = Math.max(0, hs[0] - len);
    if (o.juntar) L.push(ev(0, t0 + 2, (q, lt) => fxJuntar(q, boca, lt, t0, r, x.P, x.seed)));
    else L.push(ev(Math.max(0, t0 - 6), t0 + 4, (q, lt) => estrela(q, boca[0], boca[1], 3, 9 * Math.sin((Math.PI * lt) / 10) + 2, 6, lt * 0.2, x.P)));
    hs.forEach((h, i) => {
      const comeco = Math.max(0, h - len);
      L.push(ev(comeco, h + 1, (q, lt) => {
        const g = cl01(lt / len);
        const R = rng(x.seed + i);
        const dsp = [(R() * 2 - 1) * 6, (R() * 2 - 1) * 6];
        for (const k of [0.16, 0.08]) {
          const p0 = caminho(boca, [x.T[0] + dsp[0], x.T[1] + dsp[1]], Math.max(0, g - k), o.arc ?? 0);
          if (g - k > 0) bola(q, p0[0], p0[1], r * (k === 0.16 ? 0.35 : 0.55), x.P, { chapado: k === 0.16 ? x.P.s : x.P.b });
        }
        const p = caminho(boca, [x.T[0] + dsp[0], x.T[1] + dsp[1]], g, o.arc ?? 0);
        peca(q, kind, p[0], p[1], r, ang, lt, x.P, x.seed + i);
      }));
      const ultimo = i === hs.length - 1;
      if (["orbe", "orbeP", "orbeG", "gota", "fumaca", "pulso"].includes(kind)) L.push(ev(h, h + 24, (q, lt) => fxRespingo(q, x.T, lt, r * (ultimo ? 1.2 : 0.9), x.P, x.seed + i, { len: 24, gravidade: kind === "gota" })));
      else L.push(...impactoEv(x, h, r * 2.2, kind === "pedra" || kind === "pedraG" ? P_IMPACTO : x.P, { poeira: kind.startsWith("pedra") }));
      if (o.explode && ultimo) L.push(ev(h, h + 34, (q, lt) => fxExplosao(q, x.T, lt, 34, 26 * o.explode + 8, x.seed)));
      if (o.nuvem && ultimo) L.push(ev(h + 4, h + 40, (q, lt) => fxFumaca(q, x.T, lt, 36, 26, x.P, x.seed, { n: 6 })));
      if (o.raio && ultimo) L.push(ev(h, h + 22, (q, lt) => { if (lt % 4 < 2) for (let k = 0; k < 4; k++) raioZig(q, x.T, [x.T[0] + Math.cos(k * 1.6 + lt) * 34, x.T[1] + Math.sin(k * 1.6 + lt) * 26], 2.2, paleta(3), x.seed + lt + k, { n: 4 }); }));
      if (o.faiscas && ultimo) L.push(ev(h, h + 22, (q, lt) => fxFaiscas(q, x.T, lt, 22, 32, 8, x.P, x.seed)));
      if (o.anel) L.push(ev(h, h + 16, (q, lt) => anel(q, x.T[0], x.T[1], 10 + lt * 2.6, 3 * (1 - lt / 16) + 0.5, x.P, { ry: 0.5 })));
      if (o.respingo && ultimo && kind !== "gota") L.push(ev(h, h + 22, (q, lt) => fxRespingo(q, x.T, lt, 6, x.P, x.seed + 9, { len: 22, n: 8, gravidade: true })));
    });
    return { ev: L };
  },

  feixe(x, b, o) {
    const h = hitsDe(b, [16])[0];
    const dur = o.dur ?? 32;
    const esc = o.esc ?? 1;
    const boca = [x.U[0] + 18, x.U[1] - 12];
    const L = [];
    const ini = Math.max(0, h - 6);
    if (o.juntar) L.push(ev(0, ini + 2, (q, lt) => fxJuntar(q, boca, lt, ini, 10 * esc, x.P, x.seed)));
    L.push(ev(ini, ini + dur, (q, lt) => {
      const g = cl01(lt / 6);
      const some = lt > dur - 8 ? (lt - (dur - 8)) / 8 : 0;
      const fim = caminho(boca, x.T, g);
      const larg = 7 * esc * (1 - some) * (1 + 0.15 * Math.sin(lt * 1.7));
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const s = k / 12;
        const p = caminho(boca, fim, s);
        pts.push([p[0], p[1] + Math.sin(s * 9 - lt * 1.3) * 1.6 * esc]);
      }
      traco(q, pts, larg, x.P, { miolo: 0.42 });
      bola(q, boca[0], boca[1], larg * 1.5, x.P, { wob: 0.15, fase: lt });
      if (o.multi || esc > 1.2)
        for (let k = 0; k < 3; k++) {
          const s = ((lt * 0.06 + k / 3) % 1) * g;
          const p = caminho(boca, x.T, s);
          anel(q, p[0], p[1], larg * 1.7, 1.6, x.P, { ry: 1.1 });
        }
      if (g >= 1) bola(q, x.T[0], x.T[1], larg * 2.2 * (1 + 0.12 * Math.sin(lt * 2)), x.P, { wob: 0.2, fase: lt * 0.8, anelEscuro: true });
    }));
    L.push(ev(h, h + dur, (q, lt) => fxFaiscas(q, x.T, lt, dur, 36 * esc, 10, x.P, x.seed + 3)));
    L.push(ev(ini + dur - 6, ini + dur + 20, (q, lt) => fxRespingo(q, x.T, lt, 12 * esc, x.P, x.seed + 4, { len: 20 })));
    return { ev: L };
  },

  raio(x, b, o) {
    const h = hitsDe(b, [8])[0];
    const Pe = x.P;
    const L = [];
    const ceu = (dx) => [x.T[0] + dx, -150];
    const dur = o.grande ? 34 : 26;
    L.push(ev(Math.max(0, h - 2), h + dur, (q, lt) => {
      const pisca = lt % 6 < 4;
      if (o.status) {
        for (let k = 0; k < 3; k++) {
          const a = lt * 0.4 + (k * Math.PI * 2) / 3;
          raioZig(q, [x.T[0] + Math.cos(a) * 30, x.T[1] + Math.sin(a) * 14], [x.T[0] + Math.cos(a + 1.4) * 30, x.T[1] + Math.sin(a + 1.4) * 14], 2.2, Pe, x.seed + lt + k, { n: 4, amp: 5 });
        }
        return;
      }
      if (pisca) {
        if (o.grande || o.cercar) raioZig(q, ceu(0), [x.T[0], x.T[1] + 10], o.grande ? 9 : 6, Pe, x.seed + Math.floor(lt / 2), { n: 9, amp: 16, afina: 0.1 });
        const n = o.cercar ? 4 : 3;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + Math.floor(lt / 2) * 0.9;
          const ext = [x.T[0] + Math.cos(a) * 40, x.T[1] + Math.sin(a) * 30];
          raioZig(q, x.T, ext, 3.2, Pe, x.seed + lt * 7 + k, { n: 4, amp: 8, afina: 0.6 });
        }
      }
      bola(q, x.T[0], x.T[1], (o.grande ? 15 : 10) * (pisca ? 1 : 0.7), Pe, { wob: 0.25, fase: lt });
    }));
    if (!o.status) L.push(...impactoEv(x, h, o.grande ? 30 : 22, Pe, { poeira: !!o.grande }));
    if (o.anel || o.grande) L.push(ev(h, h + 20, (q, lt) => anel(q, x.chaoT[0], x.chaoT[1], 14 + lt * 2.4, 3 * (1 - lt / 20) + 0.5, Pe, { ry: 0.35 })));
    L.push(ev(h + 4, h + dur + 6, (q, lt) => fxFaiscas(q, x.T, lt, dur + 2, 40, 8, Pe, x.seed + 2)));
    return { ev: L };
  },

  choque(x, b, o) {
    const h = hitsDe(b, [30])[0];
    const Pe = paleta(3);
    const L = [];
    const ate = o.depois ? h - 8 : h;
    L.push(ev(0, ate, (q, lt) => {
      for (let k = 0; k < 4; k++) {
        const a = lt * 0.5 + k * 1.57;
        if ((lt + k) % 4 < 2) raioZig(q, [x.U[0] + Math.cos(a) * 30, x.U[1] + Math.sin(a) * 22], [x.U[0] + Math.cos(a + 1.1) * 30, x.U[1] + Math.sin(a + 1.1) * 22], 2.4, Pe, x.seed + lt + k, { n: 4, amp: 6 });
      }
      bola(q, x.U[0], x.U[1] - 2, 6 + 2 * Math.sin(lt), Pe, { wob: 0.3, fase: lt, contorno: true });
    }));
    if (o.depois) {
      L.push(ev(h - 8, h, (q, lt) => fxVelocidade(q, x.U, x.T, lt, 8, Pe, x.seed)));
      L.push(...impactoEv(x, h, o.forte ? 32 : 24, Pe));
    } else {
      L.push(ev(h - 4, h + 22, (q, lt) => {
        if (lt % 4 < 3)
          for (let k = 0; k < 3; k++) raioZig(q, [x.U[0] + 14, x.U[1] - 10], [x.T[0] + (k - 1) * 14, x.T[1] + (k - 1) * 8], 3.4, Pe, x.seed + lt * 3 + k, { n: 8, amp: 14 });
      }));
      L.push(...impactoEv(x, h, 26, Pe));
    }
    L.push(ev(h, h + 24, (q, lt) => fxFaiscas(q, x.T, lt, 24, 34, 8, Pe, x.seed + 5)));
    return { ev: L };
  },

  nuvem(x, b, o) {
    const P = o.cor !== undefined ? paleta(o.cor) : x.P;
    const onde = o.onde ?? "alvo";
    const L = [];
    if (o.viaja) {
      L.push(ev(0, 20, (q, lt) => {
        const p = caminho([x.U[0] + 16, x.U[1] - 10], x.T, eOut(lt / 20), 10);
        fxFumaca(q, p, 10 + lt * 0.3, 40, 14 + lt * 0.6, P, x.seed, { n: 5, sobe: 0 });
      }));
      L.push(ev(18, 70, (q, lt) => fxFumaca(q, x.T, lt, 52, 34, P, x.seed + 1, { n: 9, sobe: 8 })));
      if (o.gotas) L.push(ev(24, 60, (q, lt) => fxRespingo(q, [x.T[0], x.T[1] - 20], lt, 5, P, x.seed + 2, { len: 36, n: 8, gravidade: true })));
      return { ev: L, dur: 72 };
    }
    const at = onde === "user" ? x.U : onde === "tela" ? [0, 0] : x.T;
    const r = onde === "tela" ? 120 : 36;
    L.push(ev(0, 66, (q, lt) => fxFumaca(q, at, lt, 66, r, P, x.seed, { n: onde === "tela" ? 16 : 9, sobe: 6 })));
    return { ev: L, dur: 68 };
  },

  ondas(x, b, o) {
    const n = o.n ?? 4;
    const L = [];
    const de = o.self || o.onde === "user" ? x.U : [x.U[0] + 16, x.U[1] - 10];
    const ang = Math.atan2(x.T[1] - de[1], x.T[0] - de[0]);
    for (let i = 0; i < n; i++) {
      const t0 = i * 6;
      L.push(ev(t0, t0 + 24, (q, lt) => {
        const g = lt / 24;
        if (o.self || o.onde === "user") {
          anel(q, x.U[0], x.U[1], 10 + g * 56, 3.4 * (1 - g) + 0.6, x.P, { ry: 0.6 });
          return;
        }
        const p = caminho(de, x.T, g);
        const r = 8 + g * 18;
        anel(q, p[0] - Math.cos(ang) * r, p[1] - Math.sin(ang) * r, r, 3, x.P, { ry: 1, so: (a) => Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) < 1.0 });
      }));
    }
    const h = hitsDe(b, [24])[0];
    if (!o.status && !o.self) L.push(ev(h, h + 26, (q, lt) => fxRespingo(q, x.T, lt, 12, x.P, x.seed, { len: 26 })));
    return { ev: L };
  },

  barreira(x, b, o) {
    const P = o.cor !== undefined ? paleta(o.cor) : x.P;
    const esc = o.esc ?? 1;
    const c = [x.U[0] + 34, x.U[1] - 20];
    return {
      ev: [
        ev(0, 54, (q, lt) => {
          const g = eOut(cl01(lt / 10));
          const some = lt > 44 ? (lt - 44) / 10 : 0;
          const w = 30 * esc * g;
          const h = 44 * esc * g;
          const pts = [
            [c[0] - w * 0.3, c[1] - h],
            [c[0] + w * 0.7, c[1] - h * 0.8],
            [c[0] + w * 0.3, c[1] + h * 0.6],
            [c[0] - w * 0.7, c[1] + h * 0.4],
          ];
          if (w > 2) poligono(q, pts, { ...P, w: P.l, l: P.b, b: P.l });
          const s = ((lt * 2.2) % (h * 2.2 + 1)) - h;
          if (w > 4) traco(q, [[c[0] - w * 0.6, c[1] + s], [c[0] + w * 0.6, c[1] + s - w * 0.4]], 2, P);
          if (some) q.xadrez(lt % 2);
        }),
        ev(6, 50, (q, lt) => fxFaiscas(q, c, lt, 44, 34 * esc, 8, P, x.seed)),
      ],
      dur: 56,
    };
  },

  brilhos(x, b, o) {
    const L = [
      ev(0, 54, (q, lt) => {
        const R = rng(x.seed);
        for (let i = 0; i < 10; i++) {
          const dx = (R() * 2 - 1) * 26;
          const t0 = R() * 30;
          const g = (lt - t0) / 22;
          if (g < 0 || g > 1) continue;
          const y = x.U[1] + 28 - g * 60;
          if (o.notas) {
            bola(q, x.U[0] + dx, y, 3.4, x.P);
            traco(q, [[x.U[0] + dx + 3, y], [x.U[0] + dx + 3, y - 10]], 1.2, x.P, { semMiolo: true });
          } else cintila(q, x.U[0] + dx, y, 6 * Math.sin(Math.PI * g) + 1, x.P);
        }
      }),
    ];
    if (o.anel) L.push(ev(0, 30, (q, lt) => anel(q, x.U[0], x.U[1] + 30, 10 + lt * 1.6, 3 * (1 - lt / 30) + 0.5, x.P, { ry: 0.32 })));
    if (o.pulso) L.push(ev(4, 40, (q, lt) => { for (const k of [0, 12]) { const g = ((lt + k) % 24) / 24; anel(q, x.U[0], x.U[1], 8 + g * 34, 3 * (1 - g) + 0.6, x.P, { ry: 0.85 }); } }));
    if (o.pisca) L.push(ev(10, 46, (q, lt) => { if (lt % 6 < 3) bola(q, x.U[0], x.U[1], 24, x.P, { chapado: x.P.w }); }));
    return { ev: L, dur: 56 };
  },

  troca(x, b, o) {
    const L = [
      ev(0, 36, (q, lt) => {
        const g = eOut(cl01(lt / 30));
        const a = caminho(x.U, x.T, g, 34);
        const c = caminho(x.T, x.U, g, -34);
        if (!o.self) bola(q, a[0], a[1], 8, x.P, { wob: 0.1, fase: lt, anelEscuro: true });
        bola(q, c[0], c[1], 8, o.self ? x.P : paleta(10), { wob: 0.1, fase: lt + 2, anelEscuro: true });
        if (o.mao) mao(q, c[0], c[1] - 10, 0.9, 1);
      }),
      ev(28, 52, (q, lt) => fxFaiscas(q, x.U, lt, 24, 28, 6, x.P, x.seed)),
    ];
    if (!o.self) L.push(ev(28, 52, (q, lt) => fxFaiscas(q, x.T, lt, 24, 28, 6, x.P, x.seed + 1)));
    return { ev: L, dur: 54 };
  },

  prender(x, b, o) {
    const hs = hitsDe(b, [10, 22, 34]);
    const peca = o.peca ?? "faixa";
    const P = peca === "areia" ? P_TERRA : x.P;
    const L = [];
    if (peca === "teia") {
      L.push(ev(0, 50, (q, lt) => {
        const g = eOut(cl01(lt / 12));
        const p = caminho(x.U, x.T, g, 10);
        const r = lerp(8, 34, g);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI;
          traco(q, [[p[0] - Math.cos(a) * r, p[1] - Math.sin(a) * r * 0.8], [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r * 0.8]], 1.3, P_MAO, { semMiolo: true });
        }
        for (const rr of [0.4, 0.75]) anel(q, p[0], p[1], r * rr, 1.2, P_MAO, { ry: 0.8 });
        if (o.faiscas && lt > 12 && lt % 4 < 2) raioZig(q, [p[0] - r, p[1]], [p[0] + r, p[1]], 2, paleta(3), lt, { n: 5 });
      }));
      return { ev: L, dur: 52 };
    }
    L.push(ev(0, hs[hs.length - 1] + 14, (q, lt) => {
      if (peca === "areia") {
        const R = rng(x.seed);
        for (let i = 0; i < 26; i++) {
          const a = R() * Math.PI * 2 + lt * 0.35;
          const h = R() * 60 - 40;
          const rr = 34 - (h + 40) * 0.25;
          bola(q, x.T[0] + Math.cos(a) * rr, x.chaoT[1] + h * 0.9 + Math.sin(a) * rr * 0.25, 2.2 + R() * 1.8, P);
        }
        return;
      }
      const aperto = hs.reduce((m, h) => Math.max(m, lt >= h - 3 && lt < h + 4 ? 1 - Math.abs(lt - h) / 4 : 0), 0);
      for (const dy of [-14, 0, 14]) {
        const r = 30 - aperto * 8 + dy * 0.1;
        anel(q, x.T[0], x.T[1] + dy, r, 3.6, P, { ry: 0.36, so: (a) => Math.sin(a) > -0.15 });
      }
    }));
    hs.forEach((h, i) => L.push(...impactoEv(x, h, 14, P_IMPACTO, { poeira: false })));
    return { ev: L };
  },

  dreno(x, b) {
    const h = hitsDe(b, [8])[0];
    const Pv = paleta(4);
    return {
      ev: [
        ...impactoEv(x, h, 18, x.P, { poeira: false }),
        ev(h + 4, h + 46, (q, lt) => {
          const R = rng(x.seed);
          for (let i = 0; i < 7; i++) {
            const t0 = i * 3;
            const g = cl01((lt - t0) / 26);
            if (g <= 0 || g >= 1) continue;
            const p = caminho(x.T, x.U, eIn(g), 30 * (R() * 2 - 1));
            bola(q, p[0], p[1], 5 - g * 1.5, Pv, { anelEscuro: true });
          }
        }),
        ev(h + 26, h + 54, (q, lt) => fxFaiscas(q, x.U, lt, 28, 28, 8, Pv, x.seed + 2)),
      ],
    };
  },

  explosao(x, b, o) {
    const r = o.grande ? 70 : 52;
    return {
      ev: [
        ev(0, 10, (q, lt) => bola(q, x.U[0], x.U[1], 10 + lt * 3, P_FOGO, { chapado: P_FOGO.w, contorno: false })),
        ev(4, 54, (q, lt) => fxExplosao(q, x.U, lt, 50, r, x.seed)),
        ev(10, 56, (q, lt) => fxExplosao(q, x.T, lt, 46, r * 0.7, x.seed + 1)),
        ev(10, 50, (q, lt) => fxPedras(q, [0, 0], lt, 40, 10, P_PEDRA, x.seed, { abre: 4, forca: 1.4, tam: 5 })),
      ],
      dur: 60,
    };
  },

  sacrificio(x, b, o) {
    const P = o.cor !== undefined ? paleta(o.cor) : x.P;
    return {
      ev: [
        ev(0, 54, (q, lt) => {
          const R = rng(x.seed);
          for (let i = 0; i < 12; i++) {
            const t0 = R() * 26;
            const g = (lt - t0) / 26;
            if (g < 0 || g > 1) continue;
            const dx = (R() * 2 - 1) * 22;
            const y = o.cura ? x.T[1] - 60 + g * 70 : x.U[1] + 20 - g * 70;
            cintila(q, (o.cura ? x.T[0] : x.U[0]) + dx, y, 6 * Math.sin(Math.PI * g) + 1, P);
          }
        }),
        ev(0, 30, (q, lt) => { if (lt % 6 < 3) bola(q, x.U[0], x.U[1], 22, P, { chapado: P.w, contorno: false }); }),
      ],
      dur: 56,
    };
  },

  area(x, b, o) {
    const kind = o.peca ?? "orbe";
    const n = o.n ?? 7;
    const esc = o.esc ?? 1;
    const hs = hitsDe(b, [20]);
    const L = [];
    const R0 = rng(x.seed);
    const quedas = Array.from({ length: n }, (_, i) => ({ dx: (R0() * 2 - 1) * 40, t0: i * 4, dy: (R0() * 2 - 1) * 10 }));
    if (kind === "coluna") {
      L.push(ev(hs[0] - 4, hs[0] + 36, (q, lt) => {
        for (let k = 0; k < 3; k++) {
          const g = cl01((lt - k * 4) / 10);
          const some = lt > 26 ? (lt - 26) / 10 : 0;
          const xx = x.T[0] + (k - 1) * 24;
          const hgt = 70 * eOut(g) * (1 - some);
          if (hgt < 2) continue;
          const pts = [];
          for (let s = 0; s <= 6; s++) pts.push([xx + Math.sin(s + lt * 0.8) * 3, x.chaoT[1] - (s / 6) * hgt]);
          traco(q, pts, 9, x.P, { afina: 0.5 });
        }
      }));
      L.push(...impactoEv(x, hs[0], 26, x.P));
      return { ev: L };
    }
    for (const qd of quedas) {
      L.push(ev(qd.t0, qd.t0 + 34, (q, lt) => {
        const g = cl01(lt / 14);
        const alvo = [x.T[0] + qd.dx, x.T[1] + 18 + qd.dy];
        if (lt < 14) {
          const p = [alvo[0] + 40 * (1 - g), lerp(-150, alvo[1], eIn(g))];
          if (kind === "explosao") bola(q, p[0], p[1], 8 * esc, P_FOGO, { wob: 0.2, fase: lt });
          else if (kind === "vento") crescente(q, p[0], p[1], 14 * esc, 5, lt * 0.6, lt * 0.6 + 2.6, x.P);
          else peca(q, kind === "orbe" ? "pulso" : kind, p[0], p[1], 7 * esc, Math.PI / 2, lt, x.P, x.seed);
        } else {
          const lt2 = lt - 14;
          if (kind === "explosao" || o.explode) fxExplosao(q, alvo, lt2, 20, 16 * esc, x.seed + qd.t0);
          else fxRespingo(q, alvo, lt2, 7 * esc, kind === "pedra" ? P_PEDRA : x.P, x.seed + qd.t0, { len: 20, n: 7 });
        }
      }));
    }
    hs.forEach((h) => L.push(ev(h, h + 16, (q, lt) => anel(q, x.chaoT[0], x.chaoT[1], 16 + lt * 3, 3 * (1 - lt / 16) + 0.5, x.P, { ry: 0.35 }))));
    if (o.faiscas) L.push(ev(10, 50, (q, lt) => fxFaiscas(q, x.T, lt, 40, 40, 10, x.P, x.seed)));
    return { ev: L };
  },

  clima(x, b, o) {
    const kind = o.peca ?? "pedra";
    const P = kind === "pedra" ? P_TERRA : o.cor !== undefined ? paleta(o.cor) : x.P;
    const vx = o.vx ?? -4;
    const vy = o.vy ?? 2;
    return {
      ev: [
        ev(0, 76, (q, lt) => {
          if (kind === "anel") {
            for (let k = 0; k < 3; k++) {
              const g = ((lt + k * 12) % 36) / 36;
              anel(q, 0, 40, 160 * (1 - g) + 6, 3, P, { ry: 0.3 });
            }
            return;
          }
          const R = rng(x.seed);
          for (let i = 0; i < 40; i++) {
            const x0 = R() * 400 - 200;
            const y0 = R() * 300 - 150;
            const xx = ((x0 + vx * lt * 2.2 + 200) % 400 + 400) % 400 - 200;
            const yy = ((y0 + vy * lt * 2.2 + 150) % 300 + 300) % 300 - 150;
            if (kind === "vento") elipse(q, xx, yy, 10 * (o.esc ?? 1), 1.4, Math.atan2(vy, vx), P, { chapado: P.l });
            else if (kind === "orbe") bola(q, xx, yy, 2.4 + (i % 3), P);
            else pedra(q, xx, yy, 1.8 + (i % 3) * 0.8, lt * 0.2, P, i);
          }
        }),
      ],
      dur: 80,
    };
  },

  coracoes(x, b) {
    return {
      ev: [
        ev(0, 30, (q, lt) => {
          for (let k = 0; k < 3; k++) {
            const g = cl01((lt - k * 5) / 22);
            if (g <= 0 || g >= 1) continue;
            const p = caminho(x.U, x.T, g, 20 + k * 6);
            coracao(q, p[0], p[1], 7);
          }
        }),
        ev(24, 68, (q, lt) => {
          for (let k = 0; k < 6; k++) {
            const a = lt * 0.14 + (k / 6) * Math.PI * 2;
            coracao(q, x.T[0] + Math.cos(a) * 30, x.T[1] - 10 + Math.sin(a) * 12 - lt * 0.2, 5 + Math.sin(lt * 0.4 + k));
          }
        }),
      ],
      dur: 70,
    };
  },

  moedas(x, b) {
    const hs = hitsDe(b, [16]);
    const L = hs.map((h, i) =>
      ev(Math.max(0, h - 16), h, (q, lt) => {
        const p = caminho(x.U, x.T, cl01(lt / 16), 26);
        moeda(q, p[0], p[1], 7, lt * 0.6);
      }),
    );
    const h = hs[hs.length - 1];
    L.push(ev(h, h + 30, (q, lt) => {
      const R = rng(x.seed);
      for (let i = 0; i < 8; i++) {
        const vx = (R() * 2 - 1) * 2.4;
        const vy = -2 - R() * 2;
        moeda(q, x.T[0] + vx * lt, x.T[1] + vy * lt + 0.12 * lt * lt, 5, lt * 0.5 + i);
      }
    }));
    L.push(...impactoEv(x, h, 18, P_OURO, { poeira: false }));
    return { ev: L };
  },

  teleporte(x) {
    return {
      ev: [
        ev(0, 44, (q, lt) => {
          const g = Math.sin(Math.PI * cl01(lt / 40));
          const w = 22 * g;
          if (w > 1) poligono(q, [[x.U[0] - w, x.U[1] + 34], [x.U[0] + w, x.U[1] + 34], [x.U[0] + w * 0.6, -150], [x.U[0] - w * 0.6, -150]], { ...x.P, o: x.P.l, s: x.P.l, b: x.P.w, l: x.P.w });
        }),
        ev(8, 50, (q, lt) => fxFaiscas(q, x.U, lt, 42, 34, 10, x.P, x.seed)),
      ],
      dur: 56,
    };
  },

  maldicao(x) {
    const Pg = paleta(13);
    return {
      ev: [
        ev(4, 40, (q, lt) => {
          const g = eIn(cl01(lt / 14));
          cone(q, x.U[0], lerp(-150, x.U[1] - 10, g), 26, 5, Math.PI / 2, P_MAO);
        }),
        ...[18].flatMap((h) => [ev(h, h + 18, (q, lt) => fxImpacto(q, x.U, lt, 22, Pg, x.seed, { len: 18 }))]),
        ev(18, 66, (q, lt) => fxFumaca(q, x.U, lt, 48, 30, Pg, x.seed, { n: 7, sobe: 18 })),
      ],
      dur: 70,
    };
  },

  futuro(x, b, o) {
    const h = hitsDe(b, [52])[0];
    return {
      ev: [
        ev(0, 30, (q, lt) => {
          for (let k = 0; k < 3; k++) {
            const g = cl01((lt - k * 4) / 20);
            if (g <= 0 || g >= 1) continue;
            bola(q, x.U[0] + (k - 1) * 12, lerp(x.U[1], -160, eIn(g)), 8, x.P, { wob: 0.1, fase: lt, anelEscuro: true });
          }
        }),
        ev(h - 14, h + 2, (q, lt) => {
          for (let k = 0; k < 3; k++) {
            const g = cl01((lt - k * 2) / 12);
            if (g <= 0 || g >= 1) continue;
            bola(q, x.T[0] + (k - 1) * 12, lerp(-160, x.T[1], eIn(g)), 9, x.P, { wob: 0.1, fase: lt, anelEscuro: true });
          }
        }),
        ev(h, h + 26, (q, lt) => fxRespingo(q, x.T, lt, 16, x.P, x.seed, { len: 26 })),
        ...(o.explode ? [ev(h, h + 34, (q, lt) => fxExplosao(q, x.T, lt, 34, 36, x.seed))] : []),
      ],
    };
  },

  orbitar(x, b) {
    const hs = hitsDe(b, [46, 52, 58]);
    const L = [
      ev(0, 30, (q, lt) => {
        for (let k = 0; k < 6; k++) {
          const a = lt * 0.18 + (k / 6) * Math.PI * 2;
          bola(q, x.U[0] + Math.cos(a) * 30, x.U[1] + Math.sin(a) * 12, 6 * Math.min(1, lt / 6), x.P, { anelEscuro: true });
        }
      }),
    ];
    hs.forEach((h, i) => {
      L.push(ev(Math.max(0, h - 16), h, (q, lt) => {
        for (let k = 0; k < 2; k++) {
          const p = caminho([x.U[0] + (k ? 20 : -20), x.U[1]], x.T, eIn(cl01(lt / 16)), 14);
          bola(q, p[0], p[1], 6, x.P, { anelEscuro: true });
        }
      }));
      L.push(ev(h, h + 22, (q, lt) => fxRespingo(q, x.T, lt, 9, x.P, x.seed + i, { len: 22, n: 8 })));
    });
    return { ev: L };
  },

  aura(x, b, o) {
    return { ev: [auraEv(x, 0, 46), ev(4, 44, (q, lt) => fxFaiscas(q, x.U, lt, 40, 30, 8, x.P, x.seed))], dur: 50 };
  },

  cavar(x, b) {
    const h = hitsDe(b, [36])[0];
    return {
      ev: [
        ev(0, 26, (q, lt) => fxPedras(q, x.chaoU, lt, 26, 8, P_TERRA, x.seed, { tam: 4.5 })),
        ev(0, 16, (q, lt) => fxPoeira(q, x.chaoU, lt, 16, P_TERRA, x.seed)),
        ev(h - 2, h + 28, (q, lt) => fxPedras(q, x.chaoT, lt, 28, 10, P_TERRA, x.seed + 1, { tam: 5, forca: 1.3 })),
        ...impactoEv(x, h, 28, P_IMPACTO),
      ],
    };
  },
};

// ---------- montagem ----------
function montarCena(slug, modelo, o, base, tipo, virado) {
  const U = virado ? T0 : U0;
  const T = virado ? U0 : T0;
  const P = o.cor !== undefined ? paleta(o.cor) : paleta(tipo);
  const x = { U, T, chaoU: [U[0], U[1] + 34], chaoT: [T[0], T[1] + 28], P, seed: hash(slug) };
  const f = CENAS[modelo];
  if (!f) throw new Error(`${slug}: cena "${modelo}" não existe`);
  const { ev: eventos, dur } = f(x, base, o);
  const fimEv = Math.max(...eventos.map((e) => e[1]));
  const duracao = Math.ceil(Math.max(base.duration ?? 0, dur ?? 0, fimEv + 2));
  const n = Math.ceil(duracao / TQ);
  const quadros = [];
  for (let i = 0; i < n; i++) {
    const t = i * TQ + TQ / 2;
    const q = new Tela();
    for (const [t0, t1, d] of eventos) if (t >= t0 && t < t1) d(q, t - t0);
    if (virado) q.c.reverse(); // 180°: o player gira de volta
    quadros.push(q);
  }
  return { quadros, duracao };
}

// recorta cada quadro no que tem pixel e empilha numa folha (prateleiras de até 1024 px)
function empacotar(quadros) {
  const recortes = quadros.map((q) => {
    let x0 = CW;
    let y0 = CH;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < CW; x++)
        if (q.c[y * CW + x]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) return { q, x0: CX, y0: CY, w: 1, h: 1, vazio: true };
    return { q, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  });
  const LARG = 1024;
  let x = 0;
  let y = 0;
  let alt = 0;
  for (const r of recortes) {
    if (x + r.w > LARG) {
      x = 0;
      y += alt;
      alt = 0;
    }
    r.sx = x;
    r.sy = y;
    x += r.w;
    alt = Math.max(alt, r.h);
  }
  const W = Math.max(1, ...recortes.map((r) => r.sx + r.w));
  const H = y + alt;
  const px = new Uint32Array(W * H);
  for (const r of recortes) {
    if (r.vazio) continue;
    for (let yy = 0; yy < r.h; yy++)
      for (let xx = 0; xx < r.w; xx++) {
        const v = r.q.c[(r.y0 + yy) * CW + r.x0 + xx];
        if (v) px[(r.sy + yy) * W + r.sx + xx] = v;
      }
  }
  const quadrosAtlas = recortes.map((r) => ({
    x: r.sx,
    y: r.sy,
    w: r.w,
    h: r.h,
    ox: r.x0 + r.w / 2 - CX,
    oy: r.y0 + r.h / 2 - CY,
    px: r.w / 2,
    py: r.h / 2,
  }));
  return { W, H, px, quadrosAtlas };
}

// PNG indexado (tipo 3) com transparência: bem menor que RGBA para arte de poucas cores
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function pngIndexado(W, H, px) {
  const cores = [0];
  const idx = new Map([[0, 0]]);
  const linhas = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) {
    linhas[y * (W + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const v = px[y * W + x];
      let i = idx.get(v);
      if (i === undefined) {
        i = cores.length;
        if (i > 255) throw new Error("mais de 255 cores numa cena");
        cores.push(v);
        idx.set(v, i);
      }
      linhas[y * (W + 1) + 1 + x] = i;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  const plte = Buffer.alloc(cores.length * 3);
  cores.forEach((v, i) => {
    plte[i * 3] = (v >> 16) & 255;
    plte[i * 3 + 1] = (v >> 8) & 255;
    plte[i * 3 + 2] = v & 255;
  });
  const trns = Buffer.from([0]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("tRNS", trns), chunk("IDAT", zlib.deflateSync(linhas, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function gravarFolha(nome, quadros) {
  const { W, H, px, quadrosAtlas } = empacotar(quadros);
  const buf = pngIndexado(W, H, px);
  fs.writeFileSync(path.join(OUT, `${nome}.png`), buf);
  return { entrada: { arquivo: `${nome}.png`, tipo: "sprite-frames", w: W, h: H, celula: [CW, CH], sobDemanda: true, quadros: quadrosAtlas }, bytes: buf.length };
}

// Gera as cenas, grava as folhas, funde no atlas e devolve as receitas (mesmo formato de
// receitasPixel, para tools/gerar-receitas.mjs).
export function gerarCenas(catalogo, { so } = {}) {
  const antigas = new Map(receitasPixel(catalogo).map((p) => [p.receita.slug, p]));
  fs.mkdirSync(OUT, { recursive: true });
  const atlas = fs.existsSync(ATLAS) ? JSON.parse(fs.readFileSync(ATLAS, "utf8")) : { versao: 1, base: "256x192", arquivos: {} };
  if (!so) {
    for (const k of Object.keys(atlas.arquivos)) if (k.startsWith("Cena-")) delete atlas.arquivos[k];
    for (const f of fs.readdirSync(OUT)) if (f.startsWith("Cena-")) fs.rmSync(path.join(OUT, f));
  }
  const tipoDe = new Map(catalogo.map((l) => [l.slug, l.tipo]));
  const out = [];
  let bytes = 0;
  for (const [slug, [modelo, o]] of Object.entries(GOLPES)) {
    if (so && !so.includes(slug)) continue;
    const antiga = antigas.get(slug);
    const base = antiga.receita;
    const tipo = o.cor ?? tipoDe.get(slug);
    const nome = `Cena-${slug}`;
    const a = montarCena(slug, modelo, o, base, tipo, false);
    const v = montarCena(slug, modelo, o, base, tipo, true);
    const g1 = gravarFolha(nome, a.quadros);
    const g2 = gravarFolha(`${nome}-v`, v.quadros);
    atlas.arquivos[nome] = g1.entrada;
    atlas.arquivos[`${nome}-v`] = g2.entrada;
    bytes += g1.bytes + g2.bytes;
    const receita = {
      slug,
      duration: a.duracao,
      layers: [{ asset: nome, assetVirado: `${nome}-v`, anchor: "user", start: 0, end: a.duracao, ds: true, frameSeq: { frames: a.quadros.map((_, i) => i), fps: FPS, loop: false }, keepColor: true, z: 3 }],
      ...(base.hits ? { hits: base.hits } : {}),
      ...(base.react ? { react: base.react } : {}),
      ...(base.actor ? { actor: base.actor } : {}),
      ...(base.screen ? { screen: base.screen } : {}),
      pixel: true,
      note: `pixel art própria (${modelo})`,
    };
    out.push({ receita, tipo: undefined });
  }
  fs.writeFileSync(ATLAS, JSON.stringify(atlas, null, 1));
  return { receitas: out, bytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { CATALOGO } = await import("../src/components/poke/golpes/catalogo.ts");
  const so = process.argv.slice(2);
  const { receitas, bytes } = gerarCenas(CATALOGO, so.length ? { so } : {});
  console.log(`cenas: ${receitas.length} golpes, ${(bytes / 1024).toFixed(0)} KB → public/fx/Cena-*.png`);
}
