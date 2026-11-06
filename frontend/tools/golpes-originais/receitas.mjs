// Sprites originais de golpes (assets/golpes-originais, desenhados por código em
// tools/golpes-originais/*.py, sem pixel dos jogos) e as receitas que os tocam.
//
// gerarOriginais() copia cada folha para public/fx/Og-<arquivo>.png e funde no atlas. As folhas
// vêm com 2 px de espaço entre os quadros (o formato de entrega); o atlas aponta cada quadro
// direto, então nada é recortado. Os overlays de tela cheia (terrenos) ganham também uma folha
// "-v" girada 180°, porque o player gira os quadros de tela do DS quando o inimigo ataca e o
// terreno tem de continuar no chão.
//
// RECEITAS_OG: uma receita por golpe, com `pixel: true` e o arquétipo para o mapa (os golpes do
// lote 1 são das gerações 6–9, fora do catálogo: entram no mapa pelo slug do pokedex.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { RECEITAS as RECEITAS_DP, REUSO, REUSO_ARQUETIPO } from "../receitas.mjs";
import { POR_SLUG } from "../../src/components/poke/golpes/catalogo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(RAIZ, "assets/golpes-originais");
const OUT = path.join(RAIZ, "public/fx");
const ATLAS = path.join(OUT, "fx-atlas.json");
const GAP = 2;
const TELA_CHEIA = new Set(["misty-terrain", "grassy-terrain"]);

export const nomeOg = (arq) => `Og-${arq.replace(/\.png$/, "")}`;

function girar180(png) {
  const out = new PNG({ width: png.width, height: png.height });
  const n = png.width * png.height;
  for (let i = 0; i < n; i++) png.data.copy(out.data, (n - 1 - i) * 4, i * 4, i * 4 + 4);
  return out;
}

export function gerarOriginais() {
  const man = JSON.parse(fs.readFileSync(path.join(SRC, "manifesto.json"), "utf8"));
  const atlas = fs.existsSync(ATLAS) ? JSON.parse(fs.readFileSync(ATLAS, "utf8")) : { versao: 1, base: "256x192", arquivos: {} };
  for (const k of Object.keys(atlas.arquivos)) if (k.startsWith("Og-")) delete atlas.arquivos[k];
  for (const f of fs.readdirSync(OUT)) if (f.startsWith("Og-")) fs.rmSync(path.join(OUT, f));
  const entrada = (arquivo, png, { w, h, n }) => ({
    arquivo,
    tipo: "sprite-frames",
    w: png.width,
    h: png.height,
    celula: [w, h],
    quadros: Array.from({ length: n }, (_, i) => ({ x: i * (w + GAP), y: 0, w, h, ox: 0, oy: 0, px: w / 2, py: h / 2 })),
  });
  for (const [arq, info] of Object.entries(man)) {
    const png = PNG.sync.read(fs.readFileSync(path.join(SRC, arq)));
    if (png.width !== info.n * info.w + (info.n - 1) * GAP || png.height !== info.h) throw new Error(`${arq}: tamanho ${png.width}×${png.height} não bate com o manifesto`);
    const nome = nomeOg(arq);
    fs.copyFileSync(path.join(SRC, arq), path.join(OUT, `${nome}.png`));
    atlas.arquivos[nome] = entrada(`${nome}.png`, png, info);
    if (TELA_CHEIA.has(arq.replace(/\.png$/, ""))) {
      // girar a tira inteira inverte a ordem dos quadros: reordena para o quadro i continuar i
      const g = girar180(png);
      const v = new PNG({ width: png.width, height: png.height });
      for (let i = 0; i < info.n; i++) PNG.bitblt(g, v, (info.n - 1 - i) * (info.w + GAP), 0, info.w, info.h, i * (info.w + GAP), 0);
      fs.writeFileSync(path.join(OUT, `${nome}-v.png`), PNG.sync.write(v));
      atlas.arquivos[`${nome}-v`] = entrada(`${nome}-v.png`, v, info);
    }
  }
  fs.writeFileSync(ATLAS, JSON.stringify(atlas, null, 1));
  return Object.keys(man).length;
}

// ---------- ajudantes ----------
const k = (...pares) => ({ keys: pares.map(([t, v, ease]) => (ease ? { t, v, ease } : { t, v })) });
const fade = (fim, entra = 3, sai = 6) => k([0, 0], [entra, 1], [Math.max(entra, fim - sai), 1], [fim, 0]);
const seq = (frames, fps, loop = false) => ({ frames, fps, ...(loop ? { loop: true } : {}) });
const intervalo = (n) => Array.from({ length: n }, (_, i) => i);
const L = (asset, o) => ({ asset: nomeOg(`${asset}.png`), keepColor: true, ...o });
// viagem usuário → alvo durante [start, end]
const viagem = (asset, start, end, { ease, tracks, ...o } = {}) =>
  L(asset, { anchor: "user", to: "target", start, end, ...o, tracks: { p: k([0, 0], [end - start, 1, ease]), alpha: fade(end - start, 2, 2), ...(tracks ?? {}) } });
const noAlvo = (asset, start, n, fps, o = {}) => {
  const dur = Math.ceil((n * 60) / fps);
  return L(asset, { anchor: "target", start, end: start + dur, frameSeq: seq(intervalo(n), fps), z: 3, ...o, tracks: { alpha: fade(dur, 1, 4), ...(o.tracks ?? {}) } });
};
// queda de atributo genérica (a mesma textura da receita _stat-down) por cima do efeito próprio
const quedaAtributo = (start) => ({
  asset: "Status",
  anchor: "target",
  start,
  end: start + 50,
  frame: 1,
  maskActor: "target",
  scroll: { dx: 0, dy: 2.5 },
  tracks: { alpha: k([0, 0], [6, 0.6], [38, 0.6], [50, 0]) },
});
const subidaAtributoOg = (start) => ({
  asset: "Status",
  anchor: "user",
  start,
  end: start + 50,
  frame: 0,
  maskActor: "user",
  scroll: { dx: 0, dy: -2.5 },
  tracks: { alpha: k([0, 0], [6, 0.6], [38, 0.6], [50, 0]) },
});
const tremor = (t, dur, amp) => ({ shake: [{ t, dur, amp }] });

const R = (slug, arquetipo, note, corpo) => ({ slug, pixel: true, arquetipo, note: `pixel art própria (original): ${note}`, ...corpo });

