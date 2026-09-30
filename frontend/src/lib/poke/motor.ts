// MOTOR DA BATALHA POKÉMON. Mesma regra de ouro da batalha clássica (lib/batalha.ts): o
// jogo não pode piorar o estudo.
// - As questões vêm da fila da revisão espaçada (e completam com novas); o sorteio do jogo
//   mexe em Pokémon, itens e recompensas, nunca em QUAIS questões caem.
// - Cada treinador lança Pokémon; cada turno é uma questão (no máximo 3 por Pokémon: na 3ª
//   resposta certa ele cai, para a luta não empacar num tipo imune). Só a resposta certa faz o golpe
//   sair: tira HP de verdade (tipo, STAB, nível, crítico), aplica status (veneno, queimadura,
//   paralisia, sono, Leech Seed) ou cura. Um Pokémon aguenta ~2 acertos; super efetivo
//   derruba de uma vez. Cada Pokémon abre com a "sua" questão e as seguintes vêm da reserva
//   da partida; sem reserva, a próxima resposta certa derruba.
// - Resposta errada: o golpe erra e o Pokémon contra-ataca com dano de verdade (fórmula da
//   5ª geração, tipos contam), podendo envenenar, queimar, paralisar ou fazer dormir. Inimigo
//   dormindo, congelado ou paralisado pode não conseguir contra-atacar.
// - A questão errada VOLTA algumas lutas depois como Pokémon SELVAGEM, com as alternativas
//   em outra ordem. Só selvagem pode ser capturado, e a bola só é lançada se a resposta
//   estiver certa; HP baixo e status facilitam a captura.
// - "Tenho certeza" continua sendo a aposta de confiança: acerto vira crítico (1,5× dano),
//   erro dói 1,5×. O placar de calibragem do fim usa isso.
// - Escrever a lição de um erro cura o Pokémon ativo (autoexplicação).
// - A jornada tem modos: Rota (treino, com selvagens no meio), Ginásio (8 líderes de Kanto,
//   um por insígnia, em ordem), Zona Safári (só selvagens, com Safari Balls da partida) e
//   Liga Pokémon (Elite dos 4 + Campeão, com as 8 insígnias). Em todos, as questões são as
//   mesmas da revisão espaçada: o modo muda os Pokémon, nunca quais questões caem.
// - Golpe novo com 4 golpes já aprendidos não substitui nada sozinho: fica pendente em
//   `aprender` e o jogador escolhe qual esquecer (ou não aprender).
// Funções puras: a tela chama, guarda o resultado e anima os eventos.
import type { Confianca, Candidata, Registro } from "../batalha";
import { intercalar } from "../batalha";
import {
  MAX_GOLPES,
  MAX_NIVEL,
  NOME_TIPO,
  atributos,
  dano,
  efetividade,
  evolucaoPorNivel,
  evolucaoPorPedra,
  formaNoNivel,
  golpesNoNivel,
  golpesNovos,
  nivelDoXpPoke,
  xpDaVitoria,
  xpMinimoPorVitoria,
  xpDoNivel,
  type Dex,
  type Especie,
  type Golpe,
} from "./dex";

const INVESTIDA: Golpe = ["Tackle", 0, 40, 0, 0, 0, "", 0, 0];

// Golpes de dano fixo (Dragon Rage, Seismic Toss, Night Shade, Super Fang...) vêm da PokéAPI
// sem poder: aqui valem como poder 60, senão a resposta certa não tiraria HP nenhum.
export const PODER_FIXO = 60;
const poderDe = (g: Golpe) => (g[2] > 0 ? g[2] : g[3] !== 2 ? PODER_FIXO : 0);

// ---------- tipos ----------

export type Status = "" | "poison" | "burn" | "paralysis" | "sleep" | "freeze";
export const STATUS_VALIDOS: Status[] = ["poison", "burn", "paralysis", "sleep", "freeze"];

export interface Mon {
  uid: string;
  id: number; // espécie
  xp: number; // nível = nivelDoXpPoke(xp)
  golpes: number[];
  questaoId?: number; // capturado vencendo essa questão
  capturadoEm?: string;
  regiao?: number; // região da jornada em que entrou para a coleção (ausente = Kanto)
}

export interface Lutador extends Mon {
  hp: number;
  status: Status;
  sono: number; // turnos de sono restantes
  foco: number; // próximos contra-ataques pela metade
}

export type TipoEncontro = "treinador" | "selvagem" | "lider";
export type ModoJornada = "rota" | "ginasio" | "safari" | "liga";

export interface Encontro {
  questaoId: number; // questão da vez (troca a cada turno em que ele sobrevive)
  tipo: TipoEncontro;
  treinador: number; // índice em partida.treinadores; -1 = selvagem
  especie: number;
  nivel: number;
  retorno: boolean; // a questão da vez é a revanche de um erro desta partida
  chave: number; // identifica o Pokémon inimigo (a questão muda, ele continua)
  hp: number;
  status: Status;
  sono: number;
  semente: boolean; // Leech Seed
  turnos?: number; // questões já respondidas contra ele
  trocas?: number; // selvagem trocado por outro antes do 1º turno (a questão fica)
  fim?: "ko" | "captura" | "fuga";
}

export interface QuestaoReserva {
  questaoId: number;
  retorno: boolean;
}

export interface Treinador {
  nome: string;
  sprite: string;
  lider: boolean; // chefe (líder, Elite dos 4, campeão, treinador Ás da rota)
  insignia?: number; // líder de ginásio: índice em GINASIOS
  elite?: boolean;
  campeao?: boolean;
  fala?: string;
}

export type Bola = "poke-ball" | "great-ball" | "ultra-ball" | "safari-ball";
export const BOLAS: Bola[] = ["safari-ball", "poke-ball", "great-ball", "ultra-ball"];
export const MULT_BOLA: Record<Bola, number> = { "poke-ball": 1, "great-ball": 1.5, "ultra-ball": 2, "safari-ball": 1.5 };
// Safari Balls só valem dentro da Zona Safári: não vão para a mochila do perfil.
export const BOLAS_SAFARI = 12;

// ---------- regiões: ginásios, Elite dos 4, campeão ----------

export interface Ginasio {
  lider: string;
  sprite: string;
  tipo: number; // tipo Pokémon (índice de NOME_TIPO)
  insignia: string;
  cidade: string;
  piso: number; // nível de referência do líder (os jogos da região)
  ajudantes: string[];
}

export interface MembroElite {
  nome: string;
  sprite: string;
  tipo: number;
  piso: number;
}

export interface Regiao {
  nome: string;
  faixa: [number, number]; // números da Pokédex nacional nativos da região
  iniciais: number[];
  ginasios: Ginasio[];
  elite: MembroElite[];
  campeao: { nome: string; sprite: string; piso: number; time: number[] };
}

