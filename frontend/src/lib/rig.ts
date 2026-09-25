// MOTOR DE ANIMAÇÃO ESQUELÉTICA (2D) da Batalha.
//
// Um boneco é uma árvore de ossos. Cada osso tem a junta presa num ponto do osso pai e
// gira em torno dela; a pose é só o ângulo de cada osso (mais deslocamento e giro do
// corpo inteiro). Um clipe é uma lista de poses-chave no tempo; entre elas a pose é
// interpolada com suavização, o que dá movimento fluido a 60 quadros sem desenhar
// quadro a quadro. A cinemática direta (fk) transforma a pose em uma matriz por osso,
// que o SVG usa direto (transform="matrix(...)").
//
// Convenções (boneco virado para a direita, y para baixo como no SVG):
// - membros são desenhados apontando para baixo (0, +L): ângulo positivo gira para trás,
//   negativo para a frente;
// - tronco e cabeça são desenhados para cima (0, -L): ângulo positivo inclina para a frente.

export type Mat = [number, number, number, number, number, number];

export interface Osso {
  nome: string;
  pai: string | null;
  x: number; // posição da junta no espaço do pai
  y: number;
}

// Ângulos em graus por osso + x/y (deslocamento do corpo) + rot (giro do corpo em torno
// dos pés) + sy (achatamento vertical, para respiração e impacto).
export type Pose = Record<string, number>;

export type Suavizacao = "linear" | "entra" | "sai" | "entraSai" | "volta" | "mola";

export interface Quadro {
  t: number; // 0..1 dentro do clipe
  pose: Pose;
  s?: Suavizacao; // suavização do trecho que TERMINA neste quadro
}

export interface Clip {
  dur: number; // ms
  loop?: boolean;
  quadros: Quadro[];
}

export const SUAVE: Record<Suavizacao, (k: number) => number> = {
  linear: (k) => k,
  entra: (k) => k * k * k,
  sai: (k) => 1 - (1 - k) ** 3,
  entraSai: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  volta: (k) => {
    const c = 1.70158;
    return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
  },
  mola: (k) => (k === 0 || k === 1 ? k : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

function chaves(a: Pose, b: Pose): string[] {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])];
}

export function misturar(a: Pose, b: Pose, k: number): Pose {
  const r: Pose = {};
  for (const c of chaves(a, b)) {
    const base = c === "sy" ? 1 : 0;
    const va = a[c] ?? base;
    const vb = b[c] ?? base;
    r[c] = va + (vb - va) * k;
  }
  return r;
}

// Pose do clipe no instante `ms` (em loop ou preso no último quadro).
export function amostrar(clip: Clip, ms: number): Pose {
  const q = clip.quadros;
  if (q.length === 1) return q[0].pose;
  let t = ms / clip.dur;
  t = clip.loop ? t - Math.floor(t) : Math.min(1, Math.max(0, t));
  if (t <= q[0].t) return q[0].pose;
  for (let i = 1; i < q.length; i++) {
    if (t <= q[i].t) {
      const a = q[i - 1];
      const b = q[i];
      const k = (t - a.t) / (b.t - a.t || 1);
      return misturar(a.pose, b.pose, SUAVE[b.s ?? "entraSai"](k));
    }
  }
  // loop: do último quadro de volta ao primeiro
  const ult = q[q.length - 1];
  if (clip.loop && ult.t < 1) {
    const k = (t - ult.t) / (1 - ult.t);
    return misturar(ult.pose, q[0].pose, SUAVE[q[0].s ?? "entraSai"](k));
  }
  return ult.pose;
}

// ---------- matrizes ----------

export const IDENT: Mat = [1, 0, 0, 1, 0, 0];

export function mult(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function transl(x: number, y: number): Mat {
  return [1, 0, 0, 1, x, y];
}

export function rot(graus: number): Mat {
  const r = (graus * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

export function escala(sx: number, sy: number): Mat {
  return [sx, 0, 0, sy, 0, 0];
}

export function aplicar(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

export function matStr(m: Mat): string {
  return `matrix(${m.map((v) => +v.toFixed(3)).join(" ")})`;
}

export interface Raiz {
  x: number; // posição dos pés no palco
  y: number;
  esc: number; // tamanho do boneco
  vira: boolean; // true = olhando para a esquerda
}

// Cinemática direta: matriz de mundo de cada osso. Os ossos precisam vir na ordem de
// dependência (pai antes do filho).
export function fk(ossos: Osso[], pose: Pose, raiz: Raiz): Record<string, Mat> {
  const sy = pose.sy ?? 1;
  let base = transl(raiz.x + (pose.x ?? 0) * (raiz.vira ? -1 : 1) * raiz.esc, raiz.y + (pose.y ?? 0) * raiz.esc);
  base = mult(base, escala(raiz.esc * (raiz.vira ? -1 : 1), raiz.esc));
  base = mult(base, rot(pose.rot ?? 0));
  base = mult(base, escala(1, sy));
  const mundo: Record<string, Mat> = {};
  for (const o of ossos) {
    const pai = o.pai ? mundo[o.pai] : base;
    mundo[o.nome] = mult(mult(pai, transl(o.x, o.y)), rot(pose[o.nome] ?? 0));
  }
  return mundo;
}