// ---------- lote 1 ----------
export const RECEITAS_OG = [
  R("spiky-shield", "FIELD", "domo verde de espinhos em volta do usuário", {
    duration: 64,
    layers: [L("spiky-shield", { anchor: "user", start: 0, end: 64, frameSeq: seq([0, 1, 2, 3], 10), z: 3, tracks: { scale: k([0, 1.5]), alpha: fade(64, 3, 10) } })],
    hits: [12],
    react: "self",
  }),
  R("mystical-fire", "PROJ", "orbe de chama violeta em espiral com runas", {
    duration: 54,
    layers: [viagem("mystical-fire--projetil", 0, 26, { frameSeq: seq(intervalo(6), 20, true) }), noAlvo("mystical-fire--impacto", 26, 5, 18)],
    hits: [27],
  }),
  R("water-shuriken", "PROJ", "shurikens d'água girando, em sequência", {
    duration: 56,
    layers: [0, 7, 14].flatMap((t0, i) => [
      viagem("water-shuriken--projetil", t0, t0 + 16, { frame: 0, tracks: { rot: k([0, 0], [16, 720]) }, ...(i === 1 ? { arc: 10 } : {}) }),
      noAlvo("water-shuriken--impacto", t0 + 16, 4, 20, { tracks: { x: k([0, (i - 1) * 8]), y: k([0, (1 - i) * 5]), alpha: fade(12, 1, 4) } }),
    ]),
    hits: [17, 24, 31],
  }),
  R("leafage", "PROJ", "folhinhas soltas voando até o alvo", {
    duration: 44,
    layers: [
      L("leafage", { anchor: "user", to: "target", start: 0, end: 26, spawn: { count: 7, spread: [6, 8], interval: 3, life: 18, seed: 4, spin: 14, frames: [0, 1, 2, 3] }, tracks: { p: k([0, 0], [18, 1]), alpha: fade(18, 1, 3) } }),
    ],
    hits: [18, 30],
  }),
  R("phantom-force", "STRIKE", "some, abre uma fenda atrás do alvo e acerta em X", {
    duration: 76,
    layers: [
      L("phantom-force--portal", { anchor: "target", start: 8, end: 44, frameSeq: seq([0, 1, 2, 3, 3, 3, 2, 1, 0], 15), z: 1, tracks: { x: k([0, 24]), alpha: fade(36, 2, 6) } }),
      noAlvo("phantom-force--impacto", 40, 4, 15),
    ],
    actor: [
      { who: "user", t: 0, kind: "hide", dur: 70 },
    ],
    hits: [42],
    screen: tremor(42, 8, 2),
  }),
  R("spirit-shackle", "PROJ", "flecha-sombra crava sob o alvo e correntes o prendem", {
    duration: 76,
    layers: [
      L("spirit-shackle--flecha", { anchor: "user", to: "field-target", start: 0, end: 20, frame: 0, orient: true, arc: 18, tracks: { p: k([0, 0], [20, 1, "in"]), alpha: fade(20, 2, 1) } }),
      L("spirit-shackle--correntes", { anchor: "field-target", start: 20, end: 76, frameSeq: seq([0, 1, 2, 3, 2, 3, 2, 3], 9), z: 3, tracks: { y: k([0, -6]), alpha: fade(56, 1, 10) } }),
    ],
    hits: [20],
  }),
  R("darkest-lariat", "STRIKE", "redemoinho de braços em chamas escuras", {
    duration: 52,
    layers: [L("darkest-lariat", { anchor: "target", start: 4, end: 44, frameSeq: seq(intervalo(6), 24, true), z: 3, tracks: { alpha: fade(40, 2, 6) } })],
    actor: [{ who: "user", t: 0, kind: "lunge", dur: 14 }],
    hits: [14, 26, 36],
  }),
  R("disarming-voice", "AOE", "ondas sonoras em forma de coração", {
    duration: 52,
    layers: [0, 8, 16].map((t0) =>
      L("disarming-voice", { anchor: "user", to: "target", start: t0, end: t0 + 26, frameSeq: seq([0, 1, 2], 8), tracks: { p: k([0, 0.05], [26, 1]), alpha: fade(26, 2, 5) } })
    ),
    hits: [26, 34, 42],
  }),
  R("baby-doll-eyes", "DEBUFF", "olhões brilhantes com coraçõezinhos", {
    duration: 80,
    layers: [L("baby-doll-eyes", { anchor: "user", start: 0, end: 48, frameSeq: seq([0, 1, 1, 2, 1, 1], 8), z: 3, tracks: { y: k([0, -14]), alpha: fade(48, 3, 6) } }), quedaAtributo(30)],
    hits: [30],
    react: "status",
  }),
  R("misty-terrain", "FIELD", "névoa rosa cobrindo o chão, com faíscas", {
    duration: 96,
    layers: [L("misty-terrain", { anchor: "screen-center", ds: true, assetVirado: nomeOg("misty-terrain-v.png"), start: 0, end: 96, frameSeq: seq([0, 1, 2, 3], 8, true), z: 1, tracks: { alpha: fade(96, 14, 20) } })],
    react: "none",
  }),
  R("moonblast", "PROJ", "lua rosa se forma no alto e dispara um orbe", {
    duration: 84,
    layers: [
      L("moonblast--lua", { anchor: "user", start: 0, end: 44, frameSeq: seq([0, 1, 2, 3], 9), z: 3, tracks: { y: k([0, -44]), alpha: fade(44, 4, 6) } }),
      L("moonblast--orbe", { anchor: "user", to: "target", start: 38, end: 56, frame: 0, z: 3, tracks: { p: k([0, 0], [18, 1, "in"]), y: k([0, -44], [18, 0]), alpha: fade(18, 1, 1) } }),
      noAlvo("moonblast--explosao", 56, 5, 18),
    ],
    hits: [57],
    screen: { flash: [{ t: 56, dur: 6, color: "#FFC8DC", alpha: 0.35 }] },
  }),
  R("sparkling-aria", "AOE", "bolhas cintilantes e notas musicais", {
    duration: 64,
    layers: [
      L("sparkling-aria--bolha", { anchor: "user", to: "target", start: 0, end: 34, spawn: { count: 9, spread: [10, 12], interval: 3, life: 26, seed: 12, frames: [0, 1, 2] }, tracks: { p: k([0, 0.1], [26, 1]), alpha: fade(26, 2, 4) } }),
      L("sparkling-aria--nota", { anchor: "user", to: "target", start: 4, end: 32, spawn: { count: 4, spread: [8, 14], interval: 6, life: 24, seed: 13, frames: [0, 1] }, tracks: { p: k([0, 0.1], [24, 0.9]), alpha: fade(24, 2, 4) } }),
    ],
    hits: [28, 40],
  }),
  R("branch-poke", "STRIKE", "galho espetando à frente", {
    duration: 36,
    layers: [
      L("branch-poke--galho", { anchor: "target", start: 2, end: 20, frameSeq: seq([0, 1], 10), z: 3, tracks: { x: k([0, -22], [8, -12, "out"]), alpha: fade(18, 1, 4) } }),
      noAlvo("branch-poke--impacto", 10, 3, 15, { tracks: { x: k([0, -4]), alpha: fade(12, 1, 3) } }),
    ],
    actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }],
    hits: [10],
  }),
  R("noble-roar", "DEBUFF", "juba dourada e ondas de rugido", {
    duration: 76,
    layers: [
      L("noble-roar--juba", { anchor: "user", start: 0, end: 34, frame: 0, z: 1, tracks: { scale: k([0, 0.7], [8, 1.1, "out"], [34, 1]), alpha: fade(34, 3, 8) } }),
      ...[4, 12].map((t0) => L("noble-roar--onda", { anchor: "user", to: "target", start: t0, end: t0 + 24, frameSeq: seq([0, 1, 2], 8), tracks: { p: k([0, 0.1], [24, 0.8]), alpha: fade(24, 2, 6) } })),
      quedaAtributo(26),
    ],
    hits: [26],
    react: "status",
    screen: tremor(4, 16, 1),
  }),
  R("grassy-terrain", "FIELD", "grama e flores brotando pelo chão", {
    duration: 96,
    layers: [L("grassy-terrain", { anchor: "screen-center", ds: true, assetVirado: nomeOg("grassy-terrain-v.png"), start: 0, end: 96, frameSeq: seq([0, 1, 2, 3], 6, true), z: 1, tracks: { alpha: fade(96, 14, 20) } })],
    react: "none",
  }),
  R("drum-beating", "STRIKE", "tambor de tronco e raiz que sai do chão sob o alvo", {
    duration: 64,
    layers: [
      L("drum-beating--tambor", { anchor: "user", start: 0, end: 34, frameSeq: seq([0, 1, 2, 0, 1, 2, 0, 1], 14), z: 3, tracks: { x: k([0, 18]), y: k([0, 4]), alpha: fade(34, 2, 5) } }),
      L("drum-beating--raiz", { anchor: "field-target", start: 26, end: 58, frameSeq: seq([0, 1, 2, 3], 12), z: 3, tracks: { x: k([0, -6]), y: k([0, -22]), alpha: fade(32, 1, 8) } }),
    ],
    hits: [40],
    screen: { shake: [{ t: 8, dur: 4, amp: 1 }, { t: 16, dur: 4, amp: 1 }, { t: 40, dur: 8, amp: 2 }] },
  }),
  R("boomburst", "AOE", "anéis sonoros brancos enormes que estouram", {
    duration: 60,
    layers: [
      L("boomburst", { anchor: "user", start: 0, end: 30, frameSeq: seq(intervalo(5), 10), z: 3, tracks: { alpha: fade(30, 1, 6) } }),
      noAlvo("boomburst", 18, 5, 12),
    ],
    hits: [22],
    screen: { shake: [{ t: 6, dur: 30, amp: 3 }], flash: [{ t: 18, dur: 6, color: "#FFFFFF", alpha: 0.4 }] },
  }),
  R("pyro-ball", "PROJ", "bola de pedra em chamas chutada em arco", {
    duration: 64,
    layers: [viagem("pyro-ball--bola", 4, 32, { arc: 26, frameSeq: seq([0, 1, 2, 3], 16, true), tracks: { rot: k([0, 0], [28, 540]) } }), noAlvo("pyro-ball--explosao", 32, 5, 16)],
    actor: [{ who: "user", t: 0, kind: "hop" }],
    hits: [33],
    screen: tremor(33, 10, 3),
  }),
  R("court-change", "FIELD", "duas setas curvas trocando de lado", {
    duration: 56,
    layers: [L("court-change", { anchor: "screen-center", start: 0, end: 56, frameSeq: seq([0, 1, 2, 3, 3, 3], 8), z: 4, tracks: { alpha: fade(56, 2, 12) } })],
    react: "none",
  }),
  R("tearful-look", "DEBUFF", "olhos marejados com lágrimas caindo", {
    duration: 84,
    layers: [
      L("tearful-look--olhos", { anchor: "user", start: 0, end: 52, frameSeq: seq([0, 1], 5, true), z: 3, tracks: { y: k([0, -14]), alpha: fade(52, 3, 6) } }),
      L("tearful-look--lagrima", { anchor: "user", start: 8, end: 44, spawn: { count: 6, spread: [12, 1], interval: 6, life: 22, seed: 20, vy: 0.3, gravity: 0.03 }, frame: 0, z: 3, tracks: { y: k([0, -8]), alpha: fade(22, 1, 6) } }),
      quedaAtributo(34),
    ],
    hits: [34],
    react: "status",
  }),
  R("liquidation", "STRIKE", "jato d'água que vira lâmina e corta", {
    duration: 48,
    layers: [
      noAlvo("liquidation--corte", 4, 4, 15),
      L("liquidation--gota", { anchor: "target", start: 14, end: 22, spawn: { count: 9, spread: 6, interval: 1, life: 20, seed: 21, burst: 1.4, gravity: 0.05, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(20, 1, 6) } }),
    ],
    actor: [{ who: "user", t: 0, kind: "lunge", dur: 12 }],
    hits: [12],
  }),
  R("snipe-shot", "BEAM", "mira de atirador e um tiro d'água fino", {
    duration: 62,
    layers: [
      L("snipe-shot--mira", { anchor: "target", start: 0, end: 46, frameSeq: seq([0, 0, 1, 1, 2], 8), z: 4, tracks: { alpha: fade(46, 2, 4) } }),
      L("snipe-shot--tiro", { anchor: "user", to: "target", start: 36, end: 44, frame: 0, orient: true, tracks: { p: k([0, 0], [8, 1]), alpha: fade(8, 1, 1) } }),
      noAlvo("water-shuriken--impacto", 44, 4, 20),
    ],
    hits: [44],
  }),
  R("play-rough", "STRIKE", "nuvem de briga com estrelas, coração e poeira", {
    duration: 60,
    layers: [L("play-rough", { anchor: "target", start: 4, end: 52, frameSeq: seq(intervalo(6), 14, true), z: 3, tracks: { alpha: fade(48, 2, 6) } })],
    actor: [
      { who: "user", t: 0, kind: "lunge", dur: 10 },
      { who: "user", t: 4, kind: "hide", dur: 52 },
    ],
    hits: [12, 24, 36],
    screen: tremor(10, 34, 2),
  }),
  R("flower-trick", "STRIKE", "buquê que estoura em pétalas cortantes", {
    duration: 58,
    layers: [
      L("flower-trick--buque", { anchor: "target", start: 0, end: 26, frameSeq: seq([0, 0, 1, 1, 2], 10), z: 3, tracks: { y: k([0, -4]), alpha: fade(26, 3, 2) } }),
      L("flower-trick--petala", { anchor: "target", start: 24, end: 28, spawn: { count: 10, spread: 5, interval: 0, life: 24, seed: 24, burst: 1.6, spin: 16, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(24, 1, 8) } }),
    ],
    hits: [26],
  }),
  R("torch-song", "AOE", "notas de fogo saindo em leque", {
    duration: 60,
    layers: [
      L("torch-song", { anchor: "user", to: "target", start: 0, end: 30, spawn: { count: 9, spread: [6, 16], interval: 3, life: 24, seed: 25, frames: [0, 1, 2] }, tracks: { p: k([0, 0.1], [24, 1]), alpha: fade(24, 2, 4) } }),
    ],
    hits: [26, 38],
  }),
  R("aqua-cutter", "PROJ", "lâmina d'água em meia-lua horizontal", {
    duration: 40,
    layers: [viagem("aqua-cutter--lamina", 0, 16, { frame: 0, orient: true }), noAlvo("aqua-cutter--impacto", 16, 3, 15)],
    hits: [16],
  }),
  R("aqua-step", "STRIKE", "passos de dança com pegadas d'água e redemoinho", {
    duration: 64,
    layers: [
      L("aqua-step--redemoinho", { anchor: "field-user", start: 0, end: 34, frameSeq: seq([0, 1, 2, 3], 14, true), z: 1, tracks: { alpha: fade(34, 3, 6) } }),
      L("aqua-step--pegada", { anchor: "field-user", start: 0, end: 24, spawn: { count: 5, spread: [16, 3], interval: 5, life: 22, seed: 27 }, frame: 0, z: 1, tracks: { alpha: fade(22, 1, 10) } }),
      noAlvo("water-shuriken--impacto", 40, 4, 16),
    ],
    actor: [
      { who: "user", t: 2, kind: "hop" },
      { who: "user", t: 30, kind: "lunge", dur: 12 },
    ],
    hits: [40],
  }),
  R("wave-crash", "STRIKE", "onda gigante curvada que quebra sobre o alvo", {
    duration: 76,
    layers: [
      L("wave-crash--onda", { anchor: "target", start: 4, end: 54, frameSeq: seq([0, 1, 2, 3, 4, 4], 9), z: 3, tracks: { x: k([0, -30]), y: k([0, -12]), alpha: fade(50, 2, 8) } }),
      L("wave-crash--espuma", { anchor: "target", start: 40, end: 44, spawn: { count: 10, spread: 8, interval: 0, life: 28, seed: 28, burst: 1.3, gravity: 0.06, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(28, 1, 10) } }),
    ],
    actor: [{ who: "user", t: 30, kind: "lunge", dur: 12 }],
    hits: [42],
    screen: tremor(42, 12, 3),
  }),
];

