// Kit de peças em pixel art para os golpes que não têm folha própria do DP. Desenha tudo por
// código (nenhum pixel vem dos jogos), no estilo dos sprites de golpe da 4ª geração: contorno
// escuro de 1 px, 3–4 tons por peça, ponto de brilho branco, nada de antisserrilhado.
//
//   node tools/pixel-kit.mjs        (o `npm run fx:receitas` já chama antes de gerar)
//
// Grava public/fx/Px-<Peça>.png (uma tira de quadros por peça) e funde as entradas no
// public/fx/fx-atlas.json, sem tocar nas entradas das folhas do DP.
//
// As peças "neutras" saem em cinza com a luminância escolhida para o recolor por tipo do
// player (sprites/fx.ts: 0.16 contorno, 0.43 sombra, 0.63 corpo, 0.84 luz, 1 brilho), então
// a mesma esfera vira Shadow Ball roxa ou Hyper Beam laranja. As peças com cor própria
// (faísca de impacto, explosão, punho, coração, moeda, osso) vão com keepColor nas receitas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(RAIZ, "public/fx");
const ATLAS = path.join(OUT, "fx-atlas.json");

// tons neutros (recolor por tipo)
const O = [40, 40, 40];
const D = [110, 110, 110];
const M = [160, 160, 160];
const Lt = [215, 215, 215];
const W = [255, 255, 255];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// direção usuário → alvo na tela do DS (player.ts: DS_TELA = [132, -64])
const ANG = Math.atan2(-64, 132);

class Quadro {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.c = new Array(w * h).fill(null);
  }
  get(x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x];
  }
  set(x, y, cor) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = cor;
  }
  // pinta cada pixel cujo centro (relativo ao meio do quadro) a função aceitar
  pintar(f) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const cor = f(x + 0.5 - cx, y + 0.5 - cy, x, y);
        if (cor) this.set(x, y, cor);
      }
    return this;
  }
  // contorno de 1 px (vizinhança 4) em volta de tudo o que foi pintado
  contorno(cor = O) {
    const novos = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!this.get(x, y) && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) novos.push([x, y]);
    for (const [x, y] of novos) this.set(x, y, cor);
    return this;
  }
  // dissolve em xadrez (o "sumir" dos jogos de DS): apaga metade dos pixels
  xadrez(fase = 0) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if ((x + y + fase) % 2) this.set(x, y, null);
    return this;
  }
}

// ---------- peças ----------

// esfera sombreada, luz em cima à esquerda
function esfera(q, r, ox = 0, oy = 0) {
  const lx = -r * 0.38;
  const ly = -r * 0.38;
  q.pintar((x, y) => {
    const dx = x - ox;
    const dy = y - oy;
    if (dx * dx + dy * dy > r * r) return null;
    const dl = Math.hypot(dx - lx, dy - ly) / r;
    if (r >= 3 && dl < 0.22) return W;
    if (dl < 0.62) return Lt;
    if (dl < 1.05) return M;
    return D;
  });
}

const PECAS = {};
const peca = (nome, cel, quadros, desenhar) => (PECAS[nome] = { cel, quadros: quadros.map((p, i) => desenhar(new Quadro(cel[0], cel[1]), p, i)) });

peca("Px-Orbe", [28, 28], [2, 3, 5, 7, 9, 12], (q, r) => (esfera(q, r), q.contorno()));

// esfera piscando: corpo, corpo com halo claro, corpo menor (para golpes que "pulsam")
peca("Px-Pulso", [32, 32], [0, 1, 2, 3], (q, f) => {
  const r = [9, 10, 11, 10][f];
  q.pintar((x, y) => {
    const d = Math.hypot(x, y);
    if (d > r) return null;
    if (d > r - 2) return f % 2 ? W : Lt;
    if (d < r * 0.35) return W;
    return M;
  });
  return q.contorno();
});

// cintilância de 4 pontas
peca("Px-Faisca", [11, 11], [1, 2, 3, 4, 3, 2], (q, s) =>
  q.pintar((x, y) => {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax < 1 && ay < 1) return W;
    if ((ax < 1 && ay <= s) || (ay < 1 && ax <= s)) return ax + ay > s - 0.6 ? M : Lt;
    if (s >= 3 && ax < 2 && ay < 2) return Lt;
    return null;
  })
);

