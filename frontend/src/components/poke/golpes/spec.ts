// Do catálogo (texto) para a spec que o motor toca. A descrição de cada golpe é lida por
// palavras-chave: forma ("osso", "folhas", "esfera"), cor ("azul", "dourada"), movimento
// ("em arco", "persegue"), golpes múltiplos "(2–5)", setas "↑↑ Defense", status "(sono)".
// O que a leitura não acerta vai em AJUSTES, no fim.
import type { Golpe } from "../../../lib/poke/dex";
import { ALIASES, CATALOGO, POR_SLUG, slugDe, type LinhaCatalogo } from "./catalogo";
import type { Arquetipo, Campo, EstadoPersistente, Forma, MoveVisualSpec, Movimento, Paleta, Sabor, Stat, StatusVis, Tier } from "./tipos";

// Paleta por tipo (índices de NOME_TIPO): primária, secundária, destaque.
export const PALETA_TIPO: [string, string, string][] = [
  ["#A8A878", "#E8E8D8", "#FFFFFF"], // Normal
  ["#F08030", "#FFD27A", "#D83818"], // Fire
  ["#6890F0", "#A8D8F8", "#3058C0"], // Water
  ["#F8D030", "#FFF6A8", "#C8A010"], // Electric
  ["#78C850", "#C8F0A0", "#408830"], // Grass
  ["#98D8D8", "#E0F8F8", "#58A8B8"], // Ice
  ["#C03028", "#F08870", "#801810"], // Fighting
  ["#A040A0", "#D898D8", "#682068"], // Poison
  ["#E0C068", "#F0E0A0", "#A88830"], // Ground
  ["#A890F0", "#D8D0F8", "#7860C0"], // Flying
  ["#F85888", "#FFA8C8", "#C03060"], // Psychic
  ["#A8B820", "#D8E868", "#708010"], // Bug
  ["#B8A038", "#E0D098", "#786820"], // Rock
  ["#705898", "#A890C8", "#403060"], // Ghost
  ["#7038F8", "#A890F8", "#4820B0"], // Dragon
  ["#705848", "#A09080", "#302820"], // Dark
  ["#B8B8D0", "#E8E8F8", "#787898"], // Steel
  ["#EE99AC", "#FFD8E4", "#C86880"], // Fairy
];

// Cor do atributo nas setas ↑/↓.
export const COR_STAT: Record<Stat, string> = {
  atk: "#F0523C",
  def: "#3C8CF0",
  spa: "#D23CD2",
  spd: "#3CC85A",
  spe: "#F5C81E",
  acc: "#E6E6F0",
  eva: "#B4B4C8",
  crit: "#FF9A2E",
  todos: "#FFE680",
};

// Palavras de cor da descrição. A primeira que aparece vira a cor principal do golpe.
const CORES: [RegExp, string][] = [
  [/azul-escur|índigo/, "#3C3CC8"],
  [/azul-clar|azul-branc|branco-azul|azulad/, "#8CD2FF"],
  [/azul/, "#3C8CFF"],
  [/roxo-escur|roxo-negr|roxa-escur/, "#4A2063"],
  [/roxo-esverde/, "#8C50A0"],
  [/roxo|roxa|arroxead/, "#9B4DCA"],
  [/rosa|rosad/, "#FF7EB6"],
  [/dourad|ouro/, "#FFC93C"],
  [/amarel/, "#FFE14D"],
  [/laranja|alaranjad/, "#FF8A3D"],
  [/vermelh/, "#E8443A"],
  [/verde-brilh/, "#7CF29A"],
  [/verde/, "#5BD16A"],
  [/prata|prateado/, "#D8DEE9"],
  [/marrom/, "#8B5A2B"],
  [/cinza/, "#9AA0A6"],
  [/sombri|escur|negr|preta|preto/, "#2E2238"],
  [/branc/, "#FFFFFF"],
];