// o arquétipo é só do mapa; a receita gravada não o carrega
// ---------- lote 2a: aumento/queda de atributo e cura ----------
// A receita que o golpe reaproveitava (aura de atributo, brilho de cura) continua tocando por
// cima do efeito próprio, deslocada de `atraso` quadros.
const baseDe = (slug) => {
  const b = REUSO[slug] ?? REUSO_ARQUETIPO[POR_SLUG.get(slug)?.arquetipo];
  const r = RECEITAS_DP.find((x) => x.slug === b);
  if (!r) throw new Error(`${slug}: sem receita base (${b})`);
  return r;
};
const desloca = (l, dt) => ({ ...l, start: l.start + dt, end: l.end + dt });
function comBase(slug, note, minhas, { atraso = 0, dur = 0, actor, screen, hits, cinza = false } = {}) {
  const b = baseDe(slug);
  const fim = Math.max(dur, ...minhas.map((l) => l.end + (l.spawn?.life ?? 0)));
  return R(slug, POR_SLUG.get(slug).arquetipo, note, {
    duration: Math.max(fim, b.duration + atraso) + 4,
    layers: [...minhas.map((l) => (cinza && l.asset.startsWith("Og-") ? { ...l, keepColor: false } : l)), ...b.layers.map((l) => desloca(l, atraso))],
    hits: hits ?? (b.hits ?? []).map((h) => h + atraso),
    ...(b.react ? { react: b.react } : {}),
    ...(actor ? { actor } : {}),
    ...(screen ?? b.screen ? { screen: screen ?? b.screen } : {}),
    base: b.slug,
  });
}
// ícone animado que flutua sobre quem usa (buff) ou sobre o alvo (debuff)
const icone = (asset, quem, frames, fps, { y = -26, start = 0, dur, loop = false, z = 4, tracks = {}, ...o } = {}) => {
  const n = Array.isArray(frames) ? frames : intervalo(frames);
  const d = dur ?? Math.max(30, Math.ceil((n.length * 60) / fps) + 14);
  // acima da cabeça do usuário fica a caixa de HP do inimigo (DOM, por cima do canvas):
  // ícone alto do usuário vai para a frente dele, na altura do peito
  const desvia = quem === "user" && y < -20;
  const tr = desvia ? { y: k([0, -10]), x: k([0, 24]) } : { y: k([0, y]) };
  return L(asset, { anchor: quem, start, end: start + d, frameSeq: seq(n, fps, loop), z, ...o, tracks: { ...tr, alpha: fade(d, 3, 8), ...tracks } });
};
const U = "user";
const T = "target";
// [slug, nota, camadas, opções de comBase]
const LOTE_2A = [
  ["growth", "broto que cresce e floresce", [icone("growth", U, 4, 8, { y: -30 })], { atraso: 14 }],
  ["withdraw", "casco que se fecha", [icone("withdraw", U, [0, 1, 2, 2], 8, { y: -6 })], { atraso: 10 }],
  ["iron-defense", "placas de aço que se juntam como armadura", [icone("iron-defense", U, [0, 1, 2, 3, 3], 10, { y: -6 })], { atraso: 12 }],
  ["harden", "superfície que racha e cristaliza", [icone("harden", U, [0, 1, 2, 2], 7, { y: -6 })], { atraso: 12 }],
  ["quiver-dance", "pó de asa iridescente em espiral", [icone("quiver-dance", U, 4, 12, { y: -10, loop: true, dur: 54 })], { atraso: 8 }],
  ["focus-energy", "veias de energia amarela convergindo", [icone("focus-energy", U, [0, 1, 2, 3, 3], 10, { y: -6 })], { atraso: 16 }],
  ["stockpile", "esferas verdes que se acumulam", [icone("stockpile", U, [0, 1, 2, 2, 2], 6, { y: -30 })], { atraso: 14 }],
  ["coil", "serpente roxa se enrolando", [icone("coil", U, [0, 1, 2, 3, 3], 8, { y: -4 })], { atraso: 12 }],
  ["double-team", "três silhuetas translúcidas", [icone("double-team", U, [0, 1, 2, 1, 2], 8, { y: 0, z: 2 })], { atraso: 16, cinza: true }],
  ["defense-curl", "anel que se fecha em bola", [icone("defense-curl", U, [0, 1, 2, 3, 3], 10, { y: -4 })], { atraso: 10, cinza: true }],
  ["minimize", "setas para dentro e ponto encolhendo", [icone("minimize", U, [0, 1, 2, 3, 3], 8, { y: -4 })], { atraso: 12, cinza: true, actor: [{ who: "user", t: 6, kind: "blink", dur: 24 }] }],
  ["cosmic-power", "constelação dourada descendo", [icone("cosmic-power", U, [0, 1, 2, 2, 2], 7, { y: -60, tracks: { y: k([0, -60], [30, -24, "out"]) } })], { atraso: 16 }],
  ["after-you", "mão em gesto de 'por favor' e seta", [icone("after-you", T, [0, 1, 1], 5, { y: -26 })], { atraso: 10 }],
  ["nasty-plot", "balão com sorriso maligno e lâmpada escura", [icone("nasty-plot", U, [0, 1, 2, 2, 2], 6, { y: -34, tracks: { x: k([0, 14]) } })], { atraso: 18 }],
  ["belly-drum", "barriga batendo com ondas vermelhas", [icone("belly-drum", U, [0, 1, 2, 0, 1, 2], 10, { y: 0 })], { atraso: 14, screen: { shake: [{ t: 4, dur: 4, amp: 1 }, { t: 10, dur: 4, amp: 1 }, { t: 16, dur: 4, amp: 2 }] } }],
  ["calm-mind", "olho fechado e ondas suaves lilás", [icone("calm-mind", U, [0, 1, 2, 2], 6, { y: -30 })], { atraso: 14 }],
  ["barrier", "placa hexagonal translúcida ciano", [icone("barrier", U, [0, 1, 2, 1], 8, { y: -4, tracks: { x: k([0, 16]) } })], { atraso: 10 }],
  ["rock-polish", "pedra brilhando com faíscas de polimento", [icone("rock-polish", U, [0, 1, 2, 1, 2], 8, { y: -30 })], { atraso: 12 }],
  ["magnet-rise", "ímã em U flutuando com linhas de campo", [icone("magnet-rise", U, [0, 1], 4, { y: -34, loop: true, dur: 50 })], { atraso: 10, actor: [{ who: "user", t: 4, kind: "hop", dur: 30 }] }],
  ["acid-armor", "gosma roxa escorrendo e cobrindo", [icone("acid-armor", U, [0, 1, 2, 3, 3], 7, { y: 0, z: 3 })], { atraso: 20 }],
  ["shell-smash", "casco que racha e explode", [icone("shell-smash", U, [0, 1, 2, 3], 8, { y: -6 })], { atraso: 20, screen: { shake: [{ t: 16, dur: 8, amp: 2 }] } }],
  ["meditate", "aura de lótus laranja", [icone("meditate", U, [0, 1, 2, 2], 6, { y: 16, z: 1 })], { atraso: 14 }],
  ["charge", "faíscas elétricas se acumulando", [icone("charge", U, [0, 1, 2, 3, 3], 10, { y: -4 })], { atraso: 14 }],
  ["dragon-dance", "chamas de dragão roxas e azuis em espiral", [icone("dragon-dance", U, 6, 14, { y: -4, loop: true, dur: 54, z: 3 })], { atraso: 10 }],
  ["work-up", "punhos com linhas de esforço", [icone("work-up", U, [0, 1], 10, { y: -30, loop: true, dur: 36 })], { atraso: 10 }],
  ["sharpen", "aresta que ganha brilho afiado", [icone("sharpen", U, [0, 1, 2, 2], 8, { y: -30 })], { atraso: 12, cinza: true }],
  ["cotton-guard", "nuvens de algodão envolvendo", [icone("cotton-guard", U, [0, 1, 2, 2, 2], 8, { y: 0, z: 3 })], { atraso: 14 }],
  [
    "autotomize",
    "pedaços de metal caindo e linhas de velocidade",
    [
      L("autotomize--pedaco", { anchor: "user", start: 0, end: 24, spawn: { count: 6, spread: [14, 10], interval: 3, life: 22, seed: 40, gravity: 0.08, spin: 10, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(22, 1, 6) } }),
      L("autotomize--velocidade", { anchor: "user", start: 18, end: 44, frame: 0, z: 1, tracks: { x: k([0, -10], [26, -30]), alpha: fade(26, 2, 8) } }),
    ],
    { atraso: 16 },
  ],
  ["power-trick", "setas de ataque e defesa trocando de lugar", [icone("power-trick", U, [0, 1, 2, 3, 3], 7, { y: -30 })], { atraso: 12 }],
  ["howl", "lua e ondas de uivo", [icone("howl", U, [0, 1, 2, 2], 6, { y: -30 })], { atraso: 12 }],
  ["bulk-up", "bíceps inflando com linhas de força", [icone("bulk-up", U, [0, 1, 2, 1, 2], 8, { y: -30 })], { atraso: 12 }],
  ["tail-glow", "cauda brilhando com pontos de luz", [icone("tail-glow", U, [0, 1, 2, 2, 2], 8, { y: 8 })], { atraso: 14 }],
  ["shift-gear", "duas engrenagens girando", [icone("shift-gear", U, 4, 12, { y: -30, loop: true, dur: 44 })], { atraso: 10 }],
  ["sweet-scent", "nuvem rosa de perfume com flores", [icone("sweet-scent", T, 4, 8, { y: -20, loop: true, dur: 50, tracks: { x: k([0, -26], [30, 0, "out"]) } })], { atraso: 16 }],
  ["smokescreen", "nuvem de fumaça preta", [icone("smokescreen", T, [0, 1, 2, 2, 2, 3], 8, { y: -4, z: 4 })], { atraso: 14 }],
  ["tail-whip", "cauda balançando com linhas de movimento", [icone("tail-whip", U, [0, 1, 2, 1, 0, 1, 2], 12, { y: 10, tracks: { x: k([0, -14]) } })], { atraso: 18 }],
  ["string-shot", "fios brancos de seda enrolando", [icone("string-shot", T, [0, 1, 2, 3, 3], 8, { y: 0, z: 3 })], { atraso: 16 }],
  ["whirlwind", "redemoinho de vento cinza-claro", [icone("whirlwind", T, 4, 14, { y: -4, loop: true, dur: 44, z: 3 })], { atraso: 12, actor: [{ who: "target", t: 20, kind: "shake", dur: 20 }] }],
  ["captivate", "corações rosas com brilho", [L("captivate", { anchor: "user", to: "target", start: 0, end: 30, frameSeq: seq([0, 1, 2], 8, true), z: 4, tracks: { p: k([0, 0], [30, 1, "out"]), y: k([0, -20]), alpha: fade(30, 2, 6) } })], { atraso: 16 }],
  [
    "sand-attack",
    "punhado de areia jogado no rosto",
    [
      L("sand-attack--grao", { anchor: "user", to: "target", start: 0, end: 18, spawn: { count: 10, spread: [6, 6], interval: 1, life: 16, seed: 41, frames: [0, 1, 2] }, tracks: { p: k([0, 0], [16, 1]), alpha: fade(16, 1, 2) } }),
      L("sand-attack--nuvem", { anchor: "target", start: 14, end: 40, frameSeq: seq([0, 1, 2], 8), z: 4, tracks: { y: k([0, -16]), alpha: fade(26, 1, 8) } }),
    ],
    { atraso: 16 },
  ],
  ["feather-dance", "penas brancas caindo", [L("feather-dance", { anchor: "target", start: 0, end: 30, spawn: { count: 10, spread: [26, 6], interval: 3, life: 34, seed: 42, vy: 0.9, spin: 3, frames: [0, 1, 2] }, z: 4, tracks: { y: k([0, -40]), x: k([0, 0], [10, 3], [20, -3], [34, 0]), alpha: fade(34, 3, 8) } })], { atraso: 16 }],
  ["gastro-acid", "gosma verde ácida pingando", [icone("gastro-acid", T, 4, 8, { y: -18, loop: true, dur: 50 })], { atraso: 14 }],
  ["encore", "holofote e 'BIS!' com estrelas", [icone("encore", T, [0, 1, 2, 1, 2], 6, { y: -8 })], { atraso: 16 }],
  ["disable", "X vermelho sobre uma corrente", [icone("disable", T, [0, 1, 2, 2], 8, { y: -20 })], { atraso: 12 }],
  ["tickle", "pena fazendo cócegas com marcas de riso", [icone("tickle", T, [0, 1, 2, 1, 2], 8, { y: -14 })], { atraso: 14, actor: [{ who: "target", t: 10, kind: "shake", dur: 24 }] }],
  ["fake-tears", "lágrimas exageradas em gotas grandes", [L("fake-tears", { anchor: "user", start: 0, end: 30, spawn: { count: 8, spread: [6, 2], interval: 4, life: 22, seed: 43, burst: 0.9, gravity: 0.08, frames: [0, 1, 2] }, z: 4, tracks: { y: k([0, -22]), alpha: fade(22, 1, 6) } })], { atraso: 16 }],
  ["charm", "coração rosa piscando", [icone("charm", T, [0, 1, 2, 1, 0, 1], 8, { y: -26 })], { atraso: 12 }],
  ["quash", "mão empurrando para baixo com ondas escuras", [icone("quash", T, [0, 1, 2, 2], 8, { y: -20 })], { atraso: 12, screen: { shake: [{ t: 8, dur: 8, amp: 2 }] } }],
  // a folha de tela cheia vai no meio do DS e o clarão do motor cobre a arena inteira (que pode ser mais larga que 256×Sds)
  ["flash", "clarão branco em tela cheia", [L("flash", { anchor: "screen-center", ds: true, start: 0, end: 24, frameSeq: seq([0, 0, 1, 2], 10), z: 5, tracks: { alpha: fade(24, 1, 6) } })], { atraso: 14, screen: { flash: [{ t: 0, dur: 22, color: "#FFFFFF", alpha: 0.85 }] } }],
  ["simple-beam", "raio de pontinhos rosa e amarelo", [viagem("simple-beam", 0, 24, { frameSeq: seq([0, 1], 12, true), orient: true, tracks: { p: k([0, 0.2], [24, 0.85]) } })], { atraso: 18 }],
  // cura
  ["synthesis", "raios de sol descendo e folhas absorvendo a luz", [icone("synthesis", U, [0, 1, 2, 2, 2], 6, { y: -16, z: 3 })], { atraso: 18 }],
  [
    "roost",
    "penas descendo e ninho",
    [
      L("roost--ninho", { anchor: "field-user", start: 0, end: 70, frame: 0, z: 1, tracks: { y: k([0, -2]), alpha: fade(70, 6, 10) } }),
      L("feather-dance", { anchor: "user", start: 0, end: 28, spawn: { count: 7, spread: [22, 4], interval: 4, life: 34, seed: 44, vy: 0.8, spin: 3, frames: [0, 1, 2] }, z: 4, tracks: { y: k([0, -40]), alpha: fade(34, 3, 8) } }),
    ],
    { atraso: 14 },
  ],
  ["moonlight", "lua crescente e luz azul descendo", [icone("moonlight", U, [0, 1, 2, 2, 2], 6, { y: -26, z: 3 })], { atraso: 16 }],
  ["slack-off", "nuvenzinha de preguiça (zzz) e brilho verde", [icone("slack-off", U, [0, 1, 2, 2], 4, { y: -34 })], { atraso: 16 }],
  ["heal-pulse", "pulso de onda em cruz verde", [icone("heal-pulse", T, [0, 1, 2, 3], 8, { y: -4, z: 3 })], { atraso: 12 }],
  ["aqua-ring", "anel de bolhas d'água girando", [icone("aqua-ring", U, 4, 12, { y: 8, loop: true, dur: 70, z: 3 })], { atraso: 8 }],
  ["soft-boiled", "ovo branco que se abre em brilho", [icone("soft-boiled", U, [0, 1, 2, 3, 3], 7, { y: -32 })], { atraso: 20 }],
  ["ingrain", "raízes descendo para o chão", [L("ingrain", { anchor: "field-user", start: 0, end: 70, frameSeq: seq([0, 1, 2, 3], 8), z: 1, tracks: { y: k([0, 8]), alpha: fade(70, 3, 10) } })], { atraso: 16 }],
  ["wish", "estrela cadente que cai no usuário", [L("wish--estrela", { anchor: "user", start: 0, end: 24, frame: 0, z: 4, tracks: { x: k([0, -50], [24, 0, "in"]), y: k([0, -110], [24, -20, "in"]), rot: k([0, 35]), alpha: fade(24, 2, 2) } })], { atraso: 22 }],
  ["morning-sun", "sol nascendo laranja e amarelo", [icone("morning-sun", U, [0, 1, 2, 3, 3], 6, { y: -34 })], { atraso: 16 }],
  ["milk-drink", "garrafa de leite e brilho branco", [icone("milk-drink", U, [0, 1, 2, 2], 5, { y: -32 })], { atraso: 18 }],
];
RECEITAS_OG.push(...LOTE_2A.map(([slug, note, camadas, o]) => comBase(slug, note, camadas, o)));

// arquétipo e base são só do mapa; a receita gravada não os carrega
export const receitasOgLimpas = () => RECEITAS_OG.map(({ arquetipo, base, ...r }) => r);

