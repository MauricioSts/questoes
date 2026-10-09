// Receitas em pixel art para os golpes que não têm folha do DP nem receita reaproveitada.
// Usam só as peças de tools/pixel-kit.mjs (Px-*) e seguem o roteiro dos jogos de DS: a peça
// nasce, cresce em 2–3 quadros, a faísca de impacto estoura no alvo, a tela treme.
//
// Cada golpe é uma linha da tabela GOLPES: [modelo, opções]. Os modelos são funções que
// devolvem a receita (mesmo formato de tools/receitas.mjs). `cor` troca o tipo usado no
// recolor (padrão: o tipo do golpe; Normal fica sem recolor, branco/cinza como no DS).

const K = (...ks) => ({ keys: ks.map(([t, v, ease]) => (ease ? { t, v, ease } : { t, v })) });
const r = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const seq = (frames, fps = 12, loop = false) => ({ frames, fps, loop });
const fade = (len, entra = 3, sai = 6, max = 1) => K([0, 0], [entra, max], [Math.max(entra, len - sai), max], [len, 0]);
const L = (asset, anchor, start, end, o = {}) => ({ asset, anchor, start, end, ...o });
const viaja = (asset, start, len, o = {}) => {
  const { ease = "linear", fim = len + 4, tracks = {}, ...resto } = o;
  return L(asset, "user", start, start + fim, { to: "target", ...resto, tracks: { p: K([0, 0], [len, 1, ease]), ...tracks } });
};
const shake = (t, dur, amp) => ({ t, dur, amp });
const flash = (t, dur = 6, color = "#FFFFFF", alpha = 0.6) => ({ t, dur, color, alpha });
const tint = (start, end, color, alpha) => ({ start, end, color, alpha });

// tipos (índice de PALETA_TIPO)
const T = { normal: 0, fogo: 1, agua: 2, eletrico: 3, planta: 4, gelo: 5, luta: 6, veneno: 7, terra: 8, voador: 9, psiquico: 10, inseto: 11, pedra: 12, fantasma: 13, dragao: 14, sombrio: 15, aco: 16, fada: 17 };

// ---------- peças de montagem ----------

let semente = 1;
const sd = () => semente++;

// faísca de impacto do DS (estrela branca/amarela) no alvo
const imp = (t, o = {}) => L("Px-Impacto", o.anchor ?? "target", t, t + 12, { frameSeq: seq([0, 1, 2, 3], 20), keepColor: true, z: 3, tracks: { x: K([0, o.x ?? 0]), y: K([0, o.y ?? 0]), scale: K([0, o.esc ?? 1]) } });
// cintilâncias que espirram do ponto
const faiscas = (t, anchor = "target", o = {}) =>
  L("Px-Faisca", anchor, t, t + 4, { spawn: { count: o.n ?? 5, spread: o.spread ?? [5, 5], interval: 0, frames: [2, 3, 4], burst: o.burst ?? 1.8, life: o.life ?? 16, seed: sd() }, tracks: { y: K([0, o.y ?? 0]), alpha: fade(o.life ?? 16, 0, 6) }, z: 3 });
// onda de choque
const anel = (t, anchor = "target", o = {}) => L("Px-Anel", anchor, t, t + (o.dur ?? 15), { frameSeq: seq([0, 1, 2, 3, 4], o.fps ?? 20), tracks: { y: K([0, o.y ?? 0]), scale: K([0, o.esc ?? 1]), alpha: K([0, 1], [(o.dur ?? 15) - 3, 1], [o.dur ?? 15, 0]) }, z: o.z ?? 3, ...(o.blend ? { blend: o.blend } : {}) });
// a mão branca (0 punho, 1 tapa) vindo de lado e batendo
const mao = (t, f = 0, o = {}) =>
  L("Px-Mao", "target", t, t + 16, { frame: f, keepColor: true, z: 3, tracks: { x: K([0, (o.x ?? 0) - 18], [5, o.x ?? 0, "in"]), y: K([0, o.y ?? 0]), scale: K([0, 1.6], [5, 1, "in"], [9, 1.1], [16, 1]), alpha: K([0, 0], [2, 1], [12, 1], [16, 0]) } });
// esfera que junta energia no usuário (partículas entrando + esfera crescendo)
const juntar = (t, len = 22, o = {}) => [
  L("Px-Faisca", "user", t, t + len - 6, { spawn: { count: 8, spread: [30, 26], interval: 2, frames: [2, 3, 4], burst: -1.6, life: 14, seed: sd() }, tracks: { y: K([0, o.y ?? -6]), alpha: fade(14, 2, 4) } }),
  L("Px-Orbe", "user", t + 6, t + len, { frameSeq: seq([0, 1, 2, 3, 4], 14), tracks: { y: K([0, o.y ?? -6]) } }),
];

// ---------- modelos ----------

// investida (Tackle): o usuário avança, a faísca estoura, o alvo treme. n > 1: repete
function contato(o = {}) {
  const n = o.n ?? 1;
  const passo = 20;
  const layers = [];
  const hits = [];
  const actor = [];
  for (let i = 0; i < n; i++) {
    const t = (o.antes ?? 0) + i * passo;
    actor.push({ who: "user", t, kind: o.ator ?? (n > 1 ? "lunge" : "dash"), dur: n > 1 ? 16 : 22 });
    const h = t + (n > 1 ? 7 : 10);
    hits.push(h);
    layers.push(imp(h - 1, { x: n > 1 ? [-6, 6, 0, -4][i % 4] : 0, y: n > 1 ? [-4, 4, 0, 6][i % 4] : 0, esc: o.forte ? 1.4 : 1 }));
    if (o.forte) layers.push(anel(h, "target", { esc: 1.2 }));
    if (o.pedras) layers.push(L("Px-Pedra", "field-target", h, h + 4, { spawn: { count: 5, spread: [16, 2], interval: 0, frames: [0, 1], burst: 1.6, vy: -2.4, gravity: 0.25, life: 22, seed: sd() }, keepColor: true, z: 3 }));
  }
  if (o.vento) layers.push(L("Px-Vento", "user", o.antes ?? 0, (o.antes ?? 0) + 20, { frameSeq: seq([0, 1, 2, 3], 24, true), tracks: { scale: K([0, 1.6]), alpha: fade(20, 2, 6) }, z: 3 }));
  if (o.explode) layers.push(L("Px-Explosao", "target", hits[0], hits[0] + 30, { frameSeq: seq(r(0, 6), 14), keepColor: true, z: 3 }));
  const ultimo = hits[hits.length - 1];
  return {
    duration: ultimo + 26,
    layers: [...(o.layersAntes ?? []), ...layers],
    hits,
    actor: [...(o.actorAntes ?? []), ...actor],
    screen: {
      shake: o.forte ? [shake(hits[0], 18, 4)] : n > 2 ? [] : [shake(hits[0], 8, 1)],
      ...(o.flash ? { flash: [flash(hits[0] - 1, 6, "#FFFFFF", 0.5)] } : {}),
      ...(o.escurece ? { tint: [tint(0, ultimo + 20, o.escurece, 0.4)] } : {}),
    },
  };
}

// carga (Skull Bash, Sky Attack, Bide): junta energia piscando e depois investe
function carga(o = {}) {
  const base = contato({ ...o, antes: 30, forte: o.forte ?? true });
  base.layers.unshift(...juntar(0, 28), L("Px-Pulso", "user", 18, 32, { frameSeq: seq([0, 1, 2, 3], 16, true), tracks: { alpha: fade(14, 2, 3) } }));
  base.actor.unshift({ who: "user", t: 4, kind: "shake", dur: 22 });
  return base;
}

// tapa/soco: a mão aparece no alvo e bate
function golpe(o = {}) {
  const n = o.n ?? 1;
  const gap = o.gap ?? 14;
  const layers = [];
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = 4 + i * gap;
    const x = n > 1 ? [-8, 8, -4, 6][i % 4] : 0;
    const y = n > 1 ? [-6, 2, 6, -2][i % 4] : 0;
    layers.push(mao(t, o.f ?? 0, { x, y }));
    layers.push(imp(t + 5, { x, y }));
    hits.push(t + 5);
  }
  if (o.anel) layers.push(anel(hits[0], "target", { esc: 1.2 }));
  if (o.coracao) layers.push(L("Px-Coracao", "target", hits[0], hits[0] + 30, { spawn: { count: 4, spread: [14, 6], interval: 3, frames: [0, 1], vy: -0.8, life: 22, seed: sd() }, keepColor: true, tracks: { y: K([0, -10]), alpha: fade(22, 2, 6) }, z: 4 }));
  if (o.faixa) layers.push(L("Px-Faixa", "target", hits[0], hits[0] + 28, { frameSeq: seq([0, 1, 2, 3, 2, 3], 14), tracks: { alpha: fade(28, 2, 6) }, z: 3 }));
  return { duration: hits[hits.length - 1] + 22, layers, hits, actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }], screen: { shake: [shake(hits[0], 8, o.forte ? 3 : 1)] } };
}