const FORMAS_POR_TEXTO: [RegExp, Forma][] = [
  [/\bosso\b/, "osso"],
  [/moeda/, "moeda"],
  [/carta de baralho/, "carta"],
  [/\bovo\b/, "ovo"],
  [/presente|baga/, "presente"],
  [/engrenage/, "engrenagem"],
  [/teia|fios de seda/, "teia"],
  [/notas? music|notas/, "nota"],
  [/coraç/, "coracao"],
  [/caveira/, "caveira"],
  [/esfera|\bbolas?\b|orbe/, "orbe"],
  [/\bpenas?\b/, "pena"],
  [/pétala/, "petala"],
  [/folha/, "folha"],
  [/semente|esporo|pólen|algodão/, "semente"],
  [/agulha|ferrão|ferrões|espinho|lança|estaca|chifre/, "agulha"],
  [/estrela/, "estrela"],
  [/concha/, "concha"],
  [/bolha/, "bolha"],
  [/pedra|rocha|meteoro/, "pedra"],
  [/cristal|gelo|gema|neve|granizo/, "cristal"],
  [/chama|fogo|brasa|lava|magma|calor/, "chama"],
  [/faísca|elétric|raio|relâmpago|eletricidade|trovão/, "faisca"],
  [/gota|água|jato|lodo|lama|tinta|ácido|gosma|líquido/, "gota"],
  [/lâmina|foice|crescente|meia-lua/, "lamina"],
  [/garra|arranh|riscos/, "garra"],
  [/sonor|\bsom\b|\bvoz\b|rugido|ronco|zumbido|rosnado|berr|uiv|\beco\b|anel|anéis|onda/, "anel"],
  [/fumaça|nuvem|névoa|neblina|\bpó\b|areia|poeira/, "fumaca"],
  [/olho|olhar/, "olho"],
  [/hexagon|escudo|parede|barreira|painé|muralha/, "hexagono"],
  [/\blua\b/, "lua"],
  [/soco|punho/, "punho"],
];

// Forma padrão por tipo, quando a descrição não diz.
export const FORMA_TIPO: Forma[] = [
  "estrela", "chama", "gota", "faisca", "folha", "cristal", "punho", "bolha", "poeira",
  "pena", "anel", "agulha", "pedra", "fumaca", "chama", "fumaca", "estilhaco", "brilho",
];

const MOVIMENTOS: [RegExp, Movimento][] = [
  [/persegu|homing|certeir|nunca erra/, "teleguiado"],
  [/zigue|serpente/, "zigue"],
  [/cai do céu|despenca|desce|chuva de|caem|de cima/, "cai"],
  [/brot|irromp|sobe do chão|sob o alvo|do chão/, "sobe"],
  [/espiral|redemoinho|rodopi|tornado|giratóri/, "espiral"],
  [/órbita|circund|ao redor/, "orbita"],
  [/\barco\b|em arco/, "arco"],
];

const SABORES: [RegExp, Sabor][] = [
  [/mordida|mord|presas|mandíbula|dentes/, "mordida"],
  [/palmas na cara|\btapa/, "tapa"],
  [/soco|punho|palma|mão/, "soco"],
  [/chute|rasteira|joelhada|\bpisa|\bpé\b|pernas/, "chute"],
  [/cabeçada|cabeceia|cabeça/, "cabecada"],
  [/arremess|agarra|gira o alvo|lança longe/, "arremesso"],
  [/lamb|língua/, "lambida"],
  [/cauda|chicote|vinhas|\basas\b/, "cauda"],
  [/bicada|chifre|broca|perfura/, "bicada"],
  [/\brola|roda de|rolo|bola de/, "rola"],
  [/corte|garra|lâmina|arranh|riscos|rasga|corta|machad/, "corte"],
];

const STAT_TOKENS: [RegExp, Stat][] = [
  [/^sp\.?\s?atk/i, "spa"],
  [/^sp\.?\s?def/i, "spd"],
  [/^(attack|atk)/i, "atk"],
  [/^(defense|def|defesas)/i, "def"],
  [/^speed/i, "spe"],
  [/^accuracy/i, "acc"],
  [/^evasion/i, "eva"],
];

function lerStats(notas: string): { stat: Stat; n: number }[] {
  const out: { stat: Stat; n: number }[] = [];
  if (/↑ em todos os stats|↑ todos os stats/.test(notas)) out.push({ stat: "todos", n: 1 });
  if (/aumenta crit/.test(notas)) out.push({ stat: "crit", n: 2 });
  if (/Attack ao máximo/.test(notas)) out.push({ stat: "atk", n: 3 });
  for (const m of notas.matchAll(/(↑+|↓+)\s*([A-Za-z. /]+)/g)) {
    const n = m[1].length * (m[1][0] === "↑" ? 1 : -1);
    for (const parte of m[2].split("/")) {
      const t = parte.trim();
      const achado = STAT_TOKENS.find(([re]) => re.test(t));
      if (achado) out.push({ stat: achado[1], n });
    }
  }
  return out;
}

