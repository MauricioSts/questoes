// OS 16 ARQUÉTIPOS. Cada um é uma função async que recebe o Kit (motor.ts) e toca as
// fases antecipação → trajeto → impacto → resíduo. A forma, o movimento, a cor e o ritmo
// vêm da spec; o que é exclusivo de um golpe fica em ESPECIAIS (no fim do arquivo).
import { desenharForma as drawForma } from "./formas";
import type { Kit } from "./motor";
import { ARCOIRIS } from "./motor";
import { PALETA_TIPO, todasAsSpecs, specPorSlug } from "./spec";
import type { Ancora, Arquetipo, Campo, Forma } from "./tipos";

type Runner = (k: Kit) => Promise<void>;
const TAU = Math.PI * 2;

export async function rodarArquetipo(k: Kit): Promise<void> {
  const especial = ESPECIAIS[k.spec.slug];
  if (especial) return especial(k);
  return RUNNERS[k.spec.archetype](k);
}

// ---------- utilidades ----------

const boca = (k: Kit, an: Ancora = k.A) => ({ x: an.x + (an.x === k.A.x ? k.dir : -k.dir) * an.w * 0.28, y: an.y - an.h * 0.12 });
const pe = (an: Ancora) => an.y + an.h * 0.48;
// Acima do usuário, puxado para o meio da arena: em cima da cabeça fica a caixa de HP do outro lado.
const sobre = (k: Kit) => ({ x: k.A.x + k.dir * k.A.w * 0.55, y: k.A.y - k.A.h * 0.42 });
const notas = (k: Kit) => k.spec.notes.toLowerCase();

// Carga na boca: partículas convergindo e um brilho crescendo.
async function carregar(k: Kit, ms: number, cor = k.pal.primary, forma: Forma = "brilho", raio = 40) {
  k.fase("anticipation");
  const o = boca(k);
  const n = k.n(10);
  for (let i = 0; i < n; i++) {
    const a = k.r() * TAU;
    const d = raio * (0.7 + k.r() * 0.6);
    const vida = k.ms(ms * (0.7 + k.r() * 0.3));
    k.part({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, vx: (-Math.cos(a) * d) / (vida / 1000), vy: (-Math.sin(a) * d) / (vida / 1000), vida, s0: 2, s1: 4, c: cor, c2: k.pal.secondary, forma, camada: 2, brilho: 1, a0: 0.3, a1: 1 });
  }
  k.brilho(o.x, o.y, 22 + k.tier * 8, cor, ms + 120);
  k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: `translate(${-k.dir * 6}px,0) scale(1.04)` }, { transform: "translate(0,0)" }], ms);
  await k.esperar(ms);
}

// Recuo curto do atacante (lança o golpe).
function recuo(k: Kit, px = 8) {
  k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: `translate(${-k.dir * px}px,0)` }, { transform: "translate(0,0)" }], 240, "ease-out");
}

// Respingo de forma no impacto, por forma do golpe.
function respingo(k: Kit, x: number, y: number, esc = 1) {
  const s = k.spec.shape;
  if (s === "gota" || s === "bolha") k.explosao(x, y, { n: 12, forma: s === "bolha" ? "bolha" : "gota", vel: [80, 220].map((v) => v * esc) as [number, number], grav: 420, tam: [2, 5], ang: [Math.PI, TAU], brilho: 0.2 });
  else if (s === "chama") k.explosao(x, y, { n: 12, forma: "chama", grav: -160, vel: [40, 140], tam: [3, 7], brilho: 1 });
  else if (s === "anel") for (let i = 0; i < 3; i++) k.anel(x, y, { r1: 30 + i * 16, ms: 400 + i * 100, cor: k.cor(i), larg: 2.5 });
  else if (s === "fumaca" || s === "poeira") k.explosao(x, y, { n: 10, forma: "fumaca", vel: [20, 70], tam: [5, 10], fim: 1.6, vida: [500, 900], brilho: 0, a0: 0.7 });
  else if (s === "cristal") k.explosao(x, y, { n: 12, forma: "cristal", grav: 260, vel: [80, 200], tam: [2, 5], brilho: 0.8 });
  else if (s === "pedra") k.explosao(x, y, { n: 10, forma: "pedra", grav: 500, vel: [80, 220], tam: [2, 5], brilho: 0 });
  else if (s === "orbe") k.explosao(x, y, { n: 14, forma: "poeira", vel: [90, 260], tam: [2, 5], brilho: 1.2 });
}

// ---------- PROJ ----------

async function proj(k: Kit) {
  const n = notas(k);
  const mov = k.spec.motion;
  const forma = k.spec.shape;
  const T = k.T;
  if (mov === "cai" && forma === "faisca") return raioDoCeu(k);
  if (mov === "sobe") return irrompe(k);
  if (mov === "orbita") return orbitaELanca(k);
  const fluxo = ["faisca", "gota", "bolha", "cristal", "nota", "poeira", "fumaca", "semente", "folha", "petala", "agulha"].includes(forma) && !/esfera|bola|bomba/.test(n);
  await carregar(k, 140 + k.tier * 60, k.pal.primary, "brilho", 26);
  recuo(k);
  k.fase("travel");
  const o = boca(k);
  const d = k.destino(T);
  const tam = [6, 9, 12, 16][k.tier] * (forma === "orbe" ? 1.2 : 1);
  if (mov === "cai") {
    const q = k.n(fluxo ? 6 : 1);
    for (let i = 0; i < q; i++) {
      void k.voar({ de: { x: d.x + (k.r() - 0.5) * T.w, y: -30 }, para: { x: d.x + (k.r() - 0.5) * T.w * 0.5, y: d.y }, ms: 420, tam, mov: "cai", giro: 6 });
      await k.esperar(60);
    }
    await k.esperar(380);
  } else if (fluxo) {
    const q = Math.min(14, k.n(7));
    let ult: Promise<void> = Promise.resolve();
    for (let i = 0; i < q; i++) {
      ult = k.voar({ de: o, para: { x: d.x + (k.r() - 0.5) * T.w * 0.3, y: d.y + (k.r() - 0.5) * T.h * 0.3 }, ms: 380 + k.r() * 80, tam: tam * 0.6, cor: k.cor(i), giro: forma === "folha" || forma === "estrela" ? 10 : 0, rastro: 0.4 });
      await k.esperar(45);
    }
    await ult;
  } else {
    await k.voar({ de: o, para: d, ms: forma === "orbe" && k.tier >= 2 ? 560 : 440, tam, giro: ["estrela", "osso", "carta", "presente", "engrenagem", "pedra"].includes(forma) ? 12 : 0, rastro: 1.4 });
  }
  if (!k.errou) respingo(k, d.x, d.y, 1 + k.tier * 0.2);
  if (k.spec.slug === "fire-blast" && !k.errou) estrelaDeFogo(k, T);
  await k.impacto(T);
  k.fase("aftermath");
  await residuo(k, T);
}

// Resíduo: fumaça, brasas, cristais... depois do impacto.
async function residuo(k: Kit, an: Ancora, ms = 320) {
  if (k.errou || k.resultado === "noEffect") return k.esperar(ms * 0.6);
  const f: Forma = k.tipo === 1 ? "chama" : k.tipo === 5 ? "cristal" : k.tipo === 7 ? "bolha" : k.tipo === 3 ? "faisca" : "fumaca";
  for (let i = 0; i < k.n(4); i++)
    k.part({ x: an.x + (k.r() - 0.5) * an.w * 0.8, y: an.y + (k.r() - 0.3) * an.h * 0.5, vy: f === "cristal" ? 10 : -22, vida: k.ms(700), s0: f === "fumaca" ? 6 : 3, s1: f === "fumaca" ? 11 : 1, c: f === "fumaca" ? "#8A8496" : k.pal.primary, c2: k.pal.secondary, forma: f, camada: 3, a0: f === "fumaca" ? 0.45 : 0.9, brilho: f === "fumaca" ? 0 : 0.8 });
  await k.esperar(ms);
}

function estrelaDeFogo(k: Kit, an: Ancora) {
  k.desenho({
    camada: 3,
    dur: 520,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
      g.globalAlpha = 1 - t;
      g.rotate(t * 0.6);
      g.fillStyle = k.pal.primary;
      const r = an.w * (0.4 + t * 0.6);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 ? r * 0.4 : r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    },
  });
}

async function raioDoCeu(k: Kit) {
  k.fase("anticipation");
  k.tinta("#0A0A20", 0.45, 1000);
  await k.esperar(260);
  k.fase("travel");
  for (const an of k.Ts) {
    const d = k.destino(an);
    k.feixe({ de: { x: d.x + 10, y: -20 }, para: d, ms: 380, larg: 6 + k.tier * 3, cor: k.pal.primary, cor2: "#FFFFFF", zigue: true });
  }
  await k.esperar(90);
  k.clarao("#FFFFE0", 0.45, 160);
  for (const an of k.Ts) await k.impacto(an, { forma: "faisca" });
  await k.esperar(380);
}

// Lanças/colunas que irrompem do chão sob o alvo.
async function irrompe(k: Kit, forma: Forma = k.spec.shape) {
  k.fase("anticipation");
  recuo(k, 4);
  await k.esperar(160);
  k.fase("travel");
  for (const an of k.Ts) {
    const d = k.destino(an);
    for (let i = 0; i < k.n(5); i++) {
      const x = d.x + (i - 2) * an.w * 0.22 + (k.r() - 0.5) * 6;
      k.part({ x, y: pe(an) + 6, vy: -260 - k.r() * 120, ay: 520, vida: k.ms(520), s0: 7 + k.tier * 2, s1: 6, rot: -Math.PI / 2, c: k.cor(i), c2: k.pal.secondary, forma, camada: 3, brilho: forma === "chama" ? 1 : 0.3 });
    }
    k.explosao(d.x, pe(an), { n: 8, forma: "poeira", cor: "#B89A60", vel: [40, 120], ang: [Math.PI, TAU], tam: [3, 6], brilho: 0 });
  }
  await k.esperar(200);
  for (const an of k.Ts) await k.impacto(an);
  await k.esperar(380);
}

// Pedras orbitam o usuário e são lançadas (Ancient Power).
async function orbitaELanca(k: Kit) {
  k.fase("anticipation");
  const q = 5;
  const corpos: { a: number }[] = Array.from({ length: q }, (_, i) => ({ a: (i * TAU) / q }));
  k.desenho({
    camada: 2,
    dur: 600,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      corpos.forEach((c, i) => {
        const a = c.a + agora * 0.006;
        g.setTransform(dpr, 0, 0, dpr, k.A.x + Math.cos(a) * k.A.w * 0.7, k.A.y - t * 20 + Math.sin(a) * k.A.h * 0.25);
        g.globalAlpha = Math.min(1, t * 4);
        g.rotate(a);
        drawForma(g, k.spec.shape, 6 * k.u, k.cor(i), "#FFE08A", agora);
      });
    },
  });
  await k.esperar(600);
  k.fase("travel");
  const d = k.destino(k.T);
  for (let i = 0; i < q; i++) {
    void k.voar({ de: { x: k.A.x, y: k.A.y - 20 }, para: { x: d.x + (k.r() - 0.5) * 20, y: d.y }, ms: 360, tam: 7, giro: 8, cor: k.cor(i) });
    await k.esperar(55);
  }
  await k.esperar(340);
  await k.impacto(k.T);
  if (k.spec.stats?.length && !k.errou) for (const s of k.spec.stats) k.setas(k.A, s.stat, s.n);
  await k.esperar(300);
}

// ---------- BEAM ----------

async function beam(k: Kit) {
  const n = notas(k);
  const longo = k.spec.recarga || k.tier === 3;
  await carregar(k, longo ? 520 : 260, k.pal.primary, "brilho", 34 + k.tier * 6);
  k.fase("travel");
  const o = boca(k);
  const d = k.destino(k.T);
  const dur = [380, 520, 680, 880][k.tier];
  const larg = [5, 8, 12, 18][k.tier] * (/fino/.test(n) ? 0.55 : /maciço|grosso|massiv|gigante|imenso/.test(n) ? 1.35 : 1);
  k.feixe({ de: o, para: d, ms: dur, larg, zigue: k.spec.motion === "zigue" && k.tipo === 3, onda: k.spec.motion === "zigue" && k.tipo !== 3, arcoiris: k.pal.arcoiris, nucleo: k.tipo === 15 || k.tipo === 13 ? "#120A18" : "#FFFFFF" });
  // partículas da forma correndo pelo feixe
  const forma = k.spec.shape;
  let acum = 0;
  k.desenho({
    camada: 2,
    dur,
    tick: (t, dt) => {
      acum += dt;
      while (acum > 26) {
        acum -= 26;
        const f = k.r();
        const vx = (d.x - o.x) * 1.6;
        const vy = (d.y - o.y) * 1.6;
        k.part({ x: o.x + (d.x - o.x) * f * Math.min(1, t * 5), y: o.y + (d.y - o.y) * f * Math.min(1, t * 5) + (k.r() - 0.5) * larg, vx: vx * 0.3, vy: vy * 0.3 + (k.r() - 0.5) * 30, vida: 260, s0: larg * 0.45, s1: 1, forma: forma === "anel" ? "anel" : forma, c: k.cor(Math.floor(k.r() * 3)), c2: k.pal.secondary, camada: 2, brilho: 0.8, rot: Math.atan2(vy, vx) });
      }
    },
  });
  await k.esperar(dur * 0.22);
  if (k.tipo === 3 || /pisca|ofusc/.test(n)) k.clarao(k.pal.secondary, 0.25, 140);
  await k.impacto(k.T, { escala: 1.1 });
  // o ponto de impacto pulsa enquanto o feixe dura
  const pulsos = Math.max(1, Math.floor((dur * 0.7) / 150));
  for (let i = 0; i < pulsos && !k.errou; i++) {
    await k.esperar(140);
    respingo(k, d.x + (k.r() - 0.5) * 10, d.y + (k.r() - 0.5) * 10, 0.7);
    k.tremer(k.T, 2, 120);
  }
  k.fase("aftermath");
  if (k.spec.recarga) cansado(k);
  if (k.spec.stats?.length && !k.errou) for (const s of k.spec.stats) k.setas(s.n > 0 ? k.A : k.T, s.stat, s.n);
  await residuo(k, k.T, 260);
}

function cansado(k: Kit) {
  k.mover(k.A, [{ filter: "brightness(1)" }, { filter: "brightness(.55) saturate(.6)" }, { filter: "brightness(.55) saturate(.6)" }, { filter: "brightness(1)" }], 1100, "linear");
  for (let i = 0; i < 3; i++) k.part({ x: k.A.x + (i - 1) * 8, y: k.A.y - k.A.h * 0.45, vy: -12, vida: k.ms(900), s0: 4, s1: 6, forma: "fumaca", c: "#B8B0C8", camada: 4, a0: 0.6 });
}