// palmas (Fake Out): duas mãos abertas se fecham no alvo
function palmas() {
  return {
    duration: 40,
    layers: [
      L("Px-Mao", "target", 2, 20, { frame: 1, keepColor: true, z: 3, tracks: { x: K([0, -34], [10, -7, "in"], [18, -7]), alpha: fade(18, 2, 4) } }),
      L("Px-Mao", "target", 2, 20, { frame: 1, keepColor: true, flipWithSide: false, z: 3, tracks: { x: K([0, 34], [10, 7, "in"], [18, 7]), alpha: fade(18, 2, 4) } }),
      imp(11),
      faiscas(11, "target", { n: 6 }),
    ],
    hits: [11],
    screen: { shake: [shake(11, 8, 2)], flash: [flash(10, 4)] },
  };
}

// chifre / bico / broca viajando até o alvo. broca: gira e acerta várias vezes
function chifre(o = {}) {
  const n = o.n ?? 1;
  const esc = o.esc ?? 1;
  const layers = [];
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = i * (o.gap ?? 10);
    layers.push(viaja("Px-Chifre", t, o.len ?? 10, { orient: true, ...(o.broca ? { frameSeq: seq([1, 2], 24, true) } : { frame: 0 }), fim: (o.len ?? 10) + (o.broca ? 14 : 3), tracks: { scale: K([0, esc]), x: K([0, n > 1 ? [-5, 5, 0, -3, 4][i % 5] : 0]), y: K([0, n > 1 ? [3, -3, 6, 0, -5][i % 5] : 0]) } }));
    const h = t + (o.len ?? 10);
    if (o.broca) for (let k = 0; k < 3; k++) hits.push(h + k * 5), layers.push(faiscas(h + k * 5, "target", { n: 3 }));
    else hits.push(h);
    layers.push(imp(h, { x: n > 1 ? [-5, 5, 0, -3, 4][i % 5] * 1.2 : 0, y: n > 1 ? [3, -3, 6, 0, -5][i % 5] : 0, esc: o.forte ? 1.4 : 1 }));
  }
  hits.sort((a, b) => a - b);
  return {
    duration: hits[hits.length - 1] + 24,
    layers,
    hits,
    actor: o.dash ? [{ who: "user", t: 0, kind: "dash", dur: 22 }] : [{ who: "user", t: 0, kind: "lunge", dur: 12 }],
    screen: { shake: [shake(hits[0], o.forte ? 16 : 8, o.forte ? 4 : 1)], ...(o.flash ? { flash: [flash(hits[0], 6)] } : {}) },
  };
}

// cortes em meia-lua. cruz: o segundo corte vem girado
function corte(o = {}) {
  const n = o.n ?? 1;
  const layers = [];
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = 4 + i * 14;
    const rot = o.cruz && i % 2 ? 90 : i % 2 ? 180 : 0;
    layers.push(L(o.garra ? "Px-Garra" : "Px-Corte", "target", t, t + 16, { frameSeq: seq(o.garra ? [0, 1, 2, 3] : [0, 1, 2, 3, 4], 24), tracks: { rot: K([0, rot]), scale: K([0, o.esc ?? 1]), alpha: K([0, 1], [12, 1], [16, 0]) }, z: 3 }));
    layers.push(faiscas(t + 6, "target", { n: 4 }));
    hits.push(t + 6);
  }
  if (o.cruz && n === 1) {
    layers.push(L("Px-Corte", "target", 10, 26, { frameSeq: seq([0, 1, 2, 3, 4], 24), tracks: { rot: K([0, 90]), scale: K([0, o.esc ?? 1]), alpha: K([0, 1], [12, 1], [16, 0]) }, z: 3 }));
    hits.push(16);
  }
  if (o.respingo) layers.push(L("Px-Gota", "target", hits[0], hits[0] + 4, { spawn: { count: 6, spread: [6, 6], interval: 0, frames: [0, 1], burst: 1.5, vy: -1.4, gravity: 0.18, life: 20, seed: sd() }, z: 3 }));
  return {
    duration: hits[hits.length - 1] + 22,
    layers,
    hits,
    actor: [{ who: "user", t: 0, kind: o.dash ? "dash" : "lunge", dur: o.dash ? 20 : 12 }],
    screen: { shake: [shake(hits[0], 8, o.esc > 1.2 ? 3 : 1)], ...(o.flash ? { flash: [flash(hits[0] - 1, 8, "#FFFFFF", 0.7)] } : {}) },
  };
}

// pinça: duas meias-luas se fechando (Vise Grip, Bug Bite, Guillotine)
function pinca(o = {}) {
  const fim = o.ohko ? 34 : 22;
  return {
    duration: fim + 30,
    layers: [
      L("Px-Corte", "target", 0, fim, { frame: 2, tracks: { x: K([0, -16], [fim - 8, -4, "in"], [fim, -4]), rot: K([0, 45]), scale: K([0, o.ohko ? 1.4 : 1]), alpha: fade(fim, 3, 3) }, z: 3 }),
      L("Px-Corte", "target", 0, fim, { frame: 2, tracks: { x: K([0, 16], [fim - 8, 4, "in"], [fim, 4]), rot: K([0, 225]), scale: K([0, o.ohko ? 1.4 : 1]), alpha: fade(fim, 3, 3) }, z: 3 }),
      imp(fim - 6, { esc: o.ohko ? 1.6 : 1 }),
      faiscas(fim - 6, "target", { n: 6 }),
      ...(o.respingo ? [L("Px-Gota", "target", fim - 6, fim, { spawn: { count: 6, spread: [6, 6], interval: 0, frames: [0, 1], burst: 1.5, vy: -1.4, gravity: 0.18, life: 20, seed: sd() }, z: 3 })] : []),
    ],
    hits: [fim - 6],
    actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }],
    screen: { shake: [shake(fim - 6, o.ohko ? 24 : 8, o.ohko ? 5 : 2)], ...(o.ohko ? { flash: [flash(fim - 7, 10, "#FFFFFF", 0.8)], tint: [tint(0, fim + 24, "#000000", 0.45)] } : {}) },
  };
}

// chicote / cauda / língua estalando no alvo
function chicote(o = {}) {
  const n = o.n ?? 1;
  const layers = [];
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = 2 + i * 14;
    layers.push(L("Px-Chicote", o.chao ? "field-target" : "target", t, t + 14, { frameSeq: seq([0, 1, 2], 20), tracks: { x: K([0, -14]), y: K([0, (o.chao ? -6 : 0) + (i % 2 ? 8 : -4)]), rot: K([0, i % 2 ? 18 : 0]), scale: K([0, o.esc ?? 1]), alpha: K([0, 1], [10, 1], [14, 0]) }, z: 3 }));
    layers.push(imp(t + 8, { y: (o.chao ? 16 : 0) + (i % 2 ? 6 : -4) }));
    hits.push(t + 8);
  }
  if (o.respingo) layers.push(L("Px-Gota", "target", hits[0], hits[0] + 4, { spawn: { count: 7, spread: [6, 6], interval: 0, frames: [0, 1], burst: 1.6, vy: -1.6, gravity: 0.2, life: 20, seed: sd() }, z: 3 }));
  if (o.faiscas) layers.push(faiscas(hits[0], "target", { n: 7 }));
  return { duration: hits[hits.length - 1] + 22, layers, hits, actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }], screen: { shake: [shake(hits[0], 8, o.forte ? 3 : 1)] } };
}

// osso batendo (Bone Club, Bone Rush) ou indo e voltando (Bonemerang)
function osso(o = {}) {
  if (o.volta) {
    return {
      duration: 70,
      layers: [
        L("Px-Osso", "user", 0, 56, { to: "target", keepColor: true, tracks: { p: K([0, 0], [18, 1, "out"], [24, 1], [46, 0, "in"]), rot: K([0, 0], [56, 1440]), alpha: K([0, 0], [2, 1], [50, 1], [56, 0]) }, arc: 20, z: 3 }),
        imp(18),
        imp(34),
      ],
      hits: [18, 34],
      screen: { shake: [shake(18, 8, 2)] },
    };
  }
  const n = o.n ?? 1;
  const layers = [];
  const hits = [];
  for (let i = 0; i < n; i++) {
    const t = i * 14;
    layers.push(L("Px-Osso", "target", t, t + 14, { keepColor: true, tracks: { x: K([0, -20], [7, -2, "in"]), y: K([0, -26 + i * 6], [7, -4 + i * 4, "in"]), rot: K([0, -80], [7, 20, "in"], [14, 30]), scale: K([0, 1.6]), alpha: K([0, 0], [2, 1], [10, 1], [14, 0]) }, z: 3 }));
    layers.push(imp(t + 7, { y: i * 4 - 4 }));
    hits.push(t + 7);
  }
  return { duration: hits[hits.length - 1] + 22, layers, hits, actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }], screen: { shake: [shake(hits[0], 8, 2)] } };
}