// brilho grande de 8 pontas (cura, campo, "!" de golpe especial)
peca("Px-Brilho", [25, 25], [4, 8, 11, 7], (q, s) => {
  q.pintar((x, y) => {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax < 1.5 && ay < 1.5) return W;
    if ((ax < 1 && ay <= s) || (ay < 1 && ax <= s)) return ax + ay < s * 0.55 ? W : Lt;
    const dg = Math.abs(ax - ay);
    if (dg < 1 && ax + ay <= s * 0.9) return M;
    return null;
  });
  return s > 6 ? q.contorno(D) : q;
});

// anel de onda de choque: abre e afina
peca("Px-Anel", [48, 48], [5, 9, 13, 17, 21], (q, R, i) => {
  const esp = i < 3 ? 2.2 : i < 4 ? 1.6 : 1;
  q.pintar((x, y) => {
    const d = Math.hypot(x, y);
    if (d > R || d < R - esp) return null;
    return d > R - esp / 2 ? Lt : W;
  });
  return i < 4 ? q.contorno(D) : q;
});

// anel achatado em volta do Pokémon (Wrap, Bind, Fire Spin de pobre): aperta
peca("Px-Faixa", [60, 22], [27, 24, 20, 23], (q, rx) => {
  const ry = 6;
  q.pintar((x, y) => {
    const e = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    const ei = (x * x) / ((rx - 3) * (rx - 3)) + (y * y) / ((ry - 2.5) * (ry - 2.5));
    if (e > 1 || ei < 1) return null;
    if (y > 0) return Math.abs(x) < rx * 0.5 ? W : Lt; // a frente da volta: mais clara
    return M;
  });
  // listras de corda
  for (let x = 0; x < q.w; x += 4) for (let y = 0; y < q.h; y++) if (q.get(x, y) === Lt || q.get(x, y) === W) q.set(x, y, M);
  return q.contorno();
});

// corte em meia-lua, de cima à direita para baixo à esquerda; abre, fica, afina
peca("Px-Corte", [48, 48], [0.35, 0.7, 1, 1, 0.5], (q, abre, i) => {
  const R = 20;
  const fino = i === 4;
  q.pintar((x, y) => {
    const d1 = Math.hypot(x + 6, y + 6);
    const d2 = Math.hypot(x + 11 + (fino ? -3 : 0), y + 11 + (fino ? -3 : 0));
    if (d1 > R || d2 < R) return null;
    // ângulo ao longo do arco: 0 em cima à direita, 1 embaixo à esquerda
    const a = Math.atan2(y + 6, x + 6);
    const t = (a + Math.PI * 0.25) / (Math.PI * 1.0);
    if (t < 0 || t > 1) return null;
    if (t > abre) return null;
    const borda = R - d1;
    return borda < 1.4 ? W : Lt;
  });
  return q.contorno(D);
});

// três riscos de garra em diagonal
peca("Px-Garra", [44, 44], [0.35, 0.7, 1, 1], (q, len, i) => {
  q.pintar((x, y) => {
    for (const k of [-8, 0, 8]) {
      const u = (x + y) / Math.SQRT2; // ao longo do risco
      const v = (x - y) / Math.SQRT2 - k;
      const lim = 17 * len;
      if (u < -17 || u > -17 + 2 * lim) continue;
      const larg = 1.6 * (1 - Math.abs((u + 17) / 34 - 0.5) * 1.2) * (i === 3 ? 0.6 : 1);
      if (Math.abs(v) < larg * 0.5) return W;
      if (Math.abs(v) < larg) return Lt;
    }
    return null;
  });
  return q.contorno(D);
});

// gomo de raio (feixe): elipse apontada para o alvo
peca("Px-Feixe", [22, 22], [5, 4], (q, b) => {
  const c = Math.cos(-ANG);
  const s = Math.sin(-ANG);
  q.pintar((x, y) => {
    const u = x * c - y * s;
    const v = x * s + y * c;
    const e = (u * u) / 81 + (v * v) / (b * b);
    if (e > 1) return null;
    if (e < 0.25) return W;
    if (e < 0.6) return Lt;
    return M;
  });
  return q.contorno();
});

// raio de cima para baixo: três zigue-zagues
const ZIGUE = [
  [0, -3, 4, -2, 3, -4, 2, 0, -3],
  [0, 3, -2, 4, -3, 2, -4, 1, 2],
  [0, -2, 3, 0, -4, 3, 1, -3, 0],
];
peca("Px-Raio", [24, 80], [0, 1, 2], (q, f) => {
  const pts = ZIGUE[f].map((dx, i) => [dx, -40 + i * 10]);
  q.pintar((x, y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      if (y < y1 || y > y2) continue;
      const t = (y - y1) / (y2 - y1);
      const d = Math.abs(x - (x1 + (x2 - x1) * t));
      const larg = 3.4 - (i / pts.length) * 1.2;
      if (d < larg * 0.5) return W;
      if (d < larg) return Lt;
    }
    return null;
  });
  return q.contorno(D);
});