// ---------- STRIKE ----------

// Investida: vai até o alvo e volta. Resolve no instante do contato.
async function investir(k: Kit, o: { ms?: number; pulo?: number; giro?: number; rastro?: boolean } = {}) {
  const A = k.A;
  const T = k.T;
  const dx = T.x - A.x - k.dir * (T.w * 0.45 + A.w * 0.25);
  const dy = T.y - A.y;
  const ms = o.ms ?? 520;
  const pulo = o.pulo ?? 0;
  const giro = o.giro ?? 0;
  k.fase("anticipation");
  k.mover(
    A,
    [
      { transform: "translate(0,0) rotate(0deg)", offset: 0 },
      { transform: `translate(${-k.dir * 10}px, 2px) rotate(${-giro * 0.05}deg)`, offset: 0.2 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - pulo}px) rotate(${giro * 0.5}deg)`, offset: 0.42 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${giro}deg)`, offset: 0.55 },
      { transform: `translate(${dx * 0.92}px, ${dy * 0.92}px) rotate(${giro}deg)`, offset: 0.68 },
      { transform: "translate(0,0) rotate(0deg)", offset: 1 },
    ],
    ms,
    "ease-in-out"
  );
  await k.esperar(ms * 0.2);
  k.fase("travel");
  if (o.rastro !== false) {
    // linhas de velocidade + partículas do tipo no caminho
    let acum = 0;
    const ini = { x: A.x, y: A.y };
    k.desenho({
      camada: 1,
      dur: ms * 0.35,
      tick: (t, dt) => {
        acum += dt;
        while (acum > 18) {
          acum -= 18;
          const f = Math.min(1, t * 1.05);
          const x = ini.x + dx * f;
          const y = ini.y + dy * f - Math.sin(f * Math.PI) * pulo;
          k.part({ x: x + (k.r() - 0.5) * A.w * 0.5, y: y + (k.r() - 0.5) * A.h * 0.5, vx: -k.dir * 80, vida: 240, s0: 3, s1: 0.5, forma: k.tipo === 0 ? "poeira" : formaDoTipo(k.tipo), c: k.tipo === 0 ? "#FFFFFF" : k.pal.primary, c2: k.pal.secondary, camada: 1, brilho: 0.8, a0: 0.8 });
        }
      },
    });
  }
  await k.esperar(ms * 0.35);
}

function formaDoTipo(t: number): Forma {
  return (["estrela", "chama", "gota", "faisca", "folha", "cristal", "estrela", "bolha", "poeira", "pena", "brilho", "estilhaco", "pedra", "fumaca", "estilhaco", "fumaca", "faisca", "coracao"] as Forma[])[t] ?? "poeira";
}

async function strike(k: Kit) {
  const n = notas(k);
  const sabor = k.spec.sabor ?? "investida";
  const T = k.T;
  const rapido = /rápid|veloc|ultrarráp|velocíssim|instant/.test(n);
  const pesado = /pesad|colossal|enorme|gigante|massiv|desaba|corpo inteiro/.test(n) || k.tier >= 2;
  const ms = rapido ? 380 : pesado ? 640 : 520;
  if (/sombra|se esconde|surge em sombra|furtivo/.test(n)) {
    k.mover(k.A, [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 0.15 }, { opacity: 1 }], ms, "linear");
  }
  if (sabor === "arremesso") return arremesso(k, ms);
  if (sabor === "rola") await investir(k, { ms, giro: k.dir * 720 });
  else if (sabor === "chute" && /salto|salta|voador|altíssim/.test(n)) await investir(k, { ms: ms + 120, pulo: 60 });
  else if (/salta|desaba/.test(n)) await investir(k, { ms: ms + 80, pulo: 50 });
  else await investir(k, { ms });
  const d = k.destino(T);
  if (!k.errou) golpeNoAlvo(k, sabor, d.x, d.y, T);
  await k.impacto(T, { forma: sabor === "corte" ? "estilhaco" : "faisca" });
  k.fase("aftermath");
  if (k.spec.recoil) recoil(k);
  if (k.spec.recarga) cansado(k);
  if (k.spec.stats?.length && !k.errou) for (const s of k.spec.stats) k.setas(/do usuário|usuário fica|depois enfraquece|ganha velocidade/.test(n) || s.n > 0 ? k.A : k.T, s.stat, s.n);
  await residuo(k, T, 300);
}

function recoil(k: Kit) {
  k.mover(k.A, [{ filter: "brightness(1)" }, { filter: "brightness(1.4) sepia(1) saturate(6) hue-rotate(-30deg)" }, { filter: "brightness(1)" }], 360, "linear");
  k.tremer(k.A, 3, 260);
}

// O desenho do golpe no alvo, por sabor. A cor e as partículas vêm do tipo.
function golpeNoAlvo(k: Kit, sabor: string, x: number, y: number, an: Ancora) {
  const c = k.pal.primary;
  const c2 = k.pal.secondary;
  const dpr = () => k.m.dprAtual;
  switch (sabor) {
    case "soco":
    case "tapa": {
      const grande = sabor === "soco" ? 1 : 0.7;
      k.desenho({
        camada: 3,
        dur: 300,
        draw: (g, t, agora) => {
          g.setTransform(dpr(), 0, 0, dpr(), x - k.dir * an.w * 0.2 * (1 - t), y);
          g.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
          g.scale(k.dir, 1);
          const s = an.w * 0.28 * grande * (0.6 + Math.min(1, t * 3) * 0.6);
          drawForma(g, "punho", s, c, c2, agora);
        },
      });
      k.anel(x, y, { r1: an.w * 0.7 * grande, ms: 300, cor: c2, larg: 4 });
      if (k.tipo !== 0 && k.tipo !== 6) k.explosao(x, y, { n: 10, forma: formaDoTipo(k.tipo), vel: [80, 200], tam: [3, 6] });
      break;
    }
    case "chute":
      arcoSwoosh(k, x, y, an.w * 0.6, k.dir > 0 ? -2.4 : -0.7, 1.7, c, 5);
      k.explosao(x, y, { n: 6, forma: "estrela", cor: "#FFFFFF", vel: [80, 160], tam: [3, 5] });
      break;
    case "mordida":
      mandibulas(k, x, y, an.w * 0.5, k.tipo === 15 ? "#3A2450" : c, k.tipo === 15 ? "#E8E0FF" : "#FFFFFF");
      break;
    case "corte": {
      const cruz = /x"|"x"|em x|cruz|cruzam|cruzados/.test(notas(k));
      const tres = /três riscos|riscos|garras/.test(notas(k));
      const q = cruz ? 2 : tres ? 3 : 1;
      for (let i = 0; i < q; i++) corteLinha(k, x, y, an.w * 0.9, cruz ? (i ? -0.8 : 0.8) : 0.75 + (i - (q - 1) / 2) * 0.18, (i - (q - 1) / 2) * 10, i * 50, k.tipo === 0 ? "#FFFFFF" : c);
      break;
    }
    case "cabecada":
      k.explosao(x, y - an.h * 0.2, { n: 7, forma: k.spec.shape === "coracao" ? "coracao" : "estrela", cor: "#FFE14D", cor2: "#FFF", vel: [70, 150], tam: [3, 6], ang: [Math.PI * 1.1, Math.PI * 1.9] });
      k.anel(x, y, { r1: an.w * 0.6, ms: 280, cor: c, larg: 5 });
      break;
    case "cauda":
      arcoSwoosh(k, x, y, an.w * 0.75, k.dir > 0 ? -2.8 : -0.4, 2.2, c, 7);
      if (/duplo|vinhas/.test(notas(k))) arcoSwoosh(k, x, y + 6, an.w * 0.6, k.dir > 0 ? 0.6 : 2.2, -2.0, c2, 5, 90);
      break;
    case "bicada":
      for (let i = 0; i < 3; i++) k.part({ x: x - k.dir * 18, y: y + (i - 1) * 4, vx: k.dir * 260, vida: k.ms(140), s0: 7, s1: 3, rot: k.dir > 0 ? 0 : Math.PI, forma: "agulha", c: "#FFFFFF", c2: c, camada: 3, brilho: 0.8 });
      if (k.spec.motion === "espiral") for (let i = 0; i < 3; i++) k.anel(x, y, { r1: 14 + i * 9, ms: 260 + i * 60, cor: i % 2 ? c2 : c, larg: 2, achata: 0.45 });
      break;
    case "lambida":
      k.desenho({
        camada: 3,
        dur: 380,
        draw: (g, t) => {
          g.setTransform(dpr(), 0, 0, dpr(), 0, 0);
          g.globalAlpha = 1 - t * 0.7;
          g.strokeStyle = "#E86FA8";
          g.lineCap = "round";
          g.lineWidth = 9 * (1 - t * 0.5);
          g.beginPath();
          g.moveTo(x - k.dir * an.w * 0.6, y + an.h * 0.2);
          g.quadraticCurveTo(x, y + an.h * 0.3, x + k.dir * an.w * 0.2 * Math.min(1, t * 3), y - an.h * 0.35 * Math.min(1, t * 3));
          g.stroke();
        },
      });
      k.explosao(x, y, { n: 6, forma: "gota", cor: k.pal.primary, grav: 300, vel: [30, 90], tam: [2, 4] });
      break;
    case "rola":
      k.anel(x, y, { r1: an.w * 0.6, ms: 300, cor: c, larg: 6 });
      k.explosao(x, y, { n: 10, forma: formaDoTipo(k.tipo), vel: [100, 220], tam: [3, 6] });
      break;
    default:
      k.anel(x, y, { r1: an.w * 0.65, ms: 300, cor: k.tipo === 0 ? "#FFFFFF" : c, larg: 6 });
      k.explosao(x, y, { n: 8, forma: k.tipo === 0 ? "estrela" : formaDoTipo(k.tipo), vel: [80, 200], tam: [3, 6] });
  }
}

function arcoSwoosh(k: Kit, x: number, y: number, r: number, a0: number, varre: number, cor: string, larg: number, atraso = 0) {
  k.desenho({
    camada: 3,
    dur: 300 + atraso,
    draw: (g, t) => {
      const dur = 300 + atraso;
      const tt = (t * dur - atraso) / 300;
      if (tt <= 0) return;
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, x, y);
      g.globalAlpha = Math.max(0, 1 - tt);
      g.strokeStyle = cor;
      g.lineCap = "round";
      g.lineWidth = larg;
      const fim = a0 + varre * Math.min(1, tt * 2.2);
      const ini = a0 + varre * Math.max(0, tt * 2.2 - 0.7);
      g.beginPath();
      g.arc(0, 0, r, Math.min(ini, fim), Math.max(ini, fim));
      g.stroke();
    },
  });
}

function corteLinha(k: Kit, x: number, y: number, L: number, ang: number, off: number, atraso: number, cor: string) {
  const dur = 260 + atraso;
  k.desenho({
    camada: 3,
    dur,
    draw: (g, t) => {
      const tt = (t * dur - atraso) / 260;
      if (tt <= 0) return;
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, x, y + off);
      g.rotate(ang * k.dir);
      g.globalAlpha = Math.max(0, 1 - Math.max(0, tt - 0.4) / 0.6);
      const ext = L * Math.min(1, tt * 3);
      g.fillStyle = cor;
      g.beginPath();
      g.moveTo(-ext / 2, 0);
      g.quadraticCurveTo(0, -4, ext / 2, 0);
      g.quadraticCurveTo(0, 2, -ext / 2, 0);
      g.fill();
      g.strokeStyle = "#FFFFFF";
      g.lineWidth = 1;
      g.stroke();
    },
  });
}

function mandibulas(k: Kit, x: number, y: number, r: number, cor: string, dente: string) {
  k.desenho({
    camada: 3,
    dur: 360,
    draw: (g, t) => {
      const fecha = Math.min(1, t * 2.2);
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, x, y);
      g.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      for (const s of [-1, 1]) {
        const yy = s * r * (1 - fecha) * 0.9 + s * 3;
        g.fillStyle = cor;
        g.beginPath();
        g.ellipse(0, yy + s * r * 0.25, r, r * 0.32, 0, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : TAU);
        g.fill();
        g.fillStyle = dente;
        for (let i = 0; i < 5; i++) {
          const dx = (i - 2) * r * 0.36;
          g.beginPath();
          g.moveTo(dx - r * 0.14, yy);
          g.lineTo(dx + r * 0.14, yy);
          g.lineTo(dx, yy - s * r * 0.3);
          g.closePath();
          g.fill();
        }
      }
    },
  });
}

// Agarra e arremessa: o alvo sobe em arco e cai.
async function arremesso(k: Kit, ms: number) {
  await investir(k, { ms, rastro: false });
  const T = k.T;
  k.fase("travel");
  if (!k.errou) {
    const orbita = /órbita|gira|círculo/.test(notas(k));
    k.mover(
      T,
      orbita
        ? [{ transform: "translate(0,0) rotate(0deg)" }, { transform: `translate(${-k.dir * 30}px,-50px) rotate(${180 * k.dir}deg)` }, { transform: `translate(${k.dir * 20}px,-70px) rotate(${360 * k.dir}deg)` }, { transform: "translate(0,6px) rotate(360deg)" }, { transform: "translate(0,0) rotate(360deg)" }]
        : [{ transform: "translate(0,0)" }, { transform: "translate(0,-60px) rotate(20deg)" }, { transform: "translate(0,8px)" }, { transform: "translate(0,0)" }],
      620,
      "ease-in"
    );
    await k.esperar(470);
    k.explosao(T.x, pe(T), { n: 10, forma: "poeira", cor: "#C8B080", vel: [60, 160], ang: [Math.PI, TAU], tam: [3, 7], brilho: 0 });
  }
  await k.impacto(T);
  k.fase("aftermath");
  if (k.spec.recoil) recoil(k);
  await k.esperar(300);
}

// ---------- MULTI ----------