// projéteis (esfera, gota, pedra, vento...) do usuário ao alvo
const PECA = {
  orbe: { asset: "Px-Orbe", frame: 4 },
  orbeP: { asset: "Px-Orbe", frame: 3 },
  orbeG: { asset: "Px-Orbe", frame: 5 },
  pulso: { asset: "Px-Pulso", frameSeq: seq([0, 1, 2, 3], 16, true) },
  gota: { asset: "Px-Gota", frameSeq: seq([0, 1], 10, true) },
  pedra: { asset: "Px-Pedra", frames: [0, 1, 2], spin: 8 },
  pedraG: { asset: "Px-Pedra", frame: 2, spin: 10 },
  vento: { asset: "Px-Vento", frameSeq: seq([0, 1, 2, 3], 24, true) },
  fumaca: { asset: "Px-Fumaca", frameSeq: seq([0, 1, 2], 10) },
  brilho: { asset: "Px-Brilho", frameSeq: seq([1, 2, 3, 2], 16, true) },
  moeda: { asset: "Px-Moeda", frameSeq: seq([0, 1, 2, 3], 16, true), keepColor: true },
  faisca: { asset: "Px-Faisca", frameSeq: seq([2, 3, 4, 3], 20, true) },
};
function projetil(o = {}) {
  const p = PECA[o.peca ?? "orbe"];
  const n = o.n ?? 1;
  const len = o.len ?? 18;
  const gap = o.gap ?? 6;
  const esc = o.esc ?? 1;
  const layers = [];
  const hits = [];
  if (o.juntar) layers.push(...juntar(0, 20));
  const t0 = o.juntar ? 20 : 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * gap;
    const dx = n > 1 ? [0, -6, 6, -3, 4, -5, 3][i % 7] : 0;
    const dy = n > 1 ? [0, 5, -4, -6, 4, 2, -2][i % 7] : 0;
    layers.push(
      viaja(p.asset, t, len, {
        ...(p.frameSeq ? { frameSeq: p.frameSeq } : p.frames ? { spawn: { count: 1, spread: 0, interval: 0, frames: p.frames, spin: p.spin, seed: sd() } } : { frame: p.frame ?? 0 }),
        ...(p.keepColor ? { keepColor: true } : {}),
        arc: o.arc ?? 0,
        ease: o.ease ?? "linear",
        fim: len + 1,
        tracks: { x: K([0, dx]), y: K([0, dy]), scale: K([0, esc * 0.7], [len, esc]), ...(p.spin && !p.frames ? { rot: K([0, 0], [len, p.spin * len]) } : {}) },
        z: 3,
      })
    );
    const h = t + len;
    hits.push(h);
    if (o.impacto !== false) layers.push(imp(h, { x: dx, y: dy, esc: o.forte ? 1.3 : 1 }));
  }
  const h0 = hits[0];
  const hN = hits[hits.length - 1];
  if (o.anel) layers.push(anel(h0, "target", { esc: 1.2 }));
  if (o.respingo) layers.push(L("Px-Gota", "target", h0, hN + 2, { spawn: { count: 7, spread: [6, 6], interval: 1, frames: [0, 1], burst: 1.6, vy: -1.6, gravity: 0.2, life: 20, seed: sd() }, z: 3 }));
  if (o.nuvem) layers.push(L("Px-Fumaca", "target", h0, h0 + 30, { spawn: { count: 3, spread: [12, 8], interval: 4, life: 26, seed: sd() }, frameSeq: seq([0, 1, 2, 3, 4], 9), tracks: { alpha: K([0, 0.9], [26, 0.9]) }, z: 3 }));
  if (o.explode) layers.push(L("Px-Explosao", "target", h0, h0 + 30, { frameSeq: seq(r(0, 6), 14), keepColor: true, tracks: { scale: K([0, o.explode]) }, z: 3 }));
  if (o.raio) layers.push(L("Px-Raio", "target", h0, h0 + 16, { frameSeq: seq([0, 1, 2], 20, true), tracks: { y: K([0, -20]), scale: K([0, 0.6]), alpha: fade(16, 0, 4) }, z: 3 }));
  if (o.faiscas) layers.push(faiscas(h0, "target", { n: 7 }));
  return {
    duration: hN + (o.explode ? 32 : 20),
    layers,
    hits,
    react: o.status ? "status" : "hit",
    actor: [{ who: "user", t: t0, kind: "lunge", dur: 10 }],
    screen: { shake: o.status ? [] : [shake(h0, o.forte ? 18 : 8, o.forte ? 4 : 1)], ...(o.escurece ? { tint: [tint(0, hN + 16, o.escurece, 0.35)] } : {}), ...(o.flash ? { flash: [flash(h0, 6)] } : {}) },
  };
}

// feixe: uma fileira de gomos do usuário ao alvo, brilho na boca e anéis no alvo
function feixe(o = {}) {
  const ini = o.juntar ? 20 : 4;
  const dur = o.dur ?? 34;
  const esc = o.esc ?? 1;
  const layers = [
    ...(o.juntar ? juntar(0, 22) : []),
    L("Px-Feixe", "user", ini, ini + dur, { to: "target", orient: true, frameSeq: seq([0, 1], 20, true), spawn: { count: Math.ceil(dur / 1.5), spread: [0, 1], interval: 1.5, life: 10, seed: sd() }, tracks: { p: K([0, 0], [10, 1]), scale: K([0, esc * 0.8], [10, esc]) }, z: 2 }),
    L("Px-Pulso", "user", ini, ini + dur, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { x: K([0, 10]), y: K([0, -6]), scale: K([0, 0.7 * esc]), alpha: fade(dur, 2, 4) }, z: 3 }),
    L("Px-Pulso", "target", ini + 10, ini + dur + 8, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { scale: K([0, esc]), alpha: fade(dur - 2, 2, 6) }, z: 3 }),
    L("Px-Anel", "target", ini + 10, ini + dur + 8, { frameSeq: seq([0, 1, 2, 3, 4], 20, true), tracks: { scale: K([0, esc]), alpha: fade(dur - 2, 2, 6) }, z: 3 }),
    faiscas(ini + dur, "target", { n: 8, burst: 2.2 }),
  ];
  const hits = [ini + 10];
  if (o.multi) for (let t = ini + 20; t < ini + dur; t += 10) hits.push(t);
  return {
    duration: ini + dur + 26,
    layers,
    hits,
    react: o.status ? "status" : "hit",
    screen: {
      shake: [shake(ini + 10, dur, o.forte ? 4 : 2)],
      ...(o.forte ? { flash: [flash(ini + 8, 8, "#FFFFFF", 0.6)] } : {}),
      ...(o.escurece ? { tint: [tint(0, ini + dur + 20, o.escurece, o.forte ? 0.5 : 0.35)] } : {}),
    },
  };
}

// raio do céu (Thunder) ou faíscas elétricas (Thunder Shock, Thunderbolt)
function raio(o = {}) {
  const grande = o.grande;
  const layers = [
    L("Px-Raio", "target", 6, 30, { frameSeq: seq([0, 1, 2], 20, true), tracks: { y: K([0, grande ? -56 : -24]), scale: K([0, grande ? 1.6 : 1]), alpha: K([0, 1], [20, 1], [24, 0]) }, z: 3 }),
    faiscas(8, "target", { n: 8, burst: 2 }),
    L("Px-Faisca", "target", 8, 34, { frameSeq: seq([2, 3, 4, 3], 24, true), spawn: { count: 6, spread: [20, 20], interval: 3, life: 8, seed: sd() }, z: 4 }),
  ];
  if (o.cercar)
    layers.push(L("Px-Raio", "target", 10, 34, { frameSeq: seq([1, 2, 0], 20, true), spawn: { count: 4, spread: [24, 6], interval: 5, life: 8, seed: sd() }, tracks: { y: K([0, -10]), scale: K([0, 0.6]) }, z: 3 }));
  if (o.anel) layers.push(anel(10, "target", { dur: 20, fps: 14 }));
  return {
    duration: 54,
    layers,
    hits: [8],
    react: o.status ? "status" : "hit",
    screen: { shake: [shake(8, grande ? 24 : 12, grande ? 4 : 2)], flash: [flash(6, grande ? 10 : 5, "#FFFFFF", grande ? 0.8 : 0.4)], ...(grande ? { tint: [tint(0, 44, "#000010", 0.45)] } : {}) },
  };
}

// eletricidade em volta do usuário que corre até o alvo (Spark, Discharge, Volt Switch...)
function choque(o = {}) {
  const base = o.depois === "contato" ? contato({ antes: 18, forte: o.forte }) : null;
  const pre = [
    L("Px-Raio", "user", 0, 22, { frameSeq: seq([0, 1, 2], 20, true), spawn: { count: 4, spread: [22, 6], interval: 4, life: 8, seed: sd() }, tracks: { y: K([0, -8]), scale: K([0, 0.5]) }, z: 3 }),
    L("Px-Faisca", "user", 0, 22, { frameSeq: seq([2, 3, 4, 3], 24, true), spawn: { count: 8, spread: [26, 22], interval: 2, life: 8, seed: sd() }, z: 3 }),
  ];
  if (base) {
    base.layers.unshift(...pre);
    base.layers.push(faiscas(base.hits[0], "target", { n: 8 }));
    if (o.some) base.actor.push({ who: "user", t: base.hits[0] + 4, kind: "hide", dur: 24 });
    return base;
  }
  // em área: estoura em volta de cada alvo
  return {
    duration: 70,
    layers: [
      ...pre,
      L("Px-Raio", "target", 20, 50, { frameSeq: seq([2, 0, 1], 20, true), spawn: { count: 5, spread: [22, 6], interval: 5, life: 8, seed: sd() }, tracks: { y: K([0, -10]), scale: K([0, 0.7]) }, z: 3 }),
      anel(20, "user", { esc: 1.6, dur: 20, fps: 14 }),
      faiscas(24, "target", { n: 8 }),
      imp(24),
    ],
    hits: [24],
    screen: { shake: [shake(24, 20, 3)], flash: [flash(20, 6, "#FFFFFF", 0.5)] },
  };
}