// Cinco regiões, na ordem dos jogos (a Pokédex vai até a 5ª geração). Ser Campeão de uma
// libera a viagem para a próxima: lá o jogador escolhe um inicial da região e recomeça do
// nível 5, e o time antigo fica no PC. Insígnia i da região r = sprites/badges/(8r+i+1).png.
export const REGIOES: Regiao[] = [
  {
    nome: "Kanto",
    faixa: [1, 151],
    iniciais: [1, 4, 7],
    ginasios: [
      { lider: "Brock", sprite: "brock", tipo: 12, insignia: "Insígnia Rocha", cidade: "Pewter", piso: 12, ajudantes: ["hiker", "camper"] },
      { lider: "Misty", sprite: "misty", tipo: 2, insignia: "Insígnia Cascata", cidade: "Cerulean", piso: 18, ajudantes: ["swimmer", "sailor"] },
      { lider: "Lt. Surge", sprite: "ltsurge", tipo: 3, insignia: "Insígnia Trovão", cidade: "Vermilion", piso: 24, ajudantes: ["sailor", "guitarist"] },
      { lider: "Erika", sprite: "erika", tipo: 4, insignia: "Insígnia Arco-Íris", cidade: "Celadon", piso: 29, ajudantes: ["beauty", "lass"] },
      { lider: "Koga", sprite: "koga", tipo: 7, insignia: "Insígnia Alma", cidade: "Fuchsia", piso: 37, ajudantes: ["juggler", "burglar"] },
      { lider: "Sabrina", sprite: "sabrina", tipo: 10, insignia: "Insígnia Pântano", cidade: "Saffron", piso: 43, ajudantes: ["psychic", "psychicf"] },
      { lider: "Blaine", sprite: "blaine", tipo: 1, insignia: "Insígnia Vulcão", cidade: "Cinnabar", piso: 47, ajudantes: ["burglar", "scientist"] },
      { lider: "Giovanni", sprite: "giovanni", tipo: 8, insignia: "Insígnia Terra", cidade: "Viridian", piso: 50, ajudantes: ["blackbelt", "acetrainer"] },
    ],
    elite: [
      { nome: "Lorelei", sprite: "lorelei-gen3", tipo: 5, piso: 54 },
      { nome: "Bruno", sprite: "bruno", tipo: 6, piso: 56 },
      { nome: "Agatha", sprite: "agatha-gen3", tipo: 13, piso: 58 },
      { nome: "Lance", sprite: "lance", tipo: 14, piso: 60 },
    ],
    campeao: { nome: "Blue", sprite: "blue", piso: 63, time: [18, 65, 130, 6] },
  },
  {
    nome: "Johto",
    faixa: [152, 251],
    iniciais: [152, 155, 158],
    ginasios: [
      { lider: "Falkner", sprite: "falkner", tipo: 9, insignia: "Insígnia Zéfiro", cidade: "Violet", piso: 10, ajudantes: ["birdkeeper", "youngster"] },
      { lider: "Bugsy", sprite: "bugsy", tipo: 11, insignia: "Insígnia Colmeia", cidade: "Azalea", piso: 16, ajudantes: ["bugcatcher", "camper"] },
      { lider: "Whitney", sprite: "whitney", tipo: 0, insignia: "Insígnia Planície", cidade: "Goldenrod", piso: 20, ajudantes: ["lass", "beauty"] },
      { lider: "Morty", sprite: "morty", tipo: 13, insignia: "Insígnia Névoa", cidade: "Ecruteak", piso: 25, ajudantes: ["psychic", "psychicf"] },
      { lider: "Chuck", sprite: "chuck", tipo: 6, insignia: "Insígnia Tempestade", cidade: "Cianwood", piso: 30, ajudantes: ["blackbelt", "veteran"] },
      { lider: "Jasmine", sprite: "jasmine", tipo: 16, insignia: "Insígnia Mineral", cidade: "Olivine", piso: 35, ajudantes: ["sailor", "gentleman"] },
      { lider: "Pryce", sprite: "pryce", tipo: 5, insignia: "Insígnia Glacial", cidade: "Mahogany", piso: 34, ajudantes: ["skier", "boarder"] },
      { lider: "Clair", sprite: "clair", tipo: 14, insignia: "Insígnia Ascensão", cidade: "Blackthorn", piso: 41, ajudantes: ["acetrainer", "acetrainerf"] },
    ],
    elite: [
      { nome: "Will", sprite: "will", tipo: 10, piso: 42 },
      { nome: "Koga", sprite: "koga", tipo: 7, piso: 44 },
      { nome: "Bruno", sprite: "bruno", tipo: 6, piso: 46 },
      { nome: "Karen", sprite: "karen", tipo: 15, piso: 47 },
    ],
    campeao: { nome: "Lance", sprite: "lance", piso: 50, time: [130, 142, 6, 149] },
  },
  {
    nome: "Hoenn",
    faixa: [252, 386],
    iniciais: [252, 255, 258],
    ginasios: [
      { lider: "Roxanne", sprite: "roxanne", tipo: 12, insignia: "Insígnia Pedra", cidade: "Rustboro", piso: 15, ajudantes: ["hiker", "schoolkidf"] },
      { lider: "Brawly", sprite: "brawly", tipo: 6, insignia: "Insígnia Punho", cidade: "Dewford", piso: 19, ajudantes: ["blackbelt", "swimmer"] },
      { lider: "Wattson", sprite: "wattson", tipo: 3, insignia: "Insígnia Dínamo", cidade: "Mauville", piso: 24, ajudantes: ["guitarist", "worker"] },
      { lider: "Flannery", sprite: "flannery", tipo: 1, insignia: "Insígnia Calor", cidade: "Lavaridge", piso: 29, ajudantes: ["hiker", "burglar"] },
      { lider: "Norman", sprite: "norman", tipo: 0, insignia: "Insígnia Equilíbrio", cidade: "Petalburg", piso: 31, ajudantes: ["acetrainer", "acetrainerf"] },
      { lider: "Winona", sprite: "winona", tipo: 9, insignia: "Insígnia Pena", cidade: "Fortree", piso: 33, ajudantes: ["birdkeeper", "pilot"] },
      { lider: "Tate", sprite: "tate", tipo: 10, insignia: "Insígnia Mente", cidade: "Mossdeep", piso: 42, ajudantes: ["psychic", "psychicf"] },
      { lider: "Juan", sprite: "juan", tipo: 2, insignia: "Insígnia Chuva", cidade: "Sootopolis", piso: 46, ajudantes: ["swimmerf", "sailor"] },
    ],
    elite: [
      { nome: "Sidney", sprite: "sidney", tipo: 15, piso: 49 },
      { nome: "Phoebe", sprite: "phoebe-gen3", tipo: 13, piso: 51 },
      { nome: "Glacia", sprite: "glacia", tipo: 5, piso: 53 },
      { nome: "Drake", sprite: "drake-gen3", tipo: 14, piso: 55 },
    ],
    campeao: { nome: "Steven", sprite: "steven", piso: 58, time: [227, 344, 306, 376] },
  },
  {
    nome: "Sinnoh",
    faixa: [387, 493],
    iniciais: [387, 390, 393],
    ginasios: [
      { lider: "Roark", sprite: "roark", tipo: 12, insignia: "Insígnia Carvão", cidade: "Oreburgh", piso: 14, ajudantes: ["worker", "hiker"] },
      { lider: "Gardenia", sprite: "gardenia", tipo: 4, insignia: "Insígnia Floresta", cidade: "Eterna", piso: 22, ajudantes: ["lass", "camper"] },
      { lider: "Maylene", sprite: "maylene", tipo: 6, insignia: "Insígnia Paralelepípedo", cidade: "Veilstone", piso: 30, ajudantes: ["blackbelt", "veteran"] },
      { lider: "Crasher Wake", sprite: "crasherwake", tipo: 2, insignia: "Insígnia Pântano", cidade: "Pastoria", piso: 32, ajudantes: ["fisherman", "swimmerf"] },
      { lider: "Fantina", sprite: "fantina", tipo: 13, insignia: "Insígnia Relíquia", cidade: "Hearthome", piso: 36, ajudantes: ["psychicf", "beauty"] },
      { lider: "Byron", sprite: "byron", tipo: 16, insignia: "Insígnia Mina", cidade: "Canalave", piso: 39, ajudantes: ["worker", "gentleman"] },
      { lider: "Candice", sprite: "candice", tipo: 5, insignia: "Insígnia Pingente", cidade: "Snowpoint", piso: 42, ajudantes: ["skier", "acetrainerf"] },
      { lider: "Volkner", sprite: "volkner", tipo: 3, insignia: "Insígnia Farol", cidade: "Sunyshore", piso: 49, ajudantes: ["guitarist", "scientist"] },
    ],
    elite: [
      { nome: "Aaron", sprite: "aaron", tipo: 11, piso: 53 },
      { nome: "Bertha", sprite: "bertha", tipo: 8, piso: 55 },
      { nome: "Flint", sprite: "flint", tipo: 1, piso: 57 },
      { nome: "Lucian", sprite: "lucian", tipo: 10, piso: 59 },
    ],
    campeao: { nome: "Cynthia", sprite: "cynthia", piso: 62, time: [442, 350, 448, 445] },
  },
  {
    nome: "Unova",
    faixa: [494, 649],
    iniciais: [495, 498, 501],
    ginasios: [
      { lider: "Cilan", sprite: "cilan", tipo: 4, insignia: "Insígnia Trio", cidade: "Striaton", piso: 14, ajudantes: ["waitress", "youngster"] },
      { lider: "Lenora", sprite: "lenora", tipo: 0, insignia: "Insígnia Básica", cidade: "Nacrene", piso: 20, ajudantes: ["schoolkidf", "teacher"] },
      { lider: "Burgh", sprite: "burgh", tipo: 11, insignia: "Insígnia Inseto", cidade: "Castelia", piso: 23, ajudantes: ["bugcatcher", "artist"] },
      { lider: "Elesa", sprite: "elesa", tipo: 3, insignia: "Insígnia Raio", cidade: "Nimbasa", piso: 27, ajudantes: ["beauty", "guitarist"] },
      { lider: "Clay", sprite: "clay", tipo: 8, insignia: "Insígnia Tremor", cidade: "Driftveil", piso: 31, ajudantes: ["worker", "hiker"] },
      { lider: "Skyla", sprite: "skyla", tipo: 9, insignia: "Insígnia Jato", cidade: "Mistralton", piso: 35, ajudantes: ["pilot", "birdkeeper"] },
      { lider: "Brycen", sprite: "brycen", tipo: 5, insignia: "Insígnia Congelada", cidade: "Icirrus", piso: 39, ajudantes: ["skier", "blackbelt"] },
      { lider: "Drayden", sprite: "drayden", tipo: 14, insignia: "Insígnia Lenda", cidade: "Opelucid", piso: 43, ajudantes: ["acetrainer", "veteran"] },
    ],
    elite: [
      { nome: "Shauntal", sprite: "shauntal", tipo: 13, piso: 48 },
      { nome: "Grimsley", sprite: "grimsley", tipo: 15, piso: 49 },
      { nome: "Caitlin", sprite: "caitlin", tipo: 10, piso: 50 },
      { nome: "Marshal", sprite: "marshal", tipo: 6, piso: 51 },
    ],
    campeao: { nome: "Alder", sprite: "alder", piso: 54, time: [626, 617, 621, 637] },
  },
];

export const regiaoDe = (i: number | undefined) => REGIOES[i ?? 0] ?? REGIOES[0];
// Maior número da Pokédex que existe na jornada até a região r (cumulativo: Johto = #1–251).
export const limiteDaRegiao = (r: number | undefined) => regiaoDe(r).faixa[1];
// Kanto (compatibilidade com partidas, perfis e testes de antes das regiões).
export const GINASIOS = REGIOES[0].ginasios;
export const ELITE = REGIOES[0].elite;
export const CAMPEAO = REGIOES[0].campeao;

// Nível dos inimigos: metade do caminho entre o time e o nível dos jogos (nunca abaixo do
// time + delta). O ginásio puxa o time para cima sem virar um muro.
export function nivelDoDesafio(base: number, piso: number, delta: number): number {
  return Math.max(2, Math.min(MAX_NIVEL, Math.max(base + delta, Math.round((base + piso) / 2) + delta)));
}

export const PEDRAS = ["fire-stone", "water-stone", "thunder-stone", "leaf-stone", "moon-stone", "sun-stone", "shiny-stone", "dusk-stone", "dawn-stone", "ice-stone"];
export type Item = Bola | "potion" | "super-potion" | "hyper-potion" | "revive" | "full-heal" | "rare-candy" | (string & {});

export interface PartidaPoke {
  versao: 3;
  modo?: ModoJornada; // ausente = rota (partidas salvas antes dos modos)
  regiao?: number; // região da jornada (ausente = Kanto): ginásios, Liga e capturas
  habitat?: number; // Zona Safári: de que região são os selvagens
  terreno?: number; // Zona Safári: índice em TERRENOS (ausente = todos os tipos)
  cap?: number; // level cap da partida: acima dele o XP não entra
  ginasio?: number; // modo ginasio: índice nos ginásios da região
  aprender?: { uid: string; golpe: number }[]; // golpes novos esperando a escolha de qual esquecer
  concursoId: string | null;
  iniciadaEm: string;
  treinadores: Treinador[];
  fila: Encontro[];
  atual: Encontro | null;
  reserva: QuestaoReserva[]; // questões para os turnos seguintes de um mesmo Pokémon
  chaves: number;
  time: Lutador[];
  ativo: number;
  mochila: Record<string, number>;
  novos: Mon[]; // capturados com o time cheio: vão para o PC
  combo: number;
  xp: number; // XP total da partida (placar)
  registros: Registro[];
  licoes: Record<number, string>;
  vencidos: number[]; // treinadores derrotados
  recompensa: boolean; // treinador acabou de cair: sortear oferta ao avançar
  oferta: string[] | null;
  totalEncontros: number;
  fim: null | "vitoria" | "derrota" | "fuga";
  rng: number;
}

export type StatusGolpe = Exclude<Status, ""> | "leech-seed";

export type Evento =
  | { tipo: "ataque"; golpe: number; efetividade: number; critico: boolean; semEfeito: boolean; dano: number; hpInimigo: number }
  | { tipo: "statusInimigo"; status: StatusGolpe }
  | { tipo: "statusFalhou"; status: StatusGolpe; motivo: "imune" | "ja" }
  | { tipo: "tiqueInimigo"; status: StatusGolpe; dano: number; hpInimigo: number }
  | { tipo: "inimigoAcordou"; status: Status }
  | { tipo: "inimigoImpedido"; status: Status }
  | { tipo: "exausto" }
  | { tipo: "voltaDepois"; selvagem: boolean }
  | { tipo: "impedido"; status: Status } // dormindo/congelado/paralisado: o golpe sai sem bônus
  | { tipo: "desmaiouInimigo" }
  | { tipo: "bola"; bola: Bola; sucesso: boolean; balancos: number; uid?: string; paraPc?: boolean }
  | { tipo: "xp"; uid: string; valor: number }
  | { tipo: "cap"; uid: string; nivel: number } // no level cap: o XP não entrou
  | { tipo: "nivel"; uid: string; nivel: number }
  | { tipo: "aprendeu"; uid: string; golpe: number; esqueceu: number | null }
  | { tipo: "querAprender"; uid: string; golpe: number }
  | { tipo: "evolui"; uid: string; de: number; para: number }
  | { tipo: "cura"; uid: string; valor: number; motivo: "dreno" | "cura" | "combo" | "licao" | "item" | "semente" }
  | { tipo: "foco"; uid: string }
  | { tipo: "errou" }
  | { tipo: "contra"; golpe: number; dano: number; efetividade: number; critico: boolean; foco: boolean; revide?: boolean }
  | { tipo: "status"; uid: string; status: Status }
  | { tipo: "tique"; uid: string; dano: number; status: Status }
  | { tipo: "acordou"; uid: string; status: Status }
  | { tipo: "desmaiou"; uid: string }
  | { tipo: "fuga" }
  | { tipo: "treinadorVencido"; treinador: number; lider: boolean; insignia?: number }
  | { tipo: "derrota" };