async function multi(k: Kit) {
  const n = notas(k);
  const h = k.spec.hits ?? { min: 2, max: 5 };
  const total = k.ctx.hitsDone ?? Math.round(h.min + (h.max - h.min) * k.r());
  const contato = /soco|chute|tapa|arranh|bicada|chifrad|cauda|machad|empurr|golpeiam|socos|cortam|golpes repetitivos/.test(n) && !/disparad|lançad|arremess/.test(n);
  const T = k.T;
  let intervalo = 260;
  if (!contato) await carregar(k, 160, k.pal.primary, "brilho", 24);
  for (let i = 0; i < total; i++) {
    const cresce = /crescent|mais forte/.test(n) ? 1 + i * 0.3 : 1;
    if (contato) {
      if (i === 0) await investir(k, { ms: 360 });
      else {
        k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: `translate(${k.dir * 10}px,0)` }, { transform: "translate(0,0)" }], intervalo, "ease-out");
        await k.esperar(intervalo * 0.4);
      }
      const ox = (i % 2 ? 1 : -1) * T.w * 0.15;
      if (!k.errou) golpeNoAlvo(k, k.spec.sabor ?? "soco", T.x + ox, T.y + (k.r() - 0.5) * T.h * 0.3, T);
    } else {
      const o = k.spec.slug === "beat-up" ? { x: k.A.x + (k.r() - 0.5) * 60, y: k.A.y - 20 } : boca(k);
      const d = k.destino(T);
      const de = k.spec.motion === "cai" || k.spec.shape === "moeda" ? { x: d.x + (k.r() - 0.5) * T.w, y: -20 } : o;
      await k.voar({ de, para: { x: d.x + (k.r() - 0.5) * T.w * 0.3, y: d.y + (k.r() - 0.5) * T.h * 0.3 }, ms: 300, tam: 7 * cresce, cor: k.cor(i), mov: k.spec.motion === "teleguiado" ? "teleguiado" : k.spec.motion === "espiral" ? "espiral" : de === o ? "reto" : "cai", giro: ["osso", "estrela", "folha", "engrenagem", "moeda"].includes(k.spec.shape) ? 12 : 0, rastro: 0.8 });
    }
    if (k.errou) {
      if (i === 0) await k.impacto(T);
      break;
    }
    const x = T.x + (k.r() - 0.5) * T.w * 0.4;
    const y = T.y + (k.r() - 0.5) * T.h * 0.4;
    if (i === 0) await k.impacto(T, { escala: 0.8 * cresce, x, y });
    else {
      k.anel(x, y, { r1: T.w * 0.35 * cresce, ms: 220, cor: k.pal.secondary, larg: 3 });
      k.explosao(x, y, { n: 4, forma: "faisca", vel: [60, 140], tam: [2, 4] });
      k.tremer(T, 2 + k.tier, 140);
    }
    if (total > 2) k.texto(T.x + T.w * 0.55, T.y - T.h * 0.45 - i * 2, `${i + 1}×`, "#FFFFFF", 7, 420);
    await k.esperar(intervalo * 0.6);
    intervalo = Math.max(120, intervalo * 0.85);
  }
  if (k.spec.slug === "bonemerang" && !k.errou) await k.voar({ de: T, para: boca(k), ms: 300, tam: 7, giro: 12, mov: "arco" });
  k.fase("aftermath");
  await k.esperar(260);
}

// ---------- AOE ----------

async function aoe(k: Kit) {
  const n = notas(k);
  const s = k.spec.slug;
  if (/tremor|treme|rachad|pisa com força/.test(n)) return terremoto(k);
  if (/onda gigante|varre o campo|onda de água|onda de lodo|\bonda\b.*sobem/.test(n) && !/ondas de calor|ondas sonoras|anéis/.test(n)) return onda(k);
  if (/sonor|\bvoz\b|ronco|zumbido|rosnado|\beco\b|canto|notas|ressonância/.test(n)) return som(k);
  if (/tornado|furacão|redemoinho|gira ao redor|rodopio|tempestade enorme de folhas|tornados/.test(n)) return tornado(k);
  if (/despenca|chuva de|caem|cai em chuva|desce sobre|meteoros|avalanche/.test(n)) return chuvaSobre(k);
  if (/brotam do chão|sobe do chão|sobe uma coluna|colunas|explode com lava|raízes gigantes|sobe e envolve|explosão colossal|vulcão|erupção/.test(n)) return colunas(k);
  if (/vento|sopra|ondas de calor|varre|ventania|rajada/.test(n)) return vento(k);
  if (s === "petal-dance" || s === "fiery-dance") return tornado(k);
  return explosaoRadial(k);
}

async function terremoto(k: Kit) {
  k.fase("anticipation");
  if (k.spec.slug === "magnitude") {
    const mag = 4 + Math.floor(k.r() * 7);
    k.texto(sobre(k).x, sobre(k).y, `Magnitude ${mag}`, "#FFE08A", 9, 900);
    await k.esperar(600);
  }
  k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: "translate(0,-14px)" }, { transform: "translate(0,2px)" }, { transform: "translate(0,0)" }], 360, "ease-in");
  await k.esperar(280);
  k.fase("travel");
  k.tremerTela(TREMOR(k), 700);
  const W = k.m.largura;
  const y0 = pe(k.A);
  // rachaduras
  const rachas = Array.from({ length: 4 }, (_, i) => ({ y: y0 - i * 22 - k.r() * 10, seg: Array.from({ length: 9 }, () => k.r() - 0.5) }));
  k.desenho({
    camada: 1,
    dur: 900,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 0.9;
      g.strokeStyle = "#2A1A0A";
      g.lineWidth = 2.5;
      for (const r of rachas) {
        g.beginPath();
        const fim = Math.min(1, t * 2.5);
        const x0 = k.dir > 0 ? 0 : W;
        g.moveTo(k.A.x, r.y);
        r.seg.forEach((v, i) => {
          const f = ((i + 1) / r.seg.length) * fim;
          const x = k.A.x + (x0 === 0 ? W - k.A.x : -k.A.x) * f;
          g.lineTo(x, r.y - (r.y - (k.T.y + k.T.h * 0.5)) * f + v * 14);
        });
        g.stroke();
      }
    },
  });
  for (const an of k.Ts) {
    for (let i = 0; i < k.n(6); i++) k.part({ x: an.x + (k.r() - 0.5) * an.w, y: pe(an), vy: -140 - k.r() * 120, vx: (k.r() - 0.5) * 80, ay: 600, vida: k.ms(700), s0: 3 + k.r() * 4, forma: "pedra", c: k.pal.primary, c2: k.pal.secondary, camada: 3, rot: k.r() * 6, vr: 6 });
  }
  await k.esperar(250);
  for (const an of k.Ts) await k.impacto(an, { semAnel: true });
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(480);
}

const TREMOR = (k: Kit) => [3, 6, 9, 14][k.tier];

async function onda(k: Kit) {
  k.fase("anticipation");
  recuo(k, 6);
  await k.esperar(200);
  k.fase("travel");
  const W = k.m.largura;
  const H = k.m.altura;
  const cor = k.pal.primary;
  const cor2 = k.pal.secondary;
  const dur = 900;
  k.desenho({
    camada: 3,
    dur,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frente = k.dir > 0 ? -W * 0.3 + t * W * 1.6 : W * 1.3 - t * W * 1.6;
      const alt = H * (0.35 + 0.15 * Math.sin(t * Math.PI));
      g.globalAlpha = 0.8 * Math.min(1, (1 - t) * 3);
      g.fillStyle = cor;
      g.beginPath();
      const atras = frente - k.dir * W * 0.7;
      g.moveTo(atras, H);
      for (let i = 0; i <= 24; i++) {
        const f = i / 24;
        const x = atras + (frente - atras) * f;
        const y = H - alt * Math.pow(f, 1.6) + Math.sin(f * 18 + agora * 0.01) * 5;
        g.lineTo(x, y);
      }
      g.lineTo(frente + k.dir * 30, H - alt * 0.6);
      g.lineTo(frente, H);
      g.closePath();
      g.fill();
      g.strokeStyle = cor2;
      g.lineWidth = 4;
      g.stroke();
    },
    tick: (t) => {
      const frente = k.dir > 0 ? -W * 0.3 + t * W * 1.6 : W * 1.3 - t * W * 1.6;
      if (k.r() < 0.6) k.part({ x: frente, y: H - H * 0.4 * k.r(), vx: k.dir * 120, vy: -120 * k.r(), ay: 400, vida: 400, s0: 3, forma: "gota", c: cor2, c2: "#fff", camada: 3 });
    },
  });
  await k.esperar(dur * 0.45);
  for (const an of k.Ts) await k.impacto(an, { semAnel: true });
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(dur * 0.5);
}

async function som(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  k.mover(k.A, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], 300);
  await k.esperar(120);
  k.fase("travel");
  const o = boca(k);
  const q = 4 + k.tier;
  const notasMusicais = /notas|canto|canta/.test(n);
  const eco = k.spec.slug === "echoed-voice";
  for (let i = 0; i < q; i++) {
    k.anel(o.x, o.y, { r1: Math.hypot(k.m.largura, k.m.altura) * (eco ? 0.4 + i * 0.12 : 0.65), ms: 700, cor: k.cor(i), larg: 3 + k.tier, camada: 2, achata: 0.7 });
    if (notasMusicais || k.spec.shape === "z") {
      for (const an of k.Ts) void k.voar({ de: o, para: { x: an.x + (k.r() - 0.5) * an.w, y: an.y - an.h * 0.3 }, ms: 520, forma: k.spec.shape === "z" ? "z" : "nota", tam: 6, cor: k.pal.arcoiris || /colorid/.test(n) ? ARCOIRIS[i % 7] : k.cor(i), mov: "zigue", rastro: 0 });
    }
    await k.esperar(110);
  }
  await k.esperar(180);
  for (const an of k.Ts) {
    k.mover(an, [{ transform: "scale(1,1)" }, { transform: "scale(1.06,.94)" }, { transform: "scale(.96,1.04)" }, { transform: "scale(1,1)" }], 320);
    await k.impacto(an, { semAnel: true });
  }
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(300);
}

async function tornado(k: Kit) {
  k.fase("anticipation");
  if (/usuário dança|dança/.test(notas(k))) k.mover(k.A, [{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }], 500);
  await k.esperar(200);
  k.fase("travel");
  const dur = 1000 + k.tier * 150;
  const forma = k.spec.shape === "fumaca" ? "estilhaco" : k.spec.shape;
  for (const an of k.Ts) {
    const q = k.n(18);
    const corpos = Array.from({ length: q }, (_, i) => ({ a: k.r() * TAU, h: k.r(), r: 0.5 + k.r() * 0.5, i }));
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        for (const c of corpos) {
          const a = c.a + agora * 0.009 * (1 + c.h);
          const y = pe(an) - c.h * an.h * 1.4 - t * 10;
          const r = an.w * (0.35 + c.h * 0.5) * c.r;
          g.setTransform(dpr, 0, 0, dpr, an.x + Math.cos(a) * r, y + Math.sin(a) * r * 0.25);
          g.globalAlpha = Math.min(1, t * 5, (1 - t) * 4) * (Math.sin(a) > -0.2 ? 1 : 0.45);
          g.rotate(a * 2);
          drawForma(g, forma, (5 + k.tier) * k.u, k.cor(c.i), k.pal.secondary, agora);
        }
      },
    });
  }
  await k.esperar(dur * 0.4);
  for (const an of k.Ts) await k.impacto(an, { semAnel: true });
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(dur * 0.55);
}

async function chuvaSobre(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  if (/sobe ao céu/.test(n)) {
    await k.voar({ de: boca(k), para: { x: k.A.x, y: -30 }, ms: 400, forma: "orbe", tam: 10 });
  } else recuo(k, 6);
  if (/esbranquiçad|branco/.test(n)) k.tinta("#FFFFFF", 0.25, 1200);
  await k.esperar(120);
  k.fase("travel");
  const q = k.n(8);
  for (let i = 0; i < q; i++) {
    for (const an of k.Ts) {
      const x = an.x + (k.r() - 0.5) * an.w * 1.4;
      void k.voar({ de: { x: x + 40 * k.dir, y: -30 - k.r() * 60 }, para: { x, y: an.y + (k.r() - 0.3) * an.h * 0.5 }, ms: 380 + k.r() * 120, tam: 6 + k.tier * 2 + k.r() * 4, mov: "cai", giro: 4, rastro: 0.5, cor: k.cor(i) });
    }
    await k.esperar(55);
  }
  await k.esperar(300);
  for (const an of k.Ts) await k.impacto(an, { forma: k.spec.shape });
  for (const an of k.Ts) k.explosao(an.x, pe(an), { n: 8, forma: "poeira", cor: "#C8B890", vel: [40, 120], ang: [Math.PI, TAU], brilho: 0, tam: [3, 7] });
  k.fase("aftermath");
  await k.esperar(380);
}

async function colunas(k: Kit) {
  k.fase("anticipation");
  if (/do usuário|corpo do usuário/.test(notas(k))) {
    k.brilho(k.A.x, k.A.y, k.A.w, k.pal.primary, 600);
    await k.esperar(300);
  } else {
    recuo(k, 4);
    await k.esperar(220);
  }
  k.fase("travel");
  const dur = 700 + k.tier * 120;
  for (const an of k.Ts) {
    const larg = an.w * (0.5 + k.tier * 0.1);
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sobe = Math.min(1, t * 3);
        const alt = an.h * 1.8 * sobe;
        const a = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
        const gr = g.createLinearGradient(0, pe(an), 0, pe(an) - alt);
        gr.addColorStop(0, k.pal.accent);
        gr.addColorStop(0.5, k.pal.primary);
        gr.addColorStop(1, k.pal.secondary + "00");
        g.globalAlpha = 0.85 * a;
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(an.x - larg / 2, pe(an));
        for (let i = 0; i <= 8; i++) {
          const f = i / 8;
          g.lineTo(an.x - larg / 2 + Math.sin(f * 9 + agora * 0.02) * 5 * f, pe(an) - alt * f);
        }
        for (let i = 8; i >= 0; i--) {
          const f = i / 8;
          g.lineTo(an.x + larg / 2 + Math.sin(f * 9 + agora * 0.02 + 2) * 5 * f, pe(an) - alt * f);
        }
        g.closePath();
        g.fill();
      },
      tick: () => {
        if (k.r() < 0.5) k.part({ x: an.x + (k.r() - 0.5) * larg, y: pe(an) - k.r() * an.h, vy: -180, vida: 420, s0: 4, s1: 1, forma: formaDoTipo(k.tipo), c: k.pal.secondary, c2: "#fff", camada: 3, brilho: 1 });
      },
    });
    k.explosao(an.x, pe(an), { n: 8, forma: "poeira", cor: "#A88A50", vel: [40, 130], ang: [Math.PI, TAU], brilho: 0, tam: [3, 6] });
  }
  await k.esperar(dur * 0.3);
  if (k.tier >= 2) k.tremerTela(5, 400);
  for (const an of k.Ts) await k.impacto(an, { semAnel: true });
  k.fase("aftermath");
  if (k.spec.recarga) cansado(k);
  if (k.spec.stats?.length && !k.errou) for (const st of k.spec.stats) k.setas(k.A, st.stat, st.n);
  await k.esperar(dur * 0.6);
}

