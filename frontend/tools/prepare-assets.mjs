// Prepara os gráficos de golpes (PNGs soltos) para o player de sprites.
//
//   node tools/prepare-assets.mjs [--src assets/attack-graphics] [--out public/fx]
//
// Para cada PNG de --src:
//  1. apaga áreas marcadas em overrides.json (`erase`: créditos "ripped by…" embutidos);
//  2. limpa o fundo: `bg: "checker"` (xadrez branco/cinza de folha de quadros) ou
//     `bg: "corner"` (flood fill a partir dos cantos com tolerância baixa). Só some região
//     clara GRANDE e ligada ao fundo; brilho branco pequeno dentro do sprite fica;
//  3. separa os quadros: `rects` manual > `grid` (células fixas, cortadas no conteúdo, com o
//     deslocamento até o centro da célula em ox/oy) > componentes conectados (alpha > 0,
//     peças a até `merge` px viram uma só), em ordem de linha e depois de coluna;
//  4. grava o PNG limpo em --out/<Nome>.png e tudo em --out/fx-atlas.json;
//  5. gera tools/atlas-preview.html com os quadros numerados para conferir o recorte.
//
// Nada é redimensionado nem filtrado: os pixels saem como entraram (nearest-neighbor no
// player). O resultado (PNG + atlas) não vai para o git: são assets da Nintendo/Game Freak,
// só para protótipo local. Trocar a pasta --src por outros assets regenera tudo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const arg = (n, pad) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : pad;
};
const SRC = path.resolve(RAIZ, arg("--src", "assets/attack-graphics"));
const OUT = path.resolve(RAIZ, arg("--out", "public/fx"));
const OVR = JSON.parse(fs.readFileSync(path.join(AQUI, "overrides.json"), "utf8"));

if (!fs.existsSync(SRC)) {
  console.error(`Sem assets em ${SRC}. Extraia o zip de attack graphics lá e rode de novo.`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const arquivos = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".png")).sort();
const atlas = { versao: 1, base: "256x192", arquivos: {} };
const avisos = [];

for (const arq of arquivos) {
  const nome = arq.replace(/\.png$/i, "");
  const o = OVR[nome] ?? {};
  const png = PNG.sync.read(fs.readFileSync(path.join(SRC, arq)));
  const { width: W, height: H } = png;
  const d = png.data;

  for (const [x, y, w, h] of o.erase ?? []) apagar(d, W, H, x, y, w, h);
  if (o.grid?.eraseCorner)
    for (let r = 0; r < o.grid.rows; r++)
      for (let c = 0; c < o.grid.cols; c++)
        apagar(d, W, H, Math.round((o.grid.x ?? 0) + c * o.grid.cw), Math.round((o.grid.y ?? 0) + r * o.grid.ch), ...o.grid.eraseCorner);
  if (o.bg === "checker") limparClaro(d, W, H, o.bgMin ?? 236, o.bgArea ?? 300);
  else if (o.bg === "corner") limparCantos(d, W, H, o.tol ?? 10);
  else if (o.bg === "white") limparClaro(d, W, H, o.bgMin ?? 250, o.bgArea ?? 300);

  let quadros;
  if (o.rects) quadros = o.rects.map(([x, y, w, h]) => ({ x, y, w, h, ox: 0, oy: 0 }));
  else if (o.grid) quadros = porGrade(d, W, H, o.grid);
  else quadros = porComponentes(d, W, H, o.merge ?? 2, o.minArea ?? 6, !!o.rowFrames);
  for (const [x, y, w, h] of o.extra ?? []) quadros.push({ x, y, w, h, ox: 0, oy: 0 });
  if (o.drop) quadros = quadros.filter((_, i) => !o.drop.includes(i));
  if (!quadros.length) avisos.push(`${nome}: nenhum quadro`);

  fs.writeFileSync(path.join(OUT, arq), PNG.sync.write(png));
  atlas.arquivos[nome] = {
    arquivo: arq,
    tipo: o.kind ?? "particles",
    w: W,
    h: H,
    ...(o.cell ? { celula: o.cell } : {}),
    quadros: quadros.map((q) => ({ ...q, px: Math.round(q.w / 2), py: Math.round(q.h / 2) })),
    ...(o.nota ? { nota: o.nota } : {}),
  };
}