// ---------- lote 2b: grupos de golpes parecidos ----------
// Peças base cinza (mordida, soco, chute, pedra) vão sem keepColor: o mapa pinta pelo tipo.
const Lc = (asset, o) => ({ ...L(asset, o), keepColor: false });
const arq = (slug) => POR_SLUG.get(slug).arquetipo;
const G2 = (slug, note, corpo) => R(slug, arq(slug), note, corpo);
const imp = (asset, t, { n = 3, fps = 15, ...o } = {}) => noAlvo(asset, t, n, fps, o);
const impCinza = (asset, t, o = {}) => ({ ...imp(asset, t, o), keepColor: false });
const lunge = (t = 0, dur = 12) => ({ who: "user", t, kind: "lunge", dur });
const dash = (t = 0, dur = 20) => ({ who: "user", t, kind: "dash", dur });
const ondas3 = (asset, n, extra = [], o = {}) => [
  ...[0, 8, 16].map((t0) => L(asset, { anchor: "user", to: "target", start: t0, end: t0 + 26, frameSeq: seq(intervalo(n), 8), z: 3, tracks: { p: k([0, 0.05], [26, o.alcance ?? 0.95]), alpha: fade(26, 2, 5) } })),
  ...extra,
];
const particulasCaindo = (asset, frames, o = {}) =>
  L(asset, { anchor: "target", start: 0, end: o.end ?? 30, spawn: { count: o.count ?? 14, spread: o.spread ?? [24, 6], interval: o.interval ?? 2, life: o.life ?? 30, seed: o.seed ?? 1, vy: o.vy ?? 0.7, spin: o.spin ?? 0, frames }, z: 4, tracks: { y: k([0, o.y ?? -36]), alpha: fade(o.life ?? 30, 2, 8) } });
const feixeMeio = (asset, start, end, o = {}) =>
  L(asset, { anchor: "user", to: "target", start, end, orient: true, z: 3, frameSeq: o.frameSeq ?? seq([0, 1, 2, 3].slice(0, o.n ?? 4), 15, true), tracks: { p: k([0, 0.5]), scale: k([0, 0.3], [6, 1, "out"]), alpha: fade(end - start, 2, 6) } });
const orbesDreno = (asset, start, o = {}) =>
  L(asset, { anchor: "target", to: "user", start, end: start + 24, spawn: { count: o.count ?? 6, spread: [10, 10], interval: 3, life: 22, seed: o.seed ?? 3, frames: o.frames ?? [0] }, z: 3, tracks: { p: k([0, 0], [22, 1, "in"]), alpha: fade(22, 2, 4) } });
const sequenciaProj = (asset, n, passo, dur, o = {}) =>
  Array.from({ length: n }, (_, i) => ({
    ...viagem(asset, i * passo, i * passo + dur, { frame: (o.frames ?? [0])[i % (o.frames ?? [0]).length], orient: o.orient ?? true, ...(o.arc ? { arc: o.arc } : {}), ...(o.rot ? { tracks: { rot: k([0, 0], [dur, o.rot]) } } : {}) }),
    ...(o.cinza ? { keepColor: false } : {}),
  }));
const impactosSeq = (asset, n, passo, dur, o = {}) =>
  Array.from({ length: n }, (_, i) => ({ ...imp(asset, i * passo + dur, { n: 3, fps: 20, tracks: { x: k([0, ((i * 7) % 3) * 6 - 6]), y: k([0, ((i * 5) % 3) * 5 - 5]), alpha: fade(9, 1, 3) } }), ...(o.cinza ? { keepColor: false } : {}) }));
const hitsSeq = (n, passo, dur) => Array.from({ length: n }, (_, i) => i * passo + dur);

const SOCO = "soco-base--punho";
const SOCO_IMP = "soco-base--impacto";
const PE = "chute-base--pe";
const PE_IMP = "chute-base--impacto";
const BOCA = "mordida-base";
const punhoAoAlvo = (start, o = {}) => Lc(SOCO, { anchor: "target", start, end: start + (o.dur ?? 12), frame: 0, z: 3, tracks: { x: k([0, o.x0 ?? -34], [o.dur ?? 12, o.x1 ?? -10, "out"]), y: k([0, o.y0 ?? 0], [o.dur ?? 12, o.y1 ?? 0]), scale: k([0, o.scale ?? 1]), alpha: fade(o.dur ?? 12, 1, 3) } });
const peAoAlvo = (start, o = {}) => Lc(PE, { anchor: "target", start, end: start + (o.dur ?? 12), frame: 0, z: 3, tracks: { x: k([0, o.x0 ?? -34], [o.dur ?? 12, o.x1 ?? -10, "out"]), y: k([0, o.y0 ?? 6], [o.dur ?? 12, o.y1 ?? 6, "in"]), rot: k([0, o.rot0 ?? 0], [o.dur ?? 12, o.rot1 ?? 0]), scale: k([0, o.scale ?? 1]), alpha: fade(o.dur ?? 12, 1, 3) } });
const mordida = (start = 0) => Lc(BOCA, { anchor: "target", start, end: start + 20, frameSeq: seq([0, 1, 2, 3], 14), z: 3, tracks: { alpha: fade(20, 1, 4) } });