// nuvem de gás/névoa no alvo, no usuário ou na tela toda
function nuvem(o = {}) {
  const onde = o.onde ?? "target";
  const ancora = onde === "tela" ? "screen-center" : onde;
  const spread = onde === "tela" ? [110, 50] : [18, 12];
  const layers = [];
  if (o.viaja) layers.push(viaja("Px-Fumaca", 0, 18, { frameSeq: seq([0, 1], 10), spawn: { count: 3, spread: [6, 6], interval: 4, life: 22, seed: sd() }, tracks: { alpha: fade(22, 2, 4, 0.9) }, fim: 30 }));
  const t0 = o.viaja ? 18 : 0;
  layers.push(
    L("Px-Fumaca", ancora, t0, t0 + 40, { frameSeq: seq([0, 1, 2, 3, 2, 3, 4], 8), spawn: { count: onde === "tela" ? 10 : 5, spread, interval: 3, life: 36, seed: sd(), vx: o.vx ?? 0.15, vy: o.vy ?? -0.1 }, tracks: { scale: K([0, onde === "tela" ? 1.6 : 1]), alpha: K([0, 0], [4, o.alpha ?? 0.9], [30, o.alpha ?? 0.9], [36, 0]) }, z: onde === "user" ? 1 : 4 })
  );
  if (o.gotas) layers.push(L("Px-Gota", "target", t0 + 12, t0 + 40, { spawn: { count: 6, spread: [18, 4], interval: 4, frames: [0, 1], vy: 1.4, life: 16, seed: sd() }, tracks: { y: K([0, -26]), alpha: fade(16, 2, 4) }, z: 4 }));
  if (o.brilhos) layers.push(L("Px-Brilho", ancora, t0 + 6, t0 + 40, { frameSeq: seq([0, 1, 2, 3], 14), spawn: { count: 5, spread: [22, 18], interval: 5, life: 14, seed: sd() }, z: 4 }));
  const status = o.status ?? onde !== "user";
  return {
    duration: t0 + 50,
    layers,
    hits: status ? [t0 + 10] : [],
    react: status ? "status" : "self",
    screen: o.escurece ? { tint: [tint(0, t0 + 46, o.escurece, 0.4)] } : {},
  };
}

// ondas que saem do usuário até o alvo (Psywave, Bug Buzz, Night Shade, Synchronoise)
function ondas(o = {}) {
  const n = o.n ?? 4;
  const noUsuario = o.onde === "user";
  const layers = [];
  for (let i = 0; i < n; i++) {
    const t = i * 6;
    if (noUsuario) layers.push(anel(t, "user", { esc: 1.6, dur: 18, fps: 16, z: 2 }));
    else layers.push(L("Px-Anel", "user", t, t + 22, { to: "target", frameSeq: seq([0, 1, 2], 10), tracks: { p: K([0, 0], [20, 1]), scale: K([0, 0.6], [20, 1.1]), alpha: K([0, 1], [18, 1], [22, 0]) }, z: 3 }));
  }
  const h = noUsuario ? 8 : 20;
  if (!noUsuario) layers.push(anel(h + 2, "target", { esc: 1.3, dur: 18 }));
  if (o.brilhos) layers.push(L("Px-Brilho", noUsuario ? "user" : "target", h, h + 30, { frameSeq: seq([0, 1, 2, 3], 14), spawn: { count: 5, spread: [24, 20], interval: 5, life: 14, seed: sd() }, z: 4 }));
  const fim = (n - 1) * 6 + 30;
  const self = o.self ?? noUsuario;
  return {
    duration: fim + 10,
    layers,
    hits: self ? [] : [h, ...(o.multi ? [h + 8, h + 16] : [])],
    react: self ? "self" : o.status ? "status" : "hit",
    screen: { ...(o.escurece ? { tint: [tint(0, fim + 6, o.escurece, 0.45)] } : {}), ...(self || o.status ? {} : { shake: [shake(h, 16, 2)] }) },
  };
}

// barreira no lado do usuário (Reflect, Light Screen, Protect...)
function barreira(o = {}) {
  return {
    duration: 66,
    layers: [
      L("Px-Escudo", "user", 0, 60, { frameSeq: seq([0, 1, 2, 3, 4, 5, 2, 2, 3, 4, 5], 14), tracks: { x: K([0, o.frente ? 26 : 0]), y: K([0, -4]), scale: K([0, o.esc ?? 1.2]), alpha: K([0, 0], [3, 0.85], [52, 0.85], [60, 0]) }, z: 3 }),
      L("Px-Faisca", "user", 10, 56, { frameSeq: seq([2, 3, 4, 3, 2], 16), spawn: { count: 6, spread: [24, 28], interval: 6, life: 12, seed: sd() }, tracks: { x: K([0, o.frente ? 26 : 0]) }, z: 4 }),
    ],
    react: "self",
    screen: { flash: [flash(8, 5, "#FFFFFF", 0.3)] },
  };
}

// brilhos subindo no usuário (cura, Refresh, Aromatherapy, Psych Up...)
function brilhos(o = {}) {
  const onde = o.onde ?? "user";
  const layers = [
    L("Px-Brilho", onde, 0, 44, { frameSeq: seq([0, 1, 2, 3], 14), spawn: { count: 8, spread: [24, 22], interval: 4, life: 14, seed: sd(), vy: o.cai ? 0.9 : -0.6 }, tracks: { y: K([0, o.cai ? -30 : 0]) }, z: 4 }),
    L("Px-Faisca", onde, 4, 48, { frameSeq: seq([1, 2, 3, 4, 3, 2], 14), spawn: { count: 8, spread: [26, 26], interval: 4, life: 12, seed: sd() }, z: 4 }),
  ];
  if (o.pulso) layers.push(L("Px-Pulso", onde, 0, 30, { frameSeq: seq([0, 1, 2, 3], 16, true), tracks: { scale: K([0, 0.4], [10, 1.6, "out"], [30, 1.8]), alpha: K([0, 0.8], [30, 0]) }, z: 1 }));
  if (o.anel) layers.push(anel(4, onde, { esc: 1.6, dur: 22, fps: 14, z: 1 }));
  if (o.notas) layers.push(L("Px-Faisca", onde, 0, 40, { frameSeq: seq([2, 3, 4], 12, true), orbit: { rx: 30, ry: 10, speed: 8 }, spawn: { count: 5, spread: 0, interval: 0 }, z: 4 }));
  const status = onde === "target";
  return {
    duration: 56,
    layers,
    hits: status ? [10] : [],
    react: status ? "status" : "self",
    actor: o.pisca ? [{ who: "user", t: 6, kind: "blink", dur: 30 }] : [],
    screen: o.escurece ? { tint: [tint(0, 52, o.escurece, 0.4)] } : {},
  };
}

// troca de algo entre usuário e alvo: duas esferas cruzando em arco
function troca(o = {}) {
  const fimCruz = 34;
  return {
    duration: 64,
    layers: [
      ...juntar(0, 14),
      L("Px-Orbe", "user", 14, 14 + fimCruz, { to: "target", frame: 4, arc: 30, tracks: { p: K([0, 0], [fimCruz, 1, "inout"]), alpha: fade(fimCruz, 2, 4) }, z: 3 }),
      ...(o.mao ? [] : [L("Px-Orbe", "target", 14, 14 + fimCruz, { to: "user", frame: 3, arc: -24, tracks: { p: K([0, 0], [fimCruz, 1, "inout"]), alpha: fade(fimCruz, 2, 4) }, z: 3 })]),
      L("Px-Brilho", "target", 14 + fimCruz - 4, 62, { frameSeq: seq([0, 1, 2, 3], 14), tracks: { y: K([0, -6]) }, z: 4 }),
      ...(o.mao ? [] : [L("Px-Brilho", "user", 14 + fimCruz - 4, 62, { frameSeq: seq([0, 1, 2, 3], 14), tracks: { y: K([0, -6]) }, z: 4 })]),
    ],
    hits: o.self ? [] : [14 + fimCruz - 2],
    react: o.self ? "self" : "status",
    screen: o.escurece ? { tint: [tint(0, 60, o.escurece, 0.35)] } : {},
  };
}

