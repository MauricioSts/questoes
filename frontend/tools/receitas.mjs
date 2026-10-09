// Receitas das animações com sprites, uma por golpe que tem asset (ou combina peças). O
// gerador (gerar-receitas.mjs) grava cada uma em src/data/move-anims/<slug>.json; o app só lê
// os JSON. Para mexer numa animação: edite aqui e rode `npm run fx:receitas`.
//
// Convenções (ver src/components/poke/golpes/sprites/tipos.ts):
//  - tempo em quadros de 1/60 s; tracks em tempo LOCAL da camada (0 = início dela);
//  - posição em px da tela do DS, escrita para "meu Pokémon ataca" (alvo em cima à direita);
//  - índices de quadro = os do atlas (tools/atlas-preview.html mostra os números);
//  - approx: true quando a animação combina peças de outros golpes ou inventa o movimento.
//    Nenhuma delas é a animação do jogo: os PNGs são peças, o movimento foi recriado à mão.

const K = (...ks) => ({ keys: ks.map(([t, v, ease]) => (ease ? { t, v, ease } : { t, v })) });
const r = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const seq = (frames, fps = 12, loop = false) => ({ frames, fps, loop });
// some/aparece nas pontas da camada
const fade = (len, entra = 3, sai = 6, max = 1) => K([0, 0], [entra, max], [Math.max(entra, len - sai), max], [len, 0]);
const L = (asset, anchor, start, end, o = {}) => ({ asset, anchor, start, end, ...o });
// do usuário ao alvo em `len` quadros
const viaja = (asset, start, len, o = {}) => {
  const { ease = "linear", fim = len + 4, tracks = {}, ...resto } = o;
  return L(asset, "user", start, start + fim, { to: "target", ...resto, tracks: { p: K([0, 0], [len, 1, ease]), ...tracks } });
};
const R = (slug, duration, layers, o = {}) => ({ slug, duration, layers, ...o });
const shake = (t, dur, amp) => ({ t, dur, amp });
const flash = (t, dur = 6, color = "#FFFFFF", alpha = 0.6) => ({ t, dur, color, alpha });
const tint = (start, end, color, alpha) => ({ start, end, color, alpha });

// ---------- peças reaproveitadas ----------
const punho = (asset, frame, t = 0, o = {}) => L(asset, "target", t, t + 14, { frame, tracks: { scale: K([0, 1.8], [6, 1, "in"]), alpha: K([0, 0], [2, 1], [10, 1], [14, 0]), x: K([0, -16], [6, 0, "in"]) }, z: 3, ...o });
const estrelas = (t, o = {}) =>
  L("Close-Combat", "target", t, t + 12, { keepColor: o.keepColor, spawn: { count: o.n ?? 3, spread: o.spread ?? [14, 14], interval: o.interval ?? 2, frames: [1, 2, 3, 4], seed: o.seed ?? 3 }, tracks: { scale: K([0, 0.6], [4, 1.1, "out"], [10, 0.8]), alpha: K([0, 1], [8, 1], [12, 0]) }, z: 3 });