fs.writeFileSync(path.join(OUT, "fx-atlas.json"), JSON.stringify(atlas, null, 1));
fs.writeFileSync(path.join(AQUI, "atlas-preview.html"), preview(atlas, path.relative(AQUI, OUT)));
const total = Object.values(atlas.arquivos).reduce((s, a) => s + a.quadros.length, 0);
console.log(`${arquivos.length} arquivos, ${total} quadros → ${path.relative(RAIZ, OUT)}/fx-atlas.json`);
for (const a of avisos) console.warn("aviso:", a);

// ---------------------------------------------------------------------------------------

function apagar(d, W, H, x0, y0, w, h) {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) d[(y * W + x) * 4 + 3] = 0;
}

// Região clara (cinza neutro >= min, opaca) ligada e grande vira transparente. É o xadrez
// branco/cinza das folhas de quadros e o fundo branco das folhas de textura.
function limparClaro(d, W, H, min, areaMin) {
  const claro = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    return d[i + 3] > 0 && r >= min && g >= min && b >= min && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
  };
  const visto = new Uint8Array(W * H);
  const fila = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (visto[s] || !claro(s * 4)) continue;
    let ini = 0, fim = 0;
    fila[fim++] = s;
    visto[s] = 1;
    while (ini < fim) {
      const p = fila[ini++];
      const x = p % W, y = (p / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (!visto[n] && claro(n * 4)) {
          visto[n] = 1;
          fila[fim++] = n;
        }
      }
    }
    if (fim >= areaMin) for (let k = 0; k < fim; k++) d[fila[k] * 4 + 3] = 0;
  }
}

// Flood fill a partir dos 4 cantos pela cor do canto (tolerância por canal).
function limparCantos(d, W, H, tol) {
  for (const [cx, cy] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
    const c = (cy * W + cx) * 4;
    if (d[c + 3] === 0) continue;
    const ref = [d[c], d[c + 1], d[c + 2]];
    const igual = (i) => d[i + 3] > 0 && Math.abs(d[i] - ref[0]) <= tol && Math.abs(d[i + 1] - ref[1]) <= tol && Math.abs(d[i + 2] - ref[2]) <= tol;
    const pilha = [cy * W + cx];
    while (pilha.length) {
      const p = pilha.pop();
      if (!igual(p * 4)) continue;
      d[p * 4 + 3] = 0;
      const x = p % W, y = (p / W) | 0;
      if (x > 0) pilha.push(p - 1);
      if (x < W - 1) pilha.push(p + 1);
      if (y > 0) pilha.push(p - W);
      if (y < H - 1) pilha.push(p + W);
    }
  }
}

// Grade fixa: { x, y, cw, ch, cols, rows }. Cada célula é cortada no conteúdo; ox/oy guardam
// quanto o centro do corte está deslocado do centro da célula, para o quadro não "pular".
function porGrade(d, W, H, g) {
  const out = [];
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      const x0 = Math.round((g.x ?? 0) + c * g.cw), y0 = Math.round((g.y ?? 0) + r * g.ch);
      const x1 = Math.min(W, Math.round((g.x ?? 0) + (c + 1) * g.cw)), y1 = Math.min(H, Math.round((g.y ?? 0) + (r + 1) * g.ch));
      const bb = caixa(d, W, x0, y0, x1, y1);
      if (!bb) continue;
      const [bx, by, bw, bh] = g.full ? [x0, y0, x1 - x0, y1 - y0] : bb;
      out.push({ x: bx, y: by, w: bw, h: bh, ox: Math.round(bx + bw / 2 - (x0 + x1) / 2), oy: Math.round(by + bh / 2 - (y0 + y1) / 2) });
    }
  return out;
}

function caixa(d, W, x0, y0, x1, y1) {
  let mx = Infinity, my = Infinity, Mx = -1, My = -1;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (d[(y * W + x) * 4 + 3] > 8) {
        if (x < mx) mx = x;
        if (x > Mx) Mx = x;
        if (y < my) my = y;
        if (y > My) My = y;
      }
  return Mx < 0 ? null : [mx, my, Mx - mx + 1, My - my + 1];
}