function lerStatus(slug: string, notas: string, arq: Arquetipo): StatusVis | undefined {
  if (slug === "leech-seed") return "leech-seed";
  if (slug === "curse") return "curse";
  if (slug === "nightmare") return "nightmare";
  if (slug === "perish-song") return "perish";
  if (/veneno grave/.test(notas)) return "toxic";
  if (/\(sono\)|dorme|adormec|\bdormir\b/.test(notas) && arq !== "HEAL" && arq !== "SPECIAL") return "sleep";
  if (/paralis/.test(notas)) return "paralysis";
  if (/confus|tonto/.test(notas)) return "confusion";
  if (/paixão|corações flutuando/.test(notas)) return "attract";
  if (/queimand|queimadura|queima o alvo|queimá/.test(notas)) return "burn";
  if (/venen|venenosa/.test(notas) && (arq === "STATUS" || /injet|envenen/.test(notas))) return "poison";
  if (arq === "STATUS" && /pó roxo|nuvem roxo/.test(notas)) return "poison";
  if (/bloco de gelo|congela o alvo/.test(notas)) return "freeze";
  return undefined;
}

const CAMPO_SLUG: Record<string, Campo> = {
  "rain-dance": "chuva",
  "sunny-day": "sol",
  sandstorm: "areia",
  hail: "granizo",
  reflect: "reflect",
  "light-screen": "light-screen",
  safeguard: "safeguard",
  mist: "mist",
  haze: "neblina",
  spikes: "spikes",
  "toxic-spikes": "toxic-spikes",
  "stealth-rock": "stealth-rock",
  "trick-room": "trick-room",
  gravity: "gravity",
  "magic-room": "magic-room",
  "wonder-room": "wonder-room",
  protect: "protect",
  detect: "protect",
  "quick-guard": "protect",
  "wide-guard": "protect",
  endure: "protect",
  "magic-coat": "protect",
  substitute: "substituto",
  "mud-sport": "lama",
  "water-sport": "agua",
  "follow-me": "holofote",
  "rage-powder": "holofote",
  "lucky-chant": "trevo",
  "heal-bell": "trevo",
  aromatherapy: "trevo",
  tailwind: "vento",
  defog: "vento",
};

const DRAMATICOS = new Set(["perish-song", "destiny-bond", "explosion", "self-destruct", "memento", "final-gambit", "belly-drum", "healing-wish", "lunar-dance", "curse"]);
const DINAMICOS = new Set(["hidden-power", "judgment", "techno-blast", "weather-ball", "natural-gift", "nature-power", "secret-power"]);

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

function corDaNota(notas: string): string[] {
  const achadas: { i: number; cor: string }[] = [];
  for (const [re, cor] of CORES) {
    const m = notas.match(re);
    if (m && m.index !== undefined && !achadas.some((a) => a.cor === cor)) achadas.push({ i: m.index, cor });
  }
  return achadas.sort((a, b) => a.i - b.i).map((a) => a.cor);
}

export function paletaDe(tipo: number, notas = ""): Paleta {
  const [p, s, a] = PALETA_TIPO[tipo] ?? PALETA_TIPO[0];
  const cores = corDaNota(notas.toLowerCase());
  return {
    primary: cores[0] ?? p,
    secondary: cores[1] ?? s,
    accent: a,
    arcoiris: /arco-íris|multicolor|colorid/.test(notas) || undefined,
  };
}

function estadoDoisTurnos(notas: string): EstadoPersistente {
  if (/subsolo|no chão/.test(notas)) return "underground";
  if (/mergulha|água/.test(notas)) return "underwater";
  if (/sombra|some\b|sumindo/.test(notas)) return "vanished";
  if (/voa|sobe|quica|alto|\bar\b/.test(notas)) return "airborne";
  return "charging";
}

