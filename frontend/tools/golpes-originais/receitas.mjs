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
export const receitasOgLimpas = () => RECEITAS_OG.map(({ arquetipo, ...r }) => r);