// Componentes conectados de alpha > 8, juntando peças a até `merge` px. Ordena em linhas
// (sobreposição vertical) e da esquerda para a direita.
function porComponentes(d, W, H, merge, minArea, porLinha) {
  const lab = new Int32Array(W * H).fill(-1);
  const comps = [];
  const cheio = (p) => d[p * 4 + 3] > 8;
  for (let s = 0; s < W * H; s++) {
    if (lab[s] >= 0 || !cheio(s)) continue;
    const id = comps.length;
    let mx = Infinity, my = Infinity, Mx = -1, My = -1, area = 0;
    const pilha = [s];
    lab[s] = id;
    while (pilha.length) {
      const p = pilha.pop();
      const x = p % W, y = (p / W) | 0;
      area++;
      if (x < mx) mx = x;
      if (x > Mx) Mx = x;
      if (y < my) my = y;
      if (y > My) My = y;
      for (let dy = -merge - 1; dy <= merge + 1; dy++)
        for (let dx = -merge - 1; dx <= merge + 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx;
          if (lab[n] < 0 && cheio(n)) {
            lab[n] = id;
            pilha.push(n);
          }
        }
    }
    comps.push({ x: mx, y: my, w: Mx - mx + 1, h: My - my + 1, area });
  }
  const bons = comps.filter((c) => c.area >= minArea).sort((a, b) => a.y - b.y);
  const linhas = [];
  for (const c of bons) {
    const cy = c.y + c.h / 2;
    // rowFrames junta qualquer sobreposição vertical; o normal exige o centro dentro da linha
    const l = linhas.find((l) => (porLinha ? c.y < l.y1 && c.y + c.h > l.y0 : cy >= l.y0 && cy <= l.y1));
    if (l) {
      l.itens.push(c);
      l.y0 = Math.min(l.y0, c.y);
      l.y1 = Math.max(l.y1, c.y + c.h);
    } else linhas.push({ y0: c.y, y1: c.y + c.h, itens: [c] });
  }
  // rowFrames: cada linha da folha é UM quadro (várias peças desenhadas juntas)
  if (porLinha)
    return linhas.map((l) => {
      const x0 = Math.min(...l.itens.map((c) => c.x)), x1 = Math.max(...l.itens.map((c) => c.x + c.w));
      return { x: x0, y: l.y0, w: x1 - x0, h: l.y1 - l.y0, ox: 0, oy: 0 };
    });
  return linhas.flatMap((l) => l.itens.sort((a, b) => a.x - b.x)).map(({ x, y, w, h }) => ({ x, y, w, h, ox: 0, oy: 0 }));
}

function preview(atlas, rel) {
  const cartas = Object.entries(atlas.arquivos)
    .map(([nome, a]) => {
      const esc = Math.max(1, Math.min(4, Math.floor(560 / Math.max(a.w, a.h / 2))));
      const caixas = a.quadros
        .map((q, i) => `<i style="left:${q.x * esc}px;top:${q.y * esc}px;width:${q.w * esc}px;height:${q.h * esc}px"><b>${i}</b></i>`)
        .join("");
      return `<section><h2>${nome} <small>${a.tipo} · ${a.w}×${a.h} · ${a.quadros.length} quadros · ${esc}×</small></h2>
<div class="sheet" style="width:${a.w * esc}px;height:${a.h * esc}px"><img src="${rel}/${a.arquivo}" width="${a.w * esc}" height="${a.h * esc}">${caixas}</div></section>`;
    })
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Atlas de golpes</title>
<style>
body{font:13px system-ui;background:#1d2026;color:#ddd;margin:16px}
section{margin:0 0 28px}h2{font-size:15px;margin:0 0 6px}small{color:#9aa;font-weight:400}
.sheet{position:relative;background:repeating-conic-gradient(#3a3f4a 0 25%,#2c3038 0 50%) 0 0/16px 16px;max-width:100%;overflow:auto}
img{image-rendering:pixelated;display:block}
i{position:absolute;outline:1px solid #ff3d7f;box-sizing:border-box}
b{position:absolute;left:0;top:0;background:#ff3d7f;color:#fff;font:600 10px monospace;padding:0 2px;line-height:12px}
</style>
<h1>Atlas de golpes · ${Object.keys(atlas.arquivos).length} arquivos</h1>
${cartas}`;
}
