// Gera src/data/rotas.json: o caminho de cada região no modo história, trecho a trecho
// (da cidade de partida até cada ginásio, e a Estrada Vitória), com os Pokémon selvagens
// que aparecem em cada rota nos jogos, tirados das tabelas de encontro da PokéAPI.
//
//   node scripts/gerar-rotas.mjs
//
// A ordem das rotas segue os detonados dos jogos (a ordem dos ginásios é a de REGIOES em
// lib/poke/motor.ts):
//   Kanto  = FireRed/LeafGreen (inclui as Ilhas Sevii 1–3, visitadas entre Blaine e Giovanni)
//   Johto  = Crystal
//   Hoenn  = Emerald
//   Sinnoh = Diamond/Pearl (a ordem de ginásios do app é a de DP: Maylene antes de Fantina)
//   Unova  = Black/White
//
// Formato: { regioes: [ trecho[] ] }, trecho = { rumo, rotas: [{ nome, s: [[id, peso, min, max]] }] }
// `rumo` = índice do ginásio (8 = Estrada Vitória). `peso` = chance média do encontro (soma
// dos métodos, média entre horários/estações e entre as duas versões), em %.
import { readFile, writeFile } from "node:fs/promises";

const API = "https://pokeapi.co/api/v2";

const REGIOES = [
  {
    nome: "Kanto",
    versoes: ["firered", "leafgreen"],
    ate: 151,
    trechos: [
      [["kanto-route-1", "Rota 1"], ["kanto-route-22", "Rota 22"], ["kanto-route-2", "Rota 2"], ["viridian-forest", "Floresta de Viridian"]],
      [["kanto-route-3", "Rota 3"], ["mt-moon", "Mt. Moon"], ["kanto-route-4", "Rota 4"]],
      [["kanto-route-24", "Rota 24 (Ponte Pepita)"], ["kanto-route-25", "Rota 25"], ["kanto-route-5", "Rota 5"], ["kanto-route-6", "Rota 6"], ["digletts-cave", "Caverna do Diglett"]],
      [["kanto-route-11", "Rota 11"], ["kanto-route-9", "Rota 9"], ["rock-tunnel", "Túnel de Pedra"], ["kanto-route-10", "Rota 10"], ["kanto-route-8", "Rota 8"], ["kanto-route-7", "Rota 7"]],
      [["pokemon-tower", "Torre Pokémon"], ["kanto-route-16", "Rota 16"], ["kanto-route-17", "Rota 17 (Ciclovia)"], ["kanto-route-18", "Rota 18"]],
      [["kanto-route-15", "Rota 15"], ["kanto-route-14", "Rota 14"], ["kanto-route-13", "Rota 13"], ["kanto-route-12", "Rota 12"], ["kanto-power-plant", "Usina Elétrica"]],
      [["kanto-sea-route-19", "Rota Marítima 19"], ["kanto-sea-route-20", "Rota Marítima 20"], ["seafoam-islands", "Ilhas Seafoam"], ["pokemon-mansion", "Mansão Pokémon"]],
      [["kindle-road", "Estrada Kindle (Ilha 1)"], ["treasure-beach", "Praia do Tesouro"], ["mt-ember", "Monte Ember"], ["cape-brink", "Cabo Brink (Ilha 2)"], ["bond-bridge", "Ponte Bond (Ilha 3)"], ["berry-forest", "Floresta das Frutas"], ["kanto-sea-route-21", "Rota Marítima 21"]],
      [["kanto-route-22", "Rota 22"], ["kanto-route-23", "Rota 23"], ["kanto-victory-road-2", "Estrada Vitória"]],
    ],
  },
  {
    nome: "Johto",
    versoes: ["crystal"],
    ate: 251,
    trechos: [
      [["johto-route-29", "Rota 29"], ["johto-route-30", "Rota 30"], ["johto-route-31", "Rota 31"], ["dark-cave", "Caverna Escura"], ["sprout-tower", "Torre Sprout"]],
      [["johto-route-32", "Rota 32"], ["ruins-of-alph", "Ruínas de Alph"], ["union-cave", "Caverna União"], ["johto-route-33", "Rota 33"], ["slowpoke-well", "Poço Slowpoke"]],
      [["ilex-forest", "Floresta Ilex"], ["johto-route-34", "Rota 34"]],
      [["johto-route-35", "Rota 35"], ["national-park", "Parque Nacional"], ["johto-route-36", "Rota 36"], ["johto-route-37", "Rota 37"], ["burned-tower", "Torre Queimada"]],
      [["johto-route-38", "Rota 38"], ["johto-route-39", "Rota 39"], ["johto-sea-route-40", "Rota Marítima 40"], ["johto-sea-route-41", "Rota Marítima 41"]],
      [["johto-sea-route-41", "Rota Marítima 41 (volta com o remédio)"], ["johto-sea-route-40", "Rota Marítima 40"]],
      [["johto-route-42", "Rota 42"], ["mt-mortar", "Mt. Mortar"], ["johto-route-43", "Rota 43"], ["lake-of-rage", "Lago da Fúria"]],
      [["johto-route-44", "Rota 44"], ["ice-path", "Caminho de Gelo"]],
      [["johto-route-45", "Rota 45"], ["johto-route-46", "Rota 46"], ["kanto-route-27", "Rota 27"], ["tohjo-falls", "Cataratas Tohjo"], ["kanto-route-26", "Rota 26"], ["kanto-victory-road-1", "Estrada Vitória"]],
    ],
  },
  {
    nome: "Hoenn",
    versoes: ["emerald"],
    ate: 386,
    trechos: [
      [["hoenn-route-101", "Rota 101"], ["hoenn-route-103", "Rota 103"], ["hoenn-route-102", "Rota 102"], ["petalburg-woods", "Bosque de Petalburg"], ["hoenn-route-104", "Rota 104"]],
      [["hoenn-route-116", "Rota 116"], ["rusturf-tunnel", "Túnel Rusturf"], ["granite-cave", "Caverna de Granito"]],
      [["hoenn-route-109", "Rota 109"], ["hoenn-route-110", "Rota 110"]],
      [["hoenn-route-111", "Rota 111"], ["hoenn-route-112", "Rota 112"], ["fiery-path", "Caminho Ardente"], ["hoenn-route-113", "Rota 113"], ["hoenn-route-114", "Rota 114"], ["meteor-falls", "Cataratas Meteoro"], ["jagged-pass", "Passo Serrilhado"]],
      [["hoenn-route-117", "Rota 117"], ["hoenn-route-111", "Rota 111 (deserto)"], ["hoenn-route-102", "Rota 102"]],
      [["hoenn-route-118", "Rota 118"], ["hoenn-route-119", "Rota 119"]],
      [["hoenn-route-120", "Rota 120"], ["hoenn-route-121", "Rota 121"], ["mt-pyre", "Mt. Pyre"], ["hoenn-route-124", "Rota 124"], ["shoal-cave", "Caverna Shoal"]],
      [["hoenn-route-126", "Rota 126"], ["hoenn-route-127", "Rota 127"], ["seafloor-cavern", "Caverna do Fundo do Mar"]],
      [["hoenn-route-128", "Rota 128"], ["hoenn-victory-road", "Estrada Vitória"]],
    ],
  },
  {
    nome: "Sinnoh",
    versoes: ["diamond", "pearl"],
    ate: 493,
    trechos: [
      [["sinnoh-route-201", "Rota 201"], ["lake-verity", "Lago Verity"], ["sinnoh-route-202", "Rota 202"], ["sinnoh-route-203", "Rota 203"], ["oreburgh-gate", "Portão de Oreburgh"], ["oreburgh-mine", "Mina de Oreburgh"]],
      [["sinnoh-route-204", "Rota 204"], ["ravaged-path", "Caminho Devastado"], ["valley-windworks", "Usina Eólica do Vale"], ["sinnoh-route-205", "Rota 205"], ["eterna-forest", "Floresta de Eterna"]],
      [["sinnoh-route-206", "Rota 206 (Ciclovia)"], ["sinnoh-route-207", "Rota 207"], ["sinnoh-route-208", "Rota 208"], ["sinnoh-route-209", "Rota 209"], ["lost-tower", "Torre Perdida"], ["sinnoh-route-210", "Rota 210"], ["sinnoh-route-215", "Rota 215"]],
      [["sinnoh-route-214", "Rota 214"], ["valor-lakefront", "Margem do Lago Valor"], ["sinnoh-route-213", "Rota 213"]],
      [["sinnoh-route-212", "Rota 212"], ["sinnoh-route-209", "Rota 209"]],
      [["sinnoh-route-211", "Rota 211"], ["mt-coronet", "Mt. Coronet"], ["sinnoh-route-218", "Rota 218"]],
      [["iron-island", "Ilha de Ferro"], ["sinnoh-route-216", "Rota 216"], ["sinnoh-route-217", "Rota 217"], ["acuity-lakefront", "Margem do Lago Acuity"]],
      [["mt-coronet", "Mt. Coronet (rumo à Coluna Lança)"], ["sinnoh-route-222", "Rota 222"]],
      [["sinnoh-sea-route-223", "Rota Marítima 223"], ["sinnoh-victory-road", "Estrada Vitória"]],
    ],
  },
  {
    nome: "Unova",
    versoes: ["black", "white"],
    ate: 649,
    trechos: [
      [["unova-route-1", "Rota 1"], ["unova-route-2", "Rota 2"]],
      [["dreamyard", "Pátio dos Sonhos"], ["unova-route-3", "Rota 3"], ["wellspring-cave", "Caverna da Nascente"]],
      [["pinwheel-forest", "Floresta Pinwheel"]],
      [["unova-route-4", "Rota 4"], ["desert-resort", "Resort do Deserto"], ["relic-castle", "Castelo Relíquia"]],
      [["unova-route-5", "Rota 5"], ["driftveil-drawbridge", "Ponte Levadiça de Driftveil"], ["cold-storage", "Armazém Frigorífico"]],
      [["unova-route-6", "Rota 6"], ["chargestone-cave", "Caverna Pedra-Elétrica"]],
      [["unova-route-7", "Rota 7"], ["celestial-tower", "Torre Celestial"], ["twist-mountain", "Montanha Torcida"]],
      [["dragonspiral-tower", "Torre Espiral do Dragão"], ["unova-route-8", "Rota 8"], ["moor-of-icirrus", "Charco de Icirrus"], ["unova-route-9", "Rota 9"]],
      [["unova-route-10", "Rota 10"], ["unova-victory-road", "Estrada Vitória"]],
    ],
  },
];

