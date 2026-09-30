// Acrescenta ao pokedex.json já gerado o XP base (`x`) e a curva de crescimento (`r`) de
// cada espécie, sem regenerar golpes e evoluções. gerar-pokedex.mjs já grava os dois campos;
// este script existe para atualizar o JSON antigo sem mexer no resto.
//
//   node scripts/enriquecer-xp.mjs
import { readFile, writeFile } from "node:fs/promises";

const API = "https://pokeapi.co/api/v2";
const CURVAS = ["medium", "fast", "medium-slow", "slow", "slow-then-very-fast", "fast-then-very-slow"];
const arq = new URL("../src/data/pokedex.json", import.meta.url);
const dex = JSON.parse(await readFile(arq, "utf8"));

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

const ids = Object.keys(dex.especies);
let i = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (i < ids.length) {
      const id = ids[i++];
      const [p, s] = await Promise.all([get(`${API}/pokemon/${id}`), get(`${API}/pokemon-species/${id}`)]);
      const e = dex.especies[id];
      e.x = p.base_experience ?? Math.round(e.s.reduce((a, b) => a + b, 0) / 5);
      e.r = Math.max(0, CURVAS.indexOf(s.growth_rate?.name));
    }
  })
);
await writeFile(arq, JSON.stringify(dex));
console.log(`ok: ${ids.length} espécies com x e r`);
