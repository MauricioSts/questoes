// Tipos da camada visual dos golpes. O motor (motor.ts) toca uma MoveVisualSpec num
// contexto (quem ataca, quem recebe, resultado) e devolve quando o golpe chega e quando acaba.

export type Arquetipo =
  | "PROJ" | "BEAM" | "STRIKE" | "MULTI" | "AOE" | "CHARGE" | "BUFF" | "DEBUFF"
  | "STATUS" | "FIELD" | "HEAL" | "DRAIN" | "TRAP" | "SACRIFICE" | "OHKO" | "SPECIAL";

export const ARQUETIPOS: Arquetipo[] = [
  "PROJ", "BEAM", "STRIKE", "MULTI", "AOE", "CHARGE", "BUFF", "DEBUFF",
  "STATUS", "FIELD", "HEAL", "DRAIN", "TRAP", "SACRIFICE", "OHKO", "SPECIAL",
];

export type Resultado = "hit" | "miss" | "noEffect" | "superEffective" | "notVeryEffective" | "crit";
export type Tier = 0 | 1 | 2 | 3; // leve, médio, forte, épico

// Formas que formas.ts sabe desenhar.
export type Forma =
  | "orbe" | "faisca" | "estrela" | "lamina" | "folha" | "petala" | "osso" | "pedra" | "gota"
  | "bolha" | "nota" | "coracao" | "agulha" | "chama" | "anel" | "pena" | "moeda" | "teia"
  | "cristal" | "z" | "engrenagem" | "carta" | "ovo" | "semente" | "fumaca" | "punho"
  | "garra" | "caveira" | "seta" | "poeira" | "estilhaco" | "olho" | "hexagono" | "lua"
  | "presente" | "concha" | "brilho";

export type Movimento = "reto" | "arco" | "zigue" | "teleguiado" | "espiral" | "cai" | "sobe" | "orbita";

export type Sabor =
  | "soco" | "chute" | "mordida" | "corte" | "cabecada" | "cauda" | "bicada" | "investida"
  | "arremesso" | "lambida" | "rola" | "tapa";

export type Stat = "atk" | "def" | "spa" | "spd" | "spe" | "acc" | "eva" | "crit" | "todos";
export type StatusVis = "sleep" | "paralysis" | "burn" | "poison" | "toxic" | "freeze" | "confusion" | "attract" | "leech-seed" | "curse" | "nightmare" | "perish";
export type Clima = "chuva" | "sol" | "areia" | "granizo";
export type Campo =
  | Clima | "reflect" | "light-screen" | "safeguard" | "mist" | "spikes" | "toxic-spikes" | "stealth-rock"
  | "trick-room" | "gravity" | "magic-room" | "wonder-room" | "protect" | "substituto" | "neblina" | "lama" | "agua"
  | "holofote" | "trevo" | "vento";
export type EstadoPersistente = "underground" | "airborne" | "underwater" | "vanished" | "charging";

export interface Paleta {
  primary: string;
  secondary: string;
  accent: string;
  arcoiris?: boolean;
}

export interface MoveVisualSpec {
  slug: string;
  nome: string;
  archetype: Arquetipo;
  type: number;
  palette: Paleta;
  hits?: { min: number; max: number };
  shape: Forma;
  motion: Movimento;
  sabor?: Sabor;
  stats?: { stat: Stat; n: number }[]; // + sobe, − desce (n = 1..3 ou -1..-3)
  statusInflige?: StatusVis;
  campo?: Campo;
  twoTurn?: { persistentState: EstadoPersistente };
  recoil?: boolean;
  recarga?: boolean;
  dramatico?: boolean; // ignora o tier: sempre épico
  dinamico?: boolean; // tipo efetivo decidido na hora (Hidden Power, Weather Ball...)
  variacao: number; // 0..1 do slug: ritmo, tamanho e contagem mudam um pouco por golpe
  notes: string;
  geracao: number;
}

export interface Ancora {
  x: number;
  y: number; // centro do corpo
  w: number;
  h: number;
  lado: "meu" | "inimigo";
  chave: string; // "meu-0", "inimigo-1"...
}

export interface ContextoGolpe {
  attacker: Ancora;
  targets: Ancora[];
  power: number;
  outcome: Resultado;
  hitsDone?: number;
  seed?: number;
  reducedMotion?: boolean;
  speed?: number; // 1, 2...
  typeOverride?: number; // golpes dinâmicos
  aliados?: Ancora[];
  manterCampo?: boolean; // FIELD fica na cena até ser limpo (Move Lab)
  onPhase?: (fase: "anticipation" | "travel" | "impact" | "aftermath") => void;
}
