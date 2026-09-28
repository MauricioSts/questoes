// Como cada golpe aparece na arena. A PokéAPI não tem animação de golpe; os desenhos vêm dos
// efeitos do Pokémon Showdown (play.pokemonshowdown.com/fx), os mesmos que ele usa nas
// batalhas. O estilo sai do nome do golpe (Punch → soco, Beam → raio...) e, na falta, da
// classe (físico encosta, especial é projétil, status é aura).
import type { Golpe } from "../../lib/poke/dex";
import type { StatusGolpe } from "../../lib/poke/motor";

export type EstiloFx = "contato" | "mordida" | "projetil" | "raio" | "rajada" | "chuva" | "trovao" | "aura" | "cura" | "tique";

export const fxSprite = (nome: string) => `https://play.pokemonshowdown.com/fx/${nome}.png`;

// sprite por tipo (índices de NOME_TIPO)
const DO_TIPO = [
  "wisp", "fireball", "waterwisp", "electroball", "leaf1", "iceball", "fist", "poisonwisp", "mudwisp",
  "feather", "mistball", "energyball", "rock1", "shadowball", "flareball", "blackwisp", "wisp", "heart",
];
// partículas de rajada/chuva por tipo, quando o do tipo não serve
const RAJADA: Record<number, string[]> = { 4: ["leaf1", "leaf2"], 5: ["icicle"], 9: ["feather"], 12: ["rock1", "rock2", "rock3"], 8: ["rock3", "mudwisp"], 17: ["heart"] };

const REGRAS: [RegExp, EstiloFx, string | null][] = [
  [/punch|chop|hammer arm|brick break|close combat|cross chop|submission|seismic|vital throw/i, "contato", "fist"],
  [/kick|stomp|jump|low sweep|trample/i, "contato", "foot"],
  [/scratch|slash|claw|swipes|^cut$|x-scissor|fury cutter|false swipe|leaf blade|psycho cut|air cutter/i, "contato", "leftclaw"],
  [/bite|crunch|fang/i, "mordida", "leftclaw"],
  [/thunder$|thunderbolt|thunder shock|discharge|spark|shock wave|volt tackle|zap cannon/i, "trovao", "lightning"],
  [/beam|hydro pump|flamethrower|water gun|solar|pulse|surf|scald|fire blast|blizzard|heat wave|hydro cannon|blast burn|frenzy plant|flash cannon|psystrike|octazooka|water pulse/i, "raio", null],
  [/leaf|razor wind|petal|seed|needle|pin missile|icicle|ice shard|feather|air slash|gust|twister|spike cannon|powder snow|icy wind|bullet|barrage|fury attack|double slap|comet punch/i, "rajada", null],
  [/rock|stone|slide|avalanche|hail|meteor|earthquake|magnitude|bulldoze|earth power|draco|sand/i, "chuva", null],
  [/tackle|slam|take down|double-edge|headbutt|quick attack|horn|peck|wing attack|rollout|rapid spin|giga impact|facade|return|strength|pound|smack|wrap|constrict|astonish|lick|nuzzle/i, "contato", "impact"],
];

export interface EfeitoGolpe {
  estilo: EstiloFx;
  sprites: string[];
  cor: string;
}

export function efeitoDoGolpe(g: Golpe, cor: string): EfeitoGolpe {
  const [nome, tipo, poder, classe, , cura, cond] = g;
  const doTipo = DO_TIPO[tipo] ?? "wisp";
  if (classe === 2 || poder <= 0) {
    if (cura > 0) return { estilo: "cura", sprites: ["shine"], cor: "#7CF29A" };
    if (cond) return { estilo: "aura", sprites: [doTipo], cor };
    return { estilo: "cura", sprites: [doTipo], cor };
  }
  for (const [re, estilo, sprite] of REGRAS) {
    if (!re.test(nome)) continue;
    if (estilo === "rajada" || estilo === "chuva") return { estilo, sprites: RAJADA[tipo] ?? [doTipo], cor };
    return { estilo, sprites: [sprite ?? doTipo], cor };
  }
  return classe === 0 ? { estilo: "contato", sprites: ["impact"], cor } : { estilo: "projetil", sprites: [doTipo], cor };
}

export const COR_STATUS: Record<StatusGolpe, string> = {
  poison: "#A33EA1",
  burn: "#EE8130",
  paralysis: "#F7D02C",
  sleep: "#8D99AE",
  freeze: "#96D9D6",
  "leech-seed": "#7AC74C",
};
const SPRITE_STATUS: Record<StatusGolpe, string> = {
  poison: "poisonwisp",
  burn: "fireball",
  paralysis: "electroball",
  sleep: "mistball",
  freeze: "iceball",
  "leech-seed": "leaf1",
};
export function efeitoDoStatus(s: StatusGolpe, estilo: "aura" | "tique" = "aura"): EfeitoGolpe {
  return { estilo, sprites: [SPRITE_STATUS[s]], cor: COR_STATUS[s] };
}

// Quanto esperar até o golpe "chegar" no alvo (a página tira o HP nesse instante).
export const CHEGADA: Record<EstiloFx, number> = {
  contato: 260,
  mordida: 380,
  projetil: 480,
  raio: 520,
  rajada: 640,
  chuva: 620,
  trovao: 380,
  aura: 700,
  cura: 700,
  tique: 450,
};