// nuvem de fumaça/gás: cresce, fica, se desfaz em xadrez
const BOLHAS = [
  [0, 0, 1],
  [-0.55, 0.25, 0.7],
  [0.55, 0.2, 0.75],
  [0.1, -0.45, 0.65],
];
peca("Px-Fumaca", [36, 36], [0.45, 0.75, 1, 1.1, 1.15], (q, k, i) => {
  const R = 10 * k;
  q.pintar((x, y) => {
    for (const [bx, by, br] of BOLHAS) {
      const d = Math.hypot(x - bx * R, y - by * R);
      if (d > br * R) continue;
      const luz = (by * R + y - (bx * R - x) * 0.3) / R;
      return luz < -0.5 ? Lt : luz < 0.3 ? M : D;
    }
    return null;
  });
  q.contorno();
  if (i === 4) q.xadrez();
  return q;
});

// redemoinho de vento: arco de 270° que gira
peca("Px-Vento", [32, 32], [0, 1, 2, 3], (q, f) => {
  const giro = (f * Math.PI) / 2;
  q.pintar((x, y) => {
    const d = Math.hypot(x, y);
    let a = Math.atan2(y, x) - giro;
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a > Math.PI * 1.5) return null;
    const R = 6 + (a / (Math.PI * 1.5)) * 8; // espiral que abre
    if (Math.abs(d - R) > 1.4) return null;
    return Math.abs(d - R) < 0.6 ? W : Lt;
  });
  return q.contorno(D);
});

// barreira: painel que abre do meio, com uma faixa de brilho correndo
peca("Px-Escudo", [42, 54], [0.15, 0.5, 1, 1, 1, 1], (q, larg, i) => {
  const hw = 18 * larg;
  const hh = 24;
  const brilho = i >= 3 ? [-20, -4, 12][i - 3] : null;
  q.pintar((x, y) => {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax > hw || ay > hh) return null;
    if (ax + ay * 0.5 > hw + hh * 0.5 - 5) return null; // cantos cortados
    if (ax > hw - 2 || ay > hh - 2) return Lt;
    if (brilho !== null && Math.abs(x + y * 0.6 - brilho) < 3) return W;
    return M;
  });
  return q.contorno();
});

// gota
peca("Px-Gota", [10, 14], [0, 1], (q, f) => {
  q.pintar((x, y) => {
    const yy = y - 2;
    const r = 3.5 - f * 0.4;
    if (Math.hypot(x, yy) <= r) return Math.hypot(x + 1.2, yy + 1.2) < 1.2 ? W : yy > 1.5 ? M : Lt;
    if (yy < 0 && yy > -8 && Math.abs(x) < r * (1 + yy / 8)) return Lt;
    return null;
  });
  return q.contorno();
});

// pedras: três tamanhos, poliedro sombreado pela diagonal
peca("Px-Pedra", [24, 24], [5, 7, 10], (q, r, i) => {
  const pts = Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * Math.PI * 2 + i;
    const rr = r * (0.8 + 0.25 * Math.sin(k * 2.3 + i * 1.7));
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  });
  const dentro = (x, y) => {
    let c = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [xa, ya] = pts[a];
      const [xb, yb] = pts[b];
      if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c;
    }
    return c;
  };
  q.pintar((x, y) => {
    if (!dentro(x, y)) return null;
    const g = (x + y) / r;
    return g < -0.7 ? Lt : g < 0.5 ? M : D;
  });
  return q.contorno();
});

// chifre / bico / broca, apontado para o alvo. 0 liso, 1–2 broca girando
peca("Px-Chifre", [36, 36], [0, 1, 2], (q, f) => {
  const c = Math.cos(-ANG);
  const s = Math.sin(-ANG);
  q.pintar((x, y) => {
    const u = x * c - y * s;
    const v = x * s + y * c;
    if (u < -13 || u > 14) return null;
    const meia = 5 * (1 - (u + 13) / 27);
    if (Math.abs(v) > meia) return null;
    if (f > 0 && ((u * 0.7 + v + f * 2) % 5 + 5) % 5 < 1.8) return D;
    if (u > 9) return W;
    return v < -meia * 0.2 ? Lt : M;
  });
  return q.contorno();
});