export const MIN_LICAO = 12;
export const XP_SELVAGEM = 0.5;
const ALVO_QUESTOES = 18;
const MAX_REVISOES = 14;
const QUESTOES_POR_POKEMON = 2.2;
const DISTANCIA_RETORNO = 3;
export const MAX_TIME = 6;
const MAX_TURNOS_POKEMON = 3;

// ---------- sorteio ----------

export function sortear(rng: number): [number, number] {
  let a = (rng + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  a = a >>> 0;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
const hash = (n: number) => sortear(n * 2654435761)[0];

export const nivelDe = (m: Mon) => nivelDoXpPoke(m.xp);

export function hpMax(dex: Dex, m: Mon): number {
  return atributos(dex.especies[m.id], nivelDe(m)).hp;
}

export function criarMon(dex: Dex, id: number, nivel: number, uid: string, extra: Partial<Mon> = {}): Mon {
  return { uid, id, xp: xpDoNivel(nivel), golpes: golpesNoNivel(dex.especies[id], nivel), ...extra };
}

export function lutador(dex: Dex, m: Mon): Lutador {
  return { ...m, hp: hpMax(dex, m), status: "", sono: 0, foco: 0 };
}

// ---------- a questão vira Pokémon ----------

// Tipo da matéria (mesmo recorte de components/batalha/tipos.ts) -> tipos Pokémon.
const TIPOS_DA_MATERIA: [RegExp, number[], string[]][] = [
  // [matéria, tipos Pokémon, treinadores]
  [/portug|redac|gramat|interpreta/, [0, 17, 9], ["teacher", "schoolkidf", "lass", "artist"]],
  [/ingl|english|idioma|espanh/, [2, 5, 9], ["sailor", "swimmerf", "backpacker", "pilot"]],
  [/legisla|direito|\blei\b|etica|constitu|administra|regiment|estatuto/, [16, 6, 12], ["policeman", "gentleman", "veteran", "blackbelt"]],
  [/logic|raciocin|matemat|estatist|quantitat/, [10, 13, 15], ["psychic", "psychicf", "scientist", "pokemaniac"]],
  [/banco|dados|sql|data/, [3, 7, 8], ["scientistf", "clerk", "worker", "hiker"]],
  [/inform|program|rede|sistema|engenharia|seguran|desenvolv|software|comput|\bti\b|nuvem|devops/, [11, 3, 14], ["scientist", "guitarist", "clerkf", "burglar"]],
];
const TREINADORES_GERAIS = ["youngster", "lass", "acetrainer", "acetrainerf", "bugcatcher", "fisherman", "birdkeeper", "waitress"];
const CHEFES_ROTA: [string, string][] = [["acetrainer", "Treinador Ás"], ["acetrainerf", "Treinadora Ás"], ["veteran", "Veterano"], ["blackbelt", "Faixa-preta"]];
const NOMES_TREINADOR: Record<string, string> = {
  teacher: "Professora", schoolkidf: "Estudante", lass: "Moça", artist: "Artista", sailor: "Marinheiro",
  swimmerf: "Nadadora", backpacker: "Mochileiro", pilot: "Piloto", policeman: "Policial", gentleman: "Cavalheiro",
  veteran: "Veterano", blackbelt: "Faixa-preta", psychic: "Médium", psychicf: "Médium", scientist: "Cientista",
  pokemaniac: "Pokémaníaco", scientistf: "Cientista", clerk: "Analista", worker: "Operário", hiker: "Alpinista",
  guitarist: "Guitarrista", clerkf: "Analista", burglar: "Hacker", youngster: "Garoto", acetrainer: "Treinador Ás",
  acetrainerf: "Treinadora Ás", bugcatcher: "Caçador de Insetos", fisherman: "Pescador", birdkeeper: "Criador de Aves",
  waitress: "Garçonete", camper: "Campista", swimmer: "Nadador", beauty: "Beldade", juggler: "Malabarista",
  skier: "Esquiadora", boarder: "Snowboarder",
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function tiposDaMateria(materia: string): { tipos: number[] | null; treinadores: string[] } {
  const m = semAcento(materia);
  const achou = TIPOS_DA_MATERIA.find(([re]) => re.test(m));
  return achou ? { tipos: achou[1], treinadores: achou[2] } : { tipos: null, treinadores: TREINADORES_GERAIS };
}

// Espécies "de base" (não lendárias, sem pré-evolução que já exista até `ate`), por tipo.
// `ate` = maior número da Pokédex da região da jornada: em Kanto só aparece até o #151 (e
// Pikachu conta como base, porque Pichu é de Johto); em Johto, 1ª e 2ª gerações, e assim por
// diante. Com `faixa`, prefere as linhas com alguma forma nativa da região (até `ate`); com
// menos de 3 do tipo, vale tudo até `ate`; se nem assim houver, a Pokédex toda.
// Memorizado por dex.
const bases = new WeakMap<Dex, Map<string, number[]>>();
function basesPorTipo(dex: Dex, tipo: number | "todas", faixa?: [number, number], ate = Infinity): number[] {
  let mapa = bases.get(dex);
  if (!mapa) bases.set(dex, (mapa = new Map()));
  const chave = `${tipo}:${faixa?.join("-") ?? ""}:${ate}`;
  let lista = mapa.get(chave);
  if (!lista) {
    const naFaixa = (id: number) => !faixa || (id >= faixa[0] && id <= faixa[1]);
    const linha = (id: number): number[] => [id, ...(dex.especies[id]?.e ?? []).filter(([para]) => para <= ate).flatMap(([para]) => linha(para))];
    lista = Object.entries(dex.especies)
      .filter(([id, e]) => Number(id) <= ate && !e.l && (!e.p || e.p > ate) && (tipo === "todas" || e.t.includes(tipo)) && linha(Number(id)).some(naFaixa))
      .map(([id]) => Number(id));
    if (faixa && lista.length < 3) lista = basesPorTipo(dex, tipo, undefined, ate);
    if (!lista.length && ate !== Infinity) lista = basesPorTipo(dex, tipo);
    mapa.set(chave, lista);
  }
  return lista;
}

// A mesma questão é sempre o mesmo Pokémon (na forma do nível em que aparece): a questão
// #123 "é um Gengar" e o aluno reconhece a velha conhecida.
export function especieDaQuestao(dex: Dex, questaoId: number, materia: string, nivel: number, ate = Infinity): number {
  const { tipos } = tiposDaMateria(materia);
  const tipo = tipos ? tipos[Math.floor(hash(questaoId) * tipos.length)] : "todas";
  const pool = basesPorTipo(dex, tipo, undefined, ate);
  const base = pool[Math.floor(hash(questaoId + 7919) * pool.length)] ?? 1;
  return formaNoNivel(dex, base, nivel, ate);
}

// O líder usa uma forma final forte; com o time já alto, pode ser um lendário.
function especieDoLider(dex: Dex, questaoId: number, materia: string, nivel: number, ate = Infinity): number {
  const { tipos } = tiposDaMateria(materia);
  const finais = Object.entries(dex.especies)
    .filter(([id, e]) => Number(id) <= ate && !e.e?.some(([para]) => para <= ate) && (nivel >= 45 || !e.l) && (!tipos || e.t.some((t) => tipos.includes(t))))
    .map(([id, e]) => ({ id: Number(id), soma: e.s.reduce((a, b) => a + b, 0) }))
    .filter((x) => x.soma >= 450)
    .sort((a, b) => a.id - b.id);
  if (!finais.length) return especieDaQuestao(dex, questaoId, materia, nivel, ate);
  return finais[Math.floor(hash(questaoId + 104729) * finais.length)].id;
}

// ---------- montagem ----------

export function nivelMedio(time: Mon[]): number {
  if (!time.length) return 5;
  return Math.round(time.reduce((a, m) => a + nivelDe(m), 0) / time.length);
}

export function montarPartidaPoke(opts: {
  dex: Dex;
  time: Mon[];
  mochila: Record<string, number>;
  pendentes: Candidata[];
  novas: Candidata[];
  concursoId: string | null;
  modo?: ModoJornada;
  regiao?: number;
  habitat?: number;
  terreno?: number;
  ginasio?: number;
  cap?: number;
  semente?: number;
  agora?: Date;
}): PartidaPoke | null {
  const { dex } = opts;
  const modo = opts.modo ?? "rota";
  const regiao = REGIOES[opts.regiao ?? 0] ? (opts.regiao ?? 0) : 0;
  // Safári só das regiões já alcançadas (Pokémon de geração futura esperam a viagem).
  const habitat = REGIOES[opts.habitat ?? -1] && opts.habitat! <= regiao ? opts.habitat! : regiao;
  const ate = limiteDaRegiao(regiao);
  const terreno = TERRENOS[opts.terreno ?? -1] ? opts.terreno : undefined;
  if (!opts.time.length) return null;
  if (modo === "ginasio" && !REGIOES[regiao].ginasios[opts.ginasio ?? -1]) return null;
  let rng = opts.semente ?? Date.now() >>> 0;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };
  const base = nivelMedio(opts.time);
  const nivelEntre = (d0: number, d1: number) => Math.max(2, Math.min(MAX_NIVEL, base + d0 + Math.floor(rolar() * (d1 - d0 + 1))));

  // Quantos Pokémon inimigos o modo pede; a partida puxa ~2,2 questões por Pokémon.
  const planos = modo === "rota" ? null : modo === "safari" ? planoSafari(dex, REGIOES[habitat].faixa, terreno, nivelEntre, rolar) : modo === "liga" ? planoLiga(dex, regiao, base) : planoGinasio(dex, regiao, opts.ginasio!, base, rolar);
  const nMons = planos ? planos.reduce((a, x) => a + x.mons.length, 0) : 0;
  const alvo = planos ? Math.max(4, Math.round(nMons * (modo === "safari" ? 3 : QUESTOES_POR_POKEMON)) + 1) : ALVO_QUESTOES;
  const revisoes = opts.pendentes.slice(0, Math.min(MAX_REVISOES, alvo));
  const pool = [...revisoes, ...opts.novas.slice(0, Math.max(0, alvo - revisoes.length))];
  if (pool.length === 0) return null;

  // O chefe (líder, campeão, treinador Ás) abre com a questão em que mais errei (sem erro, a
  // mais difícil). Na Zona Safári não há chefe.
  let chefe: Candidata | undefined;
  if (pool.length > 1 && modo !== "safari") {
    const peso = (c: Candidata) => c.erros * 10 + (c.dificuldade === "dificil" ? 2 : c.dificuldade === "media" ? 1 : 0);
    chefe = pool.reduce((m, c) => (peso(c) > peso(m) ? c : m), pool[0]);
  }
  const comuns = intercalar(pool.filter((c) => c !== chefe));
  const treinadores: Treinador[] = [];
  const fila: Encontro[] = [];
  let reserva: QuestaoReserva[] = [];
  let chaves = 0;
  const inimigo = (c: Candidata, tipo: TipoEncontro, treinador: number, especie: number, nivel: number): Encontro => ({
    questaoId: c.questaoId,
    tipo,
    treinador,
    especie,
    nivel,
    retorno: false,
    chave: ++chaves,
    hp: atributos(dex.especies[especie], nivel).hp,
    status: "",
    sono: 0,
    semente: false,
  });

  if (planos) {
    // Cada Pokémon abre com uma questão; o que sobra vai para a reserva (turnos seguintes).
    // Com poucas questões, os ajudantes perdem Pokémon antes do chefe.
    const slots = planos.flatMap((pl, t) => pl.mons.map((m, j) => ({ ...m, t, ultimo: j === pl.mons.length - 1 })));
    const cabe = comuns.length + (chefe ? 1 : 0);
    while (slots.length > Math.max(1, cabe)) {
      const i = slots.findIndex((s) => !s.ultimo && s.tipo !== "lider");
      slots.splice(i >= 0 ? i : 0, 1);
    }
    const usados = [...new Set(slots.filter((s) => s.tipo !== "selvagem").map((s) => s.t))];
    for (const t of usados) treinadores.push(planos[t].t);
    const idxChefe = chefe ? slots.map((s) => s.tipo).lastIndexOf("lider") : -1;
    let k = 0;
    slots.forEach((s, i) => {
      const c = i === idxChefe && chefe ? chefe : comuns[k++] ?? chefe!;
      fila.push(inimigo(c, s.tipo, s.tipo === "selvagem" ? -1 : usados.indexOf(s.t), s.especie, s.nivel));
    });
    reserva = comuns.slice(k).map((c) => ({ questaoId: c.questaoId, retorno: false }));
  } else {
    // ROTA: treinadores de 2–3 Pokémon, selvagens entre eles (primeiro as questões que já
    // me derrubaram, que dá para capturar) e o Treinador Ás no fim.
    const ehRevisao = new Set(revisoes.map((r) => r.questaoId));
    const orcamento = Math.max(2, Math.round(pool.length / QUESTOES_POR_POKEMON) - (chefe ? 1 : 0));
    const nSelv = Math.max(1, Math.round(orcamento / 3));
    const comErro = comuns.filter((c) => c.erros > 0 && ehRevisao.has(c.questaoId));
    const selvagens = [...comErro, ...comuns.filter((c) => !comErro.includes(c))].slice(0, nSelv);
    const outras = comuns.filter((c) => !selvagens.includes(c));
    const nTreinador = Math.max(0, orcamento - selvagens.length);
    const deTreinador = outras.slice(0, nTreinador);
    reserva = outras.slice(nTreinador).map((c) => ({ questaoId: c.questaoId, retorno: false }));
    let i = 0;
    while (i < deTreinador.length) {
      const tam = Math.min(deTreinador.length - i, rolar() < 0.5 ? 2 : 3);
      const grupo = deTreinador.slice(i, i + tam);
      i += tam;
      const { treinadores: classes } = tiposDaMateria(grupo[0].materia);
      const sprite = classes[Math.floor(rolar() * classes.length)];
      const idx = treinadores.length;
      treinadores.push({ nome: NOMES_TREINADOR[sprite] ?? "Treinador", sprite, lider: false });
      for (const c of grupo) {
        const nivel = nivelEntre(-1, 1);
        fila.push(inimigo(c, "treinador", idx, especieDaQuestao(dex, c.questaoId, c.materia, nivel, ate), nivel));
      }
      // um selvagem entre treinadores, quando houver
      const s = selvagens.shift();
      if (s) {
        const nivel = nivelEntre(-2, 0);
        fila.push(inimigo(s, "selvagem", -1, especieDaQuestao(dex, s.questaoId, s.materia, nivel, ate), nivel));
      }
    }
    for (const s of selvagens) {
      const nivel = nivelEntre(-2, 0);
      fila.push(inimigo(s, "selvagem", -1, especieDaQuestao(dex, s.questaoId, s.materia, nivel, ate), nivel));
    }
    if (chefe) {
      const idx = treinadores.length;
      const [sprite, nome] = CHEFES_ROTA[Math.floor(rolar() * CHEFES_ROTA.length)];
      treinadores.push({ nome, sprite, lider: true });
      const nivel = Math.min(MAX_NIVEL, base + 3);
      fila.push(inimigo(chefe, "lider", idx, especieDoLider(dex, chefe.questaoId, chefe.materia, nivel, ate), nivel));
    }
  }

  const mochila = { ...opts.mochila };
  if (modo === "safari") mochila["safari-ball"] = BOLAS_SAFARI;
  else delete mochila["safari-ball"];
  const p: PartidaPoke = {
    versao: 3,
    modo,
    regiao,
    ...(opts.cap ? { cap: opts.cap } : {}),
    ...(modo === "safari" ? { habitat, ...(terreno !== undefined ? { terreno } : {}) } : {}),
    ...(modo === "ginasio" ? { ginasio: opts.ginasio } : {}),
    aprender: [],
    concursoId: opts.concursoId,
    iniciadaEm: (opts.agora ?? new Date()).toISOString(),
    treinadores,
    fila,
    atual: null,
    reserva,
    chaves,
    time: opts.time.slice(0, MAX_TIME).map((m) => lutador(dex, m)),
    ativo: 0,
    mochila,
    novos: [],
    combo: 0,
    xp: 0,
    registros: [],
    licoes: {},
    vencidos: [],
    recompensa: false,
    oferta: null,
    totalEncontros: fila.length + reserva.length,
    fim: null,
    rng,
  };
  return avancarPoke(p, dex);
}

// ---------- planos dos modos ----------

interface Plano {
  t: Treinador;
  mons: { especie: number; nivel: number; tipo: TipoEncontro }[];
}

// Pokémon de um tipo, sempre o mesmo para a mesma semente (o time do Brock não muda a cada
// tentativa), na forma do nível.
function especieDoTipo(dex: Dex, tipo: number, nivel: number, semente: number, faixa?: [number, number]): number {
  const ate = faixa?.[1] ?? Infinity;
  const pool = basesPorTipo(dex, tipo, faixa, ate);
  const base = pool[Math.floor(hash(semente) * pool.length)] ?? 1;
  return formaNoNivel(dex, base, nivel, ate);
}

// O "ás" do chefe: uma das linhas evolutivas mais fortes do tipo, na forma do nível (Onix no
// Brock do começo, Golem/Steelix se o time já estiver alto).
function aceDoTipo(dex: Dex, tipo: number, nivel: number, semente: number, faixa?: [number, number]): number {
  const ate = faixa?.[1] ?? Infinity;
  const fortes = basesPorTipo(dex, tipo, faixa, ate)
    .map((id) => ({ id, soma: dex.especies[formaNoNivel(dex, id, 100, ate)].s.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.soma - a.soma || a.id - b.id)
    .slice(0, 6);
  if (!fortes.length) return especieDoTipo(dex, tipo, nivel, semente, faixa);
  return formaNoNivel(dex, fortes[Math.floor(hash(semente) * fortes.length)].id, nivel, ate);
}

function planoGinasio(dex: Dex, r: number, i: number, base: number, rolar: () => number): Plano[] {
  const { faixa } = REGIOES[r];
  const g = REGIOES[r].ginasios[i];
  const s = 100000 * r; // Kanto (r = 0) mantém as sementes de antes
  const nvLider = nivelDoDesafio(base, g.piso, 1);
  const nAjud = i < 4 ? 1 : 2;
  const nLider = i < 2 ? 2 : i < 5 ? 3 : 4;
  const planos: Plano[] = g.ajudantes.map((sprite, k) => ({
    t: { nome: NOMES_TREINADOR[sprite] ?? "Treinador", sprite, lider: false },
    mons: Array.from({ length: nAjud }, (_, j) => {
      const nivel = Math.max(2, nvLider - 4 + Math.floor(rolar() * 2));
      return { especie: especieDoTipo(dex, g.tipo, nivel, s + 1000 * (i + 1) + 10 * k + j, faixa), nivel, tipo: "treinador" as const };
    }),
  }));
  planos.push({
    t: { nome: g.lider, sprite: g.sprite, lider: true, insignia: i, fala: `${g.lider}, líder do Ginásio de ${g.cidade}, aceita o desafio pela ${g.insignia}!` },
    mons: Array.from({ length: nLider }, (_, j) => {
      const ace = j === nLider - 1;
      const nivel = ace ? nvLider : Math.max(2, nvLider - 2);
      return { especie: ace ? aceDoTipo(dex, g.tipo, nivel, s + 77 * (i + 1), faixa) : especieDoTipo(dex, g.tipo, nivel, s + 1000 * (i + 1) + 500 + j, faixa), nivel, tipo: "lider" as const };
    }),
  });
  return planos;
}

// Elite dos 4 (2 Pokémon cada, o ás é chefe) e o Campeão (4 Pokémon, todos chefes).
function planoLiga(dex: Dex, r: number, base: number): Plano[] {
  const { elite, campeao, faixa } = REGIOES[r];
  const s = 100000 * r;
  const planos: Plano[] = elite.map((m, i) => ({
    t: { nome: m.nome, sprite: m.sprite, lider: true, elite: true, fala: `${m.nome}, da Elite dos 4, especialista em ${NOME_TIPO[m.tipo]}.` },
    mons: [0, 1].map((j) => {
      const nivel = nivelDoDesafio(base, m.piso, j ? 1 : -1);
      return { especie: j ? aceDoTipo(dex, m.tipo, nivel, s + 313 * (i + 1), faixa) : especieDoTipo(dex, m.tipo, nivel, s + 9000 + 10 * i, faixa), nivel, tipo: (j ? "lider" : "treinador") as TipoEncontro };
    }),
  }));
  planos.push({
    t: { nome: `Campeão ${campeao.nome}`, sprite: campeao.sprite, lider: true, campeao: true, fala: `${campeao.nome} é o Campeão da Liga de ${REGIOES[r].nome}. Vença e entre para o Hall da Fama!` },
    mons: campeao.time.filter((id) => dex.especies[id]).map((id, j, xs) => ({ especie: id, nivel: nivelDoDesafio(base, campeao.piso, j === xs.length - 1 ? 2 : 0), tipo: "lider" as const })),
  });
  return planos;
}

// Zona Safári: 6 selvagens da região escolhida (os comuns aparecem mais), um pouco abaixo do time.
const SELVAGENS_SAFARI = 6;
function planoSafari(dex: Dex, faixa: [number, number], terreno: number | undefined, nivelEntre: (a: number, b: number) => number, rolar: () => number): Plano[] {
  const mons: Plano["mons"] = [];
  for (let i = 0; i < SELVAGENS_SAFARI; i++) {
    const nivel = nivelEntre(-3, 0);
    mons.push({ especie: selvagemDaRegiao(dex, faixa, nivel, rolar(), undefined, terreno), nivel, tipo: "selvagem" });
  }
  return [{ t: { nome: "", sprite: "", lider: false }, mons }];
}

// Terrenos da Zona Safári: cada um só tem Pokémon (de base) desses tipos.
export const TERRENOS: { nome: string; tipos: number[] }[] = [
  { nome: "Mato alto", tipos: [4, 11] },
  { nome: "Água", tipos: [2] },
  { nome: "Caverna", tipos: [12, 8] },
  { nome: "Vulcão", tipos: [1] },
  { nome: "Usina", tipos: [3, 16] },
  { nome: "Pântano", tipos: [7] },
  { nome: "Torre", tipos: [13, 10] },
  { nome: "Montanha gelada", tipos: [5, 6] },
  { nome: "Céu", tipos: [9, 14] },
  { nome: "Cidade", tipos: [0, 17, 15] },
];

// Sorteio de selvagem da região (e do terreno), ponderado pela taxa de captura (comum aparece mais).
function selvagemDaRegiao(dex: Dex, faixa: [number, number], nivel: number, r01: number, evitar?: number, terreno?: number): number {
  const tipos = TERRENOS[terreno ?? -1]?.tipos;
  const pool = tipos ? [...new Set(tipos.flatMap((t) => basesPorTipo(dex, t, faixa, faixa[1])))] : basesPorTipo(dex, "todas", faixa, faixa[1]);
  const semRepetir = pool.filter((id) => evitar === undefined || formaNoNivel(dex, id, nivel, faixa[1]) !== evitar);
  const todas = semRepetir.length ? semRepetir : pool;
  const pesoTotal = todas.reduce((a, id) => a + 30 + dex.especies[id].c, 0);
  let r = r01 * pesoTotal;
  let id = todas[0] ?? 1;
  for (const x of todas) if ((r -= 30 + dex.especies[x].c) < 0) {
    id = x;
    break;
  }
  return formaNoNivel(dex, id, nivel, faixa[1]);
}

// ---------- trocar o selvagem ----------

// Antes do primeiro turno, o selvagem pode ser trocado por outro Pokémon da região, até 3
// vezes. A questão é a mesma: muda o bicho (para capturar outro), nunca o que se estuda.
export const MAX_TROCAS = 3;
export const podeTrocarSelvagem = (p: PartidaPoke) =>
  !p.fim && !p.oferta && !!p.atual && !p.atual.fim && p.atual.tipo === "selvagem" && !p.atual.turnos && (p.atual.trocas ?? 0) < MAX_TROCAS;

export function trocarSelvagem(dex: Dex, p: PartidaPoke): PartidaPoke {
  if (!podeTrocarSelvagem(p)) return p;
  const e = p.atual!;
  const [r, rng] = sortear(p.rng);
  const especie = selvagemDaRegiao(dex, regiaoDe(p.habitat ?? p.regiao).faixa, e.nivel, r, e.especie, p.modo === "safari" ? p.terreno : undefined);
  const chaves = p.chaves + 1;
  return {
    ...p,
    rng,
    chaves,
    atual: { ...e, especie, chave: chaves, hp: atributos(dex.especies[especie], e.nivel).hp, status: "", sono: 0, semente: false, trocas: (e.trocas ?? 0) + 1 },
  };
}

// ---------- XP, nível, golpes, evolução ----------

// Dá XP a um lutador e devolve os eventos de nível/golpe/evolução. Muta `l`. Com level cap,
// o XP para no começo do nível do cap (o time chega no líder no nível dele, não muito acima).
function ganharXp(dex: Dex, l: Lutador, valor: number, eventos: Evento[], ate: number, cap = MAX_NIVEL) {
  const antes = nivelDe(l);
  const hpAntes = hpMax(dex, l);
  const teto = xpDoNivel(Math.min(MAX_NIVEL, cap));
  if (l.xp >= teto) {
    eventos.push({ tipo: "cap", uid: l.uid, nivel: Math.min(MAX_NIVEL, cap) });
    return;
  }
  const real = Math.min(valor, teto - l.xp);
  l.xp += real;
  eventos.push({ tipo: "xp", uid: l.uid, valor: real });
  subiuPara(dex, l, antes, hpAntes, eventos, ate);
}

function subiuPara(dex: Dex, l: Lutador, antes: number, hpAntes: number, eventos: Evento[], ate: number) {
  const depois = nivelDe(l);
  if (depois <= antes) return;
  eventos.push({ tipo: "nivel", uid: l.uid, nivel: depois });
  for (const g of golpesNovos(dex.especies[l.id], antes, depois)) aprender(dex, l, g, eventos);
  const para = evolucaoPorNivel(dex.especies[l.id], depois, ate);
  if (para && dex.especies[para]) evoluir(dex, l, para, eventos);
  // Subir de nível aumenta o HP máximo; o HP atual sobe junto (como nos jogos).
  if (l.hp > 0) l.hp = Math.min(hpMax(dex, l), l.hp + (hpMax(dex, l) - hpAntes));
}

// Com menos de 4 golpes, aprende na hora. Com 4, como nos jogos, o jogador decide qual
// esquecer (ou não aprender): o golpe fica pendente em `partida.aprender`.
function aprender(_dex: Dex, l: Lutador, g: number, eventos: Evento[]) {
  if (l.golpes.includes(g)) return;
  if (l.golpes.length < MAX_GOLPES) {
    l.golpes = [...l.golpes, g];
    eventos.push({ tipo: "aprendeu", uid: l.uid, golpe: g, esqueceu: null });
    return;
  }
  eventos.push({ tipo: "querAprender", uid: l.uid, golpe: g });
}

function comPendentes(anteriores: PartidaPoke["aprender"], eventos: Evento[]): NonNullable<PartidaPoke["aprender"]> {
  const lista = [...(anteriores ?? [])];
  for (const e of eventos) if (e.tipo === "querAprender" && !lista.some((x) => x.uid === e.uid && x.golpe === e.golpe)) lista.push({ uid: e.uid, golpe: e.golpe });
  return lista;
}

// Resolve o primeiro golpe pendente: `esquecer` = golpe que sai (null = não aprender).
export function decidirGolpe(p: PartidaPoke, esquecer: number | null): { partida: PartidaPoke; eventos: Evento[] } {
  const [pend, ...resto] = p.aprender ?? [];
  if (!pend) return { partida: p, eventos: [] };
  const eventos: Evento[] = [];
  const time = p.time.map((l) => {
    if (l.uid !== pend.uid || l.golpes.includes(pend.golpe)) return l;
    if (l.golpes.length < MAX_GOLPES) {
      eventos.push({ tipo: "aprendeu", uid: l.uid, golpe: pend.golpe, esqueceu: null });
      return { ...l, golpes: [...l.golpes, pend.golpe] };
    }
    if (esquecer === null || !l.golpes.includes(esquecer)) return l;
    eventos.push({ tipo: "aprendeu", uid: l.uid, golpe: pend.golpe, esqueceu: esquecer });
    return { ...l, golpes: l.golpes.map((x) => (x === esquecer ? pend.golpe : x)) };
  });
  return { partida: { ...p, time, aprender: resto }, eventos };
}

// Golpes que o Pokémon pode ter (como o Relembrador de Golpes): tudo o que a espécie e as
// pré-evoluções aprendem por nível até o nível atual, mais os que ele já sabe.
export function golpesDisponiveis(dex: Dex, m: Mon): number[] {
  const nv = nivelDe(m);
  const set = new Set<number>(m.golpes);
  let id: number | undefined = m.id;
  for (let passo = 0; id && passo < 4; passo++) {
    const e: Especie | undefined = dex.especies[id];
    if (!e) break;
    for (const [g, lv] of e.g) if (lv <= nv && dex.golpes[g]) set.add(g);
    id = e.p;
  }
  return [...set];
}

export function definirGolpes(dex: Dex, perfil: PerfilPoke, uid: string, golpes: number[]): PerfilPoke {
  const m = perfil.colecao.find((x) => x.uid === uid);
  if (!m) return perfil;
  const ok = new Set(golpesDisponiveis(dex, m));
  const limpos = [...new Set(golpes)].filter((g) => ok.has(g)).slice(0, MAX_GOLPES);
  if (!limpos.length) return perfil;
  return { ...perfil, colecao: perfil.colecao.map((x) => (x.uid === uid ? { ...x, golpes: limpos } : x)) };
}

function evoluir(dex: Dex, l: Lutador, para: number, eventos: Evento[]) {
  const de = l.id;
  const hpAntes = hpMax(dex, l);
  l.id = para;
  eventos.push({ tipo: "evolui", uid: l.uid, de, para });
  // golpes que a forma nova aprende exatamente no nível atual
  const nv = nivelDe(l);
  for (const g of golpesNovos(dex.especies[para], nv - 1, nv)) aprender(dex, l, g, eventos);
  if (l.hp > 0) l.hp = Math.min(hpMax(dex, l), l.hp + (hpMax(dex, l) - hpAntes));
}

// ---------- turno ----------

export type Acao = { golpe: number } | { bola: Bola };

export interface OpcoesResposta {
  acertou: boolean;
  confianca: Confianca;
  acao: Acao;
}

const curar = (dex: Dex, l: Lutador, valor: number, motivo: Extract<Evento, { tipo: "cura" }>["motivo"], eventos: Evento[]) => {
  if (l.hp <= 0) return;
  const real = Math.min(Math.round(valor), hpMax(dex, l) - l.hp);
  if (real <= 0) return;
  l.hp += real;
  eventos.push({ tipo: "cura", uid: l.uid, valor: real, motivo });
};

// Captura: mais generosa que a dos jogos (a questão já foi vencida pela resposta certa), mas
// com a mesma lógica: HP baixo, status e bola melhor ajudam. Comum (taxa 45) com HP cheio e
// Poké Bola ≈ 30%; no vermelho ≈ 75%; dormindo, +15 pontos.
export function chanceCaptura(e: Especie, bola: Bola, confianca: Confianca, fracHp = 1, comStatus = false): number {
  const base = 0.25 + (0.5 * (1 - fracHp) + 0.3 * (e.c / 255)) * MULT_BOLA[bola] + (comStatus ? 0.15 : 0) + (confianca === "certeza" ? 0.05 : 0);
  return Math.min(1, base);
}

// Quanto do HP do inimigo um golpe tira. Parte da fórmula da 5ª geração (tipo, STAB,
// atributos, nível, crítico), normalizada para um golpe neutro de 50 de poder tirar ~60%:
// uns 2 acertos por Pokémon, 1 se for super efetivo com STAB.
export function danoDaResposta(opts: {
  dex: Dex;
  eu: Lutador;
  e: Encontro;
  golpe: Golpe;
  critico: boolean;
  aleatorio: number;
}): { valor: number; efetividade: number } {
  const { dex, eu, e, golpe, critico, aleatorio } = opts;
  const [, tipo, , classe] = golpe;
  const poder = poderDe(golpe);
  const minha = dex.especies[eu.id];
  const inimigo = dex.especies[e.especie];
  const max = atributos(inimigo, e.nivel).hp;
  const ef = efetividade(tipo, inimigo.t);
  if (poder <= 0 || classe === 2) return { valor: 0, efetividade: 1 };
  // Imune não zera: a resposta certa arranha (25%).
  if (ef === 0) return { valor: Math.max(1, Math.round(max * 0.25)), efetividade: 0 };
  const sa = atributos(minha, nivelDe(eu));
  const sd = atributos(inimigo, e.nivel);
  const a = classe === 0 ? sa.atk : sa.spa;
  const d = classe === 0 ? sd.def : sd.spd;
  const relacao = Math.min(1.4, Math.max(0.7, Math.sqrt((nivelDe(eu) * a) / (e.nivel * d))));
  const stab = minha.t.includes(tipo) ? 1.5 : 1;
  const lider = e.tipo === "lider" ? 0.7 : 1;
  const frac = 0.6 * Math.sqrt(poder / 50) * stab * ef * relacao * lider * (critico ? 1.5 : 1) * aleatorio;
  return { valor: Math.max(1, Math.round(frac * max)), efetividade: ef };
}

// Status que um golpe pode pôr no inimigo (null: o golpe não tem, ou o tipo é imune).
function statusDoGolpe(dex: Dex, g: Golpe, e: Encontro): { status: StatusGolpe; imune: boolean } | null {
  const cond = g[6];
  if (cond !== "leech-seed" && !STATUS_VALIDOS.includes(cond as Status)) return null;
  const status = cond as StatusGolpe;
  const t = dex.especies[e.especie].t;
  const imune =
    (status === "poison" && (t.includes(7) || t.includes(16))) ||
    (status === "burn" && t.includes(1)) ||
    (status === "freeze" && t.includes(5)) ||
    (status === "paralysis" && (t.includes(3) || efetividade(g[1], t) === 0)) ||
    (status === "leech-seed" && t.includes(4));
  return { status, imune };
}

export function responderPoke(dex: Dex, p: PartidaPoke, o: OpcoesResposta): { partida: PartidaPoke; eventos: Evento[] } {
  const e0 = p.atual;
  const eu0 = p.time[p.ativo];
  if (!e0 || e0.fim || p.fim || p.oferta || !eu0 || eu0.hp <= 0) return { partida: p, eventos: [] };
  // Ginásio e Liga não têm mato: a questão errada volta dentro da mesma luta (reserva).
  const semMato = p.modo === "ginasio" || p.modo === "liga";
  const e: Encontro = { ...e0 };
  const q: PartidaPoke = {
    ...p,
    atual: e,
    time: p.time.map((l) => ({ ...l, golpes: [...l.golpes] })),
    fila: [...p.fila],
    reserva: [...p.reserva],
    registros: [...p.registros],
    mochila: { ...p.mochila },
    novos: [...p.novos],
    vencidos: [...p.vencidos],
  };
  const eu = q.time[q.ativo];
  const eventos: Evento[] = [];
  let rng = q.rng;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };
  const inimigo = dex.especies[e.especie];
  const maxIni = atributos(inimigo, e.nivel).hp;
  const lider = e.tipo === "lider";
  const selvagem = e.tipo === "selvagem";
  const bola = "bola" in o.acao ? o.acao.bola : null;
  if (bola && (!selvagem || (q.mochila[bola] ?? 0) <= 0)) return { partida: p, eventos: [] };
  const questaoDaVez = e.questaoId;
  const retornoDaVez = e.retorno;
  const critico = o.acertou && o.confianca === "certeza";
  let multXp = critico ? 1.5 : 1;

  // XP só para quem lutou, no KO (como nos jogos; treinador ×1,5). Piso: o time evolui em
  // ~5 lutas de treinador; bônus (crítico, super efetivo) multiplicam o piso também.
  // Selvagem (derrubado ou capturado) vale metade: quem faz o time crescer é batalhar com
  // treinador.
  const darXp = () => {
    if (eu.hp <= 0) return;
    const piso = xpMinimoPorVitoria(dex, eu.id, nivelDe(eu)) * Math.max(1, multXp);
    const xp = Math.round(Math.max(xpDaVitoria(inimigo, e.nivel, nivelDe(eu), !selvagem) * multXp, piso) * (selvagem ? XP_SELVAGEM : 1));
    q.xp += xp;
    ganharXp(dex, eu, xp, eventos, limiteDaRegiao(q.regiao), q.cap);
  };
  const derrubar = () => {
    e.hp = 0;
    e.fim = "ko";
    eventos.push({ tipo: "desmaiouInimigo" });
    darXp();
  };

  // O inimigo ataca: forte no erro (a regra de sempre) e, se ele segue de pé depois de um
  // acerto, um revide mais fraco (metade do dano, teto de 25% do HP, sem a pena da certeza).
  const contraAtacar = (revide: boolean) => {
    // O inimigo pode estar sem conseguir agir.
    let preso = false;
    if (e.status === "sleep") {
      e.sono -= 1;
      if (e.sono <= 0) {
        e.status = "";
        eventos.push({ tipo: "inimigoAcordou", status: "sleep" });
      } else preso = true;
    } else if (e.status === "freeze") {
      if (rolar() < 0.2) {
        e.status = "";
        eventos.push({ tipo: "inimigoAcordou", status: "freeze" });
      } else preso = true;
    } else if (e.status === "paralysis" && rolar() < 0.25) preso = true;
    if (preso) eventos.push({ tipo: "inimigoImpedido", status: e.status || "paralysis" });
    else {
      // Contra-ataca com o golpe que mais machuca o meu Pokémon.
      const minha = dex.especies[eu.id];
      const golpesInimigo = golpesNoNivel(inimigo, e.nivel).filter((x) => dex.golpes[x][2] > 0 && dex.golpes[x][3] !== 2);
      const statsI = atributos(inimigo, e.nivel);
      const statsE = atributos(minha, nivelDe(eu));
      const escolher = (x: number) => dano({ golpe: dex.golpes[x], atacante: inimigo, nivel: e.nivel, atkStats: statsI, defensor: minha, defStats: statsE }).valor;
      const gi = golpesInimigo.length ? golpesInimigo.reduce((a, b) => (escolher(b) > escolher(a) ? b : a)) : -1;
      const golpeI = gi >= 0 ? dex.golpes[gi] : INVESTIDA;
      const crit = rolar() < 1 / 16;
      const d = dano({ golpe: golpeI, atacante: inimigo, nivel: e.nivel, atkStats: statsI, defensor: minha, defStats: statsE, critico: crit, aleatorio: 0.85 + rolar() * 0.15 });
      // Imunidade de tipo não livra do erro: a questão acerta "de raspão". Teto de 40% do HP
      // por golpe (antes da certeza e do líder): um erro só nunca encerra a partida.
      let valor = d.efetividade === 0 ? Math.max(1, Math.round(hpMax(dex, eu) * 0.1)) : Math.min(d.valor, Math.ceil(hpMax(dex, eu) * (revide ? 0.25 : 0.4)));
      valor = Math.round(valor * (revide ? 0.5 : o.confianca === "certeza" ? 1.5 : 1) * (lider ? 1.2 : 1) * (e.status === "burn" && golpeI[3] === 0 ? 0.5 : 1));
      const comFoco = eu.foco > 0;
      if (comFoco) {
        eu.foco -= 1;
        valor = Math.max(1, Math.round(valor / 2));
      }
      valor = Math.max(1, valor);
      eu.hp = Math.max(0, eu.hp - valor);
      eventos.push({ tipo: "contra", golpe: gi, dano: valor, efetividade: d.efetividade, critico: crit, foco: comFoco, ...(revide ? { revide } : {}) });
      const cond = golpeI[6] as Status;
      if (eu.hp > 0 && !eu.status && STATUS_VALIDOS.includes(cond) && rolar() * 100 < (golpeI[7] || 0) * (revide ? 0.5 : 1)) {
        eu.status = cond;
        if (cond === "sleep") eu.sono = 1 + Math.floor(rolar() * 3);
        eventos.push({ tipo: "status", uid: eu.uid, status: cond });
      }
    }
  };

  // Meu Pokémon dormindo/congelado (ou em 25% dos turnos paralisado) luta pela metade.
  let impedido = false;
  if (eu.status === "sleep") {
    eu.sono -= 1;
    if (eu.sono <= 0) {
      eu.status = "";
      eventos.push({ tipo: "acordou", uid: eu.uid, status: "sleep" });
    } else impedido = true;
  } else if (eu.status === "freeze") {
    if (rolar() < 0.3) {
      eu.status = "";
      eventos.push({ tipo: "acordou", uid: eu.uid, status: "freeze" });
    } else impedido = true;
  } else if (eu.status === "paralysis" && rolar() < 0.25) impedido = true;

  if (o.acertou) {
    q.combo += 1;
    if (bola) {
      q.mochila[bola] -= 1;
      const chance = chanceCaptura(inimigo, bola, o.confianca, e.hp / maxIni, e.status !== "" || e.semente);
      const sucesso = rolar() < chance;
      const balancos = sucesso ? 3 : Math.floor(rolar() * 3);
      if (sucesso) {
        e.fim = "captura";
        const novo = criarMon(dex, e.especie, e.nivel, `m${Date.parse(q.iniciadaEm).toString(36)}${q.registros.length}${Math.floor(rolar() * 1e6).toString(36)}`, {
          questaoId: questaoDaVez,
          capturadoEm: q.iniciadaEm,
          ...(q.regiao ? { regiao: q.regiao } : {}),
        });
        const paraPc = q.time.length >= MAX_TIME;
        if (paraPc) q.novos.push(novo);
        else q.time.push(lutador(dex, novo));
        eventos.push({ tipo: "bola", bola, sucesso, balancos, uid: novo.uid, paraPc });
        darXp();
      } else eventos.push({ tipo: "bola", bola, sucesso, balancos });
    } else {
      if (impedido) eventos.push({ tipo: "impedido", status: eu.status || "paralysis" });
      const idx = "golpe" in o.acao ? o.acao.golpe : eu.golpes[0];
      const g = dex.golpes[idx] ?? dex.golpes[0];
      const [, , , classe, dreno, cura] = g;
      if (poderDe(g) > 0 && classe !== 2) {
        const d = danoDaResposta({ dex, eu, e, golpe: g, critico, aleatorio: 0.85 + rolar() * 0.15 });
        const valor = impedido ? Math.max(1, Math.round(d.valor / 2)) : d.valor;
        const tirou = Math.min(e.hp, valor);
        e.hp -= tirou;
        if (d.efetividade >= 2) multXp *= 1.5;
        eventos.push({ tipo: "ataque", golpe: idx, efetividade: d.efetividade, critico, semEfeito: d.efetividade === 0, dano: tirou, hpInimigo: e.hp });
        if (dreno > 0) curar(dex, eu, Math.max(1, (tirou * dreno) / 100), "dreno", eventos);
        // efeito secundário (Ember queima 10%, Thunderbolt paralisa 10%...)
        const st = statusDoGolpe(dex, g, e);
        if (e.hp > 0 && st && !st.imune && rolar() * 100 < g[7]) aplicarStatusInimigo(e, st.status, rolar, eventos);
        if (e.hp <= 0) derrubar();
      } else {
        eventos.push({ tipo: "ataque", golpe: idx, efetividade: 1, critico: false, semEfeito: false, dano: 0, hpInimigo: e.hp });
        const st = statusDoGolpe(dex, g, e);
        if (st) {
          if (st.imune) eventos.push({ tipo: "statusFalhou", status: st.status, motivo: "imune" });
          else if (st.status === "leech-seed" ? e.semente : e.status !== "") eventos.push({ tipo: "statusFalhou", status: st.status, motivo: "ja" });
          else aplicarStatusInimigo(e, st.status, rolar, eventos);
        } else if (cura > 0) curar(dex, eu, (hpMax(dex, eu) * cura) / 100, "cura", eventos);
        else {
          eu.foco += 1;
          eventos.push({ tipo: "foco", uid: eu.uid });
        }
      }
    }
    if (q.combo % 3 === 0) curar(dex, eu, hpMax(dex, eu) * 0.1, "combo", eventos);
    // Inimigo de pé revida (a bola que pegou encerra a luta antes).
    if (!e.fim && e.hp > 0) contraAtacar(true);
  } else {
    q.combo = 0;
    eventos.push({ tipo: "errou" });
    contraAtacar(false);
    // A questão errada volta uma vez: selvagem mais adiante (ou na reserva, contra o chefe e
    // em ginásio/Liga). Errou de novo, fica para a revisão espaçada.
    if (!retornoDaVez) {
      if (lider || semMato) q.reserva.splice(Math.min(2, q.reserva.length), 0, { questaoId: questaoDaVez, retorno: true });
      else {
        const retorno: Encontro = {
          ...e,
          questaoId: questaoDaVez,
          retorno: true,
          tipo: "selvagem",
          treinador: -1,
          chave: ++q.chaves,
          hp: maxIni,
          status: "",
          sono: 0,
          semente: false,
          turnos: 0,
          fim: undefined,
        };
        const temLider = q.fila[q.fila.length - 1]?.tipo === "lider";
        const limite = q.fila.length - (temLider ? 1 : 0);
        // não corta um treinador no meio: vai para depois do grupo em que cair
        let pos = Math.min(DISTANCIA_RETORNO, limite);
        while (pos > 0 && pos < limite && q.fila[pos].treinador >= 0 && q.fila[pos].treinador === q.fila[pos - 1].treinador) pos++;
        if (e.treinador >= 0) while (pos < limite && q.fila[pos]?.treinador === e.treinador) pos++;
        q.fila.splice(pos, 0, retorno);
      }
      eventos.push({ tipo: "voltaDepois", selvagem: !lider && !semMato });
    }
  }

  // fim do turno: veneno, queimadura e Leech Seed no inimigo
  if (!e.fim && e.hp > 0) {
    const tique = (status: StatusGolpe) => {
      const t = Math.max(1, Math.floor(maxIni / 8));
      const tirou = Math.min(e.hp, t);
      e.hp -= tirou;
      eventos.push({ tipo: "tiqueInimigo", status, dano: tirou, hpInimigo: e.hp });
      if (status === "leech-seed") curar(dex, eu, tirou, "semente", eventos);
    };
    if (e.status === "poison" || e.status === "burn") tique(e.status);
    if (e.hp > 0 && e.semente) tique("leech-seed");
    if (e.hp <= 0) derrubar();
  }
  // e no meu
  if (eu.hp > 0 && (eu.status === "poison" || eu.status === "burn")) {
    const t = Math.max(1, Math.floor(hpMax(dex, eu) / (eu.status === "poison" ? 8 : 16)));
    eu.hp = Math.max(0, eu.hp - t);
    eventos.push({ tipo: "tique", uid: eu.uid, dano: t, status: eu.status });
  }
  if (eu.hp <= 0) {
    eu.status = "";
    eu.foco = 0;
    eventos.push({ tipo: "desmaiou", uid: eu.uid });
    if (!q.time.some((l) => l.hp > 0)) {
      q.fim = "derrota";
      eventos.push({ tipo: "derrota" });
    }
  }

  // O inimigo segue de pé: a próxima questão vem da reserva. Sem reserva (ou na 3ª questão
  // contra ele), acabou a luta: desmaia de cansaço se eu acertei com golpe. Se eu errei (ou
  // ele escapou da bola), o selvagem foge; Pokémon de treinador não foge: volta uma questão
  // já feita nesta partida (a mais antiga, recuperação espaçada dentro da própria luta).
  e.turnos = (e.turnos ?? 0) + 1;
  if (!e.fim && !q.fim) {
    let prox = e.turnos >= MAX_TURNOS_POKEMON && o.acertou ? undefined : q.reserva.shift();
    if (!prox && !selvagem && !(o.acertou && !bola)) {
      const vezes = new Map<number, number>();
      for (const r of q.registros) vezes.set(r.questaoId, (vezes.get(r.questaoId) ?? 0) + 1);
      vezes.set(questaoDaVez, (vezes.get(questaoDaVez) ?? 0) + 1);
      const [id] = [...vezes.entries()].filter(([x]) => x !== questaoDaVez).sort((a, b) => a[1] - b[1])[0] ?? [questaoDaVez];
      prox = { questaoId: id, retorno: true };
    }
    if (prox) {
      e.questaoId = prox.questaoId;
      e.retorno = prox.retorno;
    } else if (o.acertou && !bola) {
      eventos.push({ tipo: "exausto" });
      derrubar();
    } else {
      e.fim = "fuga";
      eventos.push({ tipo: "fuga" });
    }
  }

  // o treinador ficou sem Pokémon?
  if (e.treinador >= 0 && !q.fim && e.fim && e.fim !== "fuga" && !q.fila.some((x) => x.treinador === e.treinador) && !q.vencidos.includes(e.treinador)) {
    q.vencidos.push(e.treinador);
    q.recompensa = true; // avancarPoke só oferece se ainda houver luta pela frente
    const insignia = q.treinadores[e.treinador]?.insignia;
    eventos.push({ tipo: "treinadorVencido", treinador: e.treinador, lider: q.treinadores[e.treinador]?.lider ?? lider, ...(insignia !== undefined ? { insignia } : {}) });
  }

  q.aprender = comPendentes(p.aprender, eventos);
  q.registros.push({ questaoId: questaoDaVez, acertou: o.acertou, confianca: o.confianca, retorno: retornoDaVez, chefe: lider, capturada: e.fim === "captura" });
  q.rng = rng;
  return { partida: q, eventos };
}

function aplicarStatusInimigo(e: Encontro, status: StatusGolpe, rolar: () => number, eventos: Evento[]) {
  if (status === "leech-seed") {
    if (e.semente) return;
    e.semente = true;
  } else {
    if (e.status) return;
    e.status = status;
    if (status === "sleep") e.sono = 1 + Math.floor(rolar() * 3);
  }
  eventos.push({ tipo: "statusInimigo", status });
}

// A questão da vez sumiu do acervo: passa para a próxima da reserva (ou encerra a luta com
// esse Pokémon, sem XP). Não grava nada.
export function pularQuestao(p: PartidaPoke): PartidaPoke {
  if (!p.atual || p.atual.fim) return p;
  const reserva = [...p.reserva];
  const prox = reserva.shift();
  return prox ? { ...p, reserva, atual: { ...p.atual, questaoId: prox.questaoId, retorno: prox.retorno } } : { ...p, atual: { ...p.atual, fim: "fuga" } };
}

// Próximo encontro, ou a recompensa de quem acabou de vencer um treinador.
export function avancarPoke(p: PartidaPoke, dex?: Dex): PartidaPoke {
  if (p.fim || p.oferta) return p;
  if (p.atual && !p.atual.fim) return p; // a luta com esse Pokémon continua
  if (p.recompensa && p.fila.length > 0) return sortearOferta({ ...p, recompensa: false, atual: null }, dex);
  const q: PartidaPoke = { ...p, fila: [...p.fila], recompensa: false };
  const prox = q.fila.shift() ?? null;
  q.atual = prox;
  if (!prox) q.fim = "vitoria";
  return q;
}

export const precisaTrocar = (p: PartidaPoke) => !p.fim && (p.time[p.ativo]?.hp ?? 0) <= 0 && p.time.some((l) => l.hp > 0);

export function trocar(p: PartidaPoke, idx: number): PartidaPoke {
  if (p.fim || idx === p.ativo || !p.time[idx] || p.time[idx].hp <= 0) return p;
  return { ...p, ativo: idx };
}

// ---------- itens ----------

const POOL_OFERTA: [string, number][] = [
  ["potion", 5],
  ["super-potion", 4],
  ["hyper-potion", 1],
  ["poke-ball", 5],
  ["great-ball", 3],
  ["ultra-ball", 1],
  ["full-heal", 2],
  ["revive", 2],
  ["rare-candy", 2],
  ["pedra", 2],
];

export function sortearOferta(p: PartidaPoke, dex?: Dex): PartidaPoke {
  let rng = p.rng;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };
  // Pedra útil para o time, se houver; senão qualquer uma.
  const uteis = dex ? PEDRAS.filter((s) => p.time.some((l) => evolucaoPorPedra(dex.especies[l.id], s, limiteDaRegiao(p.regiao)))) : [];
  const escolhidas: string[] = [];
  // Com alguém desmaiado ou HP baixo, sempre há algo que ajude.
  const ferido = p.time.some((l) => l.hp <= 0);
  if (ferido) escolhidas.push("revive");
  const total = POOL_OFERTA.reduce((a, [, w]) => a + w, 0);
  for (let t = 0; escolhidas.length < 3 && t < 50; t++) {
    let r = rolar() * total;
    let item = POOL_OFERTA[0][0];
    for (const [nome, w] of POOL_OFERTA) {
      if ((r -= w) < 0) {
        item = nome;
        break;
      }
    }
    if (item === "pedra") item = (uteis.length ? uteis : PEDRAS)[Math.floor(rolar() * (uteis.length || PEDRAS.length))];
    if (!escolhidas.includes(item)) escolhidas.push(item);
  }
  return { ...p, oferta: escolhidas, rng };
}

export function escolherOferta(p: PartidaPoke, item: string, dex?: Dex): PartidaPoke {
  if (!p.oferta?.includes(item)) return p;
  const q: PartidaPoke = { ...p, oferta: null, mochila: { ...p.mochila, [item]: (p.mochila[item] ?? 0) + 1 } };
  return avancarPoke(q, dex);
}

export const CURA_ITEM: Record<string, number> = { potion: 20, "super-potion": 60, "hyper-potion": 200 };

// Usar item (fora a bola, que é ação de turno). Não gasta turno: o inimigo só age no erro.
export function podeUsar(dex: Dex, l: Lutador, item: string, ate = Infinity, cap = MAX_NIVEL): boolean {
  if (item in CURA_ITEM) return l.hp > 0 && l.hp < hpMax(dex, l);
  if (item === "revive") return l.hp <= 0;
  if (item === "full-heal") return l.hp > 0 && l.status !== "";
  if (item === "rare-candy") return nivelDe(l) < Math.min(MAX_NIVEL, cap);
  if (PEDRAS.includes(item)) return evolucaoPorPedra(dex.especies[l.id], item, ate) !== null;
  return false;
}

export function usarItem(dex: Dex, p: PartidaPoke, item: string, alvo: number): { partida: PartidaPoke; eventos: Evento[] } {
  const l0 = p.time[alvo];
  if (!l0 || p.fim || (p.mochila[item] ?? 0) <= 0 || !podeUsar(dex, l0, item, limiteDaRegiao(p.regiao), p.cap)) return { partida: p, eventos: [] };
  const q: PartidaPoke = { ...p, time: p.time.map((l) => ({ ...l, golpes: [...l.golpes] })), mochila: { ...p.mochila, [item]: p.mochila[item] - 1 } };
  const l = q.time[alvo];
  const eventos: Evento[] = [];
  if (item in CURA_ITEM) curar(dex, l, CURA_ITEM[item], "item", eventos);
  else if (item === "revive") {
    l.hp = Math.max(1, Math.floor(hpMax(dex, l) / 2));
    eventos.push({ tipo: "cura", uid: l.uid, valor: l.hp, motivo: "item" });
  } else if (item === "full-heal") {
    eventos.push({ tipo: "acordou", uid: l.uid, status: l.status });
    l.status = "";
    l.sono = 0;
  } else if (item === "rare-candy") {
    const antes = nivelDe(l);
    const hpAntes = hpMax(dex, l);
    l.xp = Math.max(l.xp, xpDoNivel(antes + 1));
    subiuPara(dex, l, antes, hpAntes, eventos, limiteDaRegiao(p.regiao));
  } else {
    const para = evolucaoPorPedra(dex.especies[l.id], item, limiteDaRegiao(p.regiao));
    if (para) evoluir(dex, l, para, eventos);
  }
  q.aprender = comPendentes(p.aprender, eventos);
  return { partida: q, eventos };
}

// Lição escrita depois de um erro: cura 25% do Pokémon ativo (ou do primeiro de pé), uma
// vez por questão.
export function registrarLicaoPoke(dex: Dex, p: PartidaPoke, questaoId: number, texto: string): { partida: PartidaPoke; curou: number } {
  const limpo = texto.trim();
  if (limpo.length < MIN_LICAO || p.fim === "derrota") return { partida: p, curou: 0 };
  const nova = !p.licoes[questaoId];
  const q: PartidaPoke = { ...p, licoes: { ...p.licoes, [questaoId]: limpo }, time: p.time.map((l) => ({ ...l })) };
  if (!nova) return { partida: q, curou: 0 };
  const idx = q.time[q.ativo].hp > 0 ? q.ativo : q.time.findIndex((l) => l.hp > 0);
  if (idx < 0) return { partida: q, curou: 0 };
  const ev: Evento[] = [];
  curar(dex, q.time[idx], hpMax(dex, q.time[idx]) * 0.25, "licao", ev);
  return { partida: q, curou: ev.length ? (ev[0] as Extract<Evento, { tipo: "cura" }>).valor : 0 };
}

export function fugirPoke(p: PartidaPoke): PartidaPoke {
  return p.fim ? p : { ...p, fim: "fuga", oferta: null };
}

// ---------- perfil ----------

export interface PerfilPoke {
  versao: 1;
  colecao: Mon[];
  time: string[]; // uids, até 6
  mochila: Record<string, number>;
  insignias: number;
  partidas: number;
  vitorias: number;
  vistos: number[];
  capturadasQuestoes: number[];
  ultimaContada?: string;
  ginasios?: number; // insígnias de Kanto (0–8), de antes das regiões; vale se `insigniasPorRegiao` não tiver
  campeao?: number; // vezes que venceu uma Liga (qualquer região)
  hallDaFama?: { data: string; regiao?: number; time: { id: number; nivel: number }[] }[];
  regiao?: number; // região da jornada atual (ausente = Kanto)
  insigniasPorRegiao?: number[]; // insígnias (0–8) em cada região
  campeaoPorRegiao?: number[]; // vezes que venceu a Liga de cada região
  criadoEm?: string; // ISO; comparado com Usuario.pokeResetAt
}

export const regiaoAtual = (perfil: PerfilPoke) => (REGIOES[perfil.regiao ?? 0] ? (perfil.regiao ?? 0) : 0);
export function insigniasDe(perfil: PerfilPoke, r = regiaoAtual(perfil)): number {
  const n = perfil.insigniasPorRegiao?.[r] ?? (r === 0 ? (perfil.ginasios ?? 0) : 0);
  return Math.min(REGIOES[r].ginasios.length, n);
}
export const ligaLiberada = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => insigniasDe(perfil, r) >= REGIOES[r].ginasios.length;
// Antes das regiões, toda Liga vencida era a de Kanto.
export const campeaoDe = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => perfil.campeaoPorRegiao?.[r] ?? (r === 0 ? (perfil.campeao ?? 0) : 0);
export const proximaRegiao = (perfil: PerfilPoke): number | null => {
  const r = regiaoAtual(perfil);
  return campeaoDe(perfil, r) > 0 && REGIOES[r + 1] ? r + 1 : null;
};

// Level cap: o nível do próximo líder de ginásio da região (o ás dele chega nesse nível);
// com as 8 insígnias, o do Campeão; sendo Campeão da região, sem cap.
export function levelCap(perfil: PerfilPoke): number {
  const r = regiaoAtual(perfil);
  if (campeaoDe(perfil, r) > 0) return MAX_NIVEL;
  const reg = REGIOES[r];
  return reg.ginasios[insigniasDe(perfil, r)]?.piso ?? reg.campeao.piso;
}

// Numa região nova só luta quem entrou para a coleção nela (o inicial escolhido e as capturas);
// o time das regiões anteriores fica no PC. Sendo Campeão da região, todos voltam a lutar.
export const podeLutar = (perfil: PerfilPoke, m: Mon) => (m.regiao ?? 0) === regiaoAtual(perfil) || campeaoDe(perfil) > 0;

// Viagem para a próxima região: o inicial escolhido (nível 5) vira o time inteiro; todo o
// resto vai para o PC. Mochila, Pokédex e Hall da Fama seguem junto.
export function viajar(dex: Dex, perfil: PerfilPoke, inicial: number, uid = `m${Date.now().toString(36)}`): PerfilPoke {
  const r = proximaRegiao(perfil);
  if (r === null || !REGIOES[r].iniciais.includes(inicial) || !dex.especies[inicial]) return perfil;
  const m = criarMon(dex, inicial, 5, uid, { regiao: r });
  const vistos = new Set(perfil.vistos).add(inicial);
  return { ...perfil, regiao: r, colecao: [...perfil.colecao, m], time: [m.uid], vistos: [...vistos] };
}
const semSafari = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== "safari-ball"));

