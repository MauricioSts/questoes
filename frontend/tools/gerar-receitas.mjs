// Gera, a partir de tools/receitas.mjs e do catálogo dos 559 golpes:
//   src/data/move-anims/<slug>.json   uma receita por arquivo (o app só lê estes JSON)
//   src/data/move-anim-map.json       golpe → visual: receita própria, reaproveitada (com
//                                     recolor pelo tipo) ou fallback procedural por arquétipo
//   reports/coverage.md               cobertos / aproximados / sem cobertura
// Valida cada receita contra public/fx/fx-atlas.json (se existir): asset e índices de quadro.
//
//   node tools/gerar-receitas.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECEITAS as RECEITAS_DP, REUSO, REUSO_ARQUETIPO } from "./receitas.mjs";
import { gerarCenas } from "./cenas-pixel.mjs";
import { gerarKit } from "./pixel-kit.mjs";
import { CATALOGO, TIPOS_EN } from "../src/components/poke/golpes/catalogo.ts";

// peças em pixel art próprias (public/fx/Px-*.png) e as cenas quadro a quadro dos golpes sem
// folha do DP (public/fx/Cena-*.png) entram no atlas antes da validação
gerarKit();
const PIXEL = gerarCenas(CATALOGO).receitas;
const TIPO_PIXEL = new Map(PIXEL.map((p) => [p.receita.slug, p.tipo]));
const RECEITAS = [...RECEITAS_DP, ...PIXEL.map((p) => p.receita)];

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "src/data/move-anims");
const ATLAS = path.join(RAIZ, "public/fx/fx-atlas.json");
const erros = [];

// ---------- validação ----------
const atlas = fs.existsSync(ATLAS) ? JSON.parse(fs.readFileSync(ATLAS, "utf8")).arquivos : null;
const confere = (slug, asset, frames, onde) => {
  if (!atlas) return;
  const a = atlas[asset];
  if (!a) return erros.push(`${slug}: asset "${asset}" não existe no atlas (${onde})`);
  for (const f of frames) if (!(f >= 0 && f < a.quadros.length)) erros.push(`${slug}: ${asset} não tem quadro ${f} (${onde}; tem ${a.quadros.length})`);
};
const slugs = new Set();
for (const r of RECEITAS) {
  if (slugs.has(r.slug)) erros.push(`receita duplicada: ${r.slug}`);
  slugs.add(r.slug);
  r.layers.forEach((l, i) => {
    const fs_ = [l.frame ?? 0, ...(l.frameSeq?.frames ?? []), ...(l.spawn?.frames ?? [])];
    confere(r.slug, l.asset, fs_, `camada ${i}`);
    if (l.assetVirado) confere(r.slug, l.assetVirado, fs_, `camada ${i} virada`);
    if (l.end <= l.start) erros.push(`${r.slug}: camada ${i} termina antes de começar`);
  });
  if (r.bg) confere(r.slug, r.bg.asset, [r.bg.frame ?? 0, ...(r.bg.frames ?? [])], "bg");
}

// ---------- receitas ----------
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });
for (const r of RECEITAS) fs.writeFileSync(path.join(DIR, `${r.slug}.json`), JSON.stringify(r, null, 1) + "\n");

// ---------- mapa ----------
const tipoDe = new Map(CATALOGO.map((l) => [l.slug, l.tipo]));
const porSlug = new Map(RECEITAS.map((r) => [r.slug, r]));
const mapa = {};
for (const l of CATALOGO) {
  const propria = porSlug.get(l.slug);
  const reuso = REUSO[l.slug] ?? REUSO_ARQUETIPO[l.arquetipo];
  if (propria?.pixel) {
    if (REUSO[l.slug]) erros.push(`${l.slug}: tem receita pixel e também REUSO`);
    const tipo = TIPO_PIXEL.get(l.slug);
    mapa[l.slug] = { modo: "pixel", receita: l.slug, ...(tipo !== undefined ? { tipo } : {}), arquetipo: l.arquetipo };
  } else if (propria) mapa[l.slug] = { modo: propria.approx ? "approx" : "asset", receita: l.slug, arquetipo: l.arquetipo };
  else if (reuso && porSlug.has(reuso)) {
    const base = tipoDe.get(reuso);
    mapa[l.slug] = { modo: "recolor", receita: reuso, ...(base !== undefined && base !== l.tipo ? { tipo: l.tipo } : {}), arquetipo: l.arquetipo };
  } else {
    if (reuso) erros.push(`${l.slug}: reaproveita "${reuso}", que não existe`);
    mapa[l.slug] = { modo: "fallback", arquetipo: l.arquetipo };
  }
}
for (const r of RECEITAS) if (!r.slug.startsWith("_") && !tipoDe.has(r.slug)) erros.push(`receita ${r.slug} não é um golpe do catálogo`);
for (const k of Object.keys(REUSO)) if (!tipoDe.has(k)) erros.push(`REUSO: ${k} não é um golpe do catálogo`);
fs.writeFileSync(path.join(RAIZ, "src/data/move-anim-map.json"), JSON.stringify(mapa, null, 1) + "\n");