// chicote: curva grossa que estala da esquerda para a direita
peca("Px-Chicote", [64, 44], [0, 1, 2], (q, f) => {
  const curva = [-16, 4, 18][f];
  const p0 = [-28, 14];
  const p2 = [28, -14 + f * 6];
  const p1 = [0, curva];
  const pontos = [];
  for (let t = 0; t <= 1; t += 0.01) {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const cc = t * t;
    pontos.push([a * p0[0] + b * p1[0] + cc * p2[0], a * p0[1] + b * p1[1] + cc * p2[1], t]);
  }
  q.pintar((x, y) => {
    let melhor = 9;
    let tt = 0;
    for (const [px, py, t] of pontos) {
      const d = Math.hypot(x - px, y - py);
      if (d < melhor) {
        melhor = d;
        tt = t;
      }
    }
    const larg = 2.6 - tt * 1.4;
    if (melhor < larg * 0.45) return W;
    if (melhor < larg) return tt > 0.5 ? Lt : M;
    return null;
  });
  return q.contorno();
});

// teia: anéis octogonais e raios
peca("Px-Teia", [52, 52], [12, 22], (q, R) => {
  q.pintar((x, y) => {
    const d = Math.hypot(x, y);
    if (d > R + 0.5) return null;
    const a = Math.atan2(y, x);
    const setor = Math.PI / 4;
    const am = ((a % setor) + setor) % setor;
    const doRaio = Math.abs(Math.sin(am)) * d < 0.6 || Math.abs(Math.sin(setor - am)) * d < 0.6;
    if (doRaio) return W;
    const dp = d * Math.cos(Math.abs(am - setor / 2)); // distância "octogonal"
    for (let k = 1; k <= 3; k++) if (Math.abs(dp - (R * k) / 3.3) < 0.55) return Lt;
    return null;
  });
  return q;
});

// ---------- peças com cor própria (keepColor) ----------

// faísca de impacto: estrela branca de borda amarela/laranja, abre e se parte
const AMAR = hex("#FFF080");
const LAR = hex("#F89830");
const VERM = hex("#D84010");
const ESC = hex("#601800");
peca("Px-Impacto", [44, 44], [0, 1, 2, 3], (q, f) => {
  const [r0, r1] = [[4, 8], [7, 15], [9, 19], [11, 20]][f];
  q.pintar((x, y) => {
    const d = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const ponta = (Math.cos(a * 8) + 1) / 2;
    const R = r0 + (r1 - r0) * Math.pow(ponta, 1.3);
    if (d > R) return null;
    if (f === 3 && d < R * 0.7) return null; // última: só as pontas, oca
    if (f === 2 && d < 3) return null;
    if (d > R - 1.5) return LAR;
    if (d > R * 0.62) return AMAR;
    return W;
  });
  q.contorno(f < 2 ? VERM : ESC);
  if (f === 3) q.xadrez();
  return q;
});

// explosão: núcleo branco, bolo amarelo/laranja, borda vermelha, fumaça que some em xadrez
const FUM = hex("#585060");
const FUM2 = hex("#888098");
peca("Px-Explosao", [64, 64], [0, 1, 2, 3, 4, 5, 6], (q, f) => {
  const R = [6, 12, 18, 23, 26, 27, 28][f];
  q.pintar((x, y) => {
    const a = Math.atan2(y, x);
    const d = Math.hypot(x, y);
    const borda = R * (1 + 0.13 * Math.sin(a * 7 + f) + 0.06 * Math.sin(a * 13 - f * 2));
    if (d > borda) return null;
    const k = d / borda;
    if (f <= 1) return k < 0.6 ? W : AMAR;
    if (f === 2) return k < 0.35 ? W : k < 0.75 ? AMAR : LAR;
    if (f === 3) return k < 0.25 ? AMAR : k < 0.7 ? LAR : VERM;
    if (f === 4) return k < 0.4 ? LAR : k < 0.75 ? VERM : FUM;
    return k < 0.5 ? FUM2 : FUM;
  });
  q.contorno(f < 4 ? ESC : hex("#302830"));
  if (f >= 5) q.xadrez(f);
  if (f === 6) for (let y = 0; y < q.h; y += 2) for (let x = 0; x < q.w; x++) q.set(x, y, null);
  return q;
});

