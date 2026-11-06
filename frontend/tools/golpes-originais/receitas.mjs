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