// Grama/caverna valem inteiro; água e pesca só entram em rota sem grama (rota marítima).
const TERRA = { walk: 1, "dark-grass": 0.4, "rough-terrain": 1 };
const AGUA = { surf: 1, "old-rod": 0.4, "good-rod": 0.4, "super-rod": 0.3 };
// Condições que tiram o encontro do normal (enxame, Poké Radar, rádio, cartucho no slot 2).
const FORA = /^(swarm-yes|radar-on|radio-(hoenn|sinnoh)|slot2-(?!none))/;
// Horário e estação dividem o dia: o encontro vale na média dos períodos.
const PERIODO = /^(time|season)-/;

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
const idDaUrl = (u) => Number(u.split("/").filter(Boolean).pop());

const dex = JSON.parse(await readFile(new URL("../src/data/pokedex.json", import.meta.url), "utf8"));

async function tabela(slug, versoes, ate) {
  const local = await get(`${API}/location/${slug}`);
  const areas = await Promise.all(local.areas.map((a) => get(a.url)));
  // por método: id -> { peso, min, max }
  const porMetodo = { terra: new Map(), agua: new Map() };
  for (const area of areas) {
    for (const enc of area.pokemon_encounters) {
      const id = idDaUrl(enc.pokemon.url);
      if (id > ate || !dex.especies[id] || dex.especies[id].l) continue;
      for (const v of enc.version_details) {
        if (!versoes.includes(v.version.name)) continue;
        // soma por período (sem condição de período = todos os períodos)
        const grupos = { terra: new Map(), agua: new Map() };
        const periodos = new Set();
        for (const d of v.encounter_details) {
          const conds = d.condition_values.map((c) => c.name);
          if (conds.some((c) => FORA.test(c))) continue;
          const fator = TERRA[d.method.name] ?? AGUA[d.method.name];
          if (!fator) continue;
          const g = TERRA[d.method.name] ? "terra" : "agua";
          const per = conds.filter((c) => PERIODO.test(c)).sort().join("+") || "*";
          if (per !== "*") periodos.add(per);
          const m = grupos[g];
          const x = m.get(per) ?? { peso: 0, min: d.min_level, max: d.max_level };
          x.peso += d.chance * fator;
          x.min = Math.min(x.min, d.min_level);
          x.max = Math.max(x.max, d.max_level);
          m.set(per, x);
        }
        const nPer = Math.max(1, periodos.size);
        for (const g of ["terra", "agua"]) {
          let peso = 0, min = Infinity, max = 0;
          for (const [per, x] of grupos[g]) {
            peso += per === "*" ? x.peso : x.peso / nPer;
            min = Math.min(min, x.min);
            max = Math.max(max, x.max);
          }
          if (!peso) continue;
          // média entre as versões e entre as áreas do lugar
          const t = porMetodo[g].get(id) ?? { peso: 0, min, max };
          t.peso += peso / versoes.length / areas.length;
          t.min = Math.min(t.min, min);
          t.max = Math.max(t.max, max);
          porMetodo[g].set(id, t);
        }
      }
    }
  }
  // Rota marítima (ou terra com quase nada): entram os da água.
  const m = porMetodo.terra.size >= 3 || !porMetodo.agua.size ? porMetodo.terra : new Map([...porMetodo.agua, ...porMetodo.terra]);
  // Áreas que só abrem no pós-jogo (a Rota 1 de Unova tem Herdier Nv. 32 na parte sul)
  // ficam de fora: nível mínimo bem acima do comum da rota.
  const comuns = [...m.values()].filter((x) => x.peso >= 5);
  const piso = Math.min(...(comuns.length ? comuns : [...m.values()]).map((x) => x.min));
  for (const [id, x] of m) if (x.min > piso + 15) m.delete(id);
  const total = [...m.values()].reduce((a, x) => a + x.peso, 0);
  return [...m.entries()]
    .map(([id, x]) => [id, Math.max(1, Math.round((x.peso / total) * 100)), x.min, x.max])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
}

const saida = { fonte: "https://pokeapi.co/api/v2/ (tabelas de encontro por versão)", regioes: [] };
for (const r of REGIOES) {
  const trechos = [];
  for (const [rumo, lista] of r.trechos.entries()) {
    const rotas = [];
    for (const [slug, nome] of lista) {
      const s = await tabela(slug, r.versoes, r.ate);
      if (!s.length) console.warn(`  ${r.nome}/${slug}: sem selvagens`);
      else rotas.push({ nome, s });
    }
    trechos.push({ rumo, rotas });
    console.log(`${r.nome} ${rumo}: ${rotas.map((x) => `${x.nome} (${x.s.length})`).join(", ")}`);
  }
  saida.regioes.push(trechos);
}
await writeFile(new URL("../src/data/rotas.json", import.meta.url), JSON.stringify(saida));
console.log("ok: src/data/rotas.json");