async function vento(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  if (/calor|quente/.test(n)) k.tinta("#FF8A3D", 0.18, 1100);
  else if (/gelad|glacial/.test(n)) k.tinta("#C8F0FF", 0.18, 1100);
  else if (/fantasm|sombr/.test(n)) k.tinta("#2A1A40", 0.25, 1100);
  recuo(k, 6);
  await k.esperar(160);
  k.fase("travel");
  const W = k.m.largura;
  const H = k.m.altura;
  const dur = 800;
  let acum = 0;
  k.desenho({
    camada: 3,
    dur,
    tick: (_t, dt) => {
      acum += dt;
      while (acum > 14) {
        acum -= 14;
        const y = H * (0.1 + k.r() * 0.75);
        k.part({ x: k.dir > 0 ? -10 : W + 10, y, vx: k.dir * (500 + k.r() * 300), vy: (k.r() - 0.5) * 60, vida: 700, s0: 3 + k.r() * 3, s1: 2, forma: k.r() < 0.5 ? k.spec.shape : formaDoTipo(k.tipo), c: k.cor(Math.floor(k.r() * 3)), c2: k.pal.secondary, camada: 3, brilho: 0.7, rot: k.r() * 6, vr: 6 });
      }
    },
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.strokeStyle = "#FFFFFF";
      g.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        const f = (t * 1.6 + i * 0.11) % 1;
        const x = k.dir > 0 ? f * W : W - f * W;
        g.globalAlpha = 0.35 * (1 - Math.abs(f - 0.5) * 2);
        g.beginPath();
        g.moveTo(x, H * (0.15 + i * 0.08));
        g.lineTo(x - k.dir * 60, H * (0.15 + i * 0.08));
        g.stroke();
      }
    },
  });
  await k.esperar(dur * 0.45);
  for (const an of k.Ts) await k.impacto(an, { semAnel: true });
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(st.n > 0 && !/alvos/.test(n) ? k.A : an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(dur * 0.5);
}

async function explosaoRadial(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  await carregar(k, 300, k.pal.primary, "brilho", 30);
  k.fase("travel");
  const origem = /saem do usuário|todas as direções/.test(n) ? { x: k.A.x, y: k.A.y } : null;
  if (origem) {
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + k.r() * 0.3;
      k.feixe({ de: origem, para: { x: origem.x + Math.cos(a) * 260, y: origem.y + Math.sin(a) * 180 }, ms: 360, larg: 3 + k.tier, zigue: k.tipo === 3 });
    }
  }
  for (const an of k.Ts) {
    // espaço distorcido em volta do alvo
    for (let i = 0; i < 3; i++) k.anel(an.x, an.y, { r0: an.w * 1.2, r1: an.w * 0.2, ms: 420 + i * 80, cor: k.cor(i), larg: 3 });
    k.mover(an, [{ transform: "scale(1)" }, { transform: "scale(1.08,.92)" }, { transform: "scale(.94,1.06)" }, { transform: "scale(1)" }], 420);
  }
  await k.esperar(300);
  for (const an of k.Ts) await k.impacto(an);
  if (k.spec.stats?.length && !k.errou) for (const an of k.Ts) for (const st of k.spec.stats) k.setas(an, st.stat, st.n);
  k.fase("aftermath");
  await k.esperar(380);
}

// ---------- CHARGE (dois turnos, tocados em sequência) ----------

async function charge(k: Kit) {
  const n = notas(k);
  const [t1] = n.split("t2:");
  const estado = k.spec.twoTurn?.persistentState ?? "charging";
  const A = k.A;
  const T = k.T;
  k.fase("anticipation");
  const segura = 520; // tempo "escondido" entre os turnos
  if (estado === "underground" || estado === "underwater") {
    const agua = estado === "underwater";
    k.mover(A, [{ transform: "translate(0,0)", opacity: 1, offset: 0 }, { transform: `translate(0,${A.h * 0.6}px)`, opacity: 0, offset: 0.22 }, { transform: `translate(0,${A.h * 0.6}px)`, opacity: 0, offset: 0.8 }, { transform: "translate(0,0)", opacity: 1, offset: 1 }], 1600, "ease-in");
    k.explosao(A.x, pe(A), { n: 14, forma: agua ? "gota" : "pedra", cor: agua ? "#6890F0" : "#A88A50", cor2: agua ? "#fff" : "#E0C068", vel: [80, 200], ang: [Math.PI * 1.1, Math.PI * 1.9], grav: 500, tam: [2, 5], brilho: 0 });
    await k.esperar(350 + segura);
    k.fase("travel");
    const d = k.destino(T);
    k.part({ x: d.x, y: pe(T), vy: 0, vida: k.ms(260), s0: 4, s1: T.w * 0.5, forma: "anel", c: agua ? "#A8D8F8" : "#5A3A1A", camada: 1, a0: 0.8 });
    await k.esperar(220);
    for (let i = 0; i < k.n(14); i++) k.part({ x: d.x + (k.r() - 0.5) * T.w * 0.6, y: pe(T), vy: -260 - k.r() * 200, vx: (k.r() - 0.5) * 120, ay: 700, vida: k.ms(700), s0: 3 + k.r() * 4, forma: agua ? "gota" : "pedra", c: agua ? "#6890F0" : k.pal.primary, c2: k.pal.secondary, camada: 3 });
    await k.impacto(T);
  } else if (estado === "airborne") {
    const cai = /cai pesadamente|despenca|solta o alvo/.test(n);
    k.mover(A, [{ transform: "translate(0,0)", opacity: 1, offset: 0 }, { transform: `translate(${-k.dir * 20}px,-${A.y + A.h}px)`, opacity: 1, offset: 0.25 }, { transform: `translate(${-k.dir * 20}px,-${A.y + A.h}px)`, opacity: 0, offset: 0.26 }, { transform: `translate(0,-${A.y + A.h}px)`, opacity: 0, offset: 0.75 }, { transform: "translate(0,0)", opacity: 1, offset: 1 }], 1700, "ease-in");
    k.explosao(A.x, pe(A), { n: 8, forma: "pena", cor: "#FFFFFF", vel: [40, 120], tam: [3, 5], brilho: 0, grav: 60 });
    await k.esperar(420 + segura);
    k.fase("travel");
    const d = k.destino(T);
    if (/flecha de luz/.test(n)) {
      k.feixe({ de: { x: d.x - k.dir * 300, y: -40 }, para: d, ms: 300, larg: 10, cor: "#FFF6C8", cor2: "#FFFFFF" });
      await k.esperar(120);
    } else await k.voar({ de: { x: d.x - k.dir * (cai ? 10 : 220), y: -50 }, para: d, ms: 300, forma: cai ? "estrela" : "pena", tam: 14, mov: "cai", rastro: 2 });
    if (/agarra o alvo/.test(n)) k.mover(T, [{ transform: "translate(0,0)" }, { transform: "translate(0,-80px)", opacity: 0.4 }, { transform: "translate(0,0)", opacity: 1 }], 500, "ease-in");
    await k.impacto(T, { forma: cai ? "estrela" : "pena" });
  } else if (estado === "vanished") {
    k.mover(A, [{ opacity: 1, filter: "brightness(1)", offset: 0 }, { opacity: 0, filter: "brightness(0)", offset: 0.25 }, { opacity: 0, offset: 0.75 }, { opacity: 1, filter: "brightness(1)", offset: 1 }], 1500, "linear");
    k.explosao(A.x, A.y, { n: 12, forma: "fumaca", cor: "#2A1A3A", vel: [20, 70], tam: [5, 10], fim: 1.5, brilho: 0, a0: 0.7 });
    await k.esperar(380 + segura);
    k.fase("travel");
    const d = k.destino(T);
    k.explosao(d.x + k.dir * T.w * 0.5, d.y, { n: 10, forma: "fumaca", cor: "#2A1A3A", vel: [20, 60], tam: [5, 10], fim: 1.5, brilho: 0, a0: 0.7 });
    corteLinha(k, d.x, d.y, T.w, -0.6, 0, 0, k.pal.primary);
    await k.impacto(T);
  } else {
    // carregando: acumula energia (luz, gelo, aura...) e solta
    const sol = /luz solar|tela clareia/.test(t1);
    if (sol) k.tinta("#FFF6C8", 0.3, 1400);
    if (/vermelh/.test(t1)) k.mover(A, [{ filter: "brightness(1)" }, { filter: "brightness(1.3) sepia(1) hue-rotate(-40deg) saturate(5)" }, { filter: "brightness(1.3) sepia(1) hue-rotate(-40deg) saturate(5)" }, { filter: "brightness(1)" }], 1000, "linear");
    if (/bloco de gelo/.test(t1)) k.mover(A, [{ filter: "brightness(1)" }, { filter: "brightness(1.4) hue-rotate(160deg)" }, { filter: "brightness(1)" }], 900);
    if (/treme/.test(t1)) k.tremer(A, 3, 800);
    if (/gira|redemoinho/.test(t1)) k.mover(A, [{ transform: "rotate(0)" }, { transform: `rotate(${k.dir * 360}deg)` }], 600, "linear");
    await carregar(k, 700, sol ? "#E8FF8A" : k.pal.primary, sol ? "brilho" : k.spec.shape === "punho" ? "brilho" : formaDoTipo(k.tipo), 60);
    if (/↑/.test(t1)) for (const s of k.spec.stats ?? []) if (s.n > 0) k.setas(A, s.stat, s.n);
    await k.esperar(segura * 0.5);
    k.fase("travel");
    const t2 = n.split("t2:")[1] ?? n;
    const d = k.destino(T);
    if (/feixe|raios/.test(t2)) {
      k.feixe({ de: boca(k), para: d, ms: 600, larg: 16, cor: sol ? "#E8FF8A" : k.pal.primary, cor2: "#FFFFFF" });
      await k.esperar(140);
      await k.impacto(T, { escala: 1.2 });
      await k.esperar(300);
    } else if (/cabeçada|soco|investida|lâminas|onda de choque|explosão/.test(t2) && !/lâminas de vento/.test(t2)) {
      if (/onda de choque/.test(t2)) {
        k.anel(A.x, A.y, { r1: 400, ms: 500, cor: "#FFFFFF", larg: 8 });
        await k.esperar(200);
      } else await investir(k, { ms: 460 });
      if (/soco/.test(t2) && !k.errou) golpeNoAlvo(k, "soco", d.x, d.y, T);
      if (/cabeçada/.test(t2) && !k.errou) golpeNoAlvo(k, "cabecada", d.x, d.y, T);
      await k.impacto(T, { escala: 1.2 });
    } else {
      for (let i = 0; i < 3; i++) {
        void k.voar({ de: boca(k), para: { x: d.x, y: d.y + (i - 1) * 10 }, ms: 300, forma: /lâmina/.test(t2) ? "lamina" : k.spec.shape, tam: 10, cor: k.cor(i) });
        await k.esperar(60);
      }
      await k.esperar(240);
      await k.impacto(T, { escala: 1.2 });
    }
  }
  k.fase("aftermath");
  if (k.spec.statusInflige) k.statusPulso(T, k.spec.statusInflige);
  await residuo(k, T, 320);
}

// ---------- BUFF ----------

async function buff(k: Kit) {
  const n = notas(k);
  const alvo = /aliado/.test(n) ? (k.ctx.aliados?.[0] ?? k.A) : k.A;
  const forma = k.spec.shape;
  k.fase("anticipation");
  if (/encolhe|recolhe|se enrola|enrola/.test(n)) {
    const min = /encolhe rapidamente|escala ~0,3/.test(n) ? 0.35 : 0.8;
    k.mover(alvo, [{ transform: "scale(1)" }, { transform: `scale(${min})` }, { transform: `scale(${min})` }, { transform: "scale(1)" }], 900);
  } else if (/infla|músculos/.test(n)) k.mover(alvo, [{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], 800);
  else if (/dança|vibra|rodopi/.test(n)) k.mover(alvo, [{ transform: "rotate(0)" }, { transform: "rotate(-10deg) translate(0,-4px)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-6deg) translate(0,-4px)" }, { transform: "rotate(0)" }], 800);
  else if (/flutua|levita/.test(n)) k.mover(alvo, [{ transform: "translate(0,0)" }, { transform: "translate(0,-14px)" }, { transform: "translate(0,-14px)" }, { transform: "translate(0,0)" }], 900);
  else if (/metálic|aço|polia|brilha como pedra/.test(n)) k.mover(alvo, [{ filter: "brightness(1)" }, { filter: "brightness(1.6) contrast(1.4) grayscale(.6)" }, { filter: "brightness(1)" }], 700);
  if (/imagens residuais|cópias|imagens|desliza/.test(n)) imagensResiduais(k, alvo, /cópias|leque/.test(n) ? 5 : 3);
  if (/derrete|gosma/.test(n)) k.mover(alvo, [{ transform: "scale(1,1)", opacity: 1 }, { transform: "scale(1.3,.5) translate(0,30%)", opacity: 0.6 }, { transform: "scale(1,1)", opacity: 1 }], 800);
  if (/vira o corpo ao contrário|inverte/.test(n)) k.mover(alvo, [{ transform: "scaleY(1)" }, { transform: "scaleY(-1)" }, { transform: "scaleY(1)" }], 700);
  if (/partes do corpo|casca explode/.test(n)) k.explosao(alvo.x, alvo.y, { n: 12, forma: "estilhaco", cor: k.pal.primary, grav: 400, vel: [80, 200], tam: [3, 6], brilho: 0.6 });
  if (/retículo|olho|símbolo psíquico/.test(n)) mira(k, k.T);
  if (/tambor|bate na barriga/.test(n)) for (let i = 0; i < 4; i++) k.anel(alvo.x, alvo.y, { r1: alvo.w * (0.6 + i * 0.2), ms: 300 + i * 120, cor: "#E8443A", larg: 3 });
  await k.esperar(150);
  k.fase("travel");
  // aura: anéis e partículas da forma do golpe subindo/orbitando
  const orbita = k.spec.motion === "orbita" || /girando|ao redor|em volta|circundam|painéis|muralha/.test(n);
  const dur = 900;
  if (orbita) {
    const q = forma === "hexagono" ? 6 : 5;
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        for (let i = 0; i < q; i++) {
          const a = (i * TAU) / q + agora * (forma === "hexagono" ? 0.0015 : 0.006);
          const r = alvo.w * (forma === "hexagono" ? 0.6 : 0.75) * Math.min(1, t * 3);
          g.setTransform(dpr, 0, 0, dpr, alvo.x + Math.cos(a) * r, alvo.y + Math.sin(a) * r * (forma === "hexagono" ? 0.9 : 0.35));
          g.globalAlpha = Math.min(1, (1 - t) * 3);
          g.rotate(forma === "lamina" ? a + Math.PI / 2 : 0);
          drawForma(g, forma, forma === "hexagono" ? alvo.h * 0.18 : 7 * k.u, k.cor(i), k.pal.secondary, agora);
        }
      },
    });
  } else {
    let acum = 0;
    k.desenho({
      camada: 3,
      dur,
      tick: (_t, dt) => {
        acum += dt;
        while (acum > 40) {
          acum -= 40;
          k.part({ x: alvo.x + (k.r() - 0.5) * alvo.w, y: pe(alvo) - k.r() * alvo.h * 0.4, vy: -70 - k.r() * 40, vida: 700, s0: 4, s1: 1.5, forma: forma === "orbe" ? "brilho" : forma, c: k.cor(Math.floor(k.r() * 3)), c2: k.pal.secondary, camada: 3, brilho: 0.9, rot: k.r() * 6, vr: 3 });
        }
      },
    });
  }
  k.anel(alvo.x, pe(alvo), { r1: alvo.w * 0.9, ms: 600, cor: k.pal.primary, larg: 3, achata: 0.3, camada: 1 });
  k.brilho(alvo.x, alvo.y, alvo.w * 0.9, k.pal.primary, 700);
  await k.esperar(380);
  k.fase("impact");
  for (const s of k.spec.stats ?? []) k.setas(s.n < 0 && /↓ def|↓ speed|perde/i.test(k.spec.notes) ? alvo : alvo, s.stat, s.n);
  if (/perde hp/.test(n)) recoil(k);
  k.fase("aftermath");
  await k.esperar(dur - 380);
}