// prender: anel apertando o alvo (Wrap, Bind, Clamp) ou teia/areia
function prender(o = {}) {
  const peca = o.peca ?? "faixa";
  const layers = [];
  if (peca === "faixa") {
    for (const [y, t] of [
      [-12, 0],
      [0, 4],
      [12, 8],
    ])
      layers.push(L("Px-Faixa", "target", t, 54, { frameSeq: seq([0, 1, 2, 3, 2, 3, 2, 3], 10), tracks: { y: K([0, y]), alpha: fade(54 - t, 3, 6) }, z: 3 }));
  } else if (peca === "teia") {
    layers.push(viaja("Px-Teia", 0, 16, { frame: 0, fim: 16, tracks: { scale: K([0, 0.4], [16, 1]) }, z: 3 }));
    layers.push(L("Px-Teia", "target", 16, 60, { frame: 1, tracks: { scale: K([0, 0.6], [6, 1.1, "out"]), alpha: fade(44, 1, 8, 0.9) }, z: 4 }));
    if (o.faiscas) layers.push(L("Px-Faisca", "target", 18, 56, { frameSeq: seq([2, 3, 4, 3], 24, true), spawn: { count: 8, spread: [24, 24], interval: 3, life: 8, seed: sd() }, z: 4 }));
  } else {
    // areia girando em volta do alvo
    layers.push(L("Px-Pedra", "target", 0, 56, { frame: 0, keepColor: o.keepColor, spawn: { count: 10, spread: [0, 30], interval: 0, seed: sd() }, orbit: { rx: 30, ry: 10, speed: 14 }, tracks: { alpha: fade(56, 4, 8) }, z: 4 }));
    layers.push(L("Px-Fumaca", "field-target", 0, 56, { frameSeq: seq([1, 2, 3, 4], 6), spawn: { count: 4, spread: [26, 4], interval: 6, life: 30, seed: sd() }, tracks: { alpha: K([0, 0.8], [30, 0.8]) }, z: 4 }));
  }
  const hits = peca === "teia" ? [16] : [10, 24, 38];
  if (peca !== "teia") for (const h of hits) layers.push(faiscas(h, "target", { n: 3 }));
  return { duration: 66, layers, hits, react: o.status ? "status" : "hit", actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }] };
}

// dreno: esferas saem do alvo e voltam ao usuário (Leech Life)
function dreno() {
  return {
    duration: 76,
    layers: [
      L("Px-Corte", "target", 2, 14, { frame: 2, tracks: { rot: K([0, 45]), scale: K([0, 0.6]), alpha: fade(12, 1, 4) }, z: 3 }),
      imp(6),
      L("Px-Orbe", "target", 14, 60, { to: "user", frame: 2, arc: 20, spawn: { count: 6, spread: [10, 10], interval: 4, life: 24, seed: sd() }, tracks: { p: K([0, 0], [22, 1, "in"]), alpha: fade(24, 2, 4) }, z: 3 }),
      L("Px-Brilho", "user", 38, 70, { frameSeq: seq([0, 1, 2, 3], 14), spawn: { count: 4, spread: [18, 18], interval: 6, life: 14, seed: sd() }, z: 4 }),
    ],
    hits: [6],
    actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }],
    screen: { shake: [shake(6, 8, 1)] },
  };
}

// explosão (Self-Destruct, Explosion): clarão, bolas de fogo pelo campo, tela tremendo
function explosao(o = {}) {
  const grande = o.grande;
  return {
    duration: 96,
    layers: [
      L("Px-Pulso", "user", 0, 22, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { scale: K([0, 0.6], [22, 1.6, "in"]), alpha: K([0, 0.9]) } }),
      L("Px-Explosao", "user", 20, 56, { frameSeq: seq(r(0, 6), 14), keepColor: true, spawn: { count: grande ? 6 : 3, spread: [30, 22], interval: 4, life: 30, seed: sd() }, tracks: { scale: K([0, grande ? 1.3 : 1]) }, z: 3 }),
      L("Px-Explosao", "target", 26, 70, { frameSeq: seq(r(0, 6), 14), keepColor: true, spawn: { count: grande ? 6 : 4, spread: [30, 24], interval: 4, life: 30, seed: sd() }, tracks: { scale: K([0, grande ? 1.3 : 1]) }, z: 3 }),
      ...(grande ? [L("Px-Explosao", "screen-center", 30, 80, { frameSeq: seq(r(0, 6), 14), keepColor: true, spawn: { count: 6, spread: [100, 40], interval: 5, life: 30, seed: sd() }, z: 3 })] : []),
    ],
    hits: [30],
    screen: { flash: [flash(20, 10, "#FFFFFF", 0.9)], shake: [shake(20, 60, grande ? 7 : 5)], tint: [tint(0, 90, "#200000", 0.4)] },
    actor: [{ who: "user", t: 22, kind: "hide", dur: 70 }],
  };
}

// sacrifício suave (Memento, Healing Wish, Lunar Dance, Final Gambit)
function sacrificio(o = {}) {
  const base = o.cura ? brilhos({ cai: true, pulso: true, escurece: o.escurece }) : nuvem({ onde: "target", escurece: o.escurece ?? "#000000", alpha: 0.85 });
  base.actor = [...(base.actor ?? []), { who: "user", t: 20, kind: "hide", dur: 36 }];
  return base;
}

// área: peças chovendo/estourando sobre os alvos (Twister, Avalanche, Draco Meteor...)
function area(o = {}) {
  const p = o.peca ?? "pedra";
  const layers = [];
  const hits = [24, 36, 48];
  if (p === "vento") {
    layers.push(L("Px-Vento", "target", 0, 60, { frameSeq: seq([0, 1, 2, 3], 24, true), spawn: { count: 6, spread: [0, 30], interval: 2, life: 54, seed: sd() }, orbit: { rx: 26, ry: 8, speed: 12 }, tracks: { y: K([0, 10], [54, -14]), scale: K([0, o.esc ?? 1.2]), alpha: fade(54, 4, 8) }, z: 4 }));
    if (o.faiscas) layers.push(L("Px-Faisca", "target", 6, 58, { frameSeq: seq([2, 3, 4, 3], 20, true), spawn: { count: 10, spread: [30, 30], interval: 4, life: 10, seed: sd() }, z: 4 }));
  } else if (p === "explosao") {
    layers.push(L("Px-Explosao", "target", 12, 60, { frameSeq: seq(r(0, 6), 16), keepColor: true, spawn: { count: 5, spread: [26, 22], interval: 6, life: 28, seed: sd() }, tracks: { scale: K([0, o.esc ?? 0.7]) }, z: 3 }));
  } else if (p === "coluna") {
    // pilares subindo do chão do alvo (Pledges)
    layers.push(L("Px-Pulso", "field-target", 10, 60, { frameSeq: seq([0, 1, 2, 3], 18, true), spawn: { count: 12, spread: [20, 2], interval: 2, life: 22, seed: sd(), vy: -3 }, tracks: { alpha: fade(22, 2, 6) }, z: 3 }));
    layers.push(L("Px-Faisca", "field-target", 14, 60, { frameSeq: seq([2, 3, 4], 14), spawn: { count: 10, spread: [26, 4], interval: 3, life: 18, seed: sd(), vy: -2 }, z: 4 }));
  } else if (p === "faisca") {
    layers.push(L("Px-Faisca", "target", 6, 56, { frameSeq: seq([2, 3, 4, 3], 24, true), spawn: { count: 16, spread: [30, 30], interval: 2, life: 10, seed: sd() }, z: 4 }));
    layers.push(anel(10, "user", { esc: 1.4, dur: 20, fps: 14 }));
  } else if (p === "gota") {
    layers.push(L("Px-Gota", "target", 6, 50, { spawn: { count: 14, spread: [12, 8], interval: 2, frames: [0, 1], burst: 1.8, vy: -2, gravity: 0.2, life: 22, seed: sd() }, tracks: { scale: K([0, 1.4]) }, z: 3 }));
    layers.push(L("Px-Pulso", "target", 4, 30, { frameSeq: seq([0, 1, 2, 3], 18, true), tracks: { scale: K([0, 0.6], [12, 1.6, "out"]), alpha: K([0, 1], [26, 0]) }, z: 3 }));
  } else if (p === "chifre") {
    // pingentes/espinhos caindo de cima
    layers.push(L("Px-Chifre", "target", 4, 56, { frame: 0, spawn: { count: 6, spread: [26, 4], interval: 6, life: 16, seed: sd() }, tracks: { rot: K([0, 116]), y: K([0, -90], [12, -4, "in"]), scale: K([0, 1.2]), alpha: K([0, 1], [12, 1], [16, 0]) }, z: 3 }));
  } else {
    // pedras ou esferas (meteoros) caindo
    const asset = p === "orbe" ? "Px-Orbe" : "Px-Pedra";
    layers.push(L(asset, "target", 4, 56, { spawn: { count: o.n ?? 7, spread: [28, 4], interval: 6, life: 16, frames: p === "orbe" ? [4, 5] : [1, 2], spin: p === "orbe" ? 0 : 10, seed: sd() }, tracks: { x: K([0, 40], [12, 0, "in"]), y: K([0, -110], [12, 0, "in"]), scale: K([0, o.esc ?? 1.3]), alpha: K([0, 1], [12, 1], [16, 0]) }, z: 3 }));
    layers.push(L("Px-Impacto", "target", 16, 66, { frameSeq: seq([0, 1, 2, 3], 20), keepColor: true, spawn: { count: o.n ?? 7, spread: [28, 6], interval: 6, life: 12, seed: sd() }, z: 3 }));
    if (o.explode) layers.push(L("Px-Explosao", "target", 16, 70, { frameSeq: seq(r(0, 6), 16), keepColor: true, spawn: { count: 4, spread: [24, 10], interval: 10, life: 28, seed: sd() }, z: 3 }));
  }
  return {
    duration: 76,
    layers,
    hits,
    screen: { shake: [shake(hits[0], 40, o.forte ? 5 : 3)], ...(o.escurece ? { tint: [tint(0, 70, o.escurece, o.forte ? 0.5 : 0.35)] } : {}), ...(o.flash ? { flash: [flash(hits[0] - 2, 8)] } : {}) },
  };
}

