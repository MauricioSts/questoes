// Gera src/data/pokedex.json a partir da PokéAPI (https://pokeapi.co/api/v2/).
// Roda uma vez (e de novo só se quiser mudar o recorte): o app não chama a PokéAPI em
// tempo de jogo, só busca os sprites. Recorte: gerações 1–5 (#1–#649), porque são as que
// têm sprite animado de Black/White de frente E de costas.
//
//   node scripts/gerar-pokedex.mjs
//
// Formato compacto (o JSON vai num chunk carregado só na tela da Batalha):
//   tipos: nomes em inglês, na ordem usada pelos índices
//   golpes: [nome, tipo, poder, classe(0 físico, 1 especial, 2 status), dreno%, cura%,
//            condição, chance%, crítico]
//   especies[id]: { n, t:[tipos], s:[hp,atk,def,spa,spd,spe], a: habilidade, c: taxa de
//            captura, l: lendário, g:[[golpe, nível]], e:[[paraId, tipo, valor]], p: pré }
//   evolução: tipo "l" = nível (valor), "i" = item (nome), "t" = troca, "f" = amizade/outro
import { writeFile, mkdir } from "node:fs/promises";

const API = "https://pokeapi.co/api/v2";
const MAX_ID = 649;
const VERSAO = "black-white";
const TIPOS = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

const cache = new Map();
async function get(url) {
  if (cache.has(url)) return cache.get(url);
  for (let tentativa = 0; ; tentativa++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const j = await r.json();
      cache.set(url, j);
      return j;
    } catch (e) {
      if (tentativa >= 4) throw e;
      await new Promise((ok) => setTimeout(ok, 800 * (tentativa + 1)));
    }
  }
}

async function emLotes(itens, n, fn) {
  const saida = new Array(itens.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < itens.length) {
        const k = i++;
        saida[k] = await fn(itens[k]);
      }
    })
  );
  return saida;
}

const idDaUrl = (u) => Number(u.split("/").filter(Boolean).pop());

const ids = Array.from({ length: MAX_ID }, (_, i) => i + 1);
let feitos = 0;
const pokes = await emLotes(ids, 8, async (id) => {
  const [p, s] = await Promise.all([get(`${API}/pokemon/${id}`), get(`${API}/pokemon-species/${id}`)]);
  if (++feitos % 50 === 0) console.log(`espécies ${feitos}/${MAX_ID}`);
  return { id, p, s };
});

// Golpes aprendidos por nível em Black/White (o jogo das sprites).
const nomesGolpes = new Set();
const aprende = new Map();
for (const { id, p } of pokes) {
  const lista = [];
  for (const m of p.moves) {
    const d = m.version_group_details.find((v) => v.version_group.name === VERSAO && v.move_learn_method.name === "level-up");
    if (d) lista.push([m.move.name, d.level_learned_at]);
  }
  lista.sort((a, b) => a[1] - b[1]);
  aprende.set(id, lista);
  for (const [n] of lista) nomesGolpes.add(n);
}

feitos = 0;
const golpesRaw = await emLotes([...nomesGolpes], 8, async (n) => {
  const m = await get(`${API}/move/${n}`);
  if (++feitos % 100 === 0) console.log(`golpes ${feitos}/${nomesGolpes.size}`);
  return m;
});
const golpes = [];
const idxGolpe = new Map();
for (const m of golpesRaw) {
  const tipo = TIPOS.indexOf(m.type.name);
  if (tipo < 0) continue; // tipo "shadow"/"???"
  const classe = { physical: 0, special: 1, status: 2 }[m.damage_class?.name] ?? 2;
  const meta = m.meta ?? {};
  idxGolpe.set(m.name, golpes.length);
  golpes.push([
    m.names.find((x) => x.language.name === "en")?.name ?? m.name,
    tipo,
    m.power ?? 0,
    classe,
    meta.drain ?? 0,
    meta.healing ?? 0,
    meta.ailment?.name && meta.ailment.name !== "none" ? meta.ailment.name : "",
    meta.ailment_chance ?? 0,
    meta.crit_rate ?? 0,
  ]);
}

// Cadeias de evolução
const cadeias = new Set(pokes.map(({ s }) => s.evolution_chain.url));
feitos = 0;
const evolucoes = new Map(); // id -> [[para, tipo, valor]]
const pre = new Map();
await emLotes([...cadeias], 8, async (url) => {
  const c = await get(url);
  const andar = (no) => {
    const de = idDaUrl(no.species.url);
    for (const filho of no.evolves_to) {
      const para = idDaUrl(filho.species.url);
      if (de <= MAX_ID && para <= MAX_ID) {
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
  andar(c.chain);
  if (++feitos % 50 === 0) console.log(`cadeias ${feitos}/${cadeias.size}`);
});

const especies = {};
for (const { id, p, s } of pokes) {
  const st = Object.fromEntries(p.stats.map((x) => [x.stat.name, x.base_stat]));
  const hab = p.abilities.filter((a) => !a.is_hidden).sort((a, b) => a.slot - b.slot)[0] ?? p.abilities[0];
  especies[id] = {
    n: s.names.find((x) => x.language.name === "en")?.name ?? p.name,
    t: p.types.sort((a, b) => a.slot - b.slot).map((x) => TIPOS.indexOf(x.type.name)),
    s: [st.hp, st.attack, st.defense, st["special-attack"], st["special-defense"], st.speed],
    a: hab?.ability.name ?? "",
    c: s.capture_rate,
    l: s.is_legendary || s.is_mythical ? 1 : 0,
    g: aprende.get(id).filter(([n]) => idxGolpe.has(n)).map(([n, lv]) => [idxGolpe.get(n), lv]),
    ...(evolucoes.has(id) ? { e: evolucoes.get(id) } : {}),
    ...(pre.has(id) ? { p: pre.get(id) } : {}),
  };
}

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
const saida = { fonte: "https://pokeapi.co/api/v2/", tipos: TIPOS, golpes, especies };
await writeFile(new URL("../src/data/pokedex.json", import.meta.url), JSON.stringify(saida));
console.log(`ok: ${Object.keys(especies).length} espécies, ${golpes.length} golpes`);