// luva branca: 0 punho fechado, 1 mão aberta (tapa)
const LUVA = hex("#F8F8F8");
const LUVA_S = hex("#B8B8C8");
const LUVA_O = hex("#282830");
peca("Px-Mao", [36, 36], [0, 1], (q, f) => {
  q.pintar((X, Y) => {
    const x = X / 1.5;
    const y = Y / 1.5;
    if (f === 0) {
      // punho: bloco arredondado com 3 sulcos e polegar embaixo
      if (Math.abs(x) <= 7 && Math.abs(y + 1) <= 6 && !(Math.abs(x) > 5.5 && Math.abs(y + 1) > 4.5)) {
        if (x > -5 && Math.abs(y + 1) < 4 && ((x + 6) % 4) < 0.9) return LUVA_S;
        return y > 3 ? LUVA_S : LUVA;
      }
      if (x > -7 && x < 3 && y > 4 && y < 8) return x > 0 ? LUVA_S : LUVA;
      return null;
    }
    // mão aberta: palma + 4 dedos para cima + polegar
    if (Math.abs(x) <= 6 && y > -1 && y < 9) return y > 6 ? LUVA_S : LUVA;
    for (const fx of [-5.2, -1.75, 1.75, 5.2]) if (Math.abs(x - fx) < 1.05 && y > -10 + Math.abs(fx) * 0.6 && y <= 0) return LUVA;
    if (x < -6 && x > -11 && y > 1 && y < 5) return LUVA;
    return null;
  });
  return q.contorno(LUVA_O);
});

// coração
const ROSA = hex("#F878A8");
const ROSA_C = hex("#FFC0D8");
const ROSA_E = hex("#C03870");
peca("Px-Coracao", [18, 18], [5, 7], (q, s) => {
  q.pintar((x, y) => {
    const X = x / s;
    const Y = -(y + 0.5) / s;
    const v = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y;
    if (v > 0) return null;
    if (Math.hypot(X + 0.45, Y - 0.35) < 0.25) return ROSA_C;
    return Y < -0.4 ? ROSA_E : ROSA;
  });
  return q.contorno(hex("#601830"));
});

// moeda girando
const OURO = hex("#F8D030");
const OURO_C = hex("#FFF8A0");
const OURO_E = hex("#C08810");
peca("Px-Moeda", [14, 14], [5, 3, 1, 3], (q, rx) => {
  q.pintar((x, y) => {
    if ((x * x) / (rx * rx + 0.3) + (y * y) / 25 > 1) return null;
    if (rx > 2 && Math.abs(x) < rx * 0.4 && Math.abs(y) < 2.5) return OURO_E;
    return x < 0 ? OURO_C : OURO;
  });
  return q.contorno(hex("#584000"));
});

// osso
const OSSO = hex("#F8F0D8");
const OSSO_S = hex("#D0C098");
peca("Px-Osso", [24, 12], [0], (q) => {
  q.pintar((x, y) => {
    for (const ex of [-8, 8]) for (const ey of [-2, 2]) if (Math.hypot(x - ex, y - ey) < 2.6) return y > 0 ? OSSO_S : OSSO;
    if (Math.abs(x) < 8.5 && Math.abs(y) < 1.6) return y > 0.5 ? OSSO_S : OSSO;
    return null;
  });
  return q.contorno(hex("#504020"));
});

// ---------- gravação ----------

function gravar(nome, { cel, quadros }) {
  const [cw, ch] = cel;
  const png = new PNG({ width: cw * quadros.length, height: ch });
  png.data.fill(0);
  quadros.forEach((q, i) => {
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const c = q.get(x, y);
        if (!c) continue;
        const o = (y * png.width + i * cw + x) * 4;
        png.data[o] = c[0];
        png.data[o + 1] = c[1];
        png.data[o + 2] = c[2];
        png.data[o + 3] = 255;
      }
  });
  fs.writeFileSync(path.join(OUT, `${nome}.png`), PNG.sync.write(png));
  return {
    arquivo: `${nome}.png`,
    tipo: "particles",
    w: png.width,
    h: ch,
    celula: [cw, ch],
    quadros: quadros.map((_, i) => ({ x: i * cw, y: 0, w: cw, h: ch, ox: 0, oy: 0, px: cw / 2, py: ch / 2 })),
  };
}

export function gerarKit() {
  fs.mkdirSync(OUT, { recursive: true });
  const atlas = fs.existsSync(ATLAS) ? JSON.parse(fs.readFileSync(ATLAS, "utf8")) : { versao: 1, base: "256x192", arquivos: {} };
  for (const k of Object.keys(atlas.arquivos)) if (k.startsWith("Px-")) delete atlas.arquivos[k];
  for (const [nome, p] of Object.entries(PECAS)) atlas.arquivos[nome] = gravar(nome, p);
  fs.writeFileSync(ATLAS, JSON.stringify(atlas, null, 1));
  return Object.fromEntries(Object.entries(PECAS).map(([n, p]) => [n, p.quadros.length]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = gerarKit();
  console.log(`kit pixel: ${Object.keys(n).length} peças → public/fx/Px-*.png`);
}