const LOTE_2B = [
  // som
  G2("supersonic", "ondas finas em zigue-zague", { duration: 56, layers: ondas3("supersonic", 3), hits: [26], react: "status" }),
  G2("screech", "ondas estridentes serrilhadas", { duration: 84, layers: ondas3("screech", 3, [quedaAtributo(30)]), hits: [30], react: "status", screen: tremor(4, 24, 1) }),
  G2("roar", "ondas grossas e vento empurrando", { duration: 60, layers: ondas3("roar", 3), hits: [26], react: "status", actor: [{ who: "target", t: 24, kind: "shake", dur: 20 }] }),
  G2("hyper-voice", "ondas sonoras enormes e brancas", { duration: 56, layers: ondas3("hyper-voice", 3), hits: [24, 34], screen: tremor(6, 30, 3) }),
  G2("metal-sound", "ondas metálicas com faíscas", { duration: 84, layers: ondas3("metal-sound", 3, [quedaAtributo(30)]), hits: [30], react: "status" }),
  G2("uproar", "notas e ondas caóticas coloridas", { duration: 60, layers: [L("uproar", { anchor: "user", to: "target", start: 0, end: 52, frameSeq: seq(intervalo(4), 10, true), z: 3, tracks: { p: k([0, 0.15], [52, 0.75]), alpha: fade(52, 3, 8) } })], hits: [20, 36], screen: tremor(4, 44, 2) }),
  G2("echoed-voice", "ondas que se repetem e crescem", { duration: 50, layers: [L("echoed-voice", { anchor: "user", to: "target", start: 0, end: 34, frameSeq: seq(intervalo(4), 8), z: 3, tracks: { p: k([0, 0.05], [34, 1]), alpha: fade(34, 2, 5) } })], hits: [32] }),
  G2("snarl", "ondas escuras com dentes", { duration: 90, layers: ondas3("snarl", 3, [quedaAtributo(36)]), hits: [26, 34] }),
  // mordidas
  G2("bite", "mordida base", { duration: 36, layers: [mordida(2)], hits: [10] }),
  G2("hyper-fang", "dois incisivos enormes", { duration: 36, layers: [Lc("hyper-fang", { anchor: "target", start: 2, end: 22, frameSeq: seq([0, 1, 2, 3], 14), z: 3, tracks: { alpha: fade(20, 1, 4) } })], hits: [10] }),
  G2("super-fang", "presas longas e rachadura no impacto", {
    duration: 52,
    layers: [Lc("super-fang--boca", { anchor: "target", start: 2, end: 22, frameSeq: seq([0, 1, 2, 3], 14), z: 3, tracks: { alpha: fade(20, 1, 4) } }), L("super-fang--rachadura", { anchor: "target", start: 10, end: 44, frameSeq: seq([0, 1, 2], 10), z: 3, tracks: { alpha: fade(34, 1, 10) } })],
    hits: [10],
    screen: tremor(10, 8, 2),
  }),
  G2("fire-fang", "mordida e chamas", { duration: 46, layers: [mordida(2), L("fire-fang--chama", { anchor: "target", start: 10, end: 20, spawn: { count: 7, spread: [16, 8], interval: 1, life: 22, seed: 11, vy: -0.8, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(22, 1, 8) } })], hits: [10] }),
  G2("thunder-fang", "mordida e raios", { duration: 44, layers: [mordida(2), L("thunder-fang--raio", { anchor: "target", start: 10, end: 32, frameSeq: seq([0, 1, 2], 15, true), z: 3, tracks: { alpha: fade(22, 1, 4) } })], hits: [10], screen: { flash: [{ t: 10, dur: 4, color: "#FFF6A8", alpha: 0.3 }] } }),
  G2("ice-fang", "mordida e cristais de gelo", { duration: 44, layers: [mordida(2), L("ice-fang--cristal", { anchor: "target", start: 10, end: 14, spawn: { count: 8, spread: 6, interval: 0, life: 24, seed: 12, burst: 1.3, spin: 8, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(24, 1, 8) } })], hits: [10] }),
  G2("poison-fang", "mordida e gotas roxas de veneno", { duration: 46, layers: [mordida(2), L("poison-fang--gota", { anchor: "target", start: 10, end: 16, spawn: { count: 7, spread: 6, interval: 1, life: 24, seed: 13, burst: 0.9, gravity: 0.08, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(24, 1, 6) } })], hits: [10] }),
  // psíquicos
  G2("confusion", "anéis psíquicos girando no alvo", { duration: 56, layers: [L("confusion", { anchor: "target", start: 0, end: 50, frameSeq: seq(intervalo(4), 12, true), z: 3, tracks: { alpha: fade(50, 4, 8) } })], hits: [24], actor: [{ who: "target", t: 16, kind: "shake", dur: 20 }] }),
  G2("psybeam", "raio em espiral de arco-íris", { duration: 48, layers: [feixeMeio("psybeam", 4, 40)], hits: [16] }),
  G2("stored-power", "esferas de energia que se juntam e disparam", {
    duration: 60,
    layers: [
      L("stored-power--esfera", { anchor: "user", start: 0, end: 18, spawn: { count: 5, spread: 26, interval: 2, life: 16, seed: 14, burst: -1.2 }, frame: 0, z: 3, tracks: { alpha: fade(16, 2, 2) } }),
      viagem("stored-power--esfera", 20, 34, { frame: 0, tracks: { scale: k([0, 1.8]) } }),
      { ...imp("psystrike", 34, { n: 5, fps: 18 }), tracks: { scale: k([0, 0.6]), alpha: fade(17, 1, 4) } },
    ],
    hits: [35],
  }),
  G2("extrasensory", "olho psíquico enorme sobre o alvo", { duration: 50, layers: [L("extrasensory", { anchor: "target", start: 0, end: 42, frameSeq: seq([0, 1, 2, 1, 2], 8), z: 4, tracks: { y: k([0, -8]), alpha: fade(42, 3, 6) } })], hits: [24], actor: [{ who: "target", t: 24, kind: "shake", dur: 12 }] }),
  G2("psyshock", "cristais psíquicos caindo como estilhaços", { duration: 52, layers: [particulasCaindo("psyshock", [0, 1, 2], { count: 9, spread: [20, 4], vy: 2.6, life: 20, y: -56, seed: 15 })], hits: [22, 30] }),
  G2("psystrike", "explosão psíquica violeta grande", { duration: 50, layers: [imp("psystrike", 6, { n: 5, fps: 14 })], hits: [10], screen: { shake: [{ t: 8, dur: 16, amp: 4 }], flash: [{ t: 6, dur: 6, color: "#D0A8FF", alpha: 0.45 }] } }),
  // socos
  G2("comet-punch", "vários punhos-cometa em sequência", { duration: 50, layers: [...sequenciaProj("comet-punch", 5, 6, 10, { orient: true }), ...impactosSeq(SOCO_IMP, 5, 6, 10, { cinza: true })], hits: hitsSeq(5, 6, 10) }),
  G2("mach-punch", "punho com linhas de velocidade", {
    duration: 32,
    layers: [L("mach-punch", { anchor: "target", start: 0, end: 10, frame: 0, z: 3, tracks: { x: k([0, -50], [8, -30]), alpha: fade(10, 1, 3) } }), punhoAoAlvo(0, { dur: 8, x0: -40 }), impCinza(SOCO_IMP, 8)],
    hits: [8],
    actor: [lunge(0, 8)],
  }),
  G2("bullet-punch", "punho de aço em bala", { duration: 30, layers: [viagem("bullet-punch", 0, 8, { frame: 0, orient: true }), impCinza(SOCO_IMP, 8)], hits: [8] }),
  G2("sky-uppercut", "gancho de baixo para cima", {
    duration: 40,
    layers: [L("sky-uppercut", { anchor: "target", start: 2, end: 22, frameSeq: seq([0, 1, 2], 12), z: 3, tracks: { x: k([0, -10]), alpha: fade(20, 1, 6) } }), punhoAoAlvo(2, { dur: 12, x0: -14, x1: -4, y0: 26, y1: -14 }), impCinza(SOCO_IMP, 12, { tracks: { y: k([0, -10]), alpha: fade(12, 1, 3) } })],
    hits: [12],
    actor: [lunge(0, 12), { who: "target", t: 12, kind: "hop", dur: 14 }],
  }),
  G2("mega-punch", "punho grande com impacto forte", { duration: 44, layers: [punhoAoAlvo(0, { dur: 14, x0: -44, x1: -14, scale: 1.6 }), impCinza("mega-punch", 14, { n: 4, fps: 14 })], hits: [14], actor: [lunge(0, 14)], screen: tremor(14, 10, 4) }),
  G2("dizzy-punch", "punho e estrelinhas girando", { duration: 70, layers: [punhoAoAlvo(0), impCinza(SOCO_IMP, 12), L("dizzy-punch", { anchor: "target", start: 16, end: 66, frameSeq: seq(intervalo(4), 12, true), z: 4, tracks: { y: k([0, -30]), alpha: fade(50, 3, 8) } })], hits: [12], actor: [lunge(0, 12)] }),
  // pós
  G2("poison-powder", "pó roxo", { duration: 56, layers: [particulasCaindo("poison-powder", [0, 1, 2], { seed: 16 })], hits: [24], react: "status" }),
  G2("stun-spore", "pó amarelo com faíscas", { duration: 56, layers: [particulasCaindo("stun-spore", [0, 1, 2], { seed: 17 })], hits: [24], react: "status" }),
  G2("rage-powder", "pó vermelho-alaranjado em volta do usuário", { duration: 56, layers: [{ ...particulasCaindo("rage-powder", [0, 1, 2], { seed: 18, spread: [20, 10], vy: -0.3, y: 10 }), anchor: "user" }], react: "self" }),
  G2("spore", "esporos de cogumelo maiores", { duration: 64, layers: [particulasCaindo("spore", [0, 1, 2], { seed: 19, count: 10, interval: 3, vy: 0.5, life: 36 })], hits: [28], react: "status" }),
  G2("cotton-spore", "tufos de algodão", { duration: 90, layers: [particulasCaindo("cotton-spore", [0, 1, 2], { seed: 20, count: 10, interval: 3, vy: 0.5, life: 36, spin: 2 }), quedaAtributo(34)], hits: [34], react: "status" }),
  // cabeçadas
  G2("meteor-mash", "punho-meteoro com estrelas", { duration: 40, layers: [viagem("meteor-mash", 0, 18, { frameSeq: seq(intervalo(4), 16, true), orient: true }), impCinza(SOCO_IMP, 18)], hits: [18], screen: tremor(18, 8, 2) }),
  G2("zen-headbutt", "cabeça com aura psíquica azul", { duration: 42, layers: [L("zen-headbutt", { anchor: "user", to: "target", start: 0, end: 18, frameSeq: seq(intervalo(4), 16, true), z: 3, tracks: { p: k([0, 0], [18, 0.85, "in"]), alpha: fade(18, 2, 2) } }), impCinza(SOCO_IMP, 18)], hits: [18], actor: [dash(0, 30)] }),
  G2("heavy-slam", "corpo pesado caindo e rachando o chão", { duration: 56, layers: [L("heavy-slam", { anchor: "field-target", start: 16, end: 50, frameSeq: seq([0, 1, 2, 3], 10), z: 1, tracks: { alpha: fade(34, 1, 10) } })], hits: [16], actor: [{ who: "user", t: 0, kind: "hop", dur: 16 }, dash(4, 24)], screen: tremor(16, 14, 5) }),
  G2("headbutt", "impacto de cabeça simples", { duration: 36, layers: [imp("headbutt", 8, { n: 3, fps: 12 })], hits: [8], actor: [lunge(0, 12)] }),
  G2("head-smash", "cabeça de pedra e explosão", { duration: 56, layers: [viagem("head-smash--cabeca", 4, 20, { frame: 0, tracks: { p: k([0, 0], [16, 0.9, "in"]) } }), imp("head-smash--explosao", 20, { n: 5, fps: 14 })], hits: [20], actor: [dash(2, 26)], screen: tremor(20, 16, 5) }),
  // chutes
  G2("low-kick", "rasteira baixa", { duration: 40, layers: [L("low-kick", { anchor: "field-target", start: 2, end: 20, frameSeq: seq([0, 1, 2], 12), z: 3, tracks: { y: k([0, -6]), alpha: fade(18, 1, 6) } }), peAoAlvo(2, { y0: 18, y1: 18, x0: -40, x1: 0 }), impCinza(PE_IMP, 12, { tracks: { y: k([0, 16]), alpha: fade(12, 1, 3) } })], hits: [12], actor: [lunge(0, 12), { who: "target", t: 12, kind: "hop", dur: 12 }] }),
  G2("rolling-kick", "chute giratório em arco", { duration: 40, layers: [L("rolling-kick", { anchor: "target", start: 0, end: 20, frameSeq: seq(intervalo(4), 16, true), z: 3, tracks: { x: k([0, -14]), alpha: fade(20, 1, 6) } }), peAoAlvo(0, { dur: 14, rot0: -360, rot1: 0, x0: -30, x1: -8 }), impCinza(PE_IMP, 14)], hits: [14], actor: [lunge(0, 14)] }),
  G2("jump-kick", "chute voador caindo de cima", { duration: 40, layers: [L("jump-kick", { anchor: "target", start: 0, end: 16, frame: 0, z: 3, tracks: { x: k([0, -26], [14, -10]), y: k([0, -60], [14, -18, "in"]), rot: k([0, -20]), alpha: fade(16, 1, 3) } }), peAoAlvo(0, { dur: 14, x0: -26, x1: -6, y0: -44, y1: -4, rot0: 25, rot1: 25 }), impCinza(PE_IMP, 14)], hits: [14], actor: [{ who: "user", t: 0, kind: "hop", dur: 12 }] }),
  G2("high-jump-kick", "chute voador alto e mais forte", { duration: 48, layers: [L("jump-kick", { anchor: "target", start: 0, end: 18, frame: 0, z: 3, tracks: { x: k([0, -30], [16, -10]), y: k([0, -90], [16, -18, "in"]), rot: k([0, -20]), alpha: fade(18, 1, 3) } }), peAoAlvo(0, { dur: 16, x0: -30, x1: -6, y0: -80, y1: -4, rot0: 25, rot1: 25, scale: 1.3 }), imp("high-jump-kick", 16, { n: 4, fps: 14 })], hits: [16], actor: [{ who: "user", t: 0, kind: "hop", dur: 14 }], screen: tremor(16, 10, 4) }),
  G2("blaze-kick", "chute em chamas", { duration: 44, layers: [L("blaze-kick", { anchor: "target", start: 0, end: 16, frameSeq: seq(intervalo(4), 16, true), z: 3, tracks: { x: k([0, -40], [14, -12, "out"]), alpha: fade(16, 1, 3) } }), impCinza(PE_IMP, 14), L("fire-fang--chama", { anchor: "target", start: 14, end: 20, spawn: { count: 6, spread: [12, 6], interval: 1, life: 20, seed: 21, vy: -0.8, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(20, 1, 8) } })], hits: [14], actor: [lunge(0, 14)] }),
  // raios
  G2("solar-beam", "carga de luz do sol e raio grosso", {
    duration: 84,
    layers: [L("solar-beam--carga", { anchor: "user", start: 0, end: 40, frameSeq: seq([0, 1, 2, 3, 3, 3], 8), z: 3, tracks: { x: k([0, 18]), y: k([0, -10]), alpha: fade(40, 3, 4) } }), feixeMeio("solar-beam--raio", 36, 76, { n: 3 })],
    hits: [44, 56],
    screen: { flash: [{ t: 36, dur: 8, color: "#FFF8A0", alpha: 0.4 }], shake: [{ t: 38, dur: 30, amp: 2 }] },
  }),
  G2("signal-beam", "raio de luzes coloridas piscando", { duration: 46, layers: [feixeMeio("signal-beam", 2, 38)], hits: [14] }),
  G2("mirror-shot", "clarão refletido num espelho", { duration: 46, layers: [L("mirror-shot--espelho", { anchor: "user", start: 0, end: 30, frameSeq: seq([0, 1, 2, 2], 8), z: 3, tracks: { x: k([0, 22]), y: k([0, -8]), alpha: fade(30, 2, 6) } }), viagem("mirror-shot--clarao", 22, 34, { frameSeq: seq([0, 1], 15, true), orient: true })], hits: [34], screen: { flash: [{ t: 20, dur: 4, color: "#FFFFFF", alpha: 0.35 }] } }),
  G2("charge-beam", "raio elétrico amarelo", { duration: 46, layers: [feixeMeio("charge-beam", 2, 38)], hits: [12, 24] }),
  // cortes de ar e lâmina
  G2("air-slash", "lâmina de ar branca em meia-lua", { duration: 40, layers: [...sequenciaProj("air-slash", 2, 8, 16), impCinza(SOCO_IMP, 16), impCinza(SOCO_IMP, 24)], hits: [16, 24] }),
  G2("air-cutter", "várias lâminas de ar pequenas", { duration: 40, layers: [L("air-cutter", { anchor: "user", to: "target", start: 0, end: 22, spawn: { count: 6, spread: [4, 16], interval: 2, life: 14, seed: 22, frames: [0, 1, 2] }, orient: true, tracks: { p: k([0, 0], [14, 1]), alpha: fade(14, 1, 2) } })], hits: [16, 24] }),
  G2("leaf-blade", "lâmina verde em forma de folha", { duration: 36, layers: [imp("leaf-blade", 4, { n: 4, fps: 15 })], hits: [10], actor: [lunge(0, 12)] }),
  G2("razor-wind", "redemoinho de lâminas de vento", { duration: 64, layers: [L("razor-wind", { anchor: "user", start: 0, end: 34, frameSeq: seq(intervalo(4), 14, true), z: 3, tracks: { alpha: fade(34, 3, 2) } }), viagem("razor-wind", 32, 50, { frameSeq: seq(intervalo(4), 16, true) })], hits: [50] }),
  // sombrio rápido
  G2("pursuit", "silhueta escura perseguindo", { duration: 44, layers: [viagem("pursuit", 0, 18, { frameSeq: seq([0, 1, 2], 12), tracks: { p: k([0, 0], [18, 0.85]) } }), impCinza(SOCO_IMP, 18)], hits: [18], actor: [{ who: "user", t: 0, kind: "hide", dur: 30 }] }),
  G2("assurance", "punho escuro e um '!'", { duration: 54, layers: [{ ...punhoAoAlvo(0, {}), asset: nomeOg("assurance--punho.png"), keepColor: true }, impCinza(SOCO_IMP, 12), L("assurance--exclamacao", { anchor: "target", start: 14, end: 48, frame: 0, z: 4, tracks: { y: k([0, -26], [6, -34, "out"]), alpha: fade(34, 1, 6) } })], hits: [12], actor: [lunge(0, 12)] }),
  G2("payback", "soco escuro de revide com seta voltando", { duration: 48, layers: [L("payback", { anchor: "target", start: 0, end: 22, frameSeq: seq([0, 1, 2], 10), z: 4, tracks: { y: k([0, -28]), alpha: fade(22, 2, 4) } }), { ...punhoAoAlvo(18, {}), asset: nomeOg("assurance--punho.png"), keepColor: true }, impCinza(SOCO_IMP, 30)], hits: [30], actor: [lunge(18, 12)] }),
  G2("feint-attack", "golpe surgindo de lado com sombra", { duration: 44, layers: [imp("feint-attack", 4, { n: 4, fps: 10 })], hits: [22], actor: [{ who: "user", t: 0, kind: "hide", dur: 36 }] }),
  // ataques rápidos
  G2("feint", "finta com silhueta falsa", { duration: 44, layers: [Lc("feint", { anchor: "target", start: 0, end: 24, frameSeq: seq([0, 1, 2], 8), z: 3, tracks: { x: k([0, -30]), alpha: fade(24, 2, 4) } }), impCinza(SOCO_IMP, 26)], hits: [26], actor: [dash(18, 18)] }),
  G2("aqua-jet", "rastro de jato d'água", { duration: 40, layers: [L("aqua-jet", { anchor: "user", to: "target", start: 0, end: 20, frameSeq: seq(intervalo(4), 16, true), orient: true, z: 1, tracks: { p: k([0, 0.2], [14, 0.6]), alpha: fade(20, 1, 6) } }), imp("water-shuriken--impacto", 14, { n: 4, fps: 18 })], hits: [14], actor: [dash(0, 24)] }),
  G2("extreme-speed", "rastro branco intenso", { duration: 36, layers: [L("extreme-speed", { anchor: "user", to: "target", start: 0, end: 16, frameSeq: seq([0, 1, 2], 18, true), orient: true, z: 1, tracks: { p: k([0, 0.5]), alpha: fade(16, 1, 6) } }), impCinza(SOCO_IMP, 8)], hits: [8], actor: [{ who: "user", t: 0, kind: "hide", dur: 16 }], screen: { flash: [{ t: 6, dur: 3, color: "#FFFFFF", alpha: 0.3 }] } }),
  G2("u-turn", "rastro em U verde-inseto", { duration: 44, layers: [L("u-turn", { anchor: "user", to: "target", start: 0, end: 36, frameSeq: seq(intervalo(4), 8), orient: true, z: 3, tracks: { p: k([0, 0.45]), alpha: fade(36, 2, 8) } }), impCinza(SOCO_IMP, 18)], hits: [18], actor: [dash(0, 36)] }),
  // bloqueios
  G2("imprison", "grade de cela roxa", { duration: 56, layers: [L("imprison", { anchor: "target", start: 0, end: 50, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { y: k([0, -40], [10, 0, "out"]), alpha: fade(50, 2, 8) } })], hits: [10], react: "status" }),
  G2("torment", "chifres de diabinho e marcas de raiva", { duration: 56, layers: [L("torment", { anchor: "target", start: 0, end: 50, frameSeq: seq([0, 1, 2, 1, 2], 6), z: 4, tracks: { y: k([0, -30]), alpha: fade(50, 3, 8) } })], hits: [20], react: "status" }),
  G2("embargo", "cadeado preto", { duration: 52, layers: [L("embargo", { anchor: "target", start: 0, end: 46, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { y: k([0, -26]), alpha: fade(46, 3, 8) } })], hits: [16], react: "status" }),
  G2("heal-block", "cruz verde com X", { duration: 52, layers: [L("heal-block", { anchor: "target", start: 0, end: 46, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { y: k([0, -26]), alpha: fade(46, 3, 8) } })], hits: [16], react: "status" }),
  // dreno
  G2("mega-drain", "esferas verdes maiores voltando", { duration: 54, layers: [imp("water-shuriken--impacto", 2, { n: 4, fps: 16 }), orbesDreno("mega-drain", 8, { frames: [0, 1], count: 6 })], hits: [4] }),
  G2("giga-drain", "muitas esferas e raízes de luz", { duration: 64, layers: [imp("giga-drain", 0, { n: 4, fps: 8, tracks: { y: k([0, -10]), alpha: fade(30, 2, 6) } }), orbesDreno("mega-drain", 16, { frames: [0, 1], count: 10 })], hits: [8] }),
  G2("drain-punch", "punho que suga energia laranja", { duration: 56, layers: [punhoAoAlvo(0), impCinza(SOCO_IMP, 12), orbesDreno("drain-punch--energia", 16)], hits: [12], actor: [lunge(0, 12)] }),
  G2("horn-leech", "chifre de madeira e esferas verdes", { duration: 56, layers: [viagem("horn-leech", 0, 12, { frame: 0, orient: true, tracks: { p: k([0, 0.3], [12, 0.9, "in"]) } }), impCinza(SOCO_IMP, 12), orbesDreno("mega-drain", 18, { frames: [0, 1] })], hits: [12], actor: [lunge(0, 12)] }),
  // lama e lodo
  G2("mud-slap", "tapa de lama marrom", { duration: 40, layers: [viagem("mud-slap", 0, 12, { frame: 0 }), imp("mud-slap", 12, { n: 4, fps: 12 })], hits: [12] }),
  G2("sludge", "gosma roxa arremessada", { duration: 44, layers: [viagem("sludge--projetil", 0, 18, { frameSeq: seq([0, 1], 10, true), arc: 16 }), imp("sludge--respingo", 18, { n: 4, fps: 12 })], hits: [18] }),
  G2("sludge-bomb", "bomba de lodo explodindo", { duration: 52, layers: [viagem("sludge-bomb--bomba", 0, 22, { frame: 0, arc: 24, tracks: { rot: k([0, 0], [22, 360]) } }), imp("sludge-bomb--explosao", 22, { n: 5, fps: 15 })], hits: [22], screen: tremor(22, 8, 2) }),
  G2("egg-bomb", "ovo branco que explode", { duration: 52, layers: [viagem("egg-bomb--ovo", 0, 22, { frame: 0, arc: 28, tracks: { rot: k([0, 0], [22, 540]) } }), imp("egg-bomb--explosao", 22, { n: 5, fps: 15 })], hits: [22], screen: tremor(22, 8, 3) }),
  // arremessos
  G2("submission", "rolagem de luta e impacto", { duration: 60, layers: [L("submission", { anchor: "target", start: 4, end: 44, frameSeq: seq(intervalo(4), 14, true), z: 3, tracks: { alpha: fade(40, 2, 6) } }), impCinza(SOCO_IMP, 44)], hits: [14, 28, 44], actor: [dash(0, 12), { who: "user", t: 6, kind: "hide", dur: 44 }] }),
  G2("circle-throw", "arremesso em arco circular", { duration: 50, layers: [L("circle-throw", { anchor: "target", start: 4, end: 30, frameSeq: seq(intervalo(4), 10), z: 3, tracks: { alpha: fade(26, 2, 6) } }), impCinza(SOCO_IMP, 28)], hits: [28], actor: [lunge(0, 10), { who: "target", t: 10, kind: "hop", dur: 18 }] }),
  G2("vital-throw", "arremesso com linhas de impacto", { duration: 46, layers: [L("vital-throw", { anchor: "field-target", start: 20, end: 38, frameSeq: seq([0, 1, 2], 10), z: 3, tracks: { y: k([0, -10]), alpha: fade(18, 1, 6) } })], hits: [20], actor: [lunge(0, 10), { who: "target", t: 6, kind: "hop", dur: 14 }], screen: tremor(20, 8, 3) }),
  G2("storm-throw", "arremesso com redemoinho de vento", { duration: 50, layers: [L("storm-throw", { anchor: "target", start: 0, end: 36, frameSeq: seq(intervalo(4), 14, true), z: 3, tracks: { alpha: fade(36, 2, 6) } }), impCinza(SOCO_IMP, 30)], hits: [30], actor: [lunge(0, 10), { who: "target", t: 12, kind: "hop", dur: 18 }] }),
  // pedras
  G2("rock-throw", "1 ou 2 pedras jogadas", { duration: 46, layers: [...sequenciaProj("pedra-base", 2, 8, 18, { frames: [1, 0], orient: false, arc: 20, rot: 360, cinza: true }), ...impactosSeq(SOCO_IMP, 2, 8, 18, { cinza: true })], hits: [18, 26] }),
  G2("rock-blast", "rajada de pedras em sequência", { duration: 54, layers: [...sequenciaProj("pedra-base", 5, 6, 12, { frames: [0, 1, 2], orient: false, rot: 360, cinza: true }), ...impactosSeq(SOCO_IMP, 5, 6, 12, { cinza: true })], hits: hitsSeq(5, 6, 12) }),
  G2("rock-slide", "avalanche de pedras caindo", { duration: 60, layers: [{ ...particulasCaindo("pedra-base", [0, 1, 2], { count: 10, spread: [26, 6], interval: 3, vy: 3, life: 20, y: -70, seed: 23, spin: 8 }), keepColor: false }], hits: [22, 34], screen: tremor(18, 30, 3) }),
  G2("rock-wrecker", "rocha enorme em projétil", { duration: 64, layers: [{ ...viagem("rock-wrecker", 6, 30, { frame: 0, arc: 18, tracks: { rot: k([0, 0], [24, 270]) } }), keepColor: false }, imp("head-smash--explosao", 30, { n: 5, fps: 14 })], hits: [30], screen: tremor(30, 16, 5) }),
  // investidas
  G2("take-down", "investida com poeira", { duration: 44, layers: [L("take-down", { anchor: "field-user", start: 0, end: 24, frameSeq: seq(intervalo(4), 10), z: 1, tracks: { x: k([0, -10]), alpha: fade(24, 1, 8) } }), impCinza(SOCO_IMP, 14)], hits: [14], actor: [dash(0, 26)], screen: tremor(14, 6, 2) }),
  G2("double-edge", "investida com aura e recuo", { duration: 56, layers: [L("double-edge--aura", { anchor: "user", to: "target", start: 0, end: 16, frameSeq: seq(intervalo(4), 16, true), z: 3, tracks: { p: k([0, 0], [16, 0.85, "in"]), alpha: fade(16, 2, 2) } }), impCinza(SOCO_IMP, 16), L("double-edge--recuo", { anchor: "user", start: 30, end: 42, frameSeq: seq([0, 1, 2], 15), z: 3, tracks: { alpha: fade(12, 1, 3) } })], hits: [16], actor: [dash(0, 30), { who: "user", t: 30, kind: "shake", dur: 12 }], screen: tremor(16, 10, 3) }),
  G2("head-charge", "cabeça com chifres investindo", { duration: 48, layers: [L("head-charge", { anchor: "user", to: "target", start: 0, end: 16, frame: 0, orient: true, z: 3, tracks: { p: k([0, 0.1], [16, 0.85, "in"]), alpha: fade(16, 2, 2) } }), L("take-down", { anchor: "field-user", start: 0, end: 24, frameSeq: seq(intervalo(4), 10), z: 1, tracks: { alpha: fade(24, 1, 8) } }), impCinza(SOCO_IMP, 16)], hits: [16], actor: [dash(0, 28)], screen: tremor(16, 10, 3) }),
  // cortes
  G2("slash", "três garras de corte", { duration: 34, layers: [imp("slash", 4, { n: 4, fps: 15 })], hits: [10], actor: [lunge(0, 10)] }),
  G2("fury-cutter", "lâmina de inseto verde que cresce", { duration: 34, layers: [imp("fury-cutter", 4, { n: 4, fps: 15 })], hits: [10], actor: [lunge(0, 10)] }),
  G2("karate-chop", "mão de golpe de caratê", { duration: 36, layers: [imp("karate-chop", 2, { n: 3, fps: 12, tracks: { y: k([0, -12]), alpha: fade(15, 1, 3) } }), impCinza(SOCO_IMP, 12)], hits: [12], actor: [lunge(0, 12)] }),
  // espinhos
  G2("poison-sting", "ferrão roxo", { duration: 34, layers: [...sequenciaProj("poison-sting", 1, 0, 12), ...impactosSeq(SOCO_IMP, 1, 0, 12, { cinza: true })], hits: [12] }),
  G2("twineedle", "duas agulhas", { duration: 40, layers: [...sequenciaProj("twineedle", 2, 6, 12), ...impactosSeq(SOCO_IMP, 2, 6, 12, { cinza: true })], hits: [12, 18] }),
  G2("spike-cannon", "espinhos em rajada", { duration: 50, layers: [...sequenciaProj("spike-cannon", 5, 5, 10), ...impactosSeq(SOCO_IMP, 5, 5, 10, { cinza: true })], hits: hitsSeq(5, 5, 10) }),
  // canto
  G2("round", "notas em roda", { duration: 56, layers: [L("round", { anchor: "user", to: "target", start: 0, end: 44, frameSeq: seq(intervalo(4), 10, true), z: 3, tracks: { p: k([0, 0.1], [44, 1]), alpha: fade(44, 3, 6) } })], hits: [40] }),
  G2("perish-song", "notas sombrias e caveira", {
    duration: 90,
    layers: [
      L("perish-song--nota", { anchor: "screen-center", start: 0, end: 50, spawn: { count: 12, spread: [90, 40], interval: 4, life: 34, seed: 24, vy: -0.4, frames: [0, 1] }, z: 4, tracks: { alpha: fade(34, 4, 8) } }),
      L("perish-song--caveira", { anchor: "target", start: 30, end: 84, frame: 0, z: 4, tracks: { y: k([0, -40]), alpha: fade(54, 6, 10) } }),
      L("perish-song--caveira", { anchor: "user", start: 30, end: 84, frame: 0, z: 4, tracks: { x: k([0, 24]), y: k([0, -10]), alpha: fade(54, 6, 10) } }),
    ],
    react: "none",
  }),
  G2("grass-whistle", "folha-apito e notas verdes", { duration: 64, layers: [L("grass-whistle--folha", { anchor: "user", start: 0, end: 40, frame: 0, z: 3, tracks: { x: k([0, 22]), y: k([0, -8]), rot: k([0, -8], [10, 8], [20, -8], [30, 8], [40, -8]), alpha: fade(40, 3, 6) } }), L("grass-whistle--nota", { anchor: "user", to: "target", start: 4, end: 36, spawn: { count: 6, spread: [6, 12], interval: 5, life: 26, seed: 25, frames: [0, 1] }, z: 3, tracks: { p: k([0, 0.15], [26, 1]), alpha: fade(26, 2, 4) } })], hits: [32], react: "status" }),
  // cortes cruzados
  G2("cross-poison", "X roxo de veneno", { duration: 34, layers: [imp("cross-poison", 4, { n: 4, fps: 15 })], hits: [10], actor: [lunge(0, 10)] }),
  G2("night-slash", "corte escuro em meia-lua", { duration: 34, layers: [imp("night-slash", 4, { n: 4, fps: 15 })], hits: [10], actor: [{ who: "user", t: 0, kind: "hide", dur: 16 }] }),
  G2("cross-chop", "duas mãos em X", { duration: 38, layers: [imp("cross-chop", 2, { n: 3, fps: 10 })], hits: [16], actor: [lunge(0, 16)], screen: tremor(16, 6, 2) }),
  // investida elemental
  G2("flame-charge", "chamas pequenas em volta, correndo", { duration: 44, layers: [L("flame-charge", { anchor: "user", start: 0, end: 20, spawn: { count: 8, spread: [18, 14], interval: 2, life: 18, seed: 26, vy: -0.6, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(18, 1, 6) } }), imp("pyro-ball--explosao", 18, { n: 5, fps: 20, tracks: { scale: k([0, 0.6]), alpha: fade(15, 1, 4) } })], hits: [18], actor: [dash(4, 24)] }),
  G2("brave-bird", "pássaro de energia azul investindo", { duration: 56, layers: [L("brave-bird", { anchor: "user", to: "target", start: 0, end: 20, frameSeq: seq(intervalo(4), 16, true), orient: true, z: 3, tracks: { p: k([0, 0], [20, 0.9, "in"]), scale: k([0, 1.4]), alpha: fade(20, 2, 2) } }), impCinza(SOCO_IMP, 20), L("double-edge--recuo", { anchor: "user", start: 34, end: 46, frameSeq: seq([0, 1, 2], 15), z: 3, tracks: { alpha: fade(12, 1, 3) } })], hits: [20], actor: [dash(0, 32), { who: "user", t: 34, kind: "shake", dur: 12 }], screen: tremor(20, 10, 3) }),
  G2("wild-charge", "corpo elétrico investindo", { duration: 52, layers: [L("wild-charge", { anchor: "user", to: "target", start: 0, end: 22, frameSeq: seq(intervalo(4), 16, true), z: 3, tracks: { p: k([0, 0], [22, 0.85, "in"]), alpha: fade(22, 2, 2) } }), L("thunder-fang--raio", { anchor: "target", start: 20, end: 34, frameSeq: seq([0, 1, 2], 15, true), z: 3, tracks: { alpha: fade(14, 1, 3) } }), L("double-edge--recuo", { anchor: "user", start: 34, end: 46, frameSeq: seq([0, 1, 2], 15), z: 3, tracks: { alpha: fade(12, 1, 3) } })], hits: [22], actor: [dash(0, 34)], screen: { flash: [{ t: 22, dur: 4, color: "#FFF6A8", alpha: 0.35 }] } }),
  // sono
  G2("yawn", "bocejo e uma bolha", { duration: 60, layers: [L("yawn", { anchor: "user", start: 0, end: 40, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { x: k([0, 22]), y: k([0, -10]), alpha: fade(40, 3, 6) } }), L("snore", { anchor: "target", start: 34, end: 56, frame: 0, z: 4, tracks: { y: k([0, -30]), alpha: fade(22, 3, 6) } })], hits: [36], react: "status" }),
  G2("snore", "zzz e onda sonora", { duration: 52, layers: [L("snore", { anchor: "user", start: 0, end: 30, frameSeq: seq([0, 1, 2], 6), z: 4, tracks: { x: k([0, 18]), y: k([0, -10]), alpha: fade(30, 3, 4) } }), ...ondas3("roar", 3).slice(0, 2).map((l) => ({ ...l, start: l.start + 20, end: l.end + 20 }))], hits: [40] }),
  G2("sleep-talk", "balão de fala dormindo", { duration: 52, layers: [L("sleep-talk", { anchor: "user", start: 0, end: 46, frameSeq: seq([0, 1, 2, 1, 2], 5), z: 4, tracks: { x: k([0, 22]), y: k([0, -12]), alpha: fade(46, 3, 6) } })], react: "self" }),
  // gelo
  G2("icy-wind", "vento gelado azul-claro", { duration: 90, layers: [feixeMeio("icy-wind", 0, 40), quedaAtributo(32)], hits: [20, 32] }),
  G2("sheer-cold", "congelamento total num bloco de gelo", { duration: 76, layers: [L("sheer-cold", { anchor: "target", start: 6, end: 70, frameSeq: seq([0, 1, 2, 3, 2, 3], 6), z: 4, tracks: { alpha: fade(64, 1, 10) } })], hits: [30], screen: { flash: [{ t: 30, dur: 8, color: "#D8F4FF", alpha: 0.5 }], tint: [{ start: 0, end: 70, color: "#285878", alpha: 0.25 }] } }),
  G2("powder-snow", "flocos de neve leves", { duration: 48, layers: [L("powder-snow", { anchor: "user", to: "target", start: 0, end: 26, spawn: { count: 12, spread: [8, 14], interval: 2, life: 20, seed: 27, spin: 6, frames: [0, 1, 2] }, z: 3, tracks: { p: k([0, 0.05], [20, 1]), alpha: fade(20, 2, 4) } })], hits: [22] }),
];
RECEITAS_OG.push(...LOTE_2B);

