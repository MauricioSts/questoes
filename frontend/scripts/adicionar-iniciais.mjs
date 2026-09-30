// Acrescenta a src/data/pokedex.json os iniciais das gerações 6–9 (Kalos, Alola, Galar,
// Paldea) com as evoluções. Só eles: as regiões da jornada continuam sendo 1–5 (#1–#649);
// esses entram apenas como opção de primeiro Pokémon. Golpes por nível vêm do jogo mais
// recente em que a espécie aparece; golpes que já existem no JSON são reaproveitados pelo
// nome e os novos vão para o fim da lista (os índices antigos não mudam).
//
//   node scripts/adicionar-iniciais.mjs
import { readFile, writeFile } from "node:fs/promises";

const CURVAS_XP = ["medium", "fast", "medium-slow", "slow", "slow-then-very-fast", "fast-then-very-slow"];

const API = "https://pokeapi.co/api/v2";
const ARQ = new URL("../src/data/pokedex.json", import.meta.url);
const EXTRAS = [650, 651, 652, 653, 654, 655, 656, 657, 658, 722, 723, 724, 725, 726, 727, 728, 729, 730, 810, 811, 812, 813, 814, 815, 816, 817, 818, 906, 907, 908, 909, 910, 911, 912, 913, 914];
const JOGOS = ["scarlet-violet", "sword-shield", "ultra-sun-ultra-moon", "sun-moon", "omega-ruby-alpha-sapphire", "x-y"];

async function get(url) {
  for (let t = 0; ; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (t >= 4) throw e;
      await new Promise((ok) => setTimeout(ok, 800 * (t + 1)));
    }
  }
}
const idDaUrl = (u) => Number(u.split("/").filter(Boolean).pop());

const dex = JSON.parse(await readFile(ARQ, "utf8"));
const TIPOS = dex.tipos;
const idxGolpe = new Map(dex.golpes.map((g, i) => [g[0], i]));
const ids = new Set(EXTRAS);

const pokes = [];
for (const id of EXTRAS) {
  const [p, s] = await Promise.all([get(`${API}/pokemon/${id}`), get(`${API}/pokemon-species/${id}`)]);
  pokes.push({ id, p, s });
}

async function golpeIdx(nomeApi) {
  const m = await get(`${API}/move/${nomeApi}`);
  const nome = m.names.find((x) => x.language.name === "en")?.name ?? m.name;
  if (idxGolpe.has(nome)) return idxGolpe.get(nome);
  const tipo = TIPOS.indexOf(m.type.name);
  if (tipo < 0) return null;
  const meta = m.meta ?? {};
  idxGolpe.set(nome, dex.golpes.length);
  dex.golpes.push([
    nome,
    tipo,
    m.power ?? 0,
    { physical: 0, special: 1, status: 2 }[m.damage_class?.name] ?? 2,
    meta.drain ?? 0,
    meta.healing ?? 0,
    meta.ailment?.name && meta.ailment.name !== "none" ? meta.ailment.name : "",
    meta.ailment_chance ?? 0,
    meta.crit_rate ?? 0,
  ]);
  return idxGolpe.get(nome);
}

const evolucoes = new Map();
const pre = new Map();
for (const url of new Set(pokes.map(({ s }) => s.evolution_chain.url))) {
  const andar = (no) => {
    const de = idDaUrl(no.species.url);
    for (const filho of no.evolves_to) {
      const para = idDaUrl(filho.species.url);
      if (ids.has(de) && ids.has(para)) {
        const d = filho.evolution_details.find((x) => x.is_default) ?? filho.evolution_details[0];
        let evo;
        if (!d) evo = [para, "f", 0];
        else if (d.trigger.name === "use-item" && d.item) evo = [para, "i", d.item.name];
        else if (d.trigger.name === "trade") evo = [para, "t", 0];
        else if (d.trigger.name === "level-up" && d.min_level) evo = [para, "l", d.min_level];
        else evo = [para, "f", 0];
        evolucoes.set(de, [...(evolucoes.get(de) ?? []), evo]);
        pre.set(para, de);
      }
      andar(filho);
    }
  };
  andar((await get(url)).chain);
}

for (const { id, p, s } of pokes) {
  const jogo = JOGOS.find((j) => p.moves.some((m) => m.version_group_details.some((v) => v.version_group.name === j && v.move_learn_method.name === "level-up")));
  const lista = [];
  for (const m of p.moves) {
    const d = m.version_group_details.find((v) => v.version_group.name === jogo && v.move_learn_method.name === "level-up");
    if (d) lista.push([m.move.name, Math.max(1, d.level_learned_at)]);
  }
  lista.sort((a, b) => a[1] - b[1]);
  const g = [];
  for (const [n, lv] of lista) {
    const i = await golpeIdx(n);
    if (i !== null) g.push([i, lv]);
  }
  const st = Object.fromEntries(p.stats.map((x) => [x.stat.name, x.base_stat]));
  const hab = p.abilities.filter((a) => !a.is_hidden).sort((a, b) => a.slot - b.slot)[0] ?? p.abilities[0];
  dex.especies[id] = {
    n: s.names.find((x) => x.language.name === "en")?.name ?? p.name,
    t: p.types.sort((a, b) => a.slot - b.slot).map((x) => TIPOS.indexOf(x.type.name)),
    s: [st.hp, st.attack, st.defense, st["special-attack"], st["special-defense"], st.speed],
    a: hab?.ability.name ?? "",
    c: s.capture_rate,
    l: s.is_legendary || s.is_mythical ? 1 : 0,
    g,
    ...(evolucoes.has(id) ? { e: evolucoes.get(id) } : {}),
    ...(pre.has(id) ? { p: pre.get(id) } : {}),
    x: p.base_experience ?? Math.round(p.stats.reduce((a, x) => a + x.base_stat, 0) / 5),
    r: Math.max(0, CURVAS_XP.indexOf(s.growth_rate?.name)),
  };
  console.log(id, dex.especies[id].n, jogo, g.length, "golpes");
}

await writeFile(ARQ, JSON.stringify(dex));
console.log(`ok: ${Object.keys(dex.especies).length} espécies, ${dex.golpes.length} golpes`);