export const RECEITAS = [
  R("acupressure", 54, [
    L("Accupressure", "user", 0, 50, { frame: 0, tracks: { x: K([0, 14]), y: K([0, -40], [8, -26, "in"], [12, -30], [20, -22, "in"], [24, -28], [32, -20, "in"], [50, -20]), alpha: fade(50) }, z: 3 }),
  ], { react: "self", note: "dedo pressiona o usuário 3 vezes" }),

  R("aerial-ace", 48, [
    L("Aerial-Ace", "target", 10, 22, { frameSeq: seq([0, 1, 2, 3], 20), tracks: { alpha: K([0, 1], [8, 1], [12, 0]) }, z: 3 }),
    L("Aerial-Ace", "target", 14, 40, { spawn: { count: 6, spread: [6, 6], interval: 1, frames: [4, 5, 6], burst: 2.2, gravity: 0.15, life: 20, seed: 2 }, tracks: { alpha: K([0, 1], [14, 1], [20, 0]) }, z: 3 }),
  ], { hits: [12], actor: [{ who: "user", t: 0, kind: "dash", dur: 22 }] }),

  R("aeroblast", 96, [
    L("Aero-Blast", "user", 0, 72, { ds: true, frameSeq: seq([0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15], 14), keepColor: true }),
  ], { bg: { asset: "Aero-Blast", frame: 17, start: 60, end: 92, scroll: { dx: 0, dy: 0 }, alpha: K([0, 0.85]) }, hits: [56], screen: { shake: [shake(56, 20, 2)] }, note: "telas do DS reduzidas no rip (202 px): saem um pouco menores" }),

  R("amnesia", 70, [
    L("Amnesia", "user", 0, 64, { frame: 2, tracks: { x: K([0, 14]), y: K([0, -30]), alpha: fade(64, 2, 8) } }),
    L("Amnesia", "user", 6, 64, { frame: 1, tracks: { x: K([0, 20]), y: K([0, -40]), alpha: fade(58, 2, 8) } }),
    L("Amnesia", "user", 12, 64, { frame: 0, tracks: { x: K([0, 28]), y: K([0, -52]), alpha: fade(52, 2, 8) } }),
    L("Amnesia", "user", 18, 64, { frame: 3, tracks: { x: K([0, 30]), y: K([0, -78]), scale: K([0, 0], [6, 1.15, "out"], [10, 1]), alpha: fade(46, 1, 8) } }),
  ], { react: "self" }),

  R("ancient-power", 80, [
    L("Ancient-Power", "field-user", 0, 56, { to: "target", spawn: { count: 6, spread: [36, 4], interval: 2, frames: r(0, 7), seed: 5 }, tracks: { y: K([0, 0], [18, -48, "out"], [26, -48], [44, 0]), p: K([0, 0], [24, 0], [44, 1, "in"]), alpha: K([0, 0], [3, 1], [44, 1], [48, 0]) } }),
    L("Ancient-Power", "target", 50, 72, { spawn: { count: 6, spread: [4, 4], interval: 0, frames: r(8, 12), burst: 2, gravity: 0.2, seed: 6 }, tracks: { alpha: fade(22, 0, 8) }, z: 3 }),
  ], { hits: [50], screen: { shake: [shake(50, 10, 2)] } }),

  R("attack-order", 72, [
    viaja("Attack-and-Heal-Order", 0, 26, { frameSeq: seq([16, 17, 18, 19], 16, true), spawn: { count: 8, spread: [18, 14], interval: 3, life: 34, seed: 9 }, tracks: { alpha: K([0, 0], [3, 1], [28, 1], [34, 0]) }, fim: 34 }),
  ], { hits: [28, 40, 52] }),
  R("heal-order", 80, [
    L("Attack-and-Heal-Order", "user", 0, 64, { frameSeq: seq([24, 25, 26, 27], 16, true), spawn: { count: 6, spread: 0, interval: 0 }, orbit: { rx: 34, ry: 12, speed: 8 }, tracks: { alpha: fade(64) } }),
    L("Attack-and-Heal-Order", "user", 30, 76, { spawn: { count: 8, spread: [26, 20], interval: 4, frames: [44, 45, 46, 47], vy: -0.8, life: 18, seed: 4 }, tracks: { alpha: fade(18, 2, 6) }, z: 4 }),
  ], { react: "self" }),
  R("defend-order", 76, [
    L("Attack-and-Heal-Order", "user", 0, 64, { frameSeq: seq([20, 21, 22, 23], 16, true), spawn: { count: 6, spread: 0, interval: 0 }, orbit: { rx: 30, ry: 22, speed: 6 }, tracks: { alpha: fade(64) } }),
    L("Attack-and-Heal-Order", "user", 24, 70, { spawn: { count: 6, spread: [22, 18], interval: 3, frames: [38, 39, 40], seed: 8 }, tracks: { scale: K([0, 0], [4, 1, "out"]), alpha: fade(46, 2, 10, 0.8) } }),
  ], { react: "self", approx: true, note: "esferas de mel como escudo: movimento inventado" }),

  R("baton-pass", 70, [
    L("Baton-Pass", "user", 0, 40, { frame: 2, tracks: { y: K([0, 0], [20, -34, "out"], [40, -34]), rot: K([0, 0], [40, 1080]), alpha: fade(40, 2, 4) }, z: 3 }),
    L("Baton-Pass", "user", 30, 56, { frame: 3, tracks: { y: K([0, -34]), scale: K([0, 0.4], [26, 2.6, "out"]), alpha: K([0, 1], [26, 0]) } }),
    L("Baton-Pass", "user", 40, 62, { frameSeq: seq([1, 4], 10), tracks: { y: K([0, -34], [22, 10, "in"]), alpha: fade(22, 1, 6) }, z: 3 }),
  ], { react: "self", actor: [{ who: "user", t: 40, kind: "hide", dur: 28 }] }),

  R("blast-burn", 100, [
    L("Blast-Burn", "field-target", 14, 84, { frameSeq: seq([6, 7, 8, 0, 1, 2, 4, 5, 3], 12, true), tracks: { y: K([0, -40]), scale: K([0, 0.4], [12, 0.8, "out"]), alpha: fade(70, 3, 12) }, z: 3 }),
    L("Blast-Burn", "field-user", 0, 30, { frameSeq: seq([6, 7, 8], 12, true), tracks: { y: K([0, -40]), scale: K([0, 0.6]), alpha: fade(30, 3, 10, 0.8) } }),
  ], { hits: [24, 44, 64], screen: { tint: [tint(0, 96, "#3A0800", 0.45)], shake: [shake(24, 50, 4)], flash: [flash(22, 8, "#FFE8B0", 0.55)] } }),

  R("bullet-seed", 66, [
    viaja("Bullet-Seed", 0, 14, { spawn: { count: 6, spread: [4, 4], interval: 6, frames: r(0, 5), life: 16, seed: 3 }, fim: 50 }),
  ], { hits: [14, 20, 26, 32, 38, 44] }),

  R("will-o-wisp", 80, [
    viaja("Grudge", 0, 28, { frameSeq: seq(r(0, 4), 10, true), arc: 24, spawn: { count: 3, spread: [10, 8], interval: 4, life: 32, seed: 2 }, tracks: { alpha: fade(32, 2, 4) }, fim: 40 }),
    L("Burn", "field-target", 34, 76, { frameSeq: seq([4, 3, 2, 1, 0, 1, 2, 3, 4], 14), spawn: { count: 3, spread: [18, 2], interval: 4, seed: 1 }, tracks: { y: K([0, -16]), alpha: fade(38, 2, 8) }, z: 4 }),
  ], { hits: [34], react: "status", approx: true, note: "chamas de Grudge + chamas de Burn" }),

  R("close-combat", 80, [
    L("Close-Combat", "target", 6, 66, { spawn: { count: 9, spread: [22, 22], interval: 6, life: 8, seed: 4 }, frame: 5, tracks: { scale: K([0, 1.6], [3, 1, "in"]), alpha: K([0, 1], [6, 1], [8, 0]) }, z: 3 }),
    L("Close-Combat", "target", 9, 70, { spawn: { count: 9, spread: [24, 24], interval: 6, life: 8, frames: [1, 2, 3, 4], seed: 7 }, tracks: { scale: K([0, 0.5], [3, 1.2, "out"]), alpha: K([0, 1], [5, 1], [8, 0]) }, z: 3 }),
  ], { bg: { asset: "Close-Combat", frame: 0, start: 0, end: 74, scroll: { dx: -10, dy: 0 }, alpha: K([0, 0.85]) }, hits: [9, 21, 33, 45, 57], actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }] }),

  R("confuse-ray", 90, [
    viaja("Sacred-Fire", 0, 26, { frame: 1, tracks: { scale: K([0, 0.4], [26, 0.7]), alpha: K([0, 0.9], [26, 0.9], [30, 0]) }, blend: "add", fim: 30 }),
    L("Confuse", "target", 28, 88, { frameSeq: seq(r(0, 19), 14, true), tracks: { y: K([0, -40]), alpha: fade(60, 3, 8) }, z: 4 }),
  ], { hits: [28], react: "status", approx: true, note: "orbe de Sacred Fire + pássaros de confusão" }),
  R("teeter-dance", 90, [
    L("Confuse", "target", 20, 88, { frameSeq: seq(r(0, 19), 14, true), tracks: { y: K([0, -40]), alpha: fade(68, 3, 8) }, z: 4 }),
  ], { hits: [20], react: "status", actor: [{ who: "user", t: 0, kind: "hop", dur: 12 }, { who: "user", t: 12, kind: "hop", dur: 12 }, { who: "user", t: 24, kind: "hop", dur: 12 }] }),

  R("crunch", 48, [
    L("Crunch", "target", 0, 30, { frame: 0, tracks: { y: K([0, -44], [10, -14, "in"], [20, -14]), alpha: fade(30, 2, 8) }, z: 3 }),
    L("Crunch", "target", 0, 30, { frame: 7, tracks: { y: K([0, 44], [10, 14, "in"], [20, 14]), alpha: fade(30, 2, 8) }, z: 3 }),
  ], { hits: [10], screen: { shake: [shake(10, 8, 2)] } }),

  R("trick", 80, [
    L("Cups", "screen-center", 0, 70, { frame: 0, tracks: { x: K([0, -34], [24, -34], [34, 0, "inout"], [44, 34, "inout"], [70, 34]), y: K([0, -6]), alpha: fade(70) } }),
    L("Cups", "screen-center", 0, 70, { frame: 1, tracks: { x: K([0, 0], [24, 0], [34, -34, "inout"], [54, -34], [64, 0, "inout"]), y: K([0, -6]), alpha: fade(70) } }),
    L("Cups", "screen-center", 0, 70, { frame: 2, tracks: { x: K([0, 34], [34, 34], [44, 0, "inout"], [54, 0], [64, -34, "inout"]), y: K([0, -6]), alpha: fade(70) } }),
  ], { react: "status", hits: [66], approx: true, note: "copos embaralhando: não sabemos qual golpe do DP usa esta folha" }),

  R("cut", 40, [
    L("Cut", "target", 4, 20, { frame: 0, tracks: { scale: K([0, 0.5], [5, 1.1, "out"]), alpha: K([0, 1], [10, 1], [16, 0]) }, z: 3 }),
    L("Cut", "target", 8, 34, { spawn: { count: 6, spread: [10, 10], interval: 1, frames: [1, 2, 3], burst: 1.6, life: 18, seed: 3 }, tracks: { alpha: fade(18, 0, 8) }, z: 3 }),
  ], { hits: [8] }),

  R("dragon-claw", 52, [
    L("Dragon-Claw", "target", 8, 30, { frameSeq: seq([10, 11, 12, 13, 16, 18, 20], 22), tracks: { alpha: K([0, 1], [18, 1], [22, 0]) }, z: 3 }),
    L("Dragon-Claw", "user", 0, 16, { spawn: { count: 5, spread: [24, 10], interval: 1, frames: r(0, 7), vy: -1.5, life: 14, seed: 1 }, tracks: { alpha: fade(14, 1, 6) } }),
  ], { hits: [12], actor: [{ who: "user", t: 0, kind: "lunge", dur: 16 }] }),

  R("dynamic-punch", 70, [
    punho("Close-Combat", 5, 4, { keepColor: true, tracks: { scale: K([0, 2.4], [8, 1.2, "in"]), alpha: K([0, 0], [2, 1], [14, 1], [18, 0]) }, end: 22 }),
  ], { bg: { asset: "Dynamic-Punch", frames: [0, 1], fps: 10, start: 10, end: 56 }, hits: [12], screen: { shake: [shake(12, 26, 6)], flash: [flash(10, 6)] }, actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }], approx: true, note: "fundo do asset + punho de Close Combat" }),

  R("energy-ball", 72, [
    L("Energy-Ball", "user", 0, 20, { spawn: { count: 8, spread: [34, 30], interval: 1, frames: r(0, 5), burst: -1.6, life: 18, seed: 2 }, tracks: { alpha: fade(18, 2, 4) } }),
    L("Energy-Ball", "user", 12, 22, { frameSeq: seq(r(10, 16), 16, true), tracks: { scale: K([0, 0.2], [10, 1, "out"]) } }),
    viaja("Energy-Ball", 22, 22, { frameSeq: seq(r(10, 16), 16, true), fim: 22, ease: "in" }),
    L("Energy-Ball", "target", 44, 62, { frameSeq: seq([6, 7, 8, 9], 14), tracks: { scale: K([0, 1], [18, 2.2, "out"]), alpha: K([0, 1], [18, 0]) }, z: 3 }),
  ], { hits: [44] }),

  R("eruption", 96, [
    L("Eruption", "user", 0, 26, { spawn: { count: 5, spread: [16, 4], interval: 3, frames: [8, 9, 10], vy: -1.5, life: 22, seed: 4 }, tracks: { y: K([0, -26]), alpha: fade(22, 2, 8) } }),
    L("Eruption", "user", 2, 30, { spawn: { count: 6, spread: [14, 4], interval: 2, frames: r(4, 7), life: 18, seed: 5 }, tracks: { y: K([0, -10], [18, -150, "out"]) } }),
    L("Eruption", "target", 34, 84, { spawn: { count: 8, spread: [34, 6], interval: 5, frames: r(0, 7), life: 16, seed: 6 }, tracks: { y: K([0, -150], [14, 0, "in"]), alpha: K([0, 1], [14, 1], [16, 0]) }, z: 3 }),
  ], { hits: [48, 58, 68], screen: { tint: [tint(0, 92, "#4A1000", 0.4)], shake: [shake(48, 30, 3)] } }),

  R("fire-blast", 96, [
    viaja("Fire-Blast", 0, 20, { frame: 3, tracks: { scale: K([0, 0.4], [20, 0.8]) }, fim: 20, ease: "in" }),
    L("Fire-Blast", "target", 20, 62, { frameSeq: seq([4, 5, 6, 7, 8], 12, true), tracks: { scale: K([0, 0.5], [8, 1, "out"]), alpha: fade(42, 1, 10) }, z: 3 }),
    L("Fire-Blast", "target", 46, 86, { spawn: { count: 10, spread: [20, 20], interval: 2, frames: r(9, 23), burst: 1.2, life: 20, seed: 2 }, tracks: { alpha: fade(20, 0, 8) }, z: 3 }),
  ], { bg: { asset: "Fire-Blast", frame: 24, start: 20, end: 40, alpha: K([0, 0.85]) }, hits: [22, 36, 50], screen: { shake: [shake(22, 34, 4)] } }),

  R("fire-punch", 64, [
    punho("Fire-Punch", 24, 0),
    L("Fire-Punch", "target", 8, 56, { frameSeq: seq(r(0, 23), 30), tracks: { scale: K([0, 1.1]), alpha: fade(48, 0, 6) }, z: 3 }),
    L("Fire-Punch", "target", 12, 48, { spawn: { count: 6, spread: [8, 8], interval: 2, frames: r(25, 28), burst: 1.8, life: 16, seed: 4 }, tracks: { alpha: fade(16, 0, 6) }, z: 3 }),
  ], { hits: [8], actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }] }),

  R("fire-spin", 90, [
    L("Fire-Spin", "target", 0, 80, { spawn: { count: 10, spread: 0, interval: 0, frames: r(0, 4), seed: 3 }, orbit: { rx: 36, ry: 12, speed: 9 }, tracks: { y: K([0, 20], [80, -30]), alpha: fade(80, 6, 14) } }),
  ], { hits: [14, 40, 64] }),
  R("flamethrower", 80, [
    viaja("Fire-Spin", 0, 16, { spawn: { count: 22, spread: [6, 6], interval: 2, frames: [1, 3, 4], life: 18, seed: 5 }, tracks: { scale: K([0, 0.5], [16, 1.3]), alpha: K([0, 1], [14, 1], [18, 0]) }, blend: "add", fim: 60 }),
  ], { hits: [18, 36, 54], approx: true, note: "jato montado com chamas soltas de Fire Spin" }),
  R("ember", 50, [
    viaja("Fire-Spin", 0, 16, { spawn: { count: 3, spread: [4, 4], interval: 4, frames: [3], life: 18, seed: 5 }, arc: 10, tracks: { scale: K([0, 0.5], [16, 0.8]) }, fim: 28 }),
    L("Burn", "field-target", 18, 44, { frameSeq: seq([3, 2, 1, 2, 3, 4], 14), tracks: { y: K([0, -12]), alpha: fade(26, 1, 6) }, z: 3 }),
  ], { hits: [18], approx: true, note: "chama pequena de Fire Spin + Burn" }),

  R("sunny-day", 80, [
    L("Fire", "screen-center", 0, 74, { frameSeq: seq([0, 1], 4, true), tracks: { y: K([0, -70]), scale: K([0, 0], [16, 1.6, "out"], [44, 1.4], [74, 1.8]), alpha: fade(74, 6, 16) }, blend: "add" }),
  ], { react: "self", screen: { tint: [tint(0, 78, "#FFCF6A", 0.3)] }, approx: true, note: "bola de fogo como sol" }),
  R("flame-wheel", 64, [
    L("Fire", "user", 0, 34, { frameSeq: seq([0, 1], 10, true), spawn: { count: 6, spread: 0, interval: 0 }, orbit: { rx: 30, ry: 26, speed: 18 }, tracks: { scale: K([0, 0.6]), alpha: fade(34, 4, 4) } }),
    L("Fire-Punch", "target", 34, 60, { frameSeq: seq(r(8, 23), 30), z: 3 }),
  ], { hits: [34], actor: [{ who: "user", t: 20, kind: "dash", dur: 22 }], approx: true }),

  R("fissure", 100, [
    L("Fissure", "field-target", 10, 92, { frameSeq: seq([4, 3, 2, 1, 5], 8), tracks: { y: K([0, -16]), alpha: fade(82, 2, 12) } }),
  ], { bg: { asset: "Fissure", frame: 0, start: 0, end: 96, alpha: K([0, 0.75]) }, hits: [30], screen: { shake: [shake(10, 70, 5)] } }),
  R("earthquake", 80, [
    L("Fissure", "field-target", 8, 70, { frameSeq: seq([8, 7, 6], 8), tracks: { y: K([0, -10]), alpha: fade(62, 2, 10) } }),
    L("Fissure", "field-user", 14, 70, { frameSeq: seq([8, 7], 8), tracks: { y: K([0, -10]), alpha: fade(56, 2, 10) }, perTarget: false }),
  ], { bg: { asset: "Fissure", frame: 0, start: 0, end: 76, alpha: K([0, 0.4]) }, hits: [20, 44], screen: { shake: [shake(0, 70, 6)] }, approx: true, note: "rachaduras de Fissure + tremor" }),

  R("flare-blitz", 80, [
    L("Fire-Punch", "target", 18, 66, { frameSeq: seq(r(0, 23), 30), tracks: { scale: K([0, 1.6]) }, z: 3 }),
  ], { bg: { asset: "Flare-Blitz", frames: [0, 1], fps: 10, start: 4, end: 40 }, hits: [18], actor: [{ who: "user", t: 4, kind: "dash", dur: 26 }], screen: { shake: [shake(18, 20, 5)], flash: [flash(16)] }, approx: true, note: "fundo do asset + explosão de Fire Punch" }),

  R("flash-cannon", 76, [
    L("Flash-Cannon", "user", 0, 22, { frameSeq: seq([3, 4, 5], 8), tracks: { scale: K([0, 0.4], [20, 1]), alpha: fade(22, 2, 2) }, blend: "add" }),
    viaja("Flash-Cannon", 18, 12, { spawn: { count: 12, spread: [4, 4], interval: 2, frames: r(6, 15), life: 14, seed: 3 }, fim: 40 }),
    L("Flash-Cannon", "target", 30, 54, { frameSeq: seq([16, 17, 18, 19], 10), tracks: { alpha: fade(24, 0, 6) }, blend: "add", z: 3 }),
    L("Flash-Cannon", "target", 52, 70, { frameSeq: seq([20, 21, 22, 23], 12), z: 3 }),
  ], { hits: [32], screen: { flash: [flash(30, 6, "#FFFFFF", 0.4)] } }),

  R("fly", 76, [
    L("Fly", "target", 34, 46, { frameSeq: seq([2, 3, 4], 18), tracks: { y: K([0, -130], [10, 0, "in"]), alpha: K([0, 1], [10, 1], [12, 0]) }, z: 3 }),
    L("Fly", "target", 44, 64, { frame: 5, tracks: { scale: K([0, 0.6], [20, 1.6, "out"]), alpha: K([0, 1], [20, 0]) }, z: 3 }),
  ], { bg: { asset: "Fly", frame: 6, start: 10, end: 50, scroll: { dx: 0, dy: 8 }, alpha: K([0, 0.8]) }, hits: [44], actor: [{ who: "user", t: 0, kind: "hide", dur: 60 }] }),

  R("focus-blast", 84, [
    L("Focus-Blast", "user", 0, 22, { spawn: { count: 6, spread: [30, 26], interval: 2, frames: [0, 1], burst: -1.4, life: 16, seed: 2 }, blend: "add" }),
    L("Focus-Blast", "user", 10, 30, { frameSeq: seq([5, 4, 3, 2], 12), tracks: { scale: K([0, 0.3], [20, 0.6]) } }),
    viaja("Focus-Blast", 30, 18, { frame: 4, tracks: { scale: K([0, 0.6], [18, 0.9]) }, fim: 18, ease: "in" }),
    L("Focus-Blast", "target", 48, 66, { frame: 6, tracks: { scale: K([0, 1], [18, 2.4, "out"]), alpha: K([0, 1], [18, 0]) }, z: 3 }),
  ], { bg: { asset: "Focus-Blast", frame: 7, start: 46, end: 72, alpha: K([0, 0.7]) }, hits: [48], screen: { shake: [shake(48, 16, 4)] } }),

  R("frenzy-plant", 100, [
    L("Frenzy-Plant", "user", 0, 88, { ds: true, frameSeq: seq([0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7], 8), keepColor: true }),
  ], { bg: { asset: "Frenzy-Plant", frame: 11, start: 0, end: 96, scroll: { dx: 0, dy: -2 }, alpha: K([0, 0.85]) }, hits: [48, 66, 80], screen: { shake: [shake(48, 40, 3)] } }),

  R("giga-impact", 76, [], { bg: { asset: "Giga-Impact", frames: [0, 1], fps: 10, start: 14, end: 60 }, hits: [16], actor: [{ who: "user", t: 0, kind: "dash", dur: 28 }], screen: { shake: [shake(16, 30, 7)], flash: [flash(14, 8)] } }),

  R("growl", 60, [
    L("Growl", "user", 0, 30, { frameSeq: seq([0, 1, 2], 10, true), tracks: { x: K([0, 22]), y: K([0, -30]), alpha: fade(30, 1, 6) }, z: 3 }),
    viaja("Growl", 4, 30, { frame: 4, spawn: { count: 3, spread: 0, interval: 8, life: 30, seed: 1 }, tracks: { p: K([0, 0], [30, 0.7, "out"]), scale: K([0, 0.2], [30, 1]), alpha: K([0, 1], [30, 0]) }, fim: 52 }),
  ], { hits: [30], react: "status" }),

  R("grudge", 76, [
    L("Grudge", "user", 0, 70, { frameSeq: seq(r(0, 4), 10, true), spawn: { count: 4, spread: 0, interval: 0 }, orbit: { rx: 34, ry: 14, speed: 6 }, tracks: { y: K([0, 0], [70, -20]), alpha: fade(70, 8, 12) } }),
  ], { react: "self", screen: { tint: [tint(0, 74, "#1A0830", 0.4)] } }),

  R("hammer-arm", 56, [
    L("Hammer-Arm", "target", 0, 22, { frame: 1, tracks: { y: K([0, -70], [10, -12, "in"], [22, -12]), rot: K([0, -30], [10, 0]), alpha: K([0, 0], [2, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("Hammer-Arm", "field-target", 10, 40, { frame: 3, tracks: { y: K([0, -8]), scale: K([0, 0.5], [30, 1.6, "out"]), alpha: K([0, 1], [30, 0]) }, z: 3 }),
  ], { hits: [10], screen: { shake: [shake(10, 14, 4)] } }),

  R("recover", 80, [
    L("Healing", "user", 0, 70, { frame: 0, maskActor: "user", scroll: { dx: 0, dy: -3 }, tracks: { alpha: fade(70, 8, 16, 0.55) } }),
    L("Healing", "user", 6, 74, { spawn: { count: 10, spread: [28, 24], interval: 5, frames: [1, 2, 3, 4], vy: -0.8, life: 20, seed: 2 }, tracks: { alpha: fade(20, 2, 8) }, z: 4 }),
  ], { react: "self" }),

  R("heat-wave", 90, [
    L("Fire-Spin", "user", 10, 76, { to: "target", spawn: { count: 10, spread: [30, 40], interval: 4, frames: [1, 2, 3], life: 20, seed: 6 }, tracks: { p: K([0, 0], [20, 1]), alpha: K([0, 0.8], [20, 0]) }, perTarget: true }),
  ], { bg: { asset: "Heat-Wave", frame: 0, start: 0, end: 86, scroll: { dx: 4, dy: 0 }, alpha: K([0, 0.75]) }, hits: [40], screen: { tint: [tint(0, 86, "#FF7A20", 0.15)] } }),

  R("helping-hand", 60, [
    L("Helping-Hand", "user", 0, 50, { frameSeq: seq([0, 2, 3, 5], 10, true), tracks: { x: K([0, -14]), y: K([0, -44]), alpha: fade(50) } }),
    L("Helping-Hand", "user", 0, 50, { frameSeq: seq([1, 4, 6, 4], 10, true), tracks: { x: K([0, 14]), y: K([0, -44]), alpha: fade(50) } }),
  ], { react: "self" }),

  R("hydro-pump", 80, [
    L("Hydro-Pump", "user", 0, 64, { ds: true, frameSeq: seq([0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13], 14), keepColor: true }),
  ], { bg: { asset: "Hydro-Pump", frame: 14, start: 14, end: 60, scroll: { dx: 8, dy: 0 }, alpha: K([0, 0.5]) }, hits: [30, 46], screen: { shake: [shake(30, 20, 2)] } }),
  R("hydro-cannon", 96, [
    L("Hydro-Pump", "user", 16, 80, { ds: true, frameSeq: seq([0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13], 14), keepColor: true }),
  ], { bg: { asset: "Hydro-Cannon-Back", frame: 0, start: 0, end: 90, scroll: { dx: -6, dy: 0 } }, hits: [46, 62], screen: { shake: [shake(46, 30, 5)] }, approx: true, note: "fundo do asset + jato de Hydro Pump" }),

  R("hypnosis", 70, [
    viaja("Hypnosis", 0, 30, { frameSeq: seq([4, 5, 6, 7], 8, true), spawn: { count: 4, spread: 0, interval: 6, life: 32, seed: 1 }, tracks: { scale: K([0, 0.4], [30, 1.3]), alpha: K([0, 1], [26, 1], [32, 0]) }, fim: 56 }),
  ], { hits: [32], react: "status" }),
  R("rest", 76, [
    L("Hypnosis", "user", 0, 70, { frameSeq: seq([0, 1, 2, 3], 8), spawn: { count: 3, spread: [6, 2], interval: 12, life: 40, seed: 2 }, tracks: { x: K([0, 14], [40, 30]), y: K([0, -26], [40, -70]), alpha: fade(40, 3, 10) }, z: 4 }),
  ], { react: "self" }),

  R("ice-shard", 52, [
    viaja("Ice-Shards", 0, 14, { spawn: { count: 6, spread: [6, 6], interval: 2, frames: r(0, 7), life: 16, seed: 2 }, fim: 30 }),
    L("Ice-Shards", "target", 16, 40, { spawn: { count: 8, spread: [4, 4], interval: 0, frames: r(24, 31), burst: 1.6, life: 18, seed: 3 }, tracks: { alpha: fade(18, 0, 6) }, z: 3 }),
  ], { hits: [16] }),
  R("ice-beam", 76, [
    viaja("Ice-Shards", 0, 12, { spawn: { count: 24, spread: [3, 3], interval: 2, frames: r(16, 23), life: 14, seed: 5 }, blend: "add", fim: 64 }),
    L("Ice-Shards", "target", 14, 70, { spawn: { count: 10, spread: [20, 20], interval: 5, frames: r(0, 7), life: 14, seed: 6 }, tracks: { scale: K([0, 0.4], [6, 1.2, "out"]), alpha: fade(14, 0, 6) }, z: 3 }),
  ], { hits: [14, 40, 62], screen: { tint: [tint(0, 72, "#BFE8FF", 0.2)] }, approx: true, note: "raio montado com cacos de gelo" }),
  R("blizzard", 96, [
    L("Ice-Shards", "screen-center", 0, 84, { spawn: { count: 40, spread: [150, 90], interval: 2, frames: r(0, 31), vx: -3, vy: 2.5, life: 22, seed: 7 }, tracks: { alpha: fade(22, 2, 6) }, z: 3 }),
  ], { hits: [30, 56], screen: { tint: [tint(0, 92, "#E8F6FF", 0.35)], shake: [shake(30, 40, 2)] }, approx: true, note: "nevasca com cacos de gelo cruzando a tela" }),

  R("iron-head", 56, [
    L("Iron-Head", "target", 12, 34, { frame: 6, tracks: { scale: K([0, 0.3], [10, 1.1, "out"]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("Iron-Head", "target", 12, 30, { frame: 7, tracks: { scale: K([0, 0.6], [18, 1.6]), alpha: K([0, 1], [18, 0]) }, z: 3 }),
    L("Iron-Head", "target", 14, 44, { spawn: { count: 6, spread: [4, 4], interval: 0, frames: r(0, 4), burst: 2, gravity: 0.2, life: 26, seed: 4 }, z: 3 }),
  ], { hits: [12], actor: [{ who: "user", t: 0, kind: "dash", dur: 22 }] }),

  R("mega-kick", 48, [
    L("Kick", "target", 0, 22, { frame: 1, tracks: { x: K([0, -40], [8, 0, "in"]), y: K([0, 12], [8, 0, "in"]), scale: K([0, 1.6], [8, 1]), alpha: K([0, 0], [2, 1], [16, 1], [22, 0]) }, z: 3 }),
  ], { hits: [8], actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }], screen: { shake: [shake(8, 8, 2)] } }),
  R("double-kick", 64, [
    L("Kick", "target", 0, 18, { frame: 1, tracks: { x: K([0, -40], [8, -6, "in"]), scale: K([0, 1.4], [8, 1]), alpha: K([0, 0], [2, 1], [12, 1], [18, 0]) }, z: 3 }),
    L("Kick", "target", 20, 38, { frame: 1, tracks: { x: K([0, -36], [8, 8, "in"]), y: K([0, -10]), scale: K([0, 1.4], [8, 1]), alpha: K([0, 0], [2, 1], [12, 1], [18, 0]) }, z: 3 }),
  ], { hits: [8, 28], actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }, { who: "user", t: 20, kind: "lunge", dur: 12 }] }),
  R("stomp", 48, [
    L("Kick", "target", 0, 26, { frame: 0, tracks: { y: K([0, -60], [10, -4, "in"]), scale: K([0, 1.3]), alpha: K([0, 0], [2, 1], [20, 1], [26, 0]) }, z: 3 }),
  ], { hits: [10], screen: { shake: [shake(10, 10, 3)] } }),

  R("last-resort", 70, [
    L("Last-Resort", "target", 0, 30, { spawn: { count: 4, spread: 0, interval: 0, frames: [0, 1, 2, 3] }, orbit: { rx: 40, ry: 26, speed: 14 }, tracks: { alpha: fade(30, 3, 4) } }),
    L("Last-Resort", "target", 30, 54, { frame: 4, tracks: { scale: K([0, 0.4], [10, 1.4, "out"]), alpha: K([0, 1], [16, 1], [24, 0]) }, z: 3 }),
  ], { hits: [30], actor: [{ who: "user", t: 14, kind: "dash", dur: 22 }] }),

  R("lava-plume", 90, [
    L("Lava-Plume", "field-target", 4, 70, { frameSeq: seq(r(0, 23), 30), spawn: { count: 10, spread: [70, 14], interval: 3, life: 26, seed: 3 }, tracks: { y: K([0, -16]) }, z: 3 }),
    L("Lava-Plume", "field-user", 0, 60, { frameSeq: seq(r(0, 23), 30), spawn: { count: 6, spread: [60, 10], interval: 4, life: 26, seed: 4 }, tracks: { y: K([0, -16]) }, perTarget: false }),
  ], { hits: [14, 32], screen: { tint: [tint(0, 86, "#5A1400", 0.3)], shake: [shake(10, 40, 3)] } }),
  R("overheat", 96, [
    L("Lava-Plume", "target", 6, 80, { frameSeq: seq(r(0, 23), 24), spawn: { count: 12, spread: [26, 26], interval: 3, life: 30, seed: 8 }, tracks: { scale: K([0, 1.4]) }, z: 3 }),
  ], { hits: [10, 30, 50], screen: { tint: [tint(0, 92, "#FFFFFF", 0.25)], flash: [flash(6, 8, "#FFD9A0", 0.5)], shake: [shake(8, 50, 4)] }, approx: true }),

  R("leaf-storm", 96, [
    viaja("Leaf-Storm", 6, 16, { spawn: { count: 26, spread: [26, 26], interval: 2, frames: r(1, 8), spin: 14, life: 18, seed: 2 }, fim: 70 }),
    L("Leaf-Storm", "target", 44, 76, { frameSeq: seq([9, 10, 11, 12], 10), tracks: { scale: K([0, 0.6], [32, 1.8]), alpha: fade(32, 2, 10) }, z: 3 }),
  ], { bg: { asset: "Leaf-Storm", frame: 0, start: 0, end: 90, scroll: { dx: -10, dy: 0 }, alpha: K([0, 0.85]) }, hits: [26, 44, 60] }),
  R("razor-leaf", 56, [
    viaja("Leaves", 0, 18, { spawn: { count: 4, spread: [10, 10], interval: 3, frames: r(0, 3), spin: 20, life: 20, seed: 4 }, arc: 10, fim: 34 }),
  ], { hits: [18, 24] }),

  R("leech-seed", 84, [
    viaja("Leech-Seed", 0, 24, { arc: 40, spawn: { count: 3, spread: [6, 4], interval: 3, frames: r(0, 5), life: 26, seed: 2 }, fim: 34 }),
    L("Leech-Seed", "field-target", 26, 78, { frameSeq: seq([6, 14, 10], 6), spawn: { count: 3, spread: [24, 2], interval: 3, seed: 3 }, tracks: { y: K([0, -14]), alpha: fade(52, 2, 10) } }),
  ], { hits: [26], react: "status" }),
  R("absorb", 70, [
    L("Leech-Seed", "target", 4, 64, { to: "user", spawn: { count: 10, spread: [16, 16], interval: 4, frames: [7, 8, 11, 15, 16], life: 22, seed: 3 }, tracks: { p: K([0, 0], [22, 1, "inout"]), alpha: fade(22, 2, 4) }, blend: "add", perTarget: true }),
    L("Leech-Seed", "user", 30, 70, { spawn: { count: 4, spread: [20, 20], interval: 8, frames: [9, 13], life: 12, seed: 4 }, tracks: { scale: K([0, 0.4], [6, 1], [12, 0.4]) }, blend: "add", z: 4 }),
  ], { hits: [4], approx: true, note: "orbes e brilhos de Leech Seed voltando ao usuário" }),

  R("lock-on", 60, [
    L("Lock-On", "target", 0, 54, { frameSeq: seq(r(0, 5), 8), tracks: { scale: K([0, 2.4], [24, 1, "out"]), alpha: fade(54, 2, 8) }, z: 4 }),
  ], { hits: [30], react: "status" }),

  R("magical-leaf", 70, [
    viaja("Magical-Leaf", 0, 24, { frameSeq: seq(r(0, 7), 16, true), arc: 30, spawn: { count: 5, spread: [12, 12], interval: 4, life: 26, seed: 3 }, fim: 44 }),
    L("Magical-Leaf", "target", 24, 60, { spawn: { count: 6, spread: [16, 16], interval: 4, frames: r(32, 35), life: 12, seed: 4 }, tracks: { scale: K([0, 0.4], [6, 1, "out"]), alpha: fade(12, 0, 4) }, z: 3 }),
  ], { hits: [26, 38] }),

  R("mean-look", 76, [
    L("Mean-Look", "target", 0, 70, { frameSeq: seq([0, 2, 3], 6), tracks: { x: K([0, -24]), y: K([0, -40]), scale: K([0, 1]), alpha: fade(70, 3, 10) }, z: 4, perTarget: false }),
    L("Mean-Look", "target", 0, 70, { frameSeq: seq([0, 1, 4], 6), tracks: { x: K([0, 24]), y: K([0, -40]), scale: K([0, 1]), alpha: fade(70, 3, 10) }, z: 4, perTarget: false, flipWithSide: false }),
  ], { hits: [30], react: "status", screen: { tint: [tint(0, 74, "#000000", 0.4)] } }),

  R("mud-bomb", 60, [
    viaja("Mud-Bomb", 0, 22, { frame: 0, arc: 40, tracks: { rot: K([0, 0], [22, 360]), scale: K([0, 0.5]) }, fim: 22 }),
    L("Mud-Sport", "target", 22, 50, { frameSeq: seq([3, 2], 10), tracks: { scale: K([0, 0.8], [28, 1.4]), alpha: fade(28, 0, 10) }, z: 3 }),
  ], { hits: [22], approx: true, note: "bola de Mud Bomb + respingo de Mud Sport" }),
  R("mud-shot", 84, [
    L("Mud-Shot", "user", 0, 72, { ds: true, frameSeq: seq([0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15], 14), keepColor: true }),
  ], { hits: [44, 60] }),
  R("mud-sport", 76, [
    L("Mud-Sport", "screen-center", 0, 70, { spawn: { count: 14, spread: [120, 40], interval: 4, frames: r(0, 7), vy: 1.8, life: 20, seed: 5 }, tracks: { y: K([0, -20]), alpha: fade(20, 2, 6) } }),
  ], { react: "self" }),

  R("needle-arm", 56, [
    L("Needle-Arn", "target", 0, 22, { frame: 41, tracks: { scale: K([0, 0.4], [8, 1.1, "out"]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("Needle-Arn", "target", 8, 40, { spawn: { count: 10, spread: [4, 4], interval: 0, frames: r(0, 23), burst: 2.4, life: 22, seed: 4 }, tracks: { alpha: fade(22, 0, 8) }, z: 3 }),
  ], { hits: [8], actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }] }),
  R("pin-missile", 70, [
    viaja("Needle-Arn", 0, 12, { frame: 6, orient: true, spawn: { count: 5, spread: [6, 8], interval: 6, life: 14, seed: 2 }, fim: 40 }),
  ], { hits: [12, 18, 24, 30, 36] }),

  R("nightmare", 80, [], { bg: { asset: "Nightmare", frame: 0, start: 0, end: 76, scroll: { dx: 1, dy: -1 }, alpha: K([0, 0.9]) }, hits: [24, 48], react: "status", actor: [{ who: "target", t: 20, kind: "shake", dur: 40 }] }),

  R("sing", 80, [
    viaja("Notes", 0, 40, { spawn: { count: 6, spread: [8, 8], interval: 6, frames: [0, 1, 2], life: 42, seed: 3 }, tracks: { y: K([0, 0], [10, -10, "inout"], [20, 6, "inout"], [30, -10, "inout"], [40, 0, "inout"]), alpha: fade(42, 3, 6) }, fim: 72 }),
  ], { hits: [44], react: "status" }),

  R("metronome", 70, [
    L("Point-Finger", "user", 0, 64, { frameSeq: seq([0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], 14, true), tracks: { x: K([0, 10]), y: K([0, -50]), alpha: fade(64) }, z: 4 }),
  ], { react: "self" }),

  R("poison-jab", 52, [
    L("Poison-Jab", "target", 0, 20, { spawn: { count: 8, spread: [50, 40], interval: 1, frames: r(0, 9), burst: -2.6, life: 16, seed: 2 }, tracks: { alpha: fade(16, 1, 2) }, z: 3 }),
    L("Poison-Jab", "target", 16, 34, { frameSeq: seq([10, 11, 12], 14), tracks: { alpha: fade(18, 0, 6) }, z: 3 }),
  ], { hits: [16], actor: [{ who: "user", t: 0, kind: "lunge", dur: 16 }] }),

  R("psychic", 80, [], { bg: { asset: "Psychic", frame: 0, start: 0, end: 76, scroll: { dx: 2, dy: 0 }, alpha: K([0, 0.85]) }, hits: [30, 50], actor: [{ who: "target", t: 26, kind: "shake", dur: 36 }] }),

  R("psycho-cut", 64, [
    L("Psycho-Cut", "user", 0, 28, { spawn: { count: 8, spread: 0, interval: 0, frames: r(4, 11) }, orbit: { rx: 30, ry: 22, speed: 16 }, tracks: { alpha: fade(28, 3, 4) } }),
    viaja("Psycho-Cut", 26, 14, { frameSeq: seq([0, 1, 2, 3], 12), orient: true, fim: 18 }),
  ], { hits: [40] }),

  R("rain-dance", 84, [
    L("Rain", "screen-center", 0, 76, { frame: 0, spawn: { count: 60, spread: [150, 100], interval: 1, vx: -2, vy: 9, life: 14, seed: 4 }, tracks: { alpha: K([0, 0.9]) }, z: 4 }),
  ], { react: "self", screen: { tint: [tint(0, 82, "#20305A", 0.35)] } }),

  R("rock-smash", 56, [
    punho("Close-Combat", 5, 0, { keepColor: true }),
    L("Rock-Smash", "target", 8, 46, { spawn: { count: 8, spread: [6, 6], interval: 0, frames: [0, 1, 4, 5, 9, 10, 11, 12], burst: 2.2, gravity: 0.25, life: 34, seed: 3 }, z: 3 }),
  ], { hits: [8], actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }], screen: { shake: [shake(8, 10, 3)] }, approx: true, note: "punho de Close Combat + pedras" }),
  R("rock-tomb", 70, [
    L("Rock-Tomb", "target", 0, 50, { spawn: { count: 4, spread: [30, 4], interval: 6, frames: r(4, 7), life: 30, seed: 3 }, tracks: { y: K([0, -140], [12, 10, "in"], [16, 6], [30, 6]), alpha: K([0, 1], [24, 1], [30, 0]) }, z: 3 }),
  ], { hits: [12, 18, 24, 30], screen: { shake: [shake(12, 26, 3)] } }),

  R("sacred-fire", 86, [
    L("Sacred-Fire", "field-target", 8, 76, { spawn: { count: 16, spread: [34, 6], interval: 4, frames: [3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16], vy: -1.6, life: 18, seed: 3 }, tracks: { alpha: fade(18, 2, 6) }, z: 3 }),
  ], { bg: { asset: "Sacred-Fire", frame: 34, start: 0, end: 80, scroll: { dx: 0, dy: -2 }, alpha: K([0, 0.8]) }, hits: [16, 40], screen: { shake: [shake(16, 30, 3)] } }),
  R("aura-sphere", 66, [
    L("Sacred-Fire", "user", 0, 16, { frameSeq: seq([27, 17, 7], 10), tracks: { scale: K([0, 0.4], [16, 0.7]) }, blend: "add" }),
    viaja("Sacred-Fire", 16, 22, { frameSeq: seq([8, 18], 10, true), tracks: { scale: K([0, 0.7]) }, blend: "add", fim: 22, ease: "in" }),
    L("Sacred-Fire", "target", 38, 58, { frame: 2, tracks: { scale: K([0, 0.6], [20, 1.8]), alpha: K([0, 1], [20, 0]) }, blend: "add", z: 3 }),
  ], { hits: [38], approx: true, note: "orbes da folha de Sacred Fire" }),

  R("scary-face", 76, [
    L("Scary-Face-Transparent", "target", 6, 70, { frame: 15, tracks: { y: K([0, -10]), scale: K([0, 1], [40, 2.2]), alpha: K([0, 0], [10, 0.5], [40, 0]) }, z: 4, perTarget: false }),
    L("Scary-Face-Reg", "target", 0, 70, { frameSeq: seq([12, 13, 14, 15], 8), tracks: { y: K([0, -10]), alpha: fade(70, 2, 10) }, z: 4, perTarget: false }),
  ], { hits: [28], react: "status", screen: { tint: [tint(0, 74, "#10001A", 0.4)] } }),

  R("foresight", 60, [
    L("Scope", "target", 0, 54, { frame: 0, tracks: { x: K([0, -30], [18, 30, "inout"], [36, 0, "inout"]), y: K([0, -8], [18, 6, "inout"], [36, 0]), scale: K([0, 1.6]), alpha: fade(54) }, z: 4 }),
  ], { hits: [40], react: "status" }),

  R("scratch", 40, [
    L("Scratch-Shadow-Claw", "target", 2, 22, { frame: 5, tracks: { scale: K([0, 0.4], [6, 1.1, "out"]), alpha: K([0, 1], [14, 1], [20, 0]) }, z: 3 }),
    L("Scratch-Shadow-Claw", "target", 6, 30, { spawn: { count: 6, spread: [10, 10], interval: 1, frames: [6, 7, 8, 9], burst: 1.6, life: 18, seed: 2 }, z: 3 }),
  ], { hits: [6] }),
  R("shadow-claw", 48, [
    L("Scratch-Shadow-Claw", "target", 6, 26, { frame: 0, tracks: { scale: K([0, 0.4], [6, 1.2, "out"]), alpha: K([0, 1], [14, 1], [20, 0]) }, z: 3 }),
    L("Scratch-Shadow-Claw", "target", 10, 34, { spawn: { count: 6, spread: [10, 10], interval: 1, frames: [1, 2, 3, 4], burst: 1.6, life: 18, seed: 2 }, z: 3 }),
  ], { hits: [10], actor: [{ who: "user", t: 0, kind: "lunge", dur: 16 }] }),

  R("seed-flare", 96, [
    L("Seed-Flare", "user", 0, 84, { ds: true, frameSeq: seq(r(0, 9), 8), keepColor: true }),
  ], { hits: [44, 60], screen: { shake: [shake(44, 30, 3)], tint: [tint(0, 90, "#0A2A20", 0.25)] } }),

  R("shadow-ball", 100, [
    L("Shadow-Ball", "user", 0, 92, { ds: true, frameSeq: seq([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21], 15), keepColor: true }),
  ], { hits: [60], screen: { shake: [shake(60, 14, 3)] } }),

  R("shadow-force", 84, [
    L("Shadow-Force", "user", 0, 22, { frame: 0, tracks: { scale: K([0, 0.4], [16, 1.4, "out"]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("Shadow-Force", "target", 40, 60, { frame: 1, tracks: { scale: K([0, 0.4], [14, 1.6, "out"]), alpha: K([0, 1], [14, 1], [20, 0]) }, z: 3 }),
    L("Shadow-Force", "target", 44, 70, { spawn: { count: 6, spread: [4, 4], interval: 1, frames: [2, 3, 4, 5], burst: 1.8, life: 22, seed: 4 }, z: 3 }),
  ], { hits: [44], actor: [{ who: "user", t: 4, kind: "hide", dur: 56 }], screen: { tint: [tint(0, 80, "#000000", 0.45)] } }),

  R("seismic-toss", 96, [
    L("Siesmic-Toss", "target", 0, 70, { spawn: { count: 14, spread: [40, 20], interval: 3, frames: r(0, 16), vy: -7, life: 14, seed: 3 }, tracks: { alpha: fade(14, 2, 4) } }),
  ], { bg: { asset: "Siesmic-Toss", frame: 17, start: 0, end: 90, alpha: K([0, 0.9]) }, hits: [58], actor: [{ who: "target", t: 16, kind: "hop", dur: 44 }], screen: { shake: [shake(58, 16, 5)] } }),

  R("spacial-rend", 86, [
    L("Spacial-Rend", "target", 20, 50, { spawn: { count: 8, spread: [26, 26], interval: 3, frames: r(0, 7), life: 12, seed: 2 }, tracks: { scale: K([0, 0.6], [6, 1.4, "out"]), alpha: fade(12, 0, 4) }, z: 3 }),
    L("Spacial-Rend", "target", 44, 70, { frame: 8, tracks: { scale: K([0, 0.4], [14, 1.6, "out"]), alpha: K([0, 1], [26, 0]) }, z: 3 }),
  ], { bg: { asset: "Spacial-Rend", frames: [9, 10], fps: 8, start: 0, end: 80, alpha: K([0, 0.85]) }, hits: [24, 44], screen: { flash: [flash(44, 8, "#F0C8FF", 0.5)], shake: [shake(44, 18, 4)] } }),

  R("quick-attack", 48, [], { bg: { asset: "Speed-Attack-Back", frame: 0, start: 0, end: 34, scroll: { dx: -14, dy: 0 }, alpha: K([0, 0.85]) }, hits: [12], actor: [{ who: "user", t: 0, kind: "dash", dur: 22 }] }),
  R("agility", 60, [], { bg: { asset: "Speed-Attack-Back", frame: 0, start: 0, end: 56, scroll: { dx: -14, dy: 0 }, alpha: K([0, 0.7]) }, react: "self", actor: [{ who: "user", t: 6, kind: "blink", dur: 40 }] }),

  R("spikes", 60, [
    L("Spikes", "user", 0, 56, { to: "field-target", arc: 50, spawn: { count: 3, spread: [24, 2], interval: 4, life: 40, seed: 1 }, tracks: { p: K([0, 0], [22, 1, "in"]), scale: K([0, 1.4]), alpha: K([0, 1], [34, 1], [40, 0]) } }),
  ], { react: "none" }),

  R("stone-edge", 70, [
    L("Srone-Edge", "field-target", 4, 30, { frame: 0, spawn: { count: 3, spread: [26, 4], interval: 3, seed: 2 }, tracks: { y: K([0, 30], [8, -50, "out"], [20, -50]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("Srone-Edge", "target", 14, 40, { spawn: { count: 6, spread: [4, 4], interval: 0, frames: [2, 3, 5], burst: 2.2, gravity: 0.25, life: 26, seed: 3 }, z: 3 }),
    L("Srone-Edge", "target", 14, 30, { frameSeq: seq([1, 4], 10), tracks: { alpha: fade(16, 0, 6) }, blend: "add", z: 3 }),
  ], { hits: [14], screen: { shake: [shake(14, 14, 4)] } }),

  // mudanças de atributo (fallback dos BUFF/DEBUFF sem asset próprio)
  R("_stat-up", 60, [
    L("Status", "user", 0, 56, { frame: 0, maskActor: "user", scroll: { dx: 0, dy: -2.5 }, tracks: { alpha: fade(56, 6, 14, 0.6) } }),
  ], { react: "self" }),
  R("_stat-down", 60, [
    L("Status", "target", 0, 56, { frame: 1, maskActor: "target", scroll: { dx: 0, dy: 2.5 }, tracks: { alpha: fade(56, 6, 14, 0.6) } }),
  ], { hits: [20], react: "status" }),

  R("substitute", 80, [
    L("Substitute-Back", "field-user", 20, 76, { assetVirado: "Substitute-Front", frame: 0, tracks: { y: K([0, -20], [8, -34, "out"], [16, -20, "in"]), scale: K([0, 0.4], [8, 1, "out"]), alpha: fade(56, 2, 10) }, flipWithSide: false }),
  ], { react: "self", actor: [{ who: "user", t: 0, kind: "hide", dur: 76 }] }),

  R("sucker-punch", 48, [
    viaja("Sucker-Punch", 0, 10, { frameSeq: seq([0, 1], 12, true), fim: 12 }),
    L("Sucker-Punch", "target", 10, 32, { spawn: { count: 6, spread: [4, 4], interval: 0, frames: [2, 3, 4, 5], burst: 2, life: 20, seed: 2 }, z: 3 }),
  ], { hits: [10], actor: [{ who: "user", t: 0, kind: "dash", dur: 18 }] }),

  // Surf: a onda (metades esquerda/direita, das linhas largas às estreitas) sai do lado do usuário e quebra no alvo
  (() => {
    const esq = [13, 11, 9, 7, 5, 3, 0];
    const dir = [14, 12, 10, 8, 6, 4, 1];
    const larg = [227, 208, 188, 159, 145, 130, 106];
    const passo = 8;
    const degraus = (sinal) => K(...larg.flatMap((w, i) => [[i * passo, (sinal * w) / 2], [i * passo + passo - 0.01, (sinal * w) / 2]]));
    const onda = (asset, frames, sinal, t0, alpha) =>
      L(asset, "field-user", t0, t0 + 60, { to: "field-target", frameSeq: seq(frames, 60 / passo), flipWithSide: false, tracks: { x: degraus(sinal), y: K([0, -10], [56, -40]), p: K([0, 0], [56, 1, "out"]), alpha: K([0, 0], [4, alpha], [50, alpha], [60, 0]) }, perTarget: false });
    return R("surf", 90, [
      onda("Surf-Regular", esq, -1, 0, 1),
      onda("Surf-Regular", dir, 1, 0, 1),
      onda("Surf-Transparent", esq, -1, 10, 0.6),
      onda("Surf-Transparent", dir, 1, 10, 0.6),
    ], { bg: { asset: "Surf-Regular", frame: 2, start: 10, end: 80, scroll: { dx: 0, dy: -3 }, alpha: K([0, 0.6]) }, hits: [48] });
  })(),

  R("swagger", 64, [
    L("Swagger", "target", 0, 50, { frame: 0, spawn: { count: 3, spread: [20, 12], interval: 10, life: 20, seed: 2 }, tracks: { x: K([0, 10]), y: K([0, -26]), scale: K([0, 0], [4, 1.8, "out"], [8, 1.3]), alpha: fade(20, 0, 6) }, z: 4 }),
  ], { hits: [20], react: "status" }),

  R("swift", 60, [
    viaja("Swift", 0, 18, { frame: 0, spawn: { count: 6, spread: [8, 8], interval: 3, spin: 12, life: 20, seed: 2 }, arc: 14, fim: 40 }),
  ], { hits: [18, 30] }),

  R("swords-dance", 80, [
    L("Swords-Dance", "user", 0, 64, { spawn: { count: 5, spread: 0, interval: 0, frames: r(0, 4) }, orbit: { rx: 38, ry: 14, speed: 12 }, tracks: { alpha: fade(64, 6, 10) } }),
    L("Swords-Dance", "user", 50, 76, { spawn: { count: 6, spread: [24, 24], interval: 2, frames: [5, 6, 7], life: 12, seed: 3 }, tracks: { scale: K([0, 0.4], [6, 1.2, "out"], [12, 0.4]) }, blend: "add", z: 4 }),
  ], { react: "self" }),

  R("kinesis", 70, [
    L("Telekineses", "user", 0, 60, { frameSeq: seq([0, 1, 2, 3], 6), tracks: { x: K([0, 12]), y: K([0, -46]), scale: K([0, 1.4]), alpha: fade(60) }, z: 4 }),
  ], { hits: [36], react: "status" }),

  R("trick-room", 90, [], { bg: { asset: "Trick-Room", frame: 0, start: 0, end: 86, alpha: K([0, 0], [16, 1], [70, 1], [86, 0]) }, react: "self", screen: { flash: [flash(16, 8, "#FFFFFF", 0.4)], tint: [tint(0, 86, "#2A0A40", 0.3)] } }),

  R("water-pulse", 70, [
    viaja("Water-Pulse", 4, 22, { frameSeq: seq([0, 1], 8, true), spawn: { count: 3, spread: 0, interval: 6, life: 24, seed: 1 }, tracks: { scale: K([0, 0.3], [22, 1.2]), alpha: K([0, 1], [20, 1], [24, 0]) }, fim: 40 }),
    L("Water-Pulse", "target", 26, 56, { spawn: { count: 8, spread: [10, 10], interval: 1, frames: r(2, 7), burst: 1.2, vy: -0.6, life: 22, seed: 2 }, z: 3 }),
  ], { bg: { asset: "Water-Pulse", frame: 8, start: 0, end: 64, alpha: K([0, 0.75]) }, hits: [26] }),
  R("bubble-beam", 66, [
    viaja("Water-Pulse", 0, 14, { spawn: { count: 16, spread: [6, 6], interval: 2, frames: r(2, 7), life: 16, seed: 3 }, fim: 50 }),
  ], { hits: [14, 30, 44], approx: true, note: "bolhas da folha de Water Pulse" }),
  R("water-sport", 66, [
    L("Water-Sport", "field-user", 0, 56, { spawn: { count: 6, spread: [40, 6], interval: 6, frames: [0, 1], life: 22, seed: 2 }, tracks: { y: K([0, -20], [22, 0, "in"]), alpha: fade(22, 2, 8) } }),
    L("Water-Sport", "field-user", 6, 60, { spawn: { count: 10, spread: [40, 6], interval: 4, frames: [12, 13, 14], vy: 2, life: 16, seed: 3 }, tracks: { y: K([0, -40]) } }),
  ], { react: "self" }),
  R("splash", 64, [
    L("Water-Sport", "field-user", 0, 56, { spawn: { count: 10, spread: [20, 4], interval: 4, frames: [12, 13, 14], vy: -2, gravity: 0.15, life: 26, seed: 4 }, tracks: { y: K([0, -6]) } }),
  ], { react: "none", actor: [{ who: "user", t: 0, kind: "hop", dur: 16 }, { who: "user", t: 18, kind: "hop", dur: 16 }, { who: "user", t: 36, kind: "hop", dur: 16 }] }),
  R("waterfall", 70, [
    L("Waterfall", "target", 24, 50, { frameSeq: seq([1, 2, 3], 10), tracks: { scale: K([0, 0.8], [26, 2]), alpha: K([0, 1], [26, 0]) }, z: 3 }),
    L("Waterfall", "target", 26, 56, { spawn: { count: 8, spread: [6, 6], interval: 0, frames: [4, 5], burst: 2, gravity: 0.2, life: 26, seed: 2 }, z: 3 }),
  ], { bg: { asset: "Waterfall", frame: 6, start: 0, end: 60, scroll: { dx: 0, dy: 8 }, alpha: K([0, 0.85]) }, hits: [26], actor: [{ who: "user", t: 8, kind: "dash", dur: 26 }] }),
  R("whirlpool", 90, [
    L("Whirlpool", "target", 0, 80, { spawn: { count: 10, spread: 0, interval: 0, frames: r(0, 4) }, orbit: { rx: 40, ry: 14, speed: 10 }, tracks: { y: K([0, 16], [80, -10]), alpha: fade(80, 6, 12) } }),
  ], { bg: { asset: "Whirlpool", frame: 5, start: 0, end: 86, alpha: K([0, 0.7]) }, hits: [20, 50] }),

  R("wood-hammer", 64, [
    L("Wood-Hammer", "target", 14, 32, { frame: 0, tracks: { scale: K([0, 0.5], [6, 1.2, "out"]), alpha: K([0, 1], [12, 1], [18, 0]) }, z: 3 }),
    L("Wood-Hammer", "field-target", 18, 44, { frameSeq: seq([4, 8], 6), tracks: { y: K([0, -12]), scale: K([0, 0.6], [26, 1.4]), alpha: K([0, 1], [26, 0]) }, z: 3 }),
    L("Wood-Hammer", "target", 16, 50, { spawn: { count: 8, spread: [6, 6], interval: 0, frames: [1, 2, 5, 6, 7, 9, 10, 11, 12], burst: 2.2, gravity: 0.25, life: 30, seed: 3 }, z: 3 }),
  ], { hits: [16], actor: [{ who: "user", t: 0, kind: "dash", dur: 26 }], screen: { shake: [shake(16, 14, 4)] } }),

  R("worry-seed", 60, [
    viaja("Worry-Seed", 0, 20, { frame: 2, arc: 36, tracks: { rot: K([0, 0], [20, 360]) }, fim: 20 }),
    L("Worry-Seed", "target", 20, 52, { frameSeq: seq([0, 1], 8), tracks: { y: K([0, -10], [32, -30]), scale: K([0, 0.5], [10, 1.1, "out"]), alpha: fade(32, 0, 12) }, z: 3 }),
  ], { hits: [20], react: "status" }),
  R("sleep-powder", 76, [
    L("Worry-Seed", "target", 0, 64, { spawn: { count: 8, spread: [30, 6], interval: 5, frames: [0, 1], vy: 1, life: 28, seed: 3 }, tracks: { y: K([0, -50]), scale: K([0, 0.5]), alpha: fade(28, 4, 10, 0.8) }, z: 3 }),
  ], { hits: [40], react: "status", approx: true, note: "nuvens de Worry Seed como pó" }),

  R("x-scissor", 48, [
    L("X-Scizzor", "target", 4, 26, { frame: 0, tracks: { scale: K([0, 0.3], [6, 1, "out"]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
    L("X-Scizzor", "target", 8, 30, { frame: 0, tracks: { rot: K([0, 90]), scale: K([0, 0.3], [6, 1, "out"]), alpha: K([0, 1], [16, 1], [22, 0]) }, z: 3 }),
  ], { hits: [8, 12], actor: [{ who: "user", t: 0, kind: "dash", dur: 20 }] }),

  R("block", 60, [
    L("X", "target", 0, 54, { frame: 0, tracks: { scale: K([0, 2.4], [8, 1.2, "in"], [12, 1.4]), alpha: fade(54, 2, 10) }, z: 4 }),
  ], { hits: [8], react: "status" }),
];

// Golpes sem asset que reaproveitam uma receita (com recolor pela paleta do tipo do golpe
// quando o tipo difere do golpe original). Chave: golpe; valor: receita.
export const REUSO = {
  // socos, chutes, mordidas
  "thunder-punch": "fire-punch", "ice-punch": "fire-punch",
  "mega-punch": "rock-smash", "comet-punch": "rock-smash", "mach-punch": "rock-smash", "dizzy-punch": "rock-smash", "focus-punch": "dynamic-punch", "sky-uppercut": "rock-smash",
  "drain-punch": "absorb", "bullet-punch": "rock-smash", "shadow-punch": "shadow-claw", "meteor-mash": "iron-head", "brick-break": "hammer-arm", "arm-thrust": "close-combat", "karate-chop": "cut", "cross-chop": "x-scissor",
  "low-kick": "mega-kick", "rolling-kick": "mega-kick", "jump-kick": "mega-kick", "high-jump-kick": "mega-kick", "triple-kick": "double-kick", "blaze-kick": "mega-kick",
  "bite": "crunch", "hyper-fang": "crunch", "super-fang": "crunch", "fire-fang": "crunch", "ice-fang": "crunch", "thunder-fang": "crunch", "poison-fang": "crunch",
  "slash": "cut", "fury-cutter": "cut", "night-slash": "x-scissor", "cross-poison": "x-scissor", "leaf-blade": "psycho-cut", "air-slash": "psycho-cut", "air-cutter": "psycho-cut", "razor-wind": "psycho-cut",
  "fury-swipes": "scratch", "metal-claw": "scratch", "crush-claw": "shadow-claw", "hone-claws": "swords-dance",
  // cabeçadas e investidas
  "headbutt": "iron-head", "zen-headbutt": "iron-head", "head-smash": "iron-head", "heavy-slam": "iron-head", "take-down": "giga-impact", "double-edge": "giga-impact", "volt-tackle": "flare-blitz", "brave-bird": "flare-blitz", "wild-charge": "flare-blitz", "head-charge": "giga-impact",
  "extreme-speed": "quick-attack", "aqua-jet": "quick-attack", "feint": "quick-attack", "u-turn": "quick-attack",
  "feint-attack": "sucker-punch", "assurance": "sucker-punch", "payback": "sucker-punch", "pursuit": "sucker-punch",
  "body-slam": "stomp",
  // projéteis e raios
  "sludge-bomb": "mud-bomb", "sludge": "mud-bomb", "mud-slap": "mud-bomb", "seed-bomb": "worry-seed", "egg-bomb": "mud-bomb",
  "poison-sting": "pin-missile", "twineedle": "pin-missile", "spike-cannon": "pin-missile", "rock-blast": "rock-tomb", "rock-slide": "rock-tomb", "rock-throw": "rock-tomb", "rock-wrecker": "rock-tomb",
  "icicle-spear": "ice-shard", "ice-ball": "ice-shard", "powder-snow": "blizzard", "icy-wind": "blizzard", "sheer-cold": "blizzard",
  "bubble": "bubble-beam", "water-gun": "bubble-beam", "octazooka": "mud-shot", "muddy-water": "surf", "water-spout": "hydro-pump", "brine": "water-pulse",
  "magma-storm": "fire-spin", "flame-charge": "flare-blitz", "incinerate": "flamethrower", "inferno": "fire-blast",
  "psybeam": "psychic", "confusion": "psychic", "extrasensory": "psychic", "psyshock": "psychic", "psystrike": "psychic", "stored-power": "psychic",
  "dark-pulse": "shadow-ball", "dragon-pulse": "aura-sphere", "dream-eater": "nightmare", "ominous-wind": "shadow-ball", "hex": "nightmare", "shadow-sneak": "shadow-force",
  "giga-drain": "absorb", "mega-drain": "absorb", "horn-leech": "absorb",
  "solar-beam": "flash-cannon", "mirror-shot": "flash-cannon", "charge-beam": "flash-cannon", "signal-beam": "flash-cannon",
  "petal-dance": "magical-leaf", "leaf-tornado": "leaf-storm",
  "earth-power": "fissure", "magnitude": "earthquake", "bulldoze": "earthquake",
  "vital-throw": "seismic-toss", "circle-throw": "seismic-toss", "storm-throw": "seismic-toss", "submission": "seismic-toss",
  "roar-of-time": "spacial-rend",
  // status e campo
  "roar": "growl", "screech": "growl", "supersonic": "growl", "uproar": "growl", "snarl": "growl", "hyper-voice": "growl", "echoed-voice": "growl", "metal-sound": "growl",
  "perish-song": "sing", "grass-whistle": "sing", "snore": "rest", "sleep-talk": "rest", "yawn": "rest", "round": "sing", "relic-song": "sing",
  "mind-reader": "lock-on", "odor-sleuth": "foresight", "miracle-eye": "foresight",
  "glare": "mean-look", "leer": "scary-face",
  "taunt": "swagger", "flatter": "swagger", "torment": "block", "embargo": "block", "heal-block": "block", "imprison": "block",
  "spite": "grudge", "telekinesis": "kinesis", "follow-me": "metronome",
  "wonder-room": "trick-room", "magic-room": "trick-room",
  "toxic-spikes": "spikes", "stealth-rock": "spikes",
  "stun-spore": "sleep-powder", "poison-powder": "sleep-powder", "spore": "sleep-powder", "cotton-spore": "sleep-powder", "rage-powder": "sleep-powder",
  "soft-boiled": "recover", "milk-drink": "recover", "roost": "recover", "slack-off": "recover", "synthesis": "recover", "moonlight": "recover", "morning-sun": "recover", "wish": "recover", "heal-pulse": "recover", "aqua-ring": "recover", "ingrain": "recover",
  "bounce": "fly", "sky-drop": "fly", "dive": "whirlpool",
  "sweet-kiss": "confuse-ray",
};

// Arquétipos que, sem receita própria, usam a textura de mudança de atributo do DP (em vez
// do procedural): a textura laranja/azul correndo dentro da silhueta do Pokémon.
export const REUSO_ARQUETIPO = { BUFF: "_stat-up", DEBUFF: "_stat-down" };