function imagensResiduais(k: Kit, an: Ancora, q: number) {
  const quadros: Keyframe[] = [{ transform: "translate(0,0)", opacity: 1 }];
  for (let i = 0; i < q; i++) quadros.push({ transform: `translate(${(i % 2 ? -1 : 1) * (12 + i * 6)}px,0)`, opacity: 0.55 });
  quadros.push({ transform: "translate(0,0)", opacity: 1 });
  k.mover(an, quadros, 700, "linear");
  for (let i = 0; i < q; i++) {
    const x = an.x + (i % 2 ? -1 : 1) * (18 + i * 10);
    k.part({ x, y: an.y, vida: k.ms(500), s0: an.w * 0.35, s1: an.w * 0.4, forma: "poeira", c: k.pal.primary, camada: 1, a0: 0.25, brilho: 0.6 });
  }
}

function mira(k: Kit, an: Ancora) {
  k.desenho({
    camada: 4,
    dur: 700,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
      const r = an.w * (1.1 - Math.min(1, t * 2) * 0.55);
      g.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
      g.strokeStyle = "#FF4A4A";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.moveTo(-r - 8, 0);
      g.lineTo(-r * 0.4, 0);
      g.moveTo(r + 8, 0);
      g.lineTo(r * 0.4, 0);
      g.moveTo(0, -r - 8);
      g.lineTo(0, -r * 0.4);
      g.moveTo(0, r + 8);
      g.lineTo(0, r * 0.4);
      g.stroke();
    },
  });
}

// ---------- DEBUFF ----------