function hitsDe(notas: string, arq: Arquetipo, slug: string): { min: number; max: number } | undefined {
  const r = notas.match(/\((\d)[–-](\d)/);
  if (r) return { min: +r[1], max: +r[2] };
  const n = notas.match(/\((\d) hits?\)/);
  if (n) return { min: +n[1], max: +n[1] };
  if (slug === "beat-up" || slug === "attack-order") return { min: 3, max: 4 };
  if (/^(dois|duas)\b/i.test(notas)) return { min: 2, max: 2 };
  if (/três/i.test(notas)) return { min: 3, max: 3 };
  if (arq === "MULTI") return { min: 2, max: 5 };
  return undefined;
}

export function specDaLinha(l: LinhaCatalogo): MoveVisualSpec {
  const notas = l.notas;
  const baixo = notas.toLowerCase();
  const texto = `${baixo} ${l.nome.toLowerCase()}`;
  const ajuste = AJUSTES[l.slug] ?? {};
  const shape = FORMAS_POR_TEXTO.find(([re]) => re.test(texto))?.[1] ?? FORMA_TIPO[l.tipo] ?? "orbe";
  const motion = MOVIMENTOS.find(([re]) => re.test(baixo))?.[1] ?? "reto";
  const sabor = l.arquetipo === "STRIKE" || l.arquetipo === "MULTI" ? SABORES.find(([re]) => re.test(texto))?.[1] ?? "investida" : undefined;
  const stats = lerStats(notas);
  const spec: MoveVisualSpec = {
    slug: l.slug,
    nome: l.nome,
    archetype: l.arquetipo,
    type: l.tipo,
    palette: paletaDe(l.tipo, notas),
    shape,
    motion,
    ...(sabor ? { sabor } : {}),
    ...(stats.length ? { stats } : {}),
    statusInflige: lerStatus(l.slug, baixo, l.arquetipo),
    ...(CAMPO_SLUG[l.slug] ? { campo: CAMPO_SLUG[l.slug] } : {}),
    hits: hitsDe(notas, l.arquetipo, l.slug),
    ...(l.arquetipo === "CHARGE" ? { twoTurn: { persistentState: estadoDoisTurnos(baixo.split("t2:")[0]) } } : {}),
    recoil: /recoil/.test(baixo) || undefined,
    recarga: /recarga|cansa\b/.test(baixo) || undefined,
    dramatico: DRAMATICOS.has(l.slug) || l.arquetipo === "OHKO" || l.arquetipo === "SACRIFICE" || undefined,
    dinamico: DINAMICOS.has(l.slug) || undefined,
    variacao: hash01(l.slug),
    notes: notas,
    geracao: l.geracao,
    ...ajuste,
  };
  return spec;
}

// Correções finas: onde a leitura do texto escolhe a forma ou o movimento errado.
const AJUSTES: Record<string, Partial<MoveVisualSpec>> = {
  thunder: { motion: "cai", shape: "faisca" },
  "thunder-shock": { motion: "zigue", shape: "faisca" },
  "thunder-wave": { shape: "faisca" },
  "shock-wave": { motion: "teleguiado", shape: "faisca" },
  "tri-attack": { shape: "orbe", palette: { primary: "#E8443A", secondary: "#3C8CFF", accent: "#FFE14D" } },
  "fire-blast": { shape: "estrela" },
  "sonic-boom": { shape: "lamina" },
  "air-cutter": { shape: "lamina", motion: "arco" },
  "air-slash": { shape: "lamina" },
  "psycho-cut": { shape: "lamina", motion: "arco" },
  "razor-leaf": { shape: "folha", motion: "espiral" },
  "magical-leaf": { shape: "folha", motion: "teleguiado", palette: { primary: "#7CF29A", secondary: "#FF7EB6", accent: "#FFE14D", arcoiris: true } },
  swift: { shape: "estrela", motion: "teleguiado", palette: { primary: "#FFE14D", secondary: "#FFF6A8", accent: "#FFFFFF" } },
  "pay-day": { shape: "moeda", motion: "arco", palette: { primary: "#FFC93C", secondary: "#FFF0A8", accent: "#B88A10" } },
  "ancient-power": { shape: "pedra", motion: "orbita" },
  "rock-throw": { motion: "arco" },
  "stone-edge": { shape: "agulha", motion: "sobe" },
  "icicle-crash": { shape: "cristal", motion: "cai" },
  "draco-meteor": { shape: "pedra", motion: "cai" },
  "rock-slide": { shape: "pedra", motion: "cai" },
  "sludge-bomb": { shape: "orbe", motion: "arco" },
  "egg-bomb": { motion: "arco" },
  "mud-bomb": { shape: "orbe", motion: "arco" },
  "seed-bomb": { shape: "semente", motion: "arco" },
  "energy-ball": { shape: "orbe" },
  "shadow-ball": { shape: "orbe" },
  "focus-blast": { shape: "orbe" },
  "aura-sphere": { shape: "orbe", motion: "teleguiado" },
  "magnet-bomb": { shape: "orbe", motion: "teleguiado" },
  "zap-cannon": { shape: "orbe" },
  "electro-ball": { shape: "orbe" },
  "water-pulse": { shape: "anel" },
  "vacuum-wave": { shape: "anel" },
  psywave: { shape: "anel" },
  confusion: { shape: "anel" },
  extrasensory: { shape: "anel" },
  "night-shade": { shape: "olho" },
  "dark-pulse": { shape: "anel" },
  "dragon-pulse": { shape: "chama" },
  "ice-shard": { shape: "cristal" },
  "powder-snow": { shape: "cristal" },
  "icicle-spear": { shape: "cristal" },
  "pin-missile": { shape: "agulha" },
  "spike-cannon": { shape: "agulha" },
  twineedle: { shape: "agulha" },
  "bullet-seed": { shape: "semente" },
  "rock-blast": { shape: "pedra" },
  barrage: { shape: "orbe", palette: { primary: "#8B5A2B", secondary: "#FFFFFF", accent: "#5A3A1A" } },
  "gear-grind": { shape: "engrenagem", motion: "espiral" },
  bonemerang: { shape: "osso", motion: "espiral" },
  "bone-rush": { shape: "osso", motion: "espiral" },
  "bone-club": { shape: "osso" },
  "trump-card": { shape: "carta" },
  present: { shape: "presente", motion: "arco" },
  "natural-gift": { shape: "semente", motion: "arco" },
  fling: { shape: "presente", motion: "arco" },
  "acid-spray": { shape: "orbe" },
  "gunk-shot": { shape: "orbe", motion: "arco" },
  sludge: { shape: "orbe", motion: "arco" },
  smog: { shape: "fumaca" },
  "poison-gas": { shape: "fumaca" },
  "poison-powder": { shape: "fumaca", motion: "cai" },
  "sleep-powder": { shape: "poeira", motion: "cai" },
  "stun-spore": { shape: "poeira", motion: "cai" },
  spore: { shape: "semente", motion: "cai" },
  sing: { shape: "nota", motion: "zigue" },
  "grass-whistle": { shape: "nota", motion: "zigue" },
  chatter: { shape: "nota", motion: "zigue" },
  "lovely-kiss": { shape: "coracao" },
  "sweet-kiss": { shape: "coracao" },
  attract: { shape: "coracao", motion: "zigue" },
  charm: { shape: "coracao" },
  "will-o-wisp": { shape: "chama", motion: "orbita", palette: { primary: "#4F8BFF", secondary: "#B8D8FF", accent: "#2A3CC8" } },
  toxic: { shape: "caveira" },
  "dream-eater": { shape: "bolha" },
  absorb: { shape: "folha" },
  "mega-drain": { shape: "folha" },
  "giga-drain": { shape: "brilho" },
  "leech-life": { shape: "gota" },
  "drain-punch": { shape: "brilho" },
  "horn-leech": { shape: "brilho" },
  "string-shot": { shape: "teia" },
  "spider-web": { shape: "teia" },
  electroweb: { shape: "teia" },
  "aurora-beam": { palette: { primary: "#8CF0FF", secondary: "#FF9AE6", accent: "#FFFFFF", arcoiris: true } },
  "signal-beam": { palette: { primary: "#FF4040", secondary: "#40FF60", accent: "#4080FF", arcoiris: true } },
  psybeam: { motion: "zigue" },
  thunderbolt: { motion: "zigue" },
  "charge-beam": { motion: "zigue" },
  "dragon-rage": { shape: "chama" },
  "sacred-fire": { shape: "chama", motion: "sobe" },
  "blue-flare": { palette: { primary: "#3C8CFF", secondary: "#B8E0FF", accent: "#1A3CC8" } },
  "fusion-flare": { shape: "orbe", palette: { primary: "#FFFFFF", secondary: "#FFB060", accent: "#3C8CFF" } },
  "fusion-bolt": { shape: "orbe", palette: { primary: "#8CD2FF", secondary: "#FFFFFF", accent: "#3C3CC8" } },
  "doom-desire": { shape: "orbe", palette: { primary: "#FFC93C", secondary: "#FFFFFF", accent: "#B8B8D0" } },
  "future-sight": { shape: "olho" },
  "luster-purge": { shape: "orbe", palette: { primary: "#FFFFFF", secondary: "#C8F0FF", accent: "#8CD2FF" } },
  "mist-ball": { shape: "orbe" },
  "hidden-power": { shape: "orbe" },
  "weather-ball": { shape: "orbe" },
  "smack-down": { shape: "pedra" },
  "rock-wrecker": { shape: "pedra" },
  "secret-sword": { shape: "lamina" },
  "sacred-sword": { shape: "lamina" },
  "x-scissor": { shape: "lamina" },
  "cross-poison": { shape: "lamina" },
  "night-slash": { shape: "lamina" },
  "leaf-blade": { shape: "folha" },
  "leaf-storm": { shape: "folha" },
  "leaf-tornado": { shape: "folha" },
  "petal-dance": { shape: "petala" },
  "fiery-dance": { shape: "chama" },
  "feather-dance": { shape: "pena" },
  "cotton-spore": { shape: "semente", motion: "cai" },
  "cotton-guard": { shape: "semente" },
  "silver-wind": { shape: "brilho" },
  "ominous-wind": { shape: "fumaca" },
  hurricane: { shape: "fumaca", motion: "espiral" },
  twister: { shape: "fumaca", motion: "espiral" },
  "fire-spin": { shape: "chama", motion: "espiral" },
  whirlpool: { shape: "gota", motion: "espiral" },
  "sand-tomb": { shape: "poeira", motion: "espiral" },
  "magma-storm": { shape: "chama", motion: "espiral" },
  "rock-tomb": { shape: "pedra", motion: "cai" },
  clamp: { shape: "concha" },
  "razor-shell": { shape: "concha" },
  bind: { shape: "anel" },
  wrap: { shape: "anel" },
  "metal-sound": { shape: "anel" },
  screech: { shape: "anel", motion: "zigue" },
  growl: { shape: "anel" },
  supersonic: { shape: "anel" },
  "bug-buzz": { shape: "anel" },
  "hyper-voice": { shape: "anel" },
  snore: { shape: "z" },
  "echoed-voice": { shape: "anel" },
  "relic-song": { shape: "nota" },
  round: { shape: "nota" },
  "perish-song": { shape: "nota" },
  uproar: { shape: "anel" },
  snarl: { shape: "anel" },
  roar: { shape: "anel" },
  synchronoise: { shape: "anel" },
  "stealth-rock": { shape: "pedra" },
  spikes: { shape: "agulha" },
  "toxic-spikes": { shape: "agulha" },
  "stockpile": { shape: "orbe" },
  "spit-up": { shape: "orbe" },
  "swallow": { shape: "orbe" },
  wish: { shape: "estrela", motion: "cai" },
  moonlight: { shape: "lua", motion: "cai" },
  "morning-sun": { shape: "brilho", motion: "cai" },
  synthesis: { shape: "folha" },
  "soft-boiled": { shape: "ovo" },
  "milk-drink": { shape: "gota", palette: { primary: "#FFFFFF", secondary: "#FFD0E0", accent: "#FF9AC0" } },
  rest: { shape: "z" },
  "slack-off": { shape: "z" },
  "aqua-ring": { shape: "anel", motion: "orbita" },
  ingrain: { shape: "folha" },
  "heal-order": { shape: "brilho" },
  "shift-gear": { shape: "engrenagem" },
  "autotomize": { shape: "estilhaco" },
  "swords-dance": { shape: "lamina", motion: "orbita" },
  barrier: { shape: "hexagono" },
  "iron-defense": { shape: "hexagono" },
  "defend-order": { shape: "hexagono" },
  "cosmic-power": { shape: "estrela" },
  "nasty-plot": { shape: "fumaca" },
  "lock-on": { shape: "olho" },
  "mind-reader": { shape: "olho" },
  "miracle-eye": { shape: "olho" },
  foresight: { shape: "olho" },
  glare: { shape: "olho" },
  "mean-look": { shape: "olho" },
  "scary-face": { shape: "olho" },
  leer: { shape: "olho" },
  "odor-sleuth": { shape: "anel" },
  "sweet-scent": { shape: "petala" },
  "fake-tears": { shape: "gota" },
  "worry-seed": { shape: "semente" },
  soak: { shape: "gota" },
  "gastro-acid": { shape: "gota" },
  "sand-attack": { shape: "poeira" },
  "mud-slap": { shape: "gota" },
  "mud-shot": { shape: "gota" },
  octazooka: { shape: "orbe" },
  smokescreen: { shape: "fumaca" },
  flash: { shape: "brilho" },
  "dark-void": { shape: "fumaca" },
  hypnosis: { shape: "anel" },
  "confuse-ray": { shape: "orbe", palette: { primary: "#B07CFF", secondary: "#F0DCFF", accent: "#5A2A9A" } },
  yawn: { shape: "bolha" },
  "teeter-dance": { shape: "estrela" },
  swagger: { shape: "estrela" },
  flatter: { shape: "petala" },
  tickle: { shape: "brilho" },
  splash: { shape: "gota" },
  magnitude: { shape: "pedra" },
  earthquake: { shape: "pedra" },
  bulldoze: { shape: "pedra" },
  fissure: { shape: "pedra" },
  "sheer-cold": { shape: "cristal" },
  guillotine: { shape: "lamina" },
  "horn-drill": { shape: "agulha", motion: "espiral" },
  "drill-peck": { motion: "espiral" },
  "drill-run": { motion: "espiral" },
  "seismic-toss": { sabor: "arremesso" },
  submission: { sabor: "arremesso" },
  "circle-throw": { sabor: "arremesso" },
  "storm-throw": { sabor: "arremesso" },
  "vital-throw": { sabor: "arremesso" },
  "sky-uppercut": { sabor: "soco" },
  "low-kick": { sabor: "chute" },
  "low-sweep": { sabor: "chute" },
  "grass-knot": { sabor: "chute" },
  "rapid-spin": { sabor: "rola" },
  "gyro-ball": { sabor: "rola" },
  rollout: { sabor: "rola" },
  "ice-ball": { sabor: "rola" },
  "flame-wheel": { sabor: "rola" },
  steamroller: { sabor: "rola" },
  "volt-tackle": { sabor: "investida" },
  "wild-charge": { sabor: "investida" },
  "bolt-strike": { sabor: "investida" },
  "flare-blitz": { sabor: "investida" },
  "brave-bird": { sabor: "investida", palette: { primary: "#4F8BFF", secondary: "#FFFFFF", accent: "#2A3CC8" } },
  "aqua-jet": { sabor: "investida" },
  "flame-charge": { sabor: "investida" },
  "v-create": { sabor: "investida" },
  "extreme-speed": { sabor: "investida" },
  "quick-attack": { sabor: "investida" },
  "giga-impact": { sabor: "investida" },
  "head-charge": { sabor: "cabecada" },
  "zen-headbutt": { sabor: "cabecada" },
  "iron-head": { sabor: "cabecada" },
  "head-smash": { sabor: "cabecada" },
  "heart-stamp": { sabor: "cabecada", shape: "coracao" },
  "skull-bash": { sabor: "cabecada" },
  "body-slam": { sabor: "investida" },
  "heavy-slam": { sabor: "investida" },
  "heat-crash": { sabor: "investida" },
  "meteor-mash": { sabor: "soco" },
  "mach-punch": { sabor: "soco" },
  "bullet-punch": { sabor: "soco" },
  "shadow-punch": { sabor: "soco" },
  "force-palm": { sabor: "soco" },
  "wake-up-slap": { sabor: "tapa" },
  "smelling-salts": { sabor: "tapa" },
  "fake-out": { sabor: "tapa" },
  "double-slap": { sabor: "tapa" },
  "arm-thrust": { sabor: "tapa" },
  "comet-punch": { sabor: "soco" },
  "double-kick": { sabor: "chute" },
  "triple-kick": { sabor: "chute" },
  "fury-swipes": { sabor: "corte" },
  "fury-attack": { sabor: "bicada" },
  "dual-chop": { sabor: "corte" },
  "chip-away": { sabor: "corte" },
  "tail-slap": { sabor: "cauda" },
  "double-hit": { sabor: "cauda" },
  "close-combat": { sabor: "soco" },
  "beat-up": { sabor: "soco" },
  "attack-order": { sabor: "bicada" },
  "dragon-tail": { sabor: "cauda" },
  "iron-tail": { sabor: "cauda" },
  "aqua-tail": { sabor: "cauda" },
  "poison-tail": { sabor: "cauda" },
  slam: { sabor: "cauda" },
  "vine-whip": { sabor: "cauda" },
  "power-whip": { sabor: "cauda" },
  "wing-attack": { sabor: "cauda" },
  "steel-wing": { sabor: "cauda" },
  constrict: { sabor: "arremesso" },
  "wring-out": { sabor: "arremesso" },
  "crush-grip": { sabor: "arremesso" },
  "vise-grip": { sabor: "mordida" },
  crabhammer: { sabor: "soco" },
  "wood-hammer": { sabor: "cabecada" },
  "hammer-arm": { sabor: "soco" },
  counter: { sabor: "soco" },
  "mirror-coat": { sabor: "investida", palette: { primary: "#E8F0FF", secondary: "#FF9AE6", accent: "#8CD2FF" } },
  "metal-burst": { sabor: "investida" },
};

const POR_SLUG_SPEC = new Map<string, MoveVisualSpec>();
export function specPorSlug(slug: string): MoveVisualSpec | undefined {
  const s = ALIASES[slug] ?? slug;
  let spec = POR_SLUG_SPEC.get(s);
  if (!spec) {
    const l = POR_SLUG.get(s);
    if (!l) return undefined;
    spec = specDaLinha(l);
    POR_SLUG_SPEC.set(s, spec);
  }
  return spec;
}

export function todasAsSpecs(): MoveVisualSpec[] {
  return CATALOGO.map((l) => specPorSlug(l.slug)!);
}

// Golpe do jogo (pokedex.json). Os 559 das gerações 1–5 vêm do catálogo; os poucos de
// gerações seguintes (iniciais de Kalos em diante) ganham uma spec pelos dados do jogo.
export function specDoGolpe(g: Golpe): MoveVisualSpec {
  const slug = slugDe(g[0]);
  const doCatalogo = specPorSlug(slug);
  if (doCatalogo) return doCatalogo;
  const [nome, tipo, poder, classe, dreno, cura, cond] = g;
  const n = nome.toLowerCase();
  const arq: Arquetipo =
    classe === 2
      ? cura > 0
        ? "HEAL"
        : cond
          ? "STATUS"
          : /terrain/.test(n)
            ? "FIELD"
            : /shield|guard/.test(n)
              ? "FIELD"
              : "DEBUFF"
      : dreno > 0
        ? "DRAIN"
        : classe === 0
          ? "STRIKE"
          : /voice|boom|aria|song/.test(n)
            ? "AOE"
            : /beam|blast|shot/.test(n)
              ? "BEAM"
              : "PROJ";
  return specDaLinha({
    nome,
    slug,
    tipo,
    arquetipo: arq,
    notas: poder > 100 ? "Golpe enorme e dramático." : "",
    geracao: 5,
  });
}

// Tier visual pelo poder da PokéAPI. Status ignora o poder (médio), dramático é épico.
export function tierDe(spec: MoveVisualSpec, power: number): Tier {
  if (spec.dramatico || spec.archetype === "OHKO") return 3;
  if (spec.recarga) return 3;
  if (!power) return spec.archetype === "STATUS" || spec.archetype === "BUFF" || spec.archetype === "DEBUFF" || spec.archetype === "FIELD" || spec.archetype === "HEAL" ? 1 : 1;
  if (power <= 40) return 0;
  if (power <= 80) return 1;
  if (power <= 120) return 2;
  return 3;
}