export const MOCHILA_INICIAL: Record<string, number> = { "poke-ball": 5, potion: 3 };

export function perfilInicial(dex: Dex, inicial: number, uid = `m${Date.now().toString(36)}`): PerfilPoke {
  const m = criarMon(dex, inicial, 5, uid);
  return { versao: 1, colecao: [m], time: [m.uid], mochila: { ...MOCHILA_INICIAL }, insignias: 0, partidas: 0, vitorias: 0, vistos: [inicial], capturadasQuestoes: [], criadoEm: new Date().toISOString() };
}

const soMon = ({ uid, id, xp, golpes, questaoId, capturadoEm, regiao }: Mon): Mon => ({
  uid,
  id,
  xp,
  golpes,
  ...(questaoId ? { questaoId } : {}),
  ...(capturadoEm ? { capturadoEm } : {}),
  ...(regiao ? { regiao } : {}),
});

// Leva o que aconteceu na partida para o perfil: níveis, golpes, evoluções, capturas e a
// mochila. Idempotente (pode rodar a cada turno). Estatísticas só somam uma vez, no fim.
export function sincronizarPerfil(perfil: PerfilPoke, p: PartidaPoke): PerfilPoke {
  const porUid = new Map(perfil.colecao.map((m) => [m.uid, m]));
  for (const l of [...p.time, ...p.novos]) porUid.set(l.uid, soMon(l));
  const colecao = [...porUid.values()];
  const vistos = new Set(perfil.vistos);
  if (p.atual) vistos.add(p.atual.especie);
  for (const l of [...p.time, ...p.novos]) vistos.add(l.id);
  const capt = new Set(perfil.capturadasQuestoes);
  for (const m of [...p.time, ...p.novos]) if (m.questaoId) capt.add(m.questaoId);
  const novo: PerfilPoke = {
    ...perfil,
    colecao,
    time: p.time.map((l) => l.uid),
    mochila: semSafari(p.mochila),
    vistos: [...vistos],
    capturadasQuestoes: [...capt],
  };
  if (p.fim && perfil.ultimaContada !== p.iniciadaEm) {
    novo.partidas += 1;
    if (p.fim === "vitoria") {
      novo.vitorias += 1;
      const venceu = (f: (t: Treinador) => boolean) => p.treinadores.some((t, i) => f(t) && p.vencidos.includes(i));
      const r = REGIOES[p.regiao ?? 0] ? (p.regiao ?? 0) : 0;
      if (p.modo === "ginasio" && p.ginasio !== undefined && venceu((t) => t.insignia === p.ginasio)) {
        const lista = REGIOES.map((_, i) => insigniasDe(novo, i));
        lista[r] = Math.max(lista[r], p.ginasio + 1);
        novo.insigniasPorRegiao = lista;
        if (r === 0) novo.ginasios = lista[0];
      }
      if (p.modo === "liga" && venceu((t) => !!t.campeao)) {
        const lista = REGIOES.map((_, i) => campeaoDe(novo, i));
        lista[r] += 1;
        novo.campeaoPorRegiao = lista;
        novo.campeao = (novo.campeao ?? 0) + 1;
        novo.hallDaFama = [...(novo.hallDaFama ?? []), { data: p.iniciadaEm, regiao: r, time: p.time.map((l) => ({ id: l.id, nivel: nivelDe(l) })) }].slice(-20);
      }
    }
    novo.ultimaContada = p.iniciadaEm;
  }
  return novo;
}