// ---------- relatório ----------
const usados = new Set(RECEITAS.flatMap((r) => [...r.layers.flatMap((l) => [l.asset, l.assetVirado].filter(Boolean)), ...(r.bg ? [r.bg.asset] : [])]));
const semUso = atlas ? Object.keys(atlas).filter((a) => !usados.has(a)) : [];
const linhas = (modos) => CATALOGO.filter((l) => modos.includes(mapa[l.slug].modo));
const asset = linhas(["asset"]);
const aprox = linhas(["approx", "recolor"]);
const pixel = linhas(["pixel"]);
const fb = linhas(["fallback"]);
const nomeTipo = (t) => (t === undefined ? "" : TIPOS_EN[t]);
const md = `# Cobertura das animações de golpes

Gerado por \`tools/gerar-receitas.mjs\`. ${CATALOGO.length} golpes (gerações 1–5), ${RECEITAS.length} receitas, ${usados.size} de ${atlas ? Object.keys(atlas).length : "?"} arquivos do atlas usados.

| | golpes |
|---|---|
| Cobertos com asset original | ${asset.length} |
| Cobertos com aproximação (receita combinada ou reaproveitada) | ${aprox.length} |
| Pixel art própria (peças Px-* desenhadas por tools/pixel-kit.mjs) | ${pixel.length} |
| Sem cobertura de sprite (fallback procedural por arquétipo) | ${fb.length} |

Nenhuma receita é a animação do jogo: os PNGs são peças e o movimento foi recriado à mão.
"Asset original" quer dizer que as peças são do próprio golpe.
${semUso.length ? `\nArquivos do atlas sem receita: ${semUso.join(", ")}\n` : ""}
## Cobertos (asset original)

${asset.map((l) => `- ${l.nome} (\`${l.slug}\`)`).join("\n")}

## Cobertos com aproximação

${aprox
  .map((l) => {
    const e = mapa[l.slug];
    if (e.modo === "approx") return `- ${l.nome}: receita própria combinando peças${porSlug.get(l.slug).note ? `: ${porSlug.get(l.slug).note}` : ""}`;
    return `- ${l.nome}: usa \`${e.receita}\`${e.tipo !== undefined ? ` pintado de ${nomeTipo(e.tipo)}` : ""}`;
  })
  .join("\n")}

## Pixel art própria

${pixel.map((l) => `- ${l.nome}: ${porSlug.get(l.slug).note.replace("pixel art própria ", "")}${mapa[l.slug].tipo !== undefined ? ` pintado de ${nomeTipo(mapa[l.slug].tipo)}` : ""}`).join("\n")}

## Sem cobertura (fallback procedural)

${fb.map((l) => `- ${l.nome} → arquétipo ${l.arquetipo}`).join("\n")}
`;
fs.mkdirSync(path.join(RAIZ, "reports"), { recursive: true });
fs.writeFileSync(path.join(RAIZ, "reports/coverage.md"), md);

console.log(`${RECEITAS.length} receitas · asset ${asset.length} · aproximados ${aprox.length} · pixel ${pixel.length} · fallback ${fb.length}${atlas ? "" : " · (sem atlas: índices não conferidos)"}`);
if (semUso.length) console.log(`atlas sem receita: ${semUso.join(", ")}`);
if (erros.length) {
  for (const e of erros) console.error("erro:", e);
  process.exit(1);
}