// clima / campo na tela toda (Sandstorm, Hail, Tailwind, Defog, Gravity)
function clima(o = {}) {
  const p = o.peca ?? "pedra";
  const layers = [];
  if (p === "anel") {
    layers.push(L("Px-Anel", "screen-center", 0, 50, { frameSeq: seq([4, 3, 2, 1, 0], 10), spawn: { count: 3, spread: 0, interval: 12, life: 30, seed: sd() }, tracks: { scale: K([0, 4]), alpha: fade(30, 2, 6) }, z: 4 }));
  } else {
    const asset = { pedra: "Px-Pedra", orbe: "Px-Orbe", vento: "Px-Vento", faisca: "Px-Faisca" }[p];
    const quadros = { pedra: [0, 1], orbe: [1, 2], vento: [0, 1, 2, 3], faisca: [2, 3, 4] }[p];
    layers.push(L(asset, "screen-center", 0, 70, { spawn: { count: 28, spread: [140, 80], interval: 2, frames: quadros, life: 24, vx: o.vx ?? -4, vy: o.vy ?? 2, spin: p === "pedra" ? 10 : 0, seed: sd() }, keepColor: p === "pedra" && o.keepColor, tracks: { scale: K([0, o.esc ?? 1]), alpha: fade(24, 2, 4) }, z: 4 }));
  }
  return { duration: 80, layers, react: "self", screen: o.escurece ? { tint: [tint(0, 76, o.escurece, 0.35)] } : {} };
}

// corações (Attract, Lovely Kiss) e moedas (Pay Day)
function coracoes(o = {}) {
  return {
    duration: 70,
    layers: [
      viaja("Px-Coracao", 0, 22, { frame: 1, keepColor: true, arc: 16, spawn: { count: 3, spread: [6, 6], interval: 5, life: 26, seed: sd() }, tracks: { alpha: fade(26, 2, 4) }, fim: 36 }),
      L("Px-Coracao", "target", 24, 66, { frameSeq: seq([0, 1], 6, true), keepColor: true, spawn: { count: 6, spread: 0, interval: 0 }, orbit: { rx: 26, ry: 10, speed: 8 }, tracks: { y: K([0, -10]), alpha: fade(42, 3, 8) }, z: 4 }),
    ],
    hits: [24],
    react: o.dano ? "hit" : "status",
  };
}
function moedas() {
  const base = projetil({ peca: "moeda", n: 5, gap: 4, len: 16, arc: 18 });
  base.layers.push(L("Px-Moeda", "target", base.hits[0], base.hits[0] + 24, { frameSeq: seq([0, 1, 2, 3], 16, true), keepColor: true, spawn: { count: 6, spread: [6, 4], interval: 0, burst: 1.4, vy: -2, gravity: 0.25, life: 24, seed: sd() }, z: 3 }));
  return base;
}

// teletransporte (Teleport, Ally Switch)
function teleporte() {
  return {
    duration: 56,
    layers: [
      L("Px-Anel", "user", 0, 24, { frameSeq: seq([4, 3, 2, 1, 0], 14), tracks: { scale: K([0, 1.4]) }, z: 3 }),
      L("Px-Faisca", "user", 10, 50, { frameSeq: seq([2, 3, 4, 3], 14), spawn: { count: 8, spread: [10, 26], interval: 2, life: 14, vy: -2.4, seed: sd() }, z: 4 }),
    ],
    react: "self",
    actor: [{ who: "user", t: 14, kind: "hide", dur: 40 }],
    screen: { flash: [flash(14, 6, "#FFFFFF", 0.5)] },
  };
}

// prego da maldição (Curse) e laço sombrio (Destiny Bond)
function maldicao() {
  return {
    duration: 70,
    layers: [L("Px-Chifre", "user", 4, 40, { frame: 0, tracks: { rot: K([0, 116]), y: K([0, -70], [14, -10, "in"], [36, -10]), scale: K([0, 1.2]), alpha: fade(36, 2, 6) }, z: 3 }), imp(18, { anchor: "user" }), L("Px-Fumaca", "user", 18, 66, { frameSeq: seq([0, 1, 2, 3, 4], 8), spawn: { count: 3, spread: [16, 10], interval: 5, life: 30, vy: -0.6, seed: sd() }, tracks: { alpha: K([0, 0.8]) }, z: 4 })],
    react: "self",
    actor: [{ who: "user", t: 18, kind: "shake", dur: 16 }],
    screen: { tint: [tint(0, 66, "#100018", 0.5)] },
  };
}

// futuro (Future Sight, Doom Desire): esferas sobem do usuário e caem no alvo
function futuro(o = {}) {
  return {
    duration: 84,
    layers: [
      L("Px-Orbe", "user", 0, 30, { frame: 4, spawn: { count: 3, spread: [12, 4], interval: 4, life: 22, seed: sd() }, tracks: { y: K([0, 0], [20, -110, "in"]), alpha: fade(22, 2, 4) }, z: 3 }),
      L("Px-Orbe", "target", 40, 70, { frame: 5, spawn: { count: 3, spread: [12, 4], interval: 4, life: 16, seed: sd() }, tracks: { y: K([0, -110], [12, 0, "in"]), alpha: K([0, 1], [12, 1], [16, 0]) }, z: 3 }),
      anel(52, "target", { esc: 1.4, dur: 20 }),
      ...(o.explode ? [L("Px-Explosao", "target", 52, 82, { frameSeq: seq(r(0, 6), 14), keepColor: true, z: 3 })] : []),
    ],
    hits: [52],
    screen: { shake: [shake(52, 16, 3)], flash: [flash(50, 6)], tint: [tint(0, 80, "#100828", 0.35)] },
  };
}

// esferas em volta do usuário que disparam (Hidden Power, Judgment de pobre)
function orbitar(o = {}) {
  return {
    duration: 76,
    layers: [
      L("Px-Orbe", "user", 0, 30, { frame: 3, spawn: { count: 6, spread: 0, interval: 0 }, orbit: { rx: 30, ry: 12, speed: 10 }, tracks: { alpha: fade(30, 3, 2) }, z: 3 }),
      viaja("Px-Orbe", 30, 16, { frame: 3, spawn: { count: 6, spread: [12, 10], interval: 2, life: 18, seed: sd() }, fim: 30 }),
      L("Px-Impacto", "target", 46, 70, { frameSeq: seq([0, 1, 2, 3], 20), keepColor: true, spawn: { count: 6, spread: [16, 14], interval: 2, life: 12, seed: sd() }, z: 3 }),
    ],
    hits: [46, 52, 58],
    screen: { shake: [shake(46, 16, 2)] },
  };
}

// aura de raiva / resistência no usuário (Endure, Rage, Counter de espera)
function aura(o = {}) {
  return {
    duration: 50,
    layers: [
      L("Px-Pulso", "user", 0, 40, { frameSeq: seq([0, 1, 2, 3], 16, true), tracks: { scale: K([0, 1.8]), alpha: K([0, 0], [4, 0.75], [32, 0.75], [40, 0]) }, z: 1 }),
      L("Px-Faisca", "user", 4, 44, { frameSeq: seq([2, 3, 4, 3], 16), spawn: { count: 8, spread: [26, 6], interval: 4, life: 14, vy: -2, seed: sd() }, tracks: { y: K([0, 20]) }, z: 4 }),
    ],
    react: "self",
    actor: [{ who: "user", t: 4, kind: "shake", dur: 20 }],
  };
}

// cava (Dig): some no chão e sai embaixo do alvo
function cavar() {
  return {
    duration: 70,
    layers: [
      L("Px-Pedra", "field-user", 0, 6, { spawn: { count: 7, spread: [18, 2], interval: 0, frames: [0, 1], burst: 1.4, vy: -2.6, gravity: 0.25, life: 22, seed: sd() }, keepColor: true, z: 3 }),
      L("Px-Pedra", "field-target", 34, 40, { spawn: { count: 9, spread: [18, 2], interval: 0, frames: [0, 1, 2], burst: 1.6, vy: -3, gravity: 0.25, life: 24, seed: sd() }, keepColor: true, z: 3 }),
      imp(36, { esc: 1.3 }),
    ],
    hits: [36],
    actor: [{ who: "user", t: 2, kind: "hide", dur: 40 }],
    screen: { shake: [shake(4, 12, 2), shake(36, 16, 3)] },
  };
}

// ---------- tabela: golpe → [modelo, opções] ----------