async function debuff(k: Kit) {
  const n = notas(k);
  const T = k.T;
  const forma = k.spec.shape;
  k.fase("anticipation");
  if (/olhar|olhos|rosto|máscara/.test(n)) {
    olhosBrilham(k, /vermelh/.test(n) ? "#FF3A3A" : k.pal.primary);
    await k.esperar(380);
  } else if (/balança a cauda|gesto|provoca|pisca|chora|palmas|acena|sorri/.test(n)) {
    k.mover(k.A, [{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(0)" }], 600);
    await k.esperar(300);
  } else {
    recuo(k, 5);
    await k.esperar(160);
  }
  k.fase("travel");
  const d = k.destino(T);
  if (/clarão/.test(n)) {
    k.clarao("#FFFFFF", 0.6, 420);
    await k.esperar(200);
  } else if (forma === "anel") {
    for (let i = 0; i < 4; i++) {
      void k.voar({ de: boca(k), para: d, ms: 420, forma: "anel", tam: 8 + i * 2, cor: k.cor(i), mov: k.spec.motion, rastro: 0 });
      await k.esperar(80);
    }
    await k.esperar(340);
  } else if (/selo|cadeado|algemas|grades|prisão|muro|bloqueia/.test(n)) {
    selo(k, T, /muro|prisão|anel/.test(n));
    await k.esperar(380);
  } else if (/levita/.test(n)) {
    k.mover(T, [{ transform: "translate(0,0)" }, { transform: "translate(0,-22px)" }, { transform: "translate(0,-18px)" }, { transform: "translate(0,0)" }], 1000);
    k.anel(T.x, pe(T), { r1: T.w * 0.7, ms: 700, cor: k.pal.primary, larg: 3, achata: 0.3 });
    await k.esperar(400);
  } else if (/redemoinho|varre o alvo|forçado a sair/.test(n)) {
    if (/redemoinho/.test(n)) await tornadoCurto(k, T);
    k.mover(T, [{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${k.dir * 90}px,-10px)`, opacity: 0 }, { transform: "translate(0,0)", opacity: 0 }, { transform: "translate(0,0)", opacity: 1 }], 900, "ease-in");
    await k.esperar(300);
  } else if (/mão|mãos/.test(n)) {
    k.desenho({
      camada: 3,
      dur: 500,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, T.x + Math.sin(agora * 0.03) * 6, T.y - T.h * 0.1);
        g.globalAlpha = Math.sin(t * Math.PI);
        drawForma(g, "punho", T.w * 0.22, k.tipo === 15 ? "#2E2238" : "#FFD8C0", "#000000", agora);
      },
    });
    await k.esperar(380);
  } else {
    // nuvem / pó / fios / corações viajam até o alvo e cobrem
    const q = k.n(6);
    for (let i = 0; i < q; i++) {
      void k.voar({ de: boca(k), para: { x: d.x + (k.r() - 0.5) * T.w * 0.5, y: d.y + (k.r() - 0.5) * T.h * 0.4 }, ms: 380, forma, tam: forma === "fumaca" ? 9 : 6, cor: k.cor(i), mov: k.spec.motion, rastro: 0.4, giro: forma === "pena" || forma === "semente" ? 4 : 0 });
      await k.esperar(50);
    }
    await k.esperar(300);
    if (forma === "fumaca" || forma === "poeira") k.explosao(d.x, d.y, { n: 10, forma: "fumaca", cor: k.pal.primary, vel: [10, 50], tam: [7, 12], fim: 1.5, vida: [700, 1000], brilho: 0, a0: 0.6 });
    if (forma === "teia") teiaSobre(k, T);
  }
  k.fase("impact");
  if (k.errou) k.esquiva(T);
  else if (k.resultado === "noEffect") k.explosao(T.x, T.y, { n: 6, forma: "fumaca", cor: "#9A9AA6", vel: [10, 40], tam: [4, 8], brilho: 0, a0: 0.5 });
  else {
    k.mover(T, [{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], 300);
    for (const s of k.spec.stats ?? []) k.setas(T, s.stat, s.n);
    if (!k.spec.stats?.length) k.statusPulso(T, k.spec.statusInflige ?? "confusion");
  }
  k.fase("aftermath");
  await k.esperar(420);
}

function olhosBrilham(k: Kit, cor: string) {
  const A = k.A;
  for (const s of [-1, 1]) {
    k.part({ x: A.x + s * A.w * 0.12 + k.dir * A.w * 0.1, y: A.y - A.h * 0.22, vida: k.ms(420), s0: 3, s1: 9, forma: "faisca", c: cor, c2: "#FFFFFF", camada: 4, brilho: 1.6, a0: 1, a1: 0 });
  }
  for (let i = 0; i < 4; i++) k.anel(k.T.x, k.T.y, { r0: k.T.w, r1: k.T.w * 0.3, ms: 400 + i * 80, cor, larg: 1.5, camada: 4 });
}

function selo(k: Kit, an: Ancora, cerca: boolean) {
  k.desenho({
    camada: 4,
    dur: 900,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      const ap = Math.min(1, t * 4);
      g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
      g.globalAlpha = t > 0.75 ? (1 - t) * 4 : ap;
      if (cerca) {
        g.strokeStyle = k.pal.primary;
        g.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const x = (i - 2.5) * an.w * 0.24;
          g.beginPath();
          g.moveTo(x, -an.h * 0.6 * ap);
          g.lineTo(x, an.h * 0.55);
          g.stroke();
        }
      } else {
        g.scale(1.6 - ap * 0.6, 1.6 - ap * 0.6);
        drawForma(g, "hexagono", an.w * 0.35, k.pal.primary, "#FFFFFF", agora);
        g.fillStyle = "#FFFFFF";
        g.fillRect(-6, -2, 12, 10);
        g.strokeStyle = "#FFFFFF";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -3, 5, Math.PI, 0);
        g.stroke();
      }
    },
  });
}

function teiaSobre(k: Kit, an: Ancora) {
  k.desenho({
    camada: 4,
    dur: 1000,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
      g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : Math.min(1, t * 5);
      drawForma(g, "teia", an.w * 0.65 * Math.min(1, t * 4), k.tipo === 3 ? "#FFE14D" : "#F0F0F0", "#fff", agora);
    },
  });
}

async function tornadoCurto(k: Kit, an: Ancora) {
  k.desenho({
    camada: 3,
    dur: 600,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.strokeStyle = "#FFFFFF";
      g.lineWidth = 2;
      g.globalAlpha = Math.sin(t * Math.PI) * 0.7;
      for (let i = 0; i < 6; i++) {
        const y = pe(an) - i * an.h * 0.2;
        const r = an.w * (0.25 + i * 0.1);
        g.beginPath();
        g.ellipse(an.x + Math.sin(agora * 0.02 + i) * 4, y, r, r * 0.25, 0, 0, TAU);
        g.stroke();
      }
    },
  });
  await k.esperar(300);
}

// ---------- STATUS ----------

async function status(k: Kit) {
  const n = notas(k);
  const T = k.T;
  const st = k.spec.statusInflige;
  const forma = k.spec.shape;
  k.fase("anticipation");
  if (/olhos/.test(n)) olhosBrilham(k, k.pal.primary);
  else if (/boceja|dança|cambaleia|elogia|exibe|faz bico/.test(n)) k.mover(k.A, [{ transform: "rotate(0)" }, { transform: "rotate(-9deg) scale(1.05)" }, { transform: "rotate(7deg)" }, { transform: "rotate(0)" }], 600);
  else recuo(k, 5);
  await k.esperar(200);
  k.fase("travel");
  const d = k.destino(T);
  if (/fio de destino|liga usuário/.test(n)) {
    k.desenho({
      camada: 3,
      dur: 1000,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = Math.min(1, t * 4, (1 - t) * 3);
        g.strokeStyle = "#7A3AB0";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(k.A.x, k.A.y);
        g.bezierCurveTo((k.A.x + T.x) / 2, k.A.y - 80 + Math.sin(agora * 0.01) * 10, (k.A.x + T.x) / 2, T.y + 60, T.x, T.y);
        g.stroke();
      },
    });
    await k.esperar(450);
  } else if (k.spec.motion === "cai" || /pó |pó$|esporos|cai como chuva/.test(n)) {
    // pó caindo sobre o alvo
    let acum = 0;
    k.desenho({
      camada: 3,
      dur: 700,
      tick: (_t, dt) => {
        acum += dt;
        while (acum > 18) {
          acum -= 18;
          k.part({ x: d.x + (k.r() - 0.5) * T.w * 1.2, y: T.y - T.h * 0.8, vy: 60 + k.r() * 40, vx: (k.r() - 0.5) * 20, vida: 700, s0: 2 + k.r() * 2, forma: forma === "semente" ? "semente" : "poeira", c: k.cor(Math.floor(k.r() * 2)), c2: k.pal.secondary, camada: 3, brilho: 0.9, a0: 0.9 });
        }
      },
    });
    await k.esperar(500);
  } else if (/vácuo|engole o campo/.test(n)) {
    for (const an of k.Ts) for (let i = 0; i < 3; i++) k.anel(an.x, an.y, { r0: an.w * 1.4, r1: 2, ms: 600 + i * 120, cor: "#1A0A20", larg: 8 });
    k.tinta("#0A0010", 0.4, 900);
    await k.esperar(500);
  } else if (forma === "anel") {
    for (let i = 0; i < 4; i++) {
      void k.voar({ de: boca(k), para: d, ms: 460, forma: "anel", tam: 7 + i * 3, cor: k.cor(i), rastro: 0 });
      await k.esperar(90);
    }
    await k.esperar(380);
    for (let i = 0; i < 3; i++) k.anel(T.x, T.y, { r1: T.w * (0.5 + i * 0.2), ms: 500, cor: k.pal.primary, larg: 2 });
  } else if (forma === "faisca") {
    k.feixe({ de: boca(k), para: d, ms: 420, larg: 3, zigue: true });
    await k.esperar(380);
  } else if (k.spec.motion === "orbita") {
    await k.voar({ de: boca(k), para: d, ms: 420, forma, tam: 8, mov: "zigue" });
    const q = 5;
    k.desenho({
      camada: 3,
      dur: 800,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        for (let i = 0; i < q; i++) {
          const a = (i * TAU) / q + agora * 0.006;
          g.setTransform(dpr, 0, 0, dpr, T.x + Math.cos(a) * T.w * 0.6, T.y + Math.sin(a) * T.h * 0.2);
          g.globalAlpha = Math.min(1, (1 - t) * 3);
          drawForma(g, forma, 7 * k.u, k.pal.primary, k.pal.secondary, agora);
        }
      },
    });
    await k.esperar(300);
  } else {
    const q = forma === "coracao" || forma === "nota" ? 5 : forma === "caveira" ? 1 : 3;
    for (let i = 0; i < q; i++) {
      void k.voar({ de: boca(k), para: { x: d.x + (k.r() - 0.5) * T.w * 0.4, y: d.y + (k.r() - 0.5) * T.h * 0.3 }, ms: 480, forma: forma === "caveira" ? "orbe" : forma, tam: forma === "fumaca" ? 10 : 7, cor: forma === "nota" ? ARCOIRIS[i % 7] : k.cor(i), mov: forma === "semente" ? "arco" : k.spec.motion, rastro: 0.5 });
      await k.esperar(80);
    }
    await k.esperar(400);
    if (forma === "caveira" && !k.errou) {
      k.explosao(T.x, T.y, { n: 12, forma: "bolha", cor: "#5A1F6A", cor2: "#D898D8", vel: [20, 70], tam: [4, 8], brilho: 0 });
      k.part({ x: T.x, y: T.y - T.h * 0.3, vy: -20, vida: k.ms(900), s0: 8, s1: 12, forma: "caveira", c: "#2A0A30", c2: "#E8D8F0", camada: 4 });
    }
    if (forma === "semente" && !k.errou) vinhas(k, T);
  }
  k.fase("impact");
  if (k.errou) k.esquiva(T);
  else if (k.resultado === "noEffect") k.explosao(T.x, T.y, { n: 6, forma: "fumaca", cor: "#9A9AA6", vel: [10, 40], tam: [4, 8], brilho: 0, a0: 0.5 });
  else {
    const alvos = /todos em campo/.test(n) ? [...k.Ts, k.A] : /alvos|campo adversário/.test(n) ? k.Ts : [T];
    for (const an of alvos) {
      if (st) k.statusPulso(an, st);
      if (st === "paralysis") k.mover(an, [{ transform: "translate(0,0)" }, { transform: "translate(2px,0)" }, { transform: "translate(-2px,0)" }, { transform: "translate(0,0)" }], 240, "steps(4)");
      if (st === "sleep") k.mover(an, [{ transform: "rotate(0)" }, { transform: `rotate(${k.dir * 8}deg)` }, { transform: "rotate(0)" }], 700);
    }
    for (const s of k.spec.stats ?? []) k.setas(T, s.stat, s.n);
    if (/drena o usuário/.test(n)) recoil(k);
  }
  k.fase("aftermath");
  await k.esperar(450);
}

function vinhas(k: Kit, an: Ancora) {
  k.desenho({
    camada: 4,
    dur: 900,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, an.x, pe(an));
      g.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
      g.strokeStyle = "#3E8E2F";
      g.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const s = i % 2 ? 1 : -1;
        const cresce = Math.min(1, t * 2.5);
        g.beginPath();
        g.moveTo(s * (i * 4), 0);
        g.bezierCurveTo(s * an.w * 0.5, -an.h * 0.3 * cresce, -s * an.w * 0.3, -an.h * 0.6 * cresce, s * an.w * 0.2, -an.h * 0.85 * cresce);
        g.stroke();
      }
    },
  });
}

// ---------- FIELD ----------

const LADO_DO_CAMPO: Partial<Record<Campo, "tudo" | "usuario" | "alvo">> = {
  chuva: "tudo",
  sol: "tudo",
  areia: "tudo",
  granizo: "tudo",
  neblina: "tudo",
  "trick-room": "tudo",
  gravity: "tudo",
  "magic-room": "tudo",
  "wonder-room": "tudo",
  spikes: "alvo",
  "toxic-spikes": "alvo",
  "stealth-rock": "alvo",
};

async function field(k: Kit) {
  const n = notas(k);
  const campo = k.spec.campo;
  k.fase("anticipation");
  if (/dança/.test(n)) k.mover(k.A, [{ transform: "rotate(0)" }, { transform: "rotate(-8deg) translate(0,-4px)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }], 700);
  else k.mover(k.A, [{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], 400);
  await k.esperar(220);
  k.fase("travel");
  if (k.spec.slug === "perish-song") return cancaoFinal(k);
  if (!campo) {
    // campos sem visual contínuo: Haze etc. Uma onda pelo campo.
    for (let i = 0; i < 3; i++) k.anel(k.A.x, k.A.y, { r1: 500, ms: 700, cor: k.cor(i), larg: 4, achata: 0.5 });
    await k.esperar(400);
    k.fase("impact");
    await k.esperar(300);
    return;
  }
  const lado = LADO_DO_CAMPO[campo] ?? "usuario";
  const chave = lado === "tudo" ? "tudo" : lado === "alvo" ? k.T.lado : k.A.lado;
  // entrada: o efeito se forma
  if (campo === "spikes" || campo === "toxic-spikes" || campo === "stealth-rock") {
    for (let i = 0; i < 5; i++) {
      void k.voar({ de: boca(k), para: { x: k.T.x + (i - 2) * k.T.w * 0.25, y: pe(k.T) }, ms: 420, forma: k.spec.shape, tam: 5, mov: "arco", altura: 60, giro: 6, rastro: 0 });
      await k.esperar(50);
    }
    await k.esperar(300);
  } else if (campo === "chuva") {
    k.tinta("#10182A", 0.25, 600);
    await k.esperar(200);
  } else if (campo === "sol") {
    k.clarao("#FFE08A", 0.3, 400);
  } else if (campo === "neblina") {
    for (const an of [k.A, ...k.Ts]) k.explosao(an.x, an.y, { n: 8, forma: "fumaca", cor: "#2A2440", vel: [20, 60], tam: [8, 14], fim: 1.6, vida: [800, 1100], brilho: 0, a0: 0.6 });
  } else if (campo === "protect" || campo === "reflect" || campo === "light-screen") {
    const an = k.A;
    const px = an.x + (an.lado === "meu" ? 1 : -1) * an.w * 0.65;
    for (let i = 0; i < 6; i++) k.part({ x: px + (k.r() - 0.5) * 80, y: an.y + (k.r() - 0.5) * 90, vx: 0, vy: 0, vida: k.ms(300), s0: 6, s1: 2, forma: "hexagono", c: k.pal.primary, c2: "#FFFFFF", camada: 3 });
    if (/olhos/.test(n)) olhosBrilham(k, "#FFFFFF");
  } else if (campo === "trevo" && /cura|time/.test(n)) {
    for (const an of [k.A, ...(k.ctx.aliados ?? [])]) {
      for (let i = 0; i < 3; i++) k.anel(an.x, an.y, { r1: an.w * (0.6 + i * 0.25), ms: 600, cor: /sino|dourad/.test(n) ? "#FFD84A" : "#7CF29A", larg: 2.5 });
      k.explosao(an.x, an.y, { n: 8, forma: /pétala/.test(n) ? "petala" : "brilho", cor: /dourad/.test(n) ? "#FFD84A" : "#9CFFB0", vel: [20, 80], grav: -40, tam: [3, 5] });
    }
  } else if (campo === "substituto") {
    k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: `translate(${-k.dir * 24}px,0)`, opacity: 0.5 }, { transform: "translate(0,0)", opacity: 1 }], 800);
    k.explosao(k.A.x, k.A.y, { n: 10, forma: "fumaca", cor: "#FFFFFF", vel: [20, 70], tam: [5, 9], brilho: 0, a0: 0.7 });
  } else if (campo === "holofote") {
    k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: "translate(0,-6px)" }, { transform: "translate(0,0)" }], 300);
  }
  k.m.definirCampo(chave, campo, k.ctx.manterCampo ? Infinity : k.ms(1600));
  k.fase("impact");
  if (campo === "neblina") for (const an of [k.A, ...k.Ts]) k.anel(an.x, an.y, { r1: an.w, ms: 500, cor: "#B8B0C8", larg: 2 });
  for (const s of k.spec.stats ?? []) k.setas(k.A, s.stat, s.n);
  k.fase("aftermath");
  await k.esperar(500);
}

async function cancaoFinal(k: Kit) {
  const todos = [k.A, ...k.Ts, ...(k.ctx.aliados ?? [])];
  for (let i = 0; i < 6; i++) {
    k.anel(k.m.largura / 2, k.m.altura / 2, { r1: k.m.largura * 0.7, ms: 900, cor: "#6A4A9A", larg: 2, achata: 0.5, camada: 2 });
    for (const an of todos) k.part({ x: an.x + (k.r() - 0.5) * an.w, y: an.y - an.h * 0.2, vy: -30, vida: k.ms(900), s0: 5, forma: "nota", c: "#B49CFF", c2: "#fff", camada: 4 });
    await k.esperar(110);
  }
  k.tinta("#1A0A2A", 0.35, 1400);
  k.fase("impact");
  for (const c of ["3", "2", "1"]) {
    for (const an of todos) k.texto(an.x, an.y - an.h * 0.65, c, "#E8DCFF", 9, 380);
    await k.esperar(300);
  }
  for (const an of todos) k.m.definirStatus(an.chave, k.ctx.manterCampo ? "perish" : null);
}

// ---------- HEAL ----------

async function heal(k: Kit) {
  const n = notas(k);
  const alvo = /aliado|cura o alvo/.test(n) ? k.T : k.A;
  k.fase("anticipation");
  if (/dorme|deitado|relaxa/.test(n)) {
    k.mover(alvo, [{ transform: "rotate(0)" }, { transform: `rotate(${k.dir * -10}deg) translate(0,4px)` }, { transform: `rotate(${k.dir * -10}deg) translate(0,4px)` }, { transform: "rotate(0)" }], 1200);
    for (let i = 0; i < 3; i++) k.part({ x: alvo.x + alvo.w * 0.2, y: alvo.y - alvo.h * 0.3, vx: 16, vy: -26, vida: k.ms(900 + i * 150), s0: 4 + i, s1: 7 + i, forma: "z", c: "#C8D6FF", camada: 4 });
  }
  if (/bolha/.test(n)) k.anel(alvo.x, alvo.y, { r0: alvo.w * 0.6, r1: alvo.w * 0.7, ms: 1100, cor: "#BFEFFF", larg: 3 });
  await k.esperar(200);
  k.fase("travel");
  const forma = k.spec.shape;
  const cor = k.pal.primary === PALETA_TIPO[k.tipo][0] && k.tipo === 0 ? "#9CFFB0" : k.pal.primary;
  if (k.spec.motion === "cai") {
    // luz que desce (lua, sol, estrela do desejo)
    k.feixe({ de: { x: alvo.x, y: -20 }, para: { x: alvo.x, y: alvo.y }, ms: 800, larg: alvo.w * 0.35, cor, cor2: "#FFFFFF" });
    if (forma !== "brilho") await k.voar({ de: { x: alvo.x - 60, y: -30 }, para: alvo, ms: 420, forma, tam: 9, mov: "cai", rastro: 2 });
    else await k.esperar(300);
  } else if (k.spec.motion === "orbita") {
    k.desenho({
      camada: 3,
      dur: 900,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        for (let i = 0; i < 3; i++) {
          g.setTransform(dpr, 0, 0, dpr, alvo.x, alvo.y + (i - 1) * alvo.h * 0.25);
          g.globalAlpha = Math.min(1, t * 4, (1 - t) * 3);
          g.strokeStyle = cor;
          g.lineWidth = 2.5;
          g.beginPath();
          g.ellipse(0, 0, alvo.w * 0.6, alvo.w * 0.15, Math.sin(agora * 0.004 + i) * 0.2, 0, TAU);
          g.stroke();
        }
      },
    });
    await k.esperar(300);
  } else if (/raízes/.test(n)) {
    k.desenho({
      camada: 1,
      dur: 900,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, alvo.x, pe(alvo));
        g.globalAlpha = Math.min(1, (1 - t) * 3);
        g.strokeStyle = "#5A3A1A";
        g.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.moveTo((i - 2) * 6, 0);
          g.quadraticCurveTo((i - 2) * 16, 10 * t, (i - 2) * 24, 18 * Math.min(1, t * 2));
          g.stroke();
        }
      },
    });
  } else if (forma === "ovo" || (forma === "gota" && /leite/.test(n))) {
    k.part({ x: alvo.x, y: alvo.y - alvo.h * 0.7, vy: 10, vida: k.ms(700), s0: 6, s1: 12, forma, c: k.pal.secondary, c2: k.pal.primary, camada: 4, brilho: 1, a0: 1, a1: 0 });
  }
  // partículas de luz convergindo
  const q = k.n(14);
  for (let i = 0; i < q; i++) {
    const a = k.r() * TAU;
    const d = alvo.w * (0.8 + k.r() * 0.6);
    const vida = k.ms(500 + k.r() * 200);
    k.part({ x: alvo.x + Math.cos(a) * d, y: alvo.y + Math.sin(a) * d * 0.7, vx: (-Math.cos(a) * d) / (vida / 1000), vy: (-Math.sin(a) * d * 0.7) / (vida / 1000), vida, s0: 4, s1: 2, forma: forma === "folha" ? "folha" : "brilho", c: i % 2 ? cor : "#FFFFFF", c2: "#FFFFFF", camada: 3, brilho: 1 });
  }
  await k.esperar(450);
  k.fase("impact");
  k.mover(alvo, [{ filter: "brightness(1)" }, { filter: "brightness(1.7) saturate(1.3)" }, { filter: "brightness(1)" }], 500);
  k.anel(alvo.x, alvo.y, { r1: alvo.w * 0.9, ms: 500, cor, larg: 3 });
  for (let i = 0; i < 6; i++) k.part({ x: alvo.x + (k.r() - 0.5) * alvo.w, y: alvo.y + alvo.h * 0.3, vy: -60, vida: k.ms(700), s0: 3, forma: "brilho", c: "#FFFFFF", c2: cor, camada: 4, brilho: 0.8 });
  k.fase("aftermath");
  await k.esperar(380);
}

// ---------- DRAIN ----------

async function drain(k: Kit) {
  const n = notas(k);
  const T = k.T;
  const contato = /soco|perfura|mordida|chifre/.test(n);
  if (contato) {
    await investir(k, { ms: 480 });
    if (!k.errou) golpeNoAlvo(k, /soco/.test(n) ? "soco" : /mordida/.test(n) ? "mordida" : "bicada", T.x, T.y, T);
  } else {
    k.fase("anticipation");
    k.brilho(T.x, T.y, T.w * 0.7, k.pal.primary, 400);
    await k.esperar(260);
  }
  await k.impacto(T, { escala: 0.7 });
  if (k.errou || k.resultado === "noEffect") return k.esperar(300);
  k.fase("travel");
  // fios do alvo para o usuário
  const q = k.n(12);
  const forma = k.spec.shape === "gota" ? "gota" : k.spec.shape === "bolha" ? "bolha" : k.spec.shape === "folha" ? "folha" : "brilho";
  for (let i = 0; i < q; i++) {
    void k.voar({ de: { x: T.x + (k.r() - 0.5) * T.w * 0.5, y: T.y + (k.r() - 0.5) * T.h * 0.4 }, para: { x: k.A.x, y: k.A.y }, ms: 520 + k.r() * 120, forma, tam: 4, cor: k.cor(i), mov: "teleguiado", rastro: 0.6, brilho: 1 });
    await k.esperar(35);
  }
  k.mover(T, [{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], 500, "linear");
  await k.esperar(480);
  k.mover(k.A, [{ filter: "brightness(1)" }, { filter: "brightness(1.6)" }, { filter: "brightness(1)" }], 420);
  k.anel(k.A.x, k.A.y, { r1: k.A.w * 0.8, ms: 420, cor: k.pal.primary, larg: 3 });
  k.fase("aftermath");
  await k.esperar(300);
}

// ---------- TRAP ----------

async function trap(k: Kit) {
  const n = notas(k);
  const T = k.T;
  const forma = k.spec.shape;
  k.fase("anticipation");
  recuo(k, 5);
  await k.esperar(180);
  k.fase("travel");
  const d = k.destino(T);
  if (forma === "teia") {
    await k.voar({ de: boca(k), para: d, ms: 380, forma: "teia", tam: 10, giro: 3, rastro: 0 });
  } else if (forma === "pedra" && k.spec.motion === "cai") {
    for (let i = 0; i < 5; i++) {
      void k.voar({ de: { x: d.x + (i - 2) * T.w * 0.3, y: -30 }, para: { x: d.x + (i - 2) * T.w * 0.3, y: pe(T) - 6 }, ms: 360, forma: "pedra", tam: 9, mov: "cai", giro: 3 });
      await k.esperar(70);
    }
    await k.esperar(300);
  } else if (forma !== "concha" && forma !== "anel") {
    await k.voar({ de: boca(k), para: d, ms: 360, forma, tam: 7, rastro: 1.2 });
  }
  if (k.errou) {
    await k.impacto(T);
    return;
  }
  await k.impacto(T, { escala: 0.7, semAnel: true });
  const dur = 1300;
  if (forma === "concha") {
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        const fecha = 0.5 + 0.5 * Math.cos(t * Math.PI * 4);
        g.globalAlpha = Math.min(1, t * 6, (1 - t) * 4);
        for (const s of [-1, 1]) {
          g.setTransform(dpr, 0, 0, dpr, T.x, T.y + s * T.h * (0.15 + fecha * 0.25));
          g.scale(1, -s);
          drawForma(g, "concha", T.w * 0.5, k.pal.primary, k.pal.secondary, agora);
        }
      },
    });
  } else if (forma === "anel") {
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        const aperta = 1 - 0.18 * Math.abs(Math.sin(t * Math.PI * 3));
        g.setTransform(dpr, 0, 0, dpr, T.x, T.y);
        g.globalAlpha = Math.min(1, t * 6, (1 - t) * 4);
        g.strokeStyle = /faixa|cordas/.test(n) ? "#E8D8A8" : k.pal.primary;
        g.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.ellipse(0, (i - 1) * T.h * 0.25, T.w * 0.5 * aperta, T.w * 0.13, 0.15, 0, TAU);
          g.stroke();
        }
      },
    });
  } else if (forma === "teia") {
    teiaSobre(k, T);
    if (k.tipo === 3) for (let i = 0; i < 3; i++) k.statusPulso(T, "paralysis");
  } else if (!(forma === "pedra" && k.spec.motion === "cai")) {
    // redemoinho que fica girando
    const q = k.n(30);
    const corpos = Array.from({ length: q }, (_, i) => ({ a: (i / q) * TAU * 3, h: i / q }));
    k.desenho({
      camada: 3,
      dur,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        const pulso = 1 + 0.12 * Math.sin(t * Math.PI * 6);
        for (const c of corpos) {
          const a = c.a + agora * 0.012;
          const r = T.w * (0.3 + c.h * 0.4) * pulso;
          g.setTransform(dpr, 0, 0, dpr, T.x + Math.cos(a) * r, pe(T) - c.h * T.h * 1.1 + Math.sin(a) * r * 0.22);
          g.globalAlpha = Math.min(1, t * 5, (1 - t) * 4) * (Math.sin(a) > 0 ? 1 : 0.5);
          drawForma(g, forma === "fumaca" ? "poeira" : forma, (6 + k.tier * 1.5) * k.u, k.cor(Math.floor(c.h * 3)), k.pal.secondary, agora);
        }
      },
    });
  }
  k.tremer(T, 2, dur * 0.8);
  for (const s of k.spec.stats ?? []) k.setas(T, s.stat, s.n);
  k.fase("aftermath");
  await k.esperar(dur * 0.9);
}

// ---------- SACRIFICE ----------

async function sacrifice(k: Kit) {
  const n = notas(k);
  const A = k.A;
  k.fase("anticipation");
  const explode = /explode|explosão/.test(n);
  const dissolve = /dissolve|desaparece em poeira|luz rosa/.test(n);
  k.tinta(dissolve ? "#2A1040" : "#000000", 0.35, 1600);
  k.mover(A, [{ transform: "scale(1)", filter: "brightness(1)" }, { transform: `scale(${explode ? 1.3 : 1.05})`, filter: "brightness(2.4)" }, { transform: `scale(${explode ? 1.3 : 1.05})`, filter: "brightness(2.4)" }], 700, "ease-in");
  await carregar(k, 600, k.pal.primary, "brilho", 60);
  k.fase("travel");
  if (explode) {
    k.mover(A, [{ opacity: 0 }, { opacity: 0 }], 900, "linear");
    k.clarao("#FFFFFF", 0.7, 300);
    k.hitstop(90);
    k.tremerTela(14, 600);
    const big = k.spec.slug === "explosion" ? 1.6 : 1.1;
    k.anel(A.x, A.y, { r1: 380 * big, ms: 600, cor: "#FFFFFF", larg: 10 });
    k.explosao(A.x, A.y, { n: 30, forma: "chama", cor: "#FF8A3D", cor2: "#FFF0A0", vel: [120 * big, 380 * big], tam: [6, 14], vida: [400, 800], brilho: 1.2 });
    k.explosao(A.x, A.y, { n: 16, forma: "fumaca", cor: "#6A6070", vel: [40, 140], tam: [10, 18], vida: [700, 1200], brilho: 0, fim: 1.6, a0: 0.7 });
    await k.esperar(150);
    for (const an of k.Ts) await k.impacto(an);
  } else if (dissolve) {
    k.mover(A, [{ opacity: 1 }, { opacity: 0 }, { opacity: 0 }, { opacity: 1 }], 1500, "linear");
    for (let i = 0; i < k.n(24); i++) k.part({ x: A.x + (k.r() - 0.5) * A.w, y: A.y + (k.r() - 0.5) * A.h, vy: -60 - k.r() * 60, vx: (k.r() - 0.5) * 30, vida: k.ms(1100), s0: 4, s1: 1, forma: /lua/.test(n) ? "lua" : "brilho", c: k.pal.primary, c2: "#FFFFFF", camada: 4, brilho: 1.2 });
    k.fase("impact");
    await k.esperar(700);
  } else {
    // Memento / Final Gambit: a vida vai num golpe e o usuário cai
    if (/se joga/.test(n)) await investir(k, { ms: 420 });
    else await k.voar({ de: A, para: k.destino(k.T), ms: 420, forma: "orbe", tam: 14, cor: k.pal.primary, rastro: 2 });
    await k.impacto(k.T, { escala: 1.3 });
    for (const s of k.spec.stats ?? []) k.setas(k.T, s.stat, s.n);
    k.mover(A, [{ opacity: 1, transform: "translate(0,0)" }, { opacity: 0, transform: "translate(0,20px)" }, { opacity: 0 }, { opacity: 1, transform: "translate(0,0)" }], 1200, "ease-in");
  }
  k.fase("aftermath");
  await k.esperar(500);
}

// ---------- OHKO ----------

async function ohko(k: Kit) {
  const T = k.T;
  const s = k.spec.slug;
  k.fase("anticipation");
  k.tinta(s === "sheer-cold" ? "#FFFFFF" : "#05030A", s === "sheer-cold" ? 0.45 : 0.6, 2000);
  // vinheta que fecha no alvo
  k.desenho({
    camada: 0,
    dur: 1500,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gr = g.createRadialGradient(T.x, T.y, T.w * (1.6 - t), T.x, T.y, T.w * 4);
      gr.addColorStop(0, "#00000000");
      gr.addColorStop(1, "#000000");
      g.globalAlpha = 0.5 * Math.sin(t * Math.PI);
      g.fillStyle = gr;
      g.fillRect(0, 0, k.m.largura, k.m.altura);
    },
  });
  k.brilho(k.A.x, k.A.y, k.A.w, k.pal.primary, 700);
  k.tremer(k.A, 2, 600);
  await k.esperar(650);
  k.fase("travel");
  if (k.errou) {
    await k.impacto(T);
    return k.esperar(400);
  }
  if (s === "fissure") {
    k.tremerTela(14, 900);
    k.desenho({
      camada: 1,
      dur: 1200,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, T.x, pe(T));
        const abre = t < 0.6 ? t / 0.6 : 1 - (t - 0.6) / 0.4;
        g.globalAlpha = 1;
        g.fillStyle = "#0A0505";
        g.beginPath();
        g.moveTo(-T.w, 0);
        for (let i = 0; i <= 8; i++) g.lineTo(-T.w + (i * T.w * 2) / 8, (i % 2 ? 6 : -4) * abre);
        for (let i = 8; i >= 0; i--) g.lineTo(-T.w + (i * T.w * 2) / 8, (i % 2 ? 26 : 34) * abre);
        g.closePath();
        g.fill();
      },
    });
    k.mover(T, [{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(0,${T.h * 0.8}px)`, opacity: 0 }, { transform: "translate(0,0)", opacity: 0 }, { transform: "translate(0,0)", opacity: 1 }], 1400, "ease-in");
    await k.esperar(500);
  } else if (s === "guillotine") {
    for (const sd of [-1, 1])
      k.desenho({
        camada: 3,
        dur: 520,
        draw: (g, t, agora) => {
          const dpr = k.m.dprAtual;
          const f = Math.min(1, t * 2.4);
          g.setTransform(dpr, 0, 0, dpr, T.x + sd * T.w * (1 - f) * 0.9, T.y);
          g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
          g.scale(sd, 1);
          g.rotate(-0.4 + f * 0.4);
          drawForma(g, "lamina", T.w * 0.6, "#E8E8F0", "#FFFFFF", agora);
        },
      });
    await k.esperar(230);
    k.cortes(T, "#FFFFFF");
  } else if (s === "horn-drill") {
    await investir(k, { ms: 420 });
    for (let i = 0; i < 5; i++) k.anel(T.x, T.y, { r1: 12 + i * 10, ms: 400 + i * 60, cor: "#FFFFFF", larg: 3, achata: 0.4 });
  } else {
    // Sheer Cold: o alvo vira um bloco de gelo gigante
    k.desenho({
      camada: 4,
      dur: 1300,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        const f = Math.min(1, t * 3);
        g.setTransform(dpr, 0, 0, dpr, T.x, T.y);
        g.globalAlpha = t > 0.8 ? (1 - t) * 5 * 0.7 : 0.7;
        g.fillStyle = "#CFF4FF";
        g.strokeStyle = "#FFFFFF";
        g.lineWidth = 2;
        g.beginPath();
        g.rect(-T.w * 0.75 * f, -T.h * 0.8 * f, T.w * 1.5 * f, T.h * 1.5 * f);
        g.fill();
        g.stroke();
      },
    });
    k.explosao(T.x, T.y, { n: 20, forma: "cristal", cor: "#E0F8FF", vel: [80, 220], tam: [3, 7], grav: 120 });
    await k.esperar(380);
  }
  k.hitstop(110);
  k.clarao("#FFFFFF", 0.5, 220);
  await k.impacto(T, { escala: 1.5 });
  k.fase("aftermath");
  await k.esperar(500);
}

// ---------- SPECIAL (genérico por palavra-chave; os nomeados ficam em ESPECIAIS) ----------

async function special(k: Kit) {
  const n = notas(k);
  if (/aleatóri|roleta|executa outro|executa um golpe/.test(n)) return roleta(k);
  if (/troc|iguala|mistura|une/.test(n)) return troca(k);
  if (/cop|imita|reflete|rabisca/.test(n)) return copia(k);
  if (/muda de cor|cor\/textura|tipo/.test(n)) return mudaCor(k);
  if (/entrega|passa um bastão|item reaparece|rouba/.test(n)) return entrega(k);
  return mudaCor(k);
}

const RESERVA_ROLETA = new Set(["metronome", "assist", "sleep-talk", "nature-power", "copycat", "mirror-move", "me-first", "mimic", "sketch", "transform", "splash", "teleport", "perish-song", "explosion", "self-destruct", "memento", "healing-wish", "lunar-dance", "final-gambit"]);

function sorteio(k: Kit, filtro: (a: Arquetipo) => boolean) {
  const xs = todasAsSpecs().filter((s) => !RESERVA_ROLETA.has(s.slug) && filtro(s.archetype));
  return xs[Math.floor(k.r() * xs.length)] ?? specPorSlug("tackle")!;
}

async function roleta(k: Kit) {
  k.fase("anticipation");
  const n = notas(k);
  if (/dorme/.test(n)) for (let i = 0; i < 3; i++) k.part({ x: k.A.x + k.A.w * 0.2, y: k.A.y - k.A.h * 0.3, vx: 14, vy: -24, vida: k.ms(900 + i * 120), s0: 4 + i, forma: "z", c: "#C8D6FF", camada: 4 });
  if (/balança o dedo/.test(n)) k.mover(k.A, [{ transform: "rotate(0)" }, { transform: "rotate(-10deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-10deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(0)" }], 800, "linear");
  if (/silhuetas/.test(n)) imagensResiduais(k, k.A, 4);
  // ícones de tipo passando em roleta sobre o usuário
  const tipos = Array.from({ length: 10 }, () => Math.floor(k.r() * 18));
  k.desenho({
    camada: 4,
    dur: 800,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      const i = Math.floor(t * 10) % tipos.length;
      g.setTransform(dpr, 0, 0, dpr, sobre(k).x, sobre(k).y);
      g.globalAlpha = 1;
      drawForma(g, "orbe", 9 * k.u, PALETA_TIPO[tipos[i]][0], PALETA_TIPO[tipos[i]][1], agora);
      g.strokeStyle = "#FFFFFF";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 12 * k.u, 0, TAU);
      g.stroke();
    },
  });
  await k.esperar(820);
  const outro =
    k.spec.slug === "nature-power"
      ? specPorSlug(["seed-bomb", "hydro-pump", "earthquake", "tri-attack", "rock-slide"][Math.floor(k.r() * 5)])!
      : sorteio(k, (a) => a !== "SPECIAL" && a !== "SACRIFICE" && a !== "OHKO" && a !== "CHARGE");
  k.texto(sobre(k).x, sobre(k).y - 22 * k.u, outro.nome, "#FFFFFF", 6, 900);
  await k.tocarOutro(outro);
}