// ---------- lote 2c: pares e golpes isolados ----------
const overlayTela = (asset, start, end, fps, o = {}) => L(asset, { anchor: "screen-center", ds: true, start, end, frameSeq: seq(intervalo(o.n ?? 4), fps, true), z: o.z ?? 1, ...(o.virado ? { assetVirado: o.virado } : {}), tracks: { alpha: fade(end - start, 10, 14) } });
const orbita = (asset, quem, start, end, o = {}) => L(asset, { anchor: quem, start, end, spawn: { count: o.count ?? 5, spread: 0, interval: 0, seed: o.seed ?? 1, frames: o.frames ?? [0, 1, 2] }, orbit: { rx: o.rx ?? 26, ry: o.ry ?? 9, speed: o.speed ?? 6 }, z: 3, tracks: { y: k([0, o.y ?? 0]), scale: k([0, o.scale ?? 1]), alpha: fade(end - start, 4, 8) } });
const LOTE_2C = [
  G2("bubble", "bolhinhas pequenas", { duration: 44, layers: [L("bubble", { anchor: "user", to: "target", start: 0, end: 24, spawn: { count: 8, spread: [6, 10], interval: 2, life: 18, seed: 31, frames: [0, 1, 2] }, z: 3, tracks: { p: k([0, 0.1], [18, 1]), y: k([0, 0], [9, -4], [18, 0]), alpha: fade(18, 2, 3) } })], hits: [20, 28] }),
  G2("water-gun", "jato d'água fino", { duration: 40, layers: [feixeMeio("water-gun", 0, 30, { frameSeq: seq([0, 1], 15, true) }), imp("water-shuriken--impacto", 12, { n: 4, fps: 16 })], hits: [12] }),
  G2("toxic-spikes", "espinhos roxos no chão", { duration: 60, layers: [L("toxic-spikes", { anchor: "field-target", start: 4, end: 56, frameSeq: seq([0, 1, 2], 8), z: 1, tracks: { y: k([0, -4]), alpha: fade(52, 2, 10) } })], react: "none" }),
  G2("stealth-rock", "pedras pontudas flutuando em volta do alvo", { duration: 70, layers: [orbita("stealth-rock", "target", 4, 66, { count: 5, seed: 32, speed: 5, rx: 34, ry: 12, y: -6, scale: 1.5 })], react: "none" }),
  G2("fury-swipes", "três a cinco arranhões rápidos", { duration: 50, layers: [0, 8, 16, 24].map((t, i) => imp("fury-swipes", t + 2, { n: 3, fps: 20, tracks: { rot: k([0, [0, 70, -30, 100][i]]), x: k([0, [0, 4, -4, 2][i]]), alpha: fade(9, 1, 2) } })), hits: [4, 12, 20, 28], actor: [lunge(0, 30)] }),
  G2("metal-claw", "garra metálica", { duration: 34, layers: [imp("metal-claw", 2, { n: 4, fps: 15 })], hits: [8], actor: [lunge(0, 10)] }),
  G2("crush-claw", "garra enorme esmagando", { duration: 40, layers: [imp("crush-claw", 2, { n: 3, fps: 10 })], hits: [16], actor: [lunge(0, 16)], screen: tremor(16, 8, 3) }),
  G2("shadow-punch", "punho de sombra que vem de longe", { duration: 36, layers: [L("shadow-punch", { anchor: "target", start: 0, end: 16, frame: 0, z: 3, tracks: { x: k([0, -110], [16, -10, "in"]), y: k([0, 30], [16, 0]), alpha: fade(16, 4, 2) } }), impCinza(SOCO_IMP, 16)], hits: [16] }),
  G2("flatter", "estrelinhas e balão de elogio", { duration: 56, layers: [L("flatter", { anchor: "target", start: 0, end: 46, frameSeq: seq([0, 1, 2, 1, 2], 6), z: 4, tracks: { x: k([0, -30]), y: k([0, -24]), alpha: fade(46, 3, 8) } })], hits: [24], react: "status" }),
  G2("taunt", "mão provocando: 'vem!'", { duration: 56, layers: [L("taunt", { anchor: "user", start: 0, end: 48, frameSeq: seq([0, 1, 0, 1, 2], 6), z: 4, tracks: { x: k([0, 30]), y: k([0, -10]), scale: k([0, 1.6]), alpha: fade(48, 3, 8) } })], hits: [26], react: "status" }),
  G2("magnitude", "tremor com o número da magnitude", { duration: 76, layers: [L("magnitude", { anchor: "screen-center", start: 0, end: 40, frameSeq: seq([0, 1, 2, 3, 4, 5, 6, 3], 12), z: 5, tracks: { y: k([0, -50]), scale: k([0, 1.5]), alpha: fade(40, 2, 6) } }), L("heavy-slam", { anchor: "field-target", start: 40, end: 72, frameSeq: seq([0, 1, 2, 3], 10), z: 1, tracks: { alpha: fade(32, 1, 10) } })], hits: [44], screen: tremor(36, 34, 5) }),
  G2("bulldoze", "chão que se ergue em ondas", { duration: 60, layers: [L("bulldoze", { anchor: "field-user", to: "field-target", start: 0, end: 44, frameSeq: seq(intervalo(4), 12, true), z: 1, tracks: { p: k([0, 0.1], [44, 1]), alpha: fade(44, 3, 8) } }), quedaAtributo(40)], hits: [36], screen: tremor(4, 40, 3) }),
  G2("wonder-room", "sala com xadrez distorcido", { duration: 96, layers: [overlayTela("wonder-room", 0, 96, 6)], react: "none" }),
  G2("magic-room", "sala com estrelas mágicas", { duration: 96, layers: [overlayTela("magic-room", 0, 96, 6, { z: 4 })], react: "none" }),
  G2("odor-sleuth", "nariz farejando com linhas de cheiro", { duration: 60, layers: [L("odor-sleuth", { anchor: "user", start: 0, end: 50, frameSeq: seq([0, 1, 2, 1, 2], 6), z: 4, tracks: { x: k([0, 26]), y: k([0, -8]), alpha: fade(50, 3, 8) } })], hits: [30], react: "status" }),
  G2("miracle-eye", "olho com brilho mágico", { duration: 56, layers: [L("miracle-eye", { anchor: "target", start: 0, end: 48, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { y: k([0, -26]), alpha: fade(48, 3, 8) } })], hits: [26], react: "status" }),
  G2("hex", "maldição em símbolos roxos", { duration: 56, layers: [L("hex", { anchor: "target", start: 0, end: 48, frameSeq: seq(intervalo(4), 10, true), z: 3, tracks: { alpha: fade(48, 4, 8) } })], hits: [26], screen: { tint: [{ start: 0, end: 50, color: "#403060", alpha: 0.25 }] } }),
  G2("dream-eater", "bolha de sonho sendo sugada", { duration: 64, layers: [L("dream-eater", { anchor: "target", to: "user", start: 6, end: 40, frameSeq: seq([0, 1, 2], 4), z: 4, tracks: { p: k([0, 0], [34, 1, "in"]), y: k([0, -24], [34, -8]), alpha: fade(34, 3, 4) } })], hits: [8] }),
  G2("bounce", "mola e o salto", { duration: 56, layers: [L("bounce", { anchor: "field-user", start: 0, end: 18, frameSeq: seq([0, 1, 2], 10), z: 1, tracks: { y: k([0, -8]), alpha: fade(18, 1, 4) } }), impCinza(SOCO_IMP, 38)], hits: [38], actor: [{ who: "user", t: 8, kind: "hop", dur: 20 }, dash(24, 20)] }),
  G2("sky-drop", "alvo erguido ao céu", { duration: 60, layers: [L("sky-drop", { anchor: "target", start: 0, end: 34, frameSeq: seq([0, 1, 2], 8, true), z: 3, tracks: { alpha: fade(34, 3, 6) } }), impCinza(SOCO_IMP, 46)], hits: [46], actor: [{ who: "target", t: 6, kind: "hop", dur: 34 }, dash(36, 18)] }),
  G2("icicle-spear", "estalactites de gelo em rajada", { duration: 50, layers: [...sequenciaProj("icicle-spear", 5, 5, 10), ...impactosSeq(SOCO_IMP, 5, 5, 10, { cinza: true })], hits: hitsSeq(5, 5, 10) }),
  G2("ice-ball", "bola de gelo rolando", { duration: 44, layers: [viagem("ice-ball", 0, 22, { frameSeq: seq(intervalo(4), 16, true), arc: 4 }), L("ice-fang--cristal", { anchor: "target", start: 22, end: 26, spawn: { count: 7, spread: 6, interval: 0, life: 20, seed: 33, burst: 1.2, spin: 8, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(20, 1, 6) } })], hits: [22] }),
  G2("dark-pulse", "anéis escuros e roxos em pulso", { duration: 44, layers: [L("dark-pulse", { anchor: "user", start: 0, end: 22, frameSeq: seq(intervalo(4), 12), z: 3, tracks: { alpha: fade(22, 1, 4) } }), imp("dark-pulse", 18, { n: 4, fps: 12 })], hits: [20], screen: { tint: [{ start: 0, end: 36, color: "#100810", alpha: 0.3 }] } }),
  G2("ominous-wind", "vento roxo fantasmagórico", { duration: 90, layers: [feixeMeio("ominous-wind", 0, 40), subidaAtributoOg(40)], hits: [22] }),
  G2("ice-punch", "punho com gelo", { duration: 44, layers: [L("ice-punch", { anchor: "target", start: 0, end: 12, frame: 0, z: 3, tracks: { x: k([0, -34], [12, -10, "out"]), alpha: fade(12, 1, 3) } }), impCinza(SOCO_IMP, 12), L("ice-fang--cristal", { anchor: "target", start: 12, end: 16, spawn: { count: 7, spread: 6, interval: 0, life: 20, seed: 34, burst: 1.2, spin: 8, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(20, 1, 6) } })], hits: [12], actor: [lunge(0, 12)] }),
  G2("thunder-punch", "punho com raios", { duration: 44, layers: [L("thunder-punch", { anchor: "target", start: 0, end: 14, frameSeq: seq([0, 1, 2], 15, true), z: 3, tracks: { x: k([0, -34], [12, -10, "out"]), alpha: fade(14, 1, 3) } }), impCinza(SOCO_IMP, 12), L("thunder-fang--raio", { anchor: "target", start: 12, end: 28, frameSeq: seq([0, 1, 2], 15, true), z: 3, tracks: { alpha: fade(16, 1, 4) } })], hits: [12], actor: [lunge(0, 12)], screen: { flash: [{ t: 12, dur: 4, color: "#FFF6A8", alpha: 0.3 }] } }),
  G2("seed-bomb", "semente que explode", { duration: 50, layers: [viagem("seed-bomb--semente", 0, 22, { frame: 0, arc: 26, tracks: { rot: k([0, 0], [22, 540]) } }), imp("seed-bomb--explosao", 22, { n: 5, fps: 15 })], hits: [22] }),
  G2("petal-dance", "pétalas rosas em redemoinho", { duration: 76, layers: [orbita("petal-dance", "user", 0, 34, { count: 10, seed: 35, speed: 14, rx: 24, ry: 14 }), orbita("petal-dance", "target", 30, 70, { count: 10, seed: 36, speed: 14, rx: 24, ry: 14 })], hits: [40, 52], actor: [{ who: "user", t: 0, kind: "hop", dur: 20 }] }),
  G2("inferno", "anel de fogo envolvendo o alvo", { duration: 64, layers: [L("inferno", { anchor: "field-target", start: 4, end: 58, frameSeq: seq(intervalo(6), 14, true), z: 3, tracks: { y: k([0, -10]), alpha: fade(54, 3, 10) } })], hits: [16, 34], screen: { tint: [{ start: 0, end: 60, color: "#802000", alpha: 0.2 }] } }),
  G2("leer", "olhar penetrante com brilho", { duration: 84, layers: [L("leer", { anchor: "user", start: 0, end: 30, frameSeq: seq([0, 1, 2, 2], 8), z: 4, tracks: { x: k([0, 24]), y: k([0, -14]), alpha: fade(30, 2, 6) } }), quedaAtributo(28)], hits: [28], react: "status" }),
  G2("glare", "olhos de serpente e raio paralisante", { duration: 56, layers: [L("glare--olhos", { anchor: "user", start: 0, end: 30, frameSeq: seq([0, 1, 1], 6), z: 4, tracks: { x: k([0, 24]), y: k([0, -14]), alpha: fade(30, 2, 6) } }), feixeMeio("glare--raio", 18, 38, { frameSeq: seq([0, 1], 15, true) })], hits: [30], react: "status" }),
  G2("body-slam", "corpo caindo e onda de choque", { duration: 50, layers: [L("body-slam", { anchor: "field-target", start: 18, end: 40, frameSeq: seq(intervalo(4), 12), z: 1, tracks: { y: k([0, -4]), alpha: fade(22, 1, 6) } })], hits: [18], actor: [{ who: "user", t: 0, kind: "hop", dur: 14 }, dash(4, 24)], screen: tremor(18, 10, 4) }),
  G2("earth-power", "rachaduras e jatos de energia do chão", { duration: 60, layers: [L("earth-power", { anchor: "field-target", start: 4, end: 44, frameSeq: seq(intervalo(5), 8), z: 3, tracks: { y: k([0, -22]), alpha: fade(40, 1, 6) } })], hits: [22], screen: tremor(4, 30, 3) }),
  G2("follow-me", "dedo chamando e seta", { duration: 56, layers: [L("follow-me", { anchor: "user", start: 0, end: 48, frameSeq: seq([0, 1, 0, 1, 2], 6), z: 4, tracks: { x: k([0, 30]), y: k([0, -10]), scale: k([0, 1.6]), alpha: fade(48, 3, 8) } })], react: "self" }),
  G2("mind-reader", "olho e linhas de mira", { duration: 56, layers: [L("mind-reader", { anchor: "target", start: 0, end: 46, frameSeq: seq([0, 1, 2, 2], 6), z: 4, tracks: { alpha: fade(46, 3, 8) } })], hits: [26], react: "status" }),
  G2("telekinesis", "aura psíquica levantando o alvo", { duration: 64, layers: [L("telekinesis", { anchor: "target", start: 0, end: 56, frameSeq: seq(intervalo(4), 10, true), z: 3, tracks: { alpha: fade(56, 4, 8) } })], hits: [20], react: "status", actor: [{ who: "target", t: 10, kind: "hop", dur: 40 }] }),
  G2("leaf-tornado", "tornado de folhas verdes", { duration: 60, layers: [L("leaf-tornado", { anchor: "user", to: "target", start: 0, end: 50, frameSeq: seq(intervalo(4), 14, true), z: 3, tracks: { p: k([0, 0.1], [20, 1, "out"]), alpha: fade(50, 3, 8) } })], hits: [22, 34] }),
  G2("brine", "jato de água salgada com cristais de sal", { duration: 46, layers: [feixeMeio("brine--jato", 0, 30, { frameSeq: seq([0, 1], 15, true) }), L("brine--sal", { anchor: "target", start: 10, end: 26, spawn: { count: 8, spread: 6, interval: 2, life: 18, seed: 37, burst: 1.2, gravity: 0.06, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(18, 1, 6) } })], hits: [12] }),
  G2("dive", "mergulho e respingo", { duration: 56, layers: [L("dive", { anchor: "field-target", start: 6, end: 40, frameSeq: seq(intervalo(5), 9), z: 3, tracks: { y: k([0, -20]), alpha: fade(34, 1, 6) } })], hits: [14], actor: [{ who: "user", t: 0, kind: "hide", dur: 40 }] }),
  G2("spite", "aura escura com rosto rancoroso", { duration: 56, layers: [L("spite", { anchor: "target", start: 0, end: 48, frameSeq: seq([0, 1, 2, 1, 2], 6), z: 4, tracks: { alpha: fade(48, 4, 8) } })], hits: [26], react: "status" }),
  G2("brick-break", "tijolo quebrando", { duration: 42, layers: [imp("brick-break", 4, { n: 4, fps: 12, tracks: { y: k([0, -20]), alpha: fade(20, 1, 6) } }), impCinza(SOCO_IMP, 12)], hits: [12], actor: [lunge(0, 12)], screen: tremor(12, 6, 2) }),
  G2("focus-punch", "punho concentrado com aura e impacto enorme", { duration: 84, layers: [L("focus-punch--aura", { anchor: "user", start: 0, end: 50, frameSeq: seq(intervalo(4), 12, true), z: 3, tracks: { alpha: fade(50, 4, 4) } }), punhoAoAlvo(50, { dur: 10, x0: -50, x1: -12, scale: 1.4 }), imp("focus-punch--impacto", 60, { n: 4, fps: 12 })], hits: [60], actor: [lunge(50, 10)], screen: { shake: [{ t: 60, dur: 16, amp: 6 }], flash: [{ t: 60, dur: 4, color: "#FFFFFF", alpha: 0.4 }] } }),
  G2("dragon-pulse", "pulso de energia em forma de cabeça de dragão", { duration: 44, layers: [viagem("dragon-pulse", 0, 22, { frameSeq: seq([0, 1, 2], 12, true), orient: true, tracks: { scale: k([0, 0.8], [22, 1.3]) } }), imp("psystrike", 22, { n: 5, fps: 18, tracks: { scale: k([0, 0.7]), alpha: fade(17, 1, 4) } })], hits: [22] }),
  G2("muddy-water", "onda de lama marrom", { duration: 64, layers: [L("muddy-water", { anchor: "target", start: 4, end: 48, frameSeq: seq([0, 1, 2, 3, 3], 8), z: 3, tracks: { x: k([0, -30]), y: k([0, -4]), alpha: fade(44, 2, 8) } })], hits: [36], actor: [lunge(26, 12)], screen: tremor(36, 10, 3) }),
  G2("shadow-sneak", "sombra rastejando pelo chão", { duration: 44, layers: [L("shadow-sneak", { anchor: "field-user", to: "field-target", start: 0, end: 24, frameSeq: seq(intervalo(4), 10), orient: true, z: 1, tracks: { p: k([0, 0.5]), alpha: fade(24, 2, 6) } }), impCinza(SOCO_IMP, 24)], hits: [24], actor: [{ who: "user", t: 0, kind: "hide", dur: 30 }] }),
  G2("sweet-kiss", "beijo e coraçãozinho", { duration: 56, layers: [L("sweet-kiss", { anchor: "user", start: 0, end: 24, frameSeq: seq([0, 1, 2], 8), z: 4, tracks: { x: k([0, 22]), y: k([0, -10]), alpha: fade(24, 2, 4) } }), L("charm", { anchor: "user", to: "target", start: 18, end: 40, frame: 0, z: 4, tracks: { p: k([0, 0.1], [22, 1, "out"]), y: k([0, -16]), scale: k([0, 0.6]), alpha: fade(22, 2, 6) } })], hits: [40], react: "status" }),
  G2("hone-claws", "garras afiando com faíscas", { duration: 84, layers: [L("hone-claws", { anchor: "user", start: 0, end: 30, frameSeq: seq([0, 1, 2, 1, 2], 10), z: 4, tracks: { x: k([0, 24]), y: k([0, -8]), alpha: fade(30, 2, 6) } }), subidaAtributoOg(26)], react: "self" }),
  G2("octazooka", "jato de tinta preta", { duration: 52, layers: [feixeMeio("octazooka--jato", 0, 26, { frameSeq: seq([0, 1], 15, true) }), imp("octazooka--mancha", 14, { n: 4, fps: 8 })], hits: [14] }),
  G2("triple-kick", "três chutes em sequência", { duration: 56, layers: [0, 14, 28].flatMap((t, i) => [peAoAlvo(t, { dur: 10, x0: -30, x1: -8, y0: [10, -6, 2][i], y1: [4, -10, -2][i] }), imp("triple-kick", t + 10, { n: 1, fps: 10, frameSeq: seq([i], 10), tracks: { x: k([0, [-4, 4, 0][i]]), y: k([0, [4, -8, -2][i]]), scale: k([0, 1 + i * 0.25]), alpha: fade(12, 1, 4) } })]), hits: [10, 24, 38], actor: [lunge(0, 40)] }),
  G2("arm-thrust", "palmas rápidas em sequência", { duration: 50, layers: [0, 7, 14, 21].flatMap((t, i) => [L("arm-thrust--palma", { anchor: "target", start: t, end: t + 8, frame: 0, z: 3, tracks: { x: k([0, -30], [6, -10]), y: k([0, (i % 2 ? -8 : 6)]), alpha: fade(8, 1, 2) } }), imp("arm-thrust--impacto", t + 6, { n: 3, fps: 20, tracks: { y: k([0, i % 2 ? -8 : 6]), alpha: fade(9, 1, 3) } })]), hits: [6, 13, 20, 27], actor: [lunge(0, 30)] }),
  G2("water-spout", "jato d'água em gêiser", { duration: 64, layers: [L("water-spout", { anchor: "field-user", start: 0, end: 30, frameSeq: seq([0, 1, 2, 3], 10), z: 3, tracks: { y: k([0, -44]), alpha: fade(30, 2, 6) } }), { ...particulasCaindo("liquidation--gota", [0, 1, 2], { count: 12, spread: [26, 6], vy: 2.6, life: 18, y: -70, seed: 38, interval: 1 }), start: 28, end: 44 }], hits: [36, 44], screen: tremor(30, 16, 2) }),
  G2("roar-of-time", "distorção temporal azul e relógio", { duration: 96, layers: [L("roar-of-time--relogio", { anchor: "user", start: 0, end: 50, frameSeq: seq(intervalo(4), 8, true), z: 4, tracks: { x: k([0, 24]), y: k([0, -14]), scale: k([0, 0.6], [12, 1.2, "out"]), alpha: fade(50, 4, 8) } }), overlayTela("roar-of-time--distorcao", 30, 90, 8, { n: 3, z: 4 })], hits: [56, 70], screen: { shake: [{ t: 40, dur: 40, amp: 4 }], flash: [{ t: 40, dur: 8, color: "#90C8FF", alpha: 0.5 }], tint: [{ start: 20, end: 92, color: "#081848", alpha: 0.35 }] } }),
  G2("magma-storm", "redemoinho de magma", { duration: 76, layers: [L("magma-storm", { anchor: "target", start: 4, end: 70, frameSeq: seq(intervalo(6), 14, true), z: 3, tracks: { alpha: fade(66, 4, 10) } })], hits: [20, 40], screen: { tint: [{ start: 0, end: 72, color: "#802000", alpha: 0.25 }] } }),
  G2("incinerate", "chama que queima itens, com cinzas", { duration: 64, layers: [L("incinerate--chama", { anchor: "target", start: 4, end: 40, frameSeq: seq(intervalo(4), 12, true), z: 3, tracks: { y: k([0, -2]), alpha: fade(36, 2, 6) } }), L("incinerate--cinza", { anchor: "target", start: 30, end: 46, spawn: { count: 10, spread: [16, 8], interval: 1, life: 24, seed: 39, vy: -0.4, gravity: 0.03, frames: [0, 1, 2] }, z: 3, tracks: { alpha: fade(24, 2, 8) } })], hits: [14] }),
];
RECEITAS_OG.push(...LOTE_2C);