const M = { contato, carga, golpe, palmas, chifre, corte, pinca, chicote, osso, projetil, feixe, raio, choque, nuvem, ondas, barreira, brilhos, troca, prender, dreno, explosao, sacrificio, area, clima, coracoes, moedas, teleporte, maldicao, futuro, orbitar, aura, cavar };

export const GOLPES = {
  // geração 1
  acid: ["projetil", { peca: "gota", n: 3, gap: 5, arc: 14, respingo: true }],
  "aurora-beam": ["feixe", { dur: 36 }],
  barrage: ["projetil", { peca: "orbe", n: 3, gap: 8, arc: 18 }],
  bide: ["carga", {}],
  bind: ["prender", {}],
  "bone-club": ["osso", {}],
  bonemerang: ["osso", { volta: true }],
  clamp: ["pinca", { respingo: true }],
  constrict: ["prender", {}],
  conversion: ["brilhos", { pulso: true }],
  counter: ["contato", { forte: true, flash: true, layersAntes: [L("Px-Pulso", "user", 0, 14, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { scale: K([0, 1.6]), alpha: fade(14, 2, 4, 0.8) }, z: 1 })], antes: 10 }],
  crabhammer: ["corte", { garra: true, respingo: true }],
  dig: ["cavar", {}],
  "double-slap": ["golpe", { f: 1, n: 3, gap: 12 }],
  "dragon-rage": ["feixe", { dur: 30, cor: T.fogo }],
  "drill-peck": ["chifre", { broca: true, esc: 0.8 }],
  explosion: ["explosao", { grande: true }],
  "fury-attack": ["chifre", { n: 4, gap: 9, len: 8, esc: 0.8 }],
  guillotine: ["pinca", { ohko: true }],
  gust: ["projetil", { peca: "vento", n: 2, gap: 8, len: 22, esc: 1.2 }],
  haze: ["nuvem", { onde: "tela", alpha: 0.7, cor: T.normal, status: false }],
  "horn-attack": ["chifre", { esc: 1.1 }],
  "horn-drill": ["chifre", { broca: true, esc: 1.5, forte: true, flash: true, dash: true }],
  "hyper-beam": ["feixe", { juntar: true, dur: 44, esc: 1.5, forte: true, escurece: "#100000", cor: T.fogo, multi: true }],
  "leech-life": ["dreno", {}],
  lick: ["chicote", { esc: 0.8, cor: T.psiquico }],
  "light-screen": ["barreira", { cor: T.eletrico }],
  "lovely-kiss": ["coracoes", {}],
  mimic: ["troca", { self: true }],
  "mirror-move": ["brilhos", { pulso: true, anel: true }],
  mist: ["nuvem", { onde: "user", alpha: 0.6, cor: T.gelo }],
  "night-shade": ["ondas", { escurece: "#000000" }],
  "pay-day": ["moedas", {}],
  peck: ["chifre", { n: 2, gap: 8, len: 8, esc: 0.7 }],
  "poison-gas": ["nuvem", { viaja: true }],
  pound: ["golpe", { f: 0 }],
  psywave: ["ondas", { n: 5, multi: true }],
  rage: ["contato", { forte: true, cor: T.fogo, layersAntes: [L("Px-Pulso", "user", 0, 16, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { scale: K([0, 1.6]), alpha: fade(16, 2, 4, 0.8) }, z: 1 })], antes: 12 }],
  reflect: ["barreira", { cor: T.psiquico }],
  "self-destruct": ["explosao", {}],
  "skull-bash": ["carga", {}],
  "sky-attack": ["carga", { flash: true }],
  slam: ["contato", { forte: true }],
  smog: ["nuvem", { viaja: true }],
  "sonic-boom": ["projetil", { peca: "vento", len: 14, esc: 1.3, anel: true }],
  strength: ["contato", { forte: true, pedras: true }],
  struggle: ["contato", { n: 2 }],
  tackle: ["contato", {}],
  teleport: ["teleporte", {}],
  thrash: ["contato", { n: 3 }],
  thunder: ["raio", { grande: true, cercar: true }],
  "thunder-shock": ["raio", {}],
  "thunder-wave": ["raio", { status: true, anel: true }],
  thunderbolt: ["raio", { cercar: true, anel: true }],
  toxic: ["nuvem", { viaja: true, gotas: true }],
  transform: ["brilhos", { pulso: true, anel: true, pisca: true }],
  "tri-attack": ["projetil", { peca: "orbeP", n: 3, gap: 4, len: 20, faiscas: true }],
  "vine-whip": ["chicote", { n: 2 }],
  "vise-grip": ["pinca", {}],
  "wing-attack": ["corte", { n: 2, cor: T.voador }],
  wrap: ["prender", {}],

  // geração 2
  attract: ["coracoes", {}],
  "beat-up": ["golpe", { f: 0, n: 4, gap: 10 }],
  "bone-rush": ["osso", { n: 3 }],
  "conversion-2": ["brilhos", { pulso: true }],
  curse: ["maldicao", {}],
  "destiny-bond": ["ondas", { escurece: "#100018", status: true, self: true, n: 3 }],
  detect: ["brilhos", { anel: true }],
  "dragon-breath": ["feixe", { dur: 30 }],
  endure: ["aura", { cor: T.luta }],
  "false-swipe": ["corte", {}],
  flail: ["contato", { n: 3 }],
  frustration: ["contato", { forte: true, escurece: "#200000" }],
  "future-sight": ["futuro", {}],
  "heal-bell": ["brilhos", { anel: true, notas: true }],
  "hidden-power": ["orbitar", {}],
  "iron-tail": ["chicote", { esc: 1.3, forte: true, faiscas: true }],
  megahorn: ["chifre", { esc: 1.6, forte: true, dash: true, len: 12 }],
  "mirror-coat": ["feixe", { juntar: true, dur: 30 }],
  outrage: ["contato", { n: 3, escurece: "#180010" }],
  "pain-split": ["troca", {}],
  present: ["projetil", { peca: "orbeG", arc: 30, len: 24, explode: 0.8 }],
  protect: ["barreira", { cor: T.planta, frente: true }],
  "psych-up": ["brilhos", { pulso: true }],
  "rapid-spin": ["contato", { vento: true, n: 2 }],
  return: ["contato", {}],
  reversal: ["contato", { forte: true, flash: true }],
  rollout: ["contato", { n: 3, pedras: true }],
  safeguard: ["barreira", { cor: T.gelo }],
  sandstorm: ["clima", { peca: "pedra", escurece: "#402800" }],
  sketch: ["troca", { self: true }],
  spark: ["choque", { depois: "contato" }],
  "spider-web": ["prender", { peca: "teia", status: true }],
  "steel-wing": ["corte", { n: 2 }],
  thief: ["golpe", { f: 1 }],
  twister: ["area", { peca: "vento", esc: 1.4 }],
  "zap-cannon": ["projetil", { peca: "pulso", juntar: true, len: 26, esc: 1.6, raio: true, forte: true }],

  // geração 3
  aromatherapy: ["brilhos", { pulso: true }],
  assist: ["brilhos", { anel: true }],
  astonish: ["contato", { flash: true, escurece: "#100018" }],
  camouflage: ["brilhos", { pisca: true }],
  covet: ["contato", { layersAntes: [L("Px-Coracao", "user", 0, 16, { frameSeq: seq([0, 1], 8, true), keepColor: true, tracks: { y: K([0, -20], [16, -34]), alpha: fade(16, 2, 4) }, z: 4 })], antes: 10 }],
  "doom-desire": ["futuro", { explode: true }],
  endeavor: ["contato", { forte: true }],
  facade: ["contato", { forte: true, flash: true }],
  "fake-out": ["palmas", {}],
  hail: ["clima", { peca: "orbe", vx: -1.5, vy: 4.5, escurece: "#102030" }],
  "knock-off": ["golpe", { f: 1, forte: true }],
  "luster-purge": ["feixe", { juntar: true, dur: 36, esc: 1.2 }],
  "magic-coat": ["barreira", { cor: T.psiquico }],
  memento: ["sacrificio", {}],
  "mist-ball": ["projetil", { peca: "pulso", len: 22, esc: 1.2, nuvem: true }],
  "nature-power": ["projetil", { peca: "brilho", juntar: true, len: 20 }],
  "poison-tail": ["chicote", { esc: 1.1 }],
  "psycho-boost": ["feixe", { juntar: true, dur: 44, esc: 1.6, forte: true, escurece: "#200018", multi: true }],
  recycle: ["brilhos", { pulso: true, anel: true }],
  refresh: ["brilhos", {}],
  revenge: ["contato", { forte: true, flash: true }],
  "role-play": ["troca", { self: true }],
  "sand-tomb": ["prender", { peca: "areia", keepColor: false }],
  "secret-power": ["projetil", { peca: "orbe", len: 18, anel: true }],
  "shock-wave": ["ondas", { n: 3, multi: false }],
  "silver-wind": ["area", { peca: "vento", faiscas: true, cor: T.aco }],
  "skill-swap": ["troca", {}],
  "smelling-salts": ["golpe", { f: 1, anel: true }],
  snatch: ["troca", { mao: true, self: true }],
  "spit-up": ["projetil", { peca: "pulso", len: 18, esc: 1.2, anel: true }],
  superpower: ["contato", { forte: true, flash: true, pedras: true, layersAntes: [L("Px-Pulso", "user", 0, 18, { frameSeq: seq([0, 1, 2, 3], 20, true), tracks: { scale: K([0, 1.8]), alpha: fade(18, 2, 4, 0.8) }, z: 1 })], antes: 14 }],
  swallow: ["brilhos", { pulso: true }],
  "weather-ball": ["projetil", { peca: "orbeG", arc: 40, len: 26, esc: 1.3, anel: true }],

  // geração 4
  "aqua-tail": ["chicote", { esc: 1.3, respingo: true }],
  avalanche: ["area", { peca: "pedra", esc: 1.4, cor: T.gelo }],
  "bug-bite": ["pinca", {}],
  "bug-buzz": ["ondas", { n: 5, multi: true }],
  chatter: ["ondas", { n: 4, cor: T.voador }],
  copycat: ["brilhos", { anel: true }],
  "crush-grip": ["golpe", { f: 0, forte: true, faixa: true }],
  "dark-void": ["nuvem", { viaja: true, escurece: "#000010", alpha: 0.95 }],
  defog: ["clima", { peca: "vento", vx: -6, vy: 0, esc: 1.4 }],
  discharge: ["choque", {}],
  "double-hit": ["chicote", { n: 2 }],
  "draco-meteor": ["area", { peca: "orbe", esc: 1.6, forte: true, explode: true, escurece: "#100020" }],
  "dragon-rush": ["contato", { forte: true, flash: true, escurece: "#100020" }],
  fling: ["projetil", { peca: "pedraG", arc: 26, len: 20 }],
  "force-palm": ["golpe", { f: 1, anel: true }],
  "grass-knot": ["chicote", { chao: true }],
  gravity: ["clima", { peca: "anel", escurece: "#100020", cor: T.psiquico }],
  "guard-swap": ["troca", {}],
  "gunk-shot": ["projetil", { peca: "fumaca", len: 22, esc: 1.4, nuvem: true, respingo: true }],
  "gyro-ball": ["contato", { vento: true, forte: true }],
  "healing-wish": ["sacrificio", { cura: true }],
  "heart-swap": ["troca", {}],
  judgment: ["area", { peca: "orbe", esc: 1.4, forte: true, flash: true, n: 9 }],
  "lucky-chant": ["barreira", { cor: T.normal }],
  "lunar-dance": ["sacrificio", { cura: true, escurece: "#000020", cor: T.psiquico }],
  "magnet-bomb": ["projetil", { peca: "orbe", n: 3, gap: 6, arc: 20 }],
  "me-first": ["troca", {}],
  "metal-burst": ["feixe", { juntar: true, dur: 28 }],
  "natural-gift": ["projetil", { peca: "orbe", juntar: true, len: 18 }],
  pluck: ["chifre", { n: 2, gap: 8, len: 8, esc: 0.7 }],
  "power-gem": ["projetil", { peca: "brilho", n: 3, gap: 5, len: 20, faiscas: true }],
  "power-swap": ["troca", {}],
  "power-whip": ["chicote", { n: 2, esc: 1.5, forte: true }],
  "psycho-shift": ["troca", {}],
  punishment: ["golpe", { f: 1, n: 2 }],
  "rock-climb": ["contato", { pedras: true, forte: true }],
  switcheroo: ["troca", {}],
  tailwind: ["clima", { peca: "vento", vx: 6, vy: -0.5, esc: 1.2 }],
  "trump-card": ["projetil", { peca: "brilho", n: 5, gap: 4, len: 18 }],
  "vacuum-wave": ["projetil", { peca: "vento", len: 10, esc: 1.2 }],
  "wake-up-slap": ["golpe", { f: 1, n: 2 }],
  "wring-out": ["golpe", { f: 0, faixa: true }],

  // geração 5
  "acid-spray": ["projetil", { peca: "gota", n: 5, gap: 3, arc: 10, respingo: true, nuvem: true }],
  acrobatics: ["contato", { vento: true }],
  "ally-switch": ["teleporte", {}],
  bestow: ["troca", { mao: true, self: true }],
  "blue-flare": ["area", { peca: "explosao", esc: 1.1, forte: true, escurece: "#000830" }],
  "bolt-strike": ["choque", { depois: "contato", forte: true }],
  "chip-away": ["contato", { n: 2 }],
  "clear-smog": ["nuvem", { viaja: true, cor: T.normal }],
  "dragon-tail": ["chicote", { esc: 1.3, forte: true }],
  "drill-run": ["chifre", { broca: true, dash: true, esc: 1.2 }],
  "dual-chop": ["corte", { n: 2 }],
  "electro-ball": ["projetil", { peca: "pulso", len: 20, esc: 1.2, raio: true }],
  electroweb: ["prender", { peca: "teia", faiscas: true }],
  entrainment: ["troca", {}],
  "fiery-dance": ["area", { peca: "explosao", esc: 0.6 }],
  "final-gambit": ["contato", { forte: true, flash: true, escurece: "#200000" }],
  "fire-pledge": ["area", { peca: "coluna" }],
  "flame-burst": ["projetil", { peca: "pulso", len: 18, explode: 0.7 }],
  "foul-play": ["contato", { forte: true, escurece: "#000000" }],
  "freeze-shock": ["carga", { cor: T.gelo }],
  "frost-breath": ["feixe", { dur: 30 }],
  "fusion-bolt": ["choque", { depois: "contato", forte: true }],
  "fusion-flare": ["projetil", { peca: "pulso", juntar: true, len: 28, esc: 1.8, explode: 1.2, forte: true }],
  "gear-grind": ["projetil", { peca: "vento", n: 2, gap: 10, len: 18 }],
  glaciate: ["area", { peca: "chifre" }],
  "grass-pledge": ["area", { peca: "coluna" }],
  "guard-split": ["troca", {}],
  "heart-stamp": ["golpe", { f: 1, coracao: true }],
  "heat-crash": ["contato", { forte: true, explode: true }],
  hurricane: ["area", { peca: "vento", esc: 1.8, forte: true }],
  "ice-burn": ["carga", { cor: T.gelo }],
  "icicle-crash": ["area", { peca: "chifre" }],
  "low-sweep": ["chicote", { chao: true, esc: 1.2 }],
  "night-daze": ["ondas", { n: 4, escurece: "#200010", multi: true }],
  "power-split": ["troca", {}],
  "quick-guard": ["barreira", { frente: true }],
  "razor-shell": ["corte", { n: 2, respingo: true }],
  "reflect-type": ["troca", { self: true }],
  retaliate: ["contato", { forte: true }],
  "sacred-sword": ["corte", { cruz: true, esc: 1.4, flash: true, dash: true }],
  scald: ["projetil", { peca: "gota", n: 6, gap: 3, len: 16, respingo: true, nuvem: true }],
  "searing-shot": ["area", { peca: "explosao", esc: 0.8, forte: true }],
  "secret-sword": ["corte", { cruz: true, esc: 1.3, flash: true }],
  "sludge-wave": ["area", { peca: "gota" }],
  "smack-down": ["projetil", { peca: "pedraG", len: 18, arc: 10, forte: true }],
  soak: ["projetil", { peca: "gota", n: 6, gap: 3, len: 18, status: true, respingo: true }],
  steamroller: ["contato", { n: 2, forte: true }],
  "struggle-bug": ["area", { peca: "faisca" }],
  synchronoise: ["ondas", { n: 6, onde: "user", self: false, multi: true }],
  "tail-slap": ["chicote", { n: 3 }],
  "techno-blast": ["feixe", { juntar: true, dur: 34, esc: 1.2 }],
  "v-create": ["contato", { forte: true, flash: true, explode: true, escurece: "#300800" }],
  venoshock: ["projetil", { peca: "gota", n: 3, gap: 5, len: 18, nuvem: true }],
  "volt-switch": ["choque", { depois: "contato", some: true }],
  "water-pledge": ["area", { peca: "coluna" }],
  "wide-guard": ["barreira", { frente: true, esc: 1.6 }],
};

// Monta as receitas (slug, tipo de recolor) a partir do catálogo.
export function receitasPixel(catalogo) {
  const tipoDe = new Map(catalogo.map((l) => [l.slug, l.tipo]));
  const out = [];
  for (const [slug, [modelo, o]] of Object.entries(GOLPES)) {
    const f = M[modelo];
    if (!f) throw new Error(`${slug}: modelo "${modelo}" não existe`);
    semente = 1;
    const corpo = f(o);
    const tipo = o.cor ?? tipoDe.get(slug);
    out.push({ receita: { slug, duration: Math.round(corpo.duration), layers: corpo.layers, ...limpo(corpo), pixel: true, note: `pixel art própria (${modelo})` }, tipo: tipo === T.normal ? undefined : tipo });
  }
  return out;
}

function limpo({ hits, react, actor, screen }) {
  const s = {};
  if (hits?.length) s.hits = hits;
  if (react && react !== "hit") s.react = react;
  if (actor?.length) s.actor = actor;
  if (screen && Object.values(screen).some((v) => v?.length)) s.screen = Object.fromEntries(Object.entries(screen).filter(([, v]) => v?.length));
  return s;
}