async function copia(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  // brilho espelhado varrendo o usuário
  k.desenho({
    camada: 4,
    dur: 600,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, k.A.x - k.A.w * 0.6 + t * k.A.w * 1.2, k.A.y);
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = Math.sin(t * Math.PI) * 0.6;
      g.fillStyle = "#E8F0FF";
      g.rotate(0.3);
      g.fillRect(-6, -k.A.h * 0.7, 12, k.A.h * 1.4);
    },
  });
  if (/caderno|rabisca/.test(n)) rabisco(k, k.A);
  if (/penas/.test(n)) k.explosao(k.A.x, k.A.y, { n: 8, forma: "pena", cor: "#E8E8F0", vel: [30, 90], tam: [3, 5], brilho: 0.3 });
  if (/onda psíquica|setas/.test(n)) {
    await k.voar({ de: k.T, para: k.A, ms: 400, forma: "anel", tam: 12, cor: k.pal.primary, rastro: 0 });
    for (const st of ["atk", "def"] as const) k.setas(k.A, st, 1);
  }
  if (/máscara|habilidade/.test(n)) await k.voar({ de: k.T, para: k.A, ms: 420, forma: "olho", tam: 9, cor: "#8CD2FF", mov: "arco" });
  await k.esperar(600);
  if (/psych|psych-up|role-play/.test(k.spec.slug) || /setas|habilidade/.test(n)) {
    k.fase("impact");
    return k.esperar(300);
  }
  const outro = sorteio(k, (a) => a === "PROJ" || a === "STRIKE" || a === "BEAM");
  k.texto(sobre(k).x, sobre(k).y - 22 * k.u, outro.nome, "#E8F0FF", 6, 900);
  k.mover(k.A, [{ filter: "grayscale(0)" }, { filter: "grayscale(1) brightness(1.3)" }, { filter: "grayscale(0)" }], 1200);
  await k.tocarOutro(outro);
}

function rabisco(k: Kit, an: Ancora) {
  const pts = Array.from({ length: 14 }, () => [(k.r() - 0.5) * an.w, (k.r() - 0.5) * an.h * 0.8]);
  k.desenho({
    camada: 4,
    dur: 700,
    draw: (g, t) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, an.x, an.y);
      g.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
      g.strokeStyle = "#2A2A3A";
      g.lineWidth = 1.5;
      g.beginPath();
      const ate = Math.floor(t * 1.4 * pts.length);
      pts.slice(0, Math.min(pts.length, ate)).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    },
  });
}

async function mudaCor(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  const alvo = k.A;
  if (/massa|amorfa|remodela/.test(n)) {
    k.mover(alvo, [{ transform: "scale(1,1)", filter: "brightness(1)" }, { transform: "scale(1.3,.6)", filter: "brightness(2) sepia(1) hue-rotate(220deg) saturate(3)" }, { transform: "scale(.7,1.3)", filter: "brightness(2) sepia(1) hue-rotate(220deg) saturate(3)" }, { transform: "scale(1,1)", filter: "brightness(1)" }], 1300);
    await k.voar({ de: k.T, para: alvo, ms: 500, forma: "anel", tam: 14, cor: "#C8A0F0", rastro: 0 });
  } else {
    k.mover(alvo, [{ filter: "hue-rotate(0deg)" }, { filter: "hue-rotate(120deg) saturate(1.6)" }, { filter: "hue-rotate(240deg) saturate(1.6)" }, { filter: "hue-rotate(360deg)" }], 1100, "linear");
    // carrossel de tipos em volta
    const tipos = [0, 1, 2, 3, 4, 5, 10, 14];
    k.desenho({
      camada: 4,
      dur: 1100,
      draw: (g, t, agora) => {
        const dpr = k.m.dprAtual;
        tipos.forEach((tp, i) => {
          const a = (i * TAU) / tipos.length + agora * 0.004;
          g.setTransform(dpr, 0, 0, dpr, alvo.x + Math.cos(a) * alvo.w * 0.75, alvo.y + Math.sin(a) * alvo.h * 0.3);
          g.globalAlpha = Math.min(1, t * 5, (1 - t) * 4);
          drawForma(g, "orbe", 5 * k.u, PALETA_TIPO[tp][0], PALETA_TIPO[tp][1], agora);
        });
      },
    });
    if (/dança|notas/.test(n)) for (let i = 0; i < 4; i++) void k.voar({ de: alvo, para: k.T, ms: 600, forma: "nota", tam: 6, cor: ARCOIRIS[i], mov: "zigue", rastro: 0 });
  }
  await k.esperar(900);
  k.fase("impact");
  k.anel(alvo.x, alvo.y, { r1: alvo.w * 0.9, ms: 400, cor: k.pal.primary, larg: 3 });
  await k.esperar(300);
}

async function troca(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  const formaA: Forma = /coraç/.test(n) ? "coracao" : /itens|item/.test(n) ? "presente" : "orbe";
  const corA = /defesa|guard/.test(k.spec.slug) ? "#3C8CF0" : /power/.test(k.spec.slug) ? "#F0523C" : k.pal.primary;
  if (/fios|liga/.test(n) || /iguala|mistura|une/.test(n)) {
    k.feixe({ de: k.A, para: k.T, ms: 900, larg: 3, cor: corA, cor2: "#FFFFFF", onda: true });
    await k.esperar(300);
  }
  if (/fumaça|flash/.test(n)) {
    for (const an of [k.A, k.T]) k.explosao(an.x, an.y, { n: 8, forma: "fumaca", cor: k.tipo === 15 ? "#2E2238" : "#E8E0F0", vel: [20, 60], tam: [5, 9], brilho: 0, a0: 0.6 });
  }
  k.fase("travel");
  const ida = k.voar({ de: k.A, para: k.T, ms: 600, forma: formaA, tam: 7, cor: corA, mov: "arco", altura: 70, rastro: 1 });
  void k.voar({ de: k.T, para: k.A, ms: 600, forma: formaA, tam: 7, cor: k.pal.secondary, mov: "arco", altura: -70, rastro: 1 });
  if (/trocam de lugar|teletransporte/.test(n)) {
    for (const an of [k.A, ...(k.ctx.aliados ?? [])]) k.mover(an, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], 600, "linear");
  }
  await ida;
  k.fase("impact");
  for (const an of [k.A, k.T]) {
    k.anel(an.x, an.y, { r1: an.w * 0.7, ms: 400, cor: k.pal.primary, larg: 3 });
    if (/barras de vida/.test(n)) k.mover(an, [{ filter: "brightness(1)" }, { filter: "brightness(1.6)" }, { filter: "brightness(1)" }], 400);
  }
  await k.esperar(350);
}

async function entrega(k: Kit) {
  const n = notas(k);
  k.fase("anticipation");
  await k.esperar(150);
  k.fase("travel");
  if (/reciclagem|item reaparece/.test(n)) {
    k.desenho({
      camada: 4,
      dur: 900,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, k.A.x, k.A.y - k.A.h * 0.6);
        g.rotate(t * TAU);
        g.globalAlpha = Math.sin(t * Math.PI);
        g.strokeStyle = "#5BD16A";
        g.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.arc(0, 0, 13, (i * TAU) / 3, (i * TAU) / 3 + 1.6);
          g.stroke();
        }
      },
    });
    await k.esperar(600);
    k.part({ x: k.A.x, y: k.A.y - k.A.h * 0.6, vida: k.ms(600), s0: 2, s1: 8, forma: "presente", c: "#FF7EB6", c2: "#FFE14D", camada: 4 });
  } else if (/rouba|mão sombria/.test(n)) {
    await k.voar({ de: k.A, para: k.T, ms: 380, forma: "punho", tam: 9, cor: "#2E2238", cor2: "#000", rastro: 1.4 });
    await k.voar({ de: k.T, para: k.A, ms: 380, forma: "brilho", tam: 8, cor: "#FFE14D", rastro: 1 });
  } else {
    // bastão / presente em arco
    await k.voar({ de: k.A, para: /bastão/.test(n) ? { x: k.A.x - k.dir * 120, y: k.A.y } : k.T, ms: 620, forma: /bastão/.test(n) ? "agulha" : "presente", tam: 9, cor: "#FFE08A", cor2: "#FFFFFF", mov: "arco", altura: 90, giro: 10, rastro: 1.6 });
    if (/stats brilham/.test(n)) for (const st of ["atk", "def", "spe"] as const) k.setas(k.A, st, 1);
  }
  k.fase("impact");
  await k.esperar(350);
}

// ---------- golpes únicos ----------

const ESPECIAIS: Record<string, Runner> = {
  async splash(k) {
    k.fase("anticipation");
    for (let i = 0; i < 3; i++) {
      k.mover(k.A, [{ transform: "translate(0,0)" }, { transform: "translate(0,-26px)" }, { transform: "translate(0,0)" }], 300, "ease-out");
      k.explosao(k.A.x, pe(k.A), { n: 5, forma: "gota", cor: "#8CC8FF", grav: 500, vel: [60, 140], ang: [Math.PI * 1.15, Math.PI * 1.85], tam: [2, 4], brilho: 0 });
      await k.esperar(320);
    }
    k.fase("impact");
    k.part({ x: k.A.x, y: k.A.y - k.A.h * 0.2, vy: -10, vida: k.ms(900), s0: 6, s1: 10, forma: "fumaca", c: "#E8E8F0", camada: 4, a0: 0.6 });
    k.texto(sobre(k).x, sobre(k).y, "...", "#FFFFFF", 9, 900);
    await k.esperar(500);
  },
  async teleport(k) {
    k.fase("anticipation");
    for (let i = 0; i < 3; i++) k.anel(k.A.x, k.A.y, { r1: k.A.w * (0.6 + i * 0.3), ms: 600, cor: k.pal.primary, larg: 2 });
    k.mover(k.A, [{ opacity: 1, transform: "scale(1,1)" }, { opacity: 0, transform: "scale(.2,1.6)" }, { opacity: 0 }, { opacity: 1, transform: "scale(1,1)" }], 1500, "ease-in");
    for (let i = 0; i < k.n(18); i++) k.part({ x: k.A.x + (k.r() - 0.5) * k.A.w, y: k.A.y + (k.r() - 0.5) * k.A.h, vy: -80 - k.r() * 60, vida: k.ms(700), s0: 3, s1: 1, forma: "brilho", c: k.pal.primary, c2: "#FFFFFF", camada: 4, brilho: 1 });
    await k.esperar(500);
    k.fase("impact");
    await k.esperar(700);
  },
  async "tri-attack"(k) {
    await carregar(k, 220, "#FFFFFF", "brilho", 30);
    k.fase("travel");
    const cores = ["#E8443A", "#3C8CFF", "#FFE14D"];
    const d = k.destino(k.T);
    const o = boca(k);
    const ps = cores.map((c, i) => {
      const a = -Math.PI / 2 + (i * TAU) / 3;
      return k.voar({ de: { x: o.x + Math.cos(a) * 26, y: o.y + Math.sin(a) * 26 }, para: d, ms: 460, forma: "orbe", tam: 7, cor: c, cor2: "#FFFFFF", mov: "teleguiado", fase: a });
    });
    k.desenho({
      camada: 2,
      dur: 460,
      draw: (g, t) => {
        const dpr = k.m.dprAtual;
        g.setTransform(dpr, 0, 0, dpr, o.x + (d.x - o.x) * t, o.y + (d.y - o.y) * t);
        g.rotate(t * 8);
        g.globalAlpha = 0.6;
        g.strokeStyle = "#FFFFFF";
        g.lineWidth = 2;
        const r = 26 * (1 - t);
        g.beginPath();
        for (let i = 0; i < 3; i++) g.lineTo(Math.cos(-Math.PI / 2 + (i * TAU) / 3) * r, Math.sin(-Math.PI / 2 + (i * TAU) / 3) * r);
        g.closePath();
        g.stroke();
      },
    });
    await Promise.all(ps);
    for (const [i, c] of cores.entries()) k.anel(d.x, d.y, { r1: k.T.w * (0.4 + i * 0.15), ms: 380, cor: c, larg: 3 });
    await k.impacto(k.T);
    await k.esperar(320);
  },
  async present(k) {
    await carregar(k, 180, "#FF7EB6", "brilho", 24);
    k.fase("travel");
    const d = k.destino(k.T);
    await k.voar({ de: boca(k), para: d, ms: 520, forma: "presente", tam: 10, cor: "#FF7EB6", cor2: "#FFE14D", mov: "arco", altura: 90, giro: 6 });
    if (!k.errou && k.r() < 0.25) {
      k.fase("impact");
      k.explosao(d.x, d.y, { n: 14, forma: "petala", cor: "#9CFFB0", cor2: "#FFFFFF", vel: [40, 120], tam: [3, 6] });
      k.mover(k.T, [{ filter: "brightness(1)" }, { filter: "brightness(1.6)" }, { filter: "brightness(1)" }], 500);
    } else {
      k.explosao(d.x, d.y, { n: 16, forma: "estrela", cor: "#FFE14D", cor2: "#FF7EB6", vel: [100, 240], tam: [3, 6] });
      await k.impacto(k.T);
    }
    await k.esperar(380);
  },
  async "future-sight"(k) {
    await futuro(k, "olho");
  },
  async "doom-desire"(k) {
    await futuro(k, "orbe");
  },
  async "pain-split"(k) {
    k.fase("anticipation");
    k.feixe({ de: k.A, para: k.T, ms: 1100, larg: 3, cor: "#FF7EB6", cor2: "#FFFFFF", onda: true });
    await k.esperar(300);
    k.fase("travel");
    for (let i = 0; i < 3; i++) {
      for (const an of [k.A, k.T]) k.mover(an, [{ filter: "brightness(1)" }, { filter: "brightness(1.7)" }, { filter: "brightness(1)" }], 220);
      await k.esperar(220);
    }
    k.fase("impact");
    await k.esperar(300);
  },
  async transform(k) {
    await mudaCor(k);
  },
};

async function futuro(k: Kit, forma: Forma) {
  k.fase("anticipation");
  await carregar(k, 400, k.pal.primary, "brilho", 40);
  const T = k.T;
  const topo = { x: T.x, y: T.y - T.h * 1.1 };
  await k.voar({ de: boca(k), para: topo, ms: 500, forma, tam: 10, mov: "arco", altura: 60 });
  // fica pairando (o golpe chega "dois turnos depois")
  k.desenho({
    camada: 3,
    dur: 900,
    draw: (g, t, agora) => {
      const dpr = k.m.dprAtual;
      g.setTransform(dpr, 0, 0, dpr, topo.x, topo.y + Math.sin(agora * 0.006) * 4);
      g.globalAlpha = Math.min(1, (1 - t) * 3);
      drawForma(g, forma, 10 * k.u, k.pal.primary, k.pal.secondary, agora);
    },
  });
  await k.esperar(800);
  k.fase("travel");
  for (let i = 0; i < 5; i++) {
    k.feixe({ de: { x: topo.x + (i - 2) * 14, y: -10 }, para: { x: T.x + (i - 2) * 6, y: T.y }, ms: 360, larg: 5, cor: k.pal.primary, cor2: "#FFFFFF" });
    await k.esperar(40);
  }
  k.clarao(k.pal.secondary, 0.3, 200);
  await k.impacto(T, { escala: 1.3 });
  await k.esperar(350);
}

const RUNNERS: Record<Arquetipo, Runner> = {
  PROJ: proj,
  BEAM: beam,
  STRIKE: strike,
  MULTI: multi,
  AOE: aoe,
  CHARGE: charge,
  BUFF: buff,
  DEBUFF: debuff,
  STATUS: status,
  FIELD: field,
  HEAL: heal,
  DRAIN: drain,
  TRAP: trap,
  SACRIFICE: sacrifice,
  OHKO: ohko,
  SPECIAL: special,
};
