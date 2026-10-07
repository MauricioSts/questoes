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
// - XP como nos jogos: fórmula da 5ª geração com o XP base real de cada espécie e a curva de
//   crescimento dela (somarXp em dex.ts). Exp. Share (segurado) e Exp. All (item-chave) dão
//   metade a quem não lutou; o level cap segura todo mundo.
// - Itens segurados e frutas (catálogo em itens.ts) agem sozinhos na luta: reforço de tipo,
//   Restos, Faixa do Foco, frutas de HP/status/resistência...
// - A jornada tem modos: Caminho (modo história, com selvagens no meio), Ginásio (8 líderes de Kanto,
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
  ateParaEvoluir,
  evolucaoPorNivel,
  evolucaoPorPedra,
  formaNoNivel,
  golpesNoNivel,
  golpesNovos,
  nivelDoXpPoke,
  somarXp,
  xpDaVitoria,
  xpDoNivel,
  type Dex,
  type Especie,
  type Golpe,
  ULTIMO_DA_JORNADA,
} from "./dex";
import { indiceDaRota, sortearSelvagem, trechoDe, TRECHO_VITORIA, type Rota } from "./rotas";
import { EQUIPES, INSIGNIAS_RASTRO, TURNOS_LENDA, lendaPorId, type Lenda } from "./lendas";
import { CURA_ITEM, CURA_STATUS, FRUTA_HP, FRUTA_RESISTE, FRUTA_STATUS, ITENS, PREMIO_CHAVE, REFORCO_DO_TIPO, REFORCO_TIPO, REVIVER, lojaDe, seguravel } from "./itens";

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
  item?: string; // item segurado (itens.ts, categoria segurar ou fruta)
}

export interface Lutador extends Mon {
  hp: number;
  status: Status;
  sono: number; // turnos de sono restantes
  foco: number; // próximos contra-ataques pela metade
}

export type TipoEncontro = "treinador" | "selvagem" | "lider";
export type ModoJornada = "rota" | "ginasio" | "safari" | "liga" | "lendario";

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
  participantes?: string[]; // uids dos meus que estiveram em campo contra ele (dividem o XP)
  rota?: number; // modo história: índice da rota do trecho onde ele aparece (rotas.ts)
  lendario?: boolean; // a lenda do Rastro Lendário: selvagem que luta como chefe e não desmaia
  curas?: number; // vezes que o treinador usou item de cura nele (cada uma rende mais um turno)
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
  dupla?: boolean; // batalha dupla: lança dois Pokémon de uma vez
  admin?: boolean; // Rastro Lendário: o chefe da equipe vilã no caminho da lenda
  total?: number; // Pokémon que ele tinha ao começar a partida
  itens?: string[]; // bolsa de cura que ainda resta (Potion, Super Potion, Full Restore...)
  fala?: string;
}

export type Bola =
  | "poke-ball"
  | "great-ball"
  | "ultra-ball"
  | "safari-ball"
  | "net-ball"
  | "nest-ball"
  | "quick-ball"
  | "timer-ball"
  | "dusk-ball"
  | "repeat-ball"
  | "premier-ball"
  | "master-ball";
export const BOLAS: Bola[] = ["safari-ball", "poke-ball", "great-ball", "ultra-ball", "net-ball", "nest-ball", "quick-ball", "timer-ball", "dusk-ball", "repeat-ball", "premier-ball", "master-ball"];
// Multiplicador da bola (regras da 5ª geração). `turnos`: questões já respondidas contra ele;
// `jaTem`: a espécie já está na coleção (Bola Repetida).
export function multBola(bola: Bola, e: Especie, ctx: { nivel?: number; turnos?: number; jaTem?: boolean } = {}): number {
  switch (bola) {
    case "great-ball":
    case "safari-ball":
      return 1.5;
    case "ultra-ball":
      return 2;
    case "net-ball":
      return e.t.includes(2) || e.t.includes(11) ? 3 : 1;
    case "nest-ball":
      return Math.min(4, Math.max(1, (41 - (ctx.nivel ?? 40)) / 10));
    case "quick-ball":
      return (ctx.turnos ?? 0) === 0 ? 5 : 1;
    case "timer-ball":
      return Math.min(4, 1 + (ctx.turnos ?? 0) * 0.3);
    case "dusk-ball":
      return e.t.includes(13) || e.t.includes(15) ? 3.5 : 1;
    case "repeat-ball":
      return ctx.jaTem ? 3 : 1;
    case "master-ball":
      return Infinity;
    default:
      return 1;
  }
}
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
  time: number[]; // o time do líder nos jogos (o último é o ás)
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
      { lider: "Brock", sprite: "brock", tipo: 12, insignia: "Insígnia Rocha", cidade: "Pewter", piso: 12, ajudantes: ["hiker", "camper"], time: [74, 95] },
      { lider: "Misty", sprite: "misty", tipo: 2, insignia: "Insígnia Cascata", cidade: "Cerulean", piso: 18, ajudantes: ["swimmer", "sailor"], time: [120, 121] },
      { lider: "Lt. Surge", sprite: "ltsurge", tipo: 3, insignia: "Insígnia Trovão", cidade: "Vermilion", piso: 24, ajudantes: ["sailor", "guitarist"], time: [100, 25, 26] },
      { lider: "Erika", sprite: "erika", tipo: 4, insignia: "Insígnia Arco-Íris", cidade: "Celadon", piso: 29, ajudantes: ["beauty", "lass"], time: [71, 114, 45] },
      { lider: "Koga", sprite: "koga", tipo: 7, insignia: "Insígnia Alma", cidade: "Fuchsia", piso: 37, ajudantes: ["juggler", "burglar"], time: [109, 89, 109, 110] },
      { lider: "Sabrina", sprite: "sabrina", tipo: 10, insignia: "Insígnia Pântano", cidade: "Saffron", piso: 43, ajudantes: ["psychic", "psychicf"], time: [64, 122, 49, 65] },
      { lider: "Blaine", sprite: "blaine", tipo: 1, insignia: "Insígnia Vulcão", cidade: "Cinnabar", piso: 47, ajudantes: ["burglar", "scientist"], time: [58, 77, 78, 59] },
      { lider: "Giovanni", sprite: "giovanni", tipo: 8, insignia: "Insígnia Terra", cidade: "Viridian", piso: 50, ajudantes: ["blackbelt", "acetrainer"], time: [111, 51, 31, 34, 112] },
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
      { lider: "Falkner", sprite: "falkner", tipo: 9, insignia: "Insígnia Zéfiro", cidade: "Violet", piso: 10, ajudantes: ["birdkeeper", "youngster"], time: [16, 17] },
      { lider: "Bugsy", sprite: "bugsy", tipo: 11, insignia: "Insígnia Colmeia", cidade: "Azalea", piso: 16, ajudantes: ["bugcatcher", "camper"], time: [11, 14, 123] },
      { lider: "Whitney", sprite: "whitney", tipo: 0, insignia: "Insígnia Planície", cidade: "Goldenrod", piso: 20, ajudantes: ["lass", "beauty"], time: [35, 241] },
      { lider: "Morty", sprite: "morty", tipo: 13, insignia: "Insígnia Névoa", cidade: "Ecruteak", piso: 25, ajudantes: ["psychic", "psychicf"], time: [92, 93, 93, 94] },
      { lider: "Chuck", sprite: "chuck", tipo: 6, insignia: "Insígnia Tempestade", cidade: "Cianwood", piso: 30, ajudantes: ["blackbelt", "veteran"], time: [57, 62] },
      { lider: "Jasmine", sprite: "jasmine", tipo: 16, insignia: "Insígnia Mineral", cidade: "Olivine", piso: 35, ajudantes: ["sailor", "gentleman"], time: [81, 81, 208] },
      { lider: "Pryce", sprite: "pryce", tipo: 5, insignia: "Insígnia Glacial", cidade: "Mahogany", piso: 34, ajudantes: ["skier", "boarder"], time: [86, 87, 221] },
      { lider: "Clair", sprite: "clair", tipo: 14, insignia: "Insígnia Ascensão", cidade: "Blackthorn", piso: 41, ajudantes: ["acetrainer", "acetrainerf"], time: [148, 148, 148, 230] },
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
      { lider: "Roxanne", sprite: "roxanne", tipo: 12, insignia: "Insígnia Pedra", cidade: "Rustboro", piso: 15, ajudantes: ["hiker", "schoolkidf"], time: [74, 74, 299] },
      { lider: "Brawly", sprite: "brawly", tipo: 6, insignia: "Insígnia Punho", cidade: "Dewford", piso: 19, ajudantes: ["blackbelt", "swimmer"], time: [66, 307, 296] },
      { lider: "Wattson", sprite: "wattson", tipo: 3, insignia: "Insígnia Dínamo", cidade: "Mauville", piso: 24, ajudantes: ["guitarist", "worker"], time: [100, 309, 82, 310] },
      { lider: "Flannery", sprite: "flannery", tipo: 1, insignia: "Insígnia Calor", cidade: "Lavaridge", piso: 29, ajudantes: ["hiker", "burglar"], time: [218, 218, 324] },
      { lider: "Norman", sprite: "norman", tipo: 0, insignia: "Insígnia Equilíbrio", cidade: "Petalburg", piso: 31, ajudantes: ["acetrainer", "acetrainerf"], time: [327, 288, 264, 289] },
      { lider: "Winona", sprite: "winona", tipo: 9, insignia: "Insígnia Pena", cidade: "Fortree", piso: 33, ajudantes: ["birdkeeper", "pilot"], time: [277, 279, 227, 334] },
      { lider: "Tate", sprite: "tate", tipo: 10, insignia: "Insígnia Mente", cidade: "Mossdeep", piso: 42, ajudantes: ["psychic", "psychicf"], time: [344, 178, 337, 338] },
      { lider: "Juan", sprite: "juan", tipo: 2, insignia: "Insígnia Chuva", cidade: "Sootopolis", piso: 46, ajudantes: ["swimmerf", "sailor"], time: [370, 340, 364, 342, 230] },
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
      { lider: "Roark", sprite: "roark", tipo: 12, insignia: "Insígnia Carvão", cidade: "Oreburgh", piso: 14, ajudantes: ["worker", "hiker"], time: [74, 95, 408] },
      { lider: "Gardenia", sprite: "gardenia", tipo: 4, insignia: "Insígnia Floresta", cidade: "Eterna", piso: 22, ajudantes: ["lass", "camper"], time: [420, 387, 407] },
      { lider: "Maylene", sprite: "maylene", tipo: 6, insignia: "Insígnia Paralelepípedo", cidade: "Veilstone", piso: 30, ajudantes: ["blackbelt", "veteran"], time: [307, 67, 448] },
      { lider: "Crasher Wake", sprite: "crasherwake", tipo: 2, insignia: "Insígnia Pântano", cidade: "Pastoria", piso: 32, ajudantes: ["fisherman", "swimmerf"], time: [130, 195, 419] },
      { lider: "Fantina", sprite: "fantina", tipo: 13, insignia: "Insígnia Relíquia", cidade: "Hearthome", piso: 36, ajudantes: ["psychicf", "beauty"], time: [426, 94, 429] },
      { lider: "Byron", sprite: "byron", tipo: 16, insignia: "Insígnia Mina", cidade: "Canalave", piso: 39, ajudantes: ["worker", "gentleman"], time: [436, 208, 411] },
      { lider: "Candice", sprite: "candice", tipo: 5, insignia: "Insígnia Pingente", cidade: "Snowpoint", piso: 42, ajudantes: ["skier", "acetrainerf"], time: [215, 221, 308, 460] },
      { lider: "Volkner", sprite: "volkner", tipo: 3, insignia: "Insígnia Farol", cidade: "Sunyshore", piso: 49, ajudantes: ["guitarist", "scientist"], time: [135, 26, 405, 466] },
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
      { lider: "Cilan", sprite: "cilan", tipo: 4, insignia: "Insígnia Trio", cidade: "Striaton", piso: 14, ajudantes: ["waitress", "youngster"], time: [506, 511] },
      { lider: "Lenora", sprite: "lenora", tipo: 0, insignia: "Insígnia Básica", cidade: "Nacrene", piso: 20, ajudantes: ["schoolkidf", "teacher"], time: [507, 505] },
      { lider: "Burgh", sprite: "burgh", tipo: 11, insignia: "Insígnia Inseto", cidade: "Castelia", piso: 23, ajudantes: ["bugcatcher", "artist"], time: [544, 557, 542] },
      { lider: "Elesa", sprite: "elesa", tipo: 3, insignia: "Insígnia Raio", cidade: "Nimbasa", piso: 27, ajudantes: ["beauty", "guitarist"], time: [587, 587, 523] },
      { lider: "Clay", sprite: "clay", tipo: 8, insignia: "Insígnia Tremor", cidade: "Driftveil", piso: 31, ajudantes: ["worker", "hiker"], time: [552, 536, 530] },
      { lider: "Skyla", sprite: "skyla", tipo: 9, insignia: "Insígnia Jato", cidade: "Mistralton", piso: 35, ajudantes: ["pilot", "birdkeeper"], time: [528, 521, 581] },
      { lider: "Brycen", sprite: "brycen", tipo: 5, insignia: "Insígnia Congelada", cidade: "Icirrus", piso: 39, ajudantes: ["skier", "blackbelt"], time: [583, 615, 614] },
      { lider: "Drayden", sprite: "drayden", tipo: 14, insignia: "Insígnia Lenda", cidade: "Opelucid", piso: 43, ajudantes: ["acetrainer", "veteran"], time: [611, 621, 612] },
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
  lenda?: number; // modo lendario: a espécie lendária no fim do rastro (lendas.ts)
  rumo?: number; // modo rota (história): ginásio para onde o caminho leva (ausente = Estrada Vitória)
  insignias?: number; // insígnias da região ao começar: libera itens melhores nas recompensas
  expAll?: boolean; // Exp. All ligado: todo o time ganha metade do XP
  premios?: string[]; // modo ginasio: itens que o líder entrega ao cair
  tem?: number[]; // espécies já na coleção (Bola Repetida)
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
  // batalha dupla em andamento: `par` é o 2º inimigo em campo, `ativo2` o meu 2º Pokémon e
  // `vez` o slot do inimigo cuja questão está valendo
  dupla?: boolean;
  par?: Encontro | null;
  ativo2?: number;
  vez?: 0 | 1;
  // pausa antes da próxima batalha (organizar o time, usar item, Centro Pokémon)
  // `loja`: Poké Mart aberto (na cidade); `curadoAuto`: o time foi curado antes do líder
  parada?: { centro: boolean; loja?: boolean; curou?: boolean; curadoAuto?: boolean } | null;
  dinheiro?: number; // carteira (Pokédólares): treinador vencido paga, o Poké Mart cobra
  ajudantesAntes?: number; // ginásio: ajudantes já vencidos em tentativas anteriores (não lutam de novo)
  ultimoTreinador?: number; // treinador do último encontro puxado da fila (-1 = selvagem)
}

export type StatusGolpe = Exclude<Status, ""> | "leech-seed";

export type Evento =
  | { tipo: "ataque"; golpe: number; efetividade: number; critico: boolean; semEfeito: boolean; dano: number; hpInimigo: number; uid?: string; alvo?: 0 | 1; firme?: boolean }
  | { tipo: "statusInimigo"; status: StatusGolpe; slot?: 0 | 1 }
  | { tipo: "statusFalhou"; status: StatusGolpe; motivo: "imune" | "ja"; slot?: 0 | 1 }
  | { tipo: "tiqueInimigo"; status: StatusGolpe; dano: number; hpInimigo: number; slot?: 0 | 1 }
  | { tipo: "inimigoAcordou"; status: Status; slot?: 0 | 1 }
  | { tipo: "inimigoImpedido"; status: Status; slot?: 0 | 1 }
  | { tipo: "exausto"; slot?: 0 | 1 }
  | { tipo: "voltaDepois"; selvagem: boolean }
  | { tipo: "impedido"; status: Status; uid?: string } // dormindo/congelado/paralisado: o golpe sai sem bônus
  | { tipo: "desmaiouInimigo"; slot?: 0 | 1 }
  | { tipo: "bola"; bola: Bola; sucesso: boolean; balancos: number; uid?: string; paraPc?: boolean }
  | { tipo: "xp"; uid: string; valor: number; compartilhado?: boolean }
  | { tipo: "item"; uid: string; item: string; efeito: "cura" | "status" | "segurou" | "resistiu" | "esquivou" | "recuou" | "recuo"; valor?: number }
  | { tipo: "premio"; item: string }
  | { tipo: "cap"; uid: string; nivel: number } // no level cap: o XP não entrou
  | { tipo: "nivel"; uid: string; nivel: number }
  | { tipo: "aprendeu"; uid: string; golpe: number; esqueceu: number | null }
  | { tipo: "querAprender"; uid: string; golpe: number }
  | { tipo: "evolui"; uid: string; de: number; para: number }
  | { tipo: "cura"; uid: string; valor: number; motivo: "dreno" | "cura" | "combo" | "licao" | "item" | "semente" }
  | { tipo: "foco"; uid: string }
  | { tipo: "errou" }
  | { tipo: "contra"; golpe: number; dano: number; efetividade: number; critico: boolean; foco: boolean; revide?: boolean; livre?: boolean; primeiro?: boolean; firme?: boolean; uid?: string; slot?: 0 | 1 }
  | { tipo: "contraStatus"; golpe: number; resultado: "ok" | "errou" | "imune" | "ja"; uid?: string; slot?: 0 | 1 }
  | { tipo: "itemInimigo"; item: string; treinador: number; valor: number; hpInimigo: number; curouStatus?: boolean; slot?: 0 | 1 }
  | { tipo: "status"; uid: string; status: Status }
  | { tipo: "tique"; uid: string; dano: number; status: Status }
  | { tipo: "acordou"; uid: string; status: Status }
  | { tipo: "desmaiou"; uid: string }
  | { tipo: "fuga"; slot?: 0 | 1; lenda?: boolean }
  | { tipo: "treinadorVencido"; treinador: number; lider: boolean; insignia?: number }
  | { tipo: "usouItem"; item: string; uid: string }
  | { tipo: "dinheiro"; valor: number; treinador: number }
  | { tipo: "trocou"; slot: 0 | 1; de: string; para: string }
  | { tipo: "derrota" };

export const MIN_LICAO = 12;
const ALVO_QUESTOES = 26; // Caminho: ~4 treinadores de 1–3 Pokémon, selvagens e o Treinador Ás
const MAX_REVISOES = 14;
const QUESTOES_POR_POKEMON = 2.6;
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
      .filter(([id, e]) => Number(id) <= Math.min(ate, ULTIMO_DA_JORNADA) && !e.l && (!e.p || e.p > ate) && (tipo === "todas" || e.t.includes(tipo)) && linha(Number(id)).some(naFaixa))
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

// Pokémon de treinador do caminho: um dos que vivem na rota (como nos jogos, o Caçador de
// Insetos da Floresta de Viridian tem Caterpie e Weedle), de preferência dos tipos da
// matéria. A mesma questão na mesma rota é sempre o mesmo Pokémon.
function especieDaRota(dex: Dex, rota: Rota, questaoId: number, materia: string, nivel: number, ate = Infinity): number {
  const { tipos } = tiposDaMateria(materia);
  const doTipo = tipos ? rota.s.filter(([id]) => dex.especies[id]?.t.some((t) => tipos.includes(t))) : [];
  const [id] = sortearSelvagem({ nome: rota.nome, s: doTipo.length ? doTipo : rota.s }, hash(questaoId + 7919));
  return formaNoNivel(dex, id, nivel, ate);
}

// O líder usa uma forma final forte; com o time já alto, pode ser um lendário.
function especieDoLider(dex: Dex, questaoId: number, materia: string, nivel: number, ate = Infinity): number {
  const { tipos } = tiposDaMateria(materia);
  const finais = Object.entries(dex.especies)
    .filter(([id, e]) => Number(id) <= Math.min(ate, ULTIMO_DA_JORNADA) && !e.e?.some(([para]) => para <= ate) && (nivel >= 45 || !e.l) && (!tipos || e.t.some((t) => tipos.includes(t))))
    .map(([id, e]) => ({ id: Number(id), soma: e.s.reduce((a, b) => a + b, 0) }))
    .filter((x) => x.soma >= 450)
    .sort((a, b) => a.id - b.id);
  if (!finais.length) return especieDaQuestao(dex, questaoId, materia, nivel, ate);
  return finais[Math.floor(hash(questaoId + 104729) * finais.length)].id;
}

// ---------- montagem ----------

// Treinadores de batalha dupla do caminho (sprites do Showdown).
const DUPLAS: [string, string][] = [
  ["twins", "Gêmeas"],
  ["youngcouple", "Casal Jovem"],
  ["acetrainercouple", "Casal Ás"],
  ["sisandbro", "Irmãos"],
  ["doubleteam", "Dupla Dinâmica"],
  ["interviewers", "Repórteres"],
];
const CHANCE_DUPLA = 0.4;

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
  lenda?: number; // modo lendario: espécie da lenda
  rumo?: number;
  cap?: number;
  insignias?: number;
  expAll?: boolean;
  possui?: string[]; // itens-chave já ganhos (não repetem como prêmio)
  dinheiro?: number; // carteira do perfil
  restantes?: number; // Caminho: treinadores que ainda faltam até o ginásio (a rota acaba neles)
  passo?: number; // Caminho: treinadores já vencidos no trecho (em que rota o jogador está)
  ajudantesVencidos?: number; // Ginásio: ajudantes já vencidos (ficam de fora)
  tem?: number[];
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
  const lenda = modo === "lendario" ? lendaPorId(opts.lenda ?? -1) : undefined;
  if (modo === "lendario" && (!lenda || lenda.regiao > regiao || !dex.especies[lenda.id])) return null;
  let rng = opts.semente ?? Date.now() >>> 0;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };
  const base = nivelMedio(opts.time);
  const nivelEntre = (d0: number, d1: number) => Math.max(2, Math.min(MAX_NIVEL, base + d0 + Math.floor(rolar() * (d1 - d0 + 1))));

  // Quantos Pokémon inimigos o modo pede; a partida puxa ~2,2 questões por Pokémon.
  const planos =
    modo === "rota"
      ? null
      : modo === "safari"
        ? planoSafari(dex, REGIOES[habitat].faixa, terreno, nivelEntre, rolar)
        : modo === "liga"
          ? planoLiga(dex, regiao, base)
          : modo === "lendario"
            ? planoLendario(dex, lenda!, base, rolar, ate)
            : planoGinasio(dex, regiao, opts.ginasio!, base, rolar, opts.ajudantesVencidos ?? 0);
  const nMons = planos ? planos.reduce((a, x) => a + x.mons.length, 0) : 0;
  // A lenda aguenta muitos turnos: o rastro reserva mais questões para ela.
  const extraLenda = modo === "lendario" ? TURNOS_LENDA - 2 : 0;
  const alvo = planos ? Math.max(4, Math.round(nMons * (modo === "safari" ? 3 : QUESTOES_POR_POKEMON)) + 1 + extraLenda) : ALVO_QUESTOES;
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
  const inimigo = (c: Candidata, tipo: TipoEncontro, treinador: number, especie: number, nivel: number, lendario = false): Encontro => ({
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
    ...(lendario ? { lendario } : {}),
  });

  if (planos) {
    // Cada Pokémon abre com uma questão; o que sobra vai para a reserva (turnos seguintes).
    // Com poucas questões, os ajudantes perdem Pokémon antes do chefe.
    const slots = planos.flatMap((pl, t) => pl.mons.map((m, j) => ({ ...m, t, ultimo: j === pl.mons.length - 1 })));
    const cabe = comuns.length + (chefe ? 1 : 0);
    while (slots.length > Math.max(1, cabe)) {
      const i = slots.findIndex((s) => !s.ultimo && s.tipo !== "lider" && !s.lendario);
      slots.splice(i >= 0 ? i : 0, 1);
    }
    const usados = [...new Set(slots.filter((s) => s.tipo !== "selvagem").map((s) => s.t))];
    for (const t of usados) treinadores.push(planos[t].t);
    // O chefe abre com a questão em que mais errei; no Rastro Lendário, quem a recebe é a lenda.
    const idxChefe = !chefe ? -1 : modo === "lendario" ? slots.findIndex((s) => s.lendario) : slots.map((s) => s.tipo).lastIndexOf("lider");
    let k = 0;
    slots.forEach((s, i) => {
      const c = i === idxChefe && chefe ? chefe : comuns[k++] ?? chefe!;
      fila.push(inimigo(c, s.tipo, s.tipo === "selvagem" ? -1 : usados.indexOf(s.t), s.especie, s.nivel, !!s.lendario));
    });
    reserva = comuns.slice(k).map((c) => ({ questaoId: c.questaoId, retorno: false }));
  } else {
    // ROTA (modo história): treinadores de 2–3 Pokémon, selvagens entre eles (primeiro as questões que já
    // me derrubaram, que dá para capturar) e o Treinador Ás no fim.
    const ehRevisao = new Set(revisoes.map((r) => r.questaoId));
    const orcamento = Math.max(2, Math.round(pool.length / QUESTOES_POR_POKEMON) - (chefe ? 1 : 0));
    const nSelv = Math.max(1, Math.round(orcamento / 4));
    // Nível do caminho: como nos jogos, sobe rumo ao líder sem passar do level cap (os
    // treinadores ficam 2 abaixo do ás do líder, os selvagens 3, o Treinador Ás 1).
    const cap = opts.cap && opts.cap < MAX_NIVEL ? opts.cap : null;
    const alvoCaminho = cap ? Math.max(base - 1, Math.round((base + cap - 3) / 2)) : base;
    const nivelCaminho = (d0: number, d1: number, folga: number) => {
      const n = alvoCaminho + d0 + Math.floor(rolar() * (d1 - d0 + 1));
      return Math.max(2, Math.min(cap ? cap - folga : MAX_NIVEL, n));
    };
    // As rotas do trecho, como nos jogos: cada treinador vencido anda um pedaço do caminho, e
    // os selvagens são os da rota onde se está, na chance e no nível dos jogos.
    const trecho = trechoDe(regiao, opts.rumo);
    const totalTrecho = treinadoresParaGinasio(opts.rumo ?? TRECHO_VITORIA);
    const rotaAgora = () => (trecho ? indiceDaRota(trecho, (opts.passo ?? 0) + treinadores.length, totalTrecho) : undefined);
    const selvagemAqui = (s: Candidata): Encontro => {
      const k = rotaAgora();
      if (k === undefined || !trecho) {
        const nivel = nivelCaminho(-3, -1, 3);
        return inimigo(s, "selvagem", -1, especieDaQuestao(dex, s.questaoId, s.materia, nivel, ate), nivel);
      }
      const [especie, , min, max] = sortearSelvagem(trecho.rotas[k], rolar());
      const nivel = Math.max(2, Math.min(cap ? cap - 3 : MAX_NIVEL, min + Math.floor(rolar() * (max - min + 1))));
      return { ...inimigo(s, "selvagem", -1, especie, nivel), rota: k };
    };
    const comErro = comuns.filter((c) => c.erros > 0 && ehRevisao.has(c.questaoId));
    const selvagens = [...comErro, ...comuns.filter((c) => !comErro.includes(c))].slice(0, nSelv);
    const outras = comuns.filter((c) => !selvagens.includes(c));
    const nTreinador = Math.max(0, orcamento - selvagens.length);
    const deTreinador = outras.slice(0, nTreinador);
    reserva = outras.slice(nTreinador).map((c) => ({ questaoId: c.questaoId, retorno: false }));
    // O caminho acaba quando faltar vencer ninguém: no máximo os treinadores que ainda faltam
    // (o Treinador Ás conta); o resto das questões vira turno extra (reserva).
    const maxGrupos = opts.restantes && opts.restantes > 0 ? Math.max(0, opts.restantes - (chefe ? 1 : 0)) : Infinity;
    let i = 0;
    while (i < deTreinador.length && treinadores.length < maxGrupos) {
      const r = rolar();
      const tam = Math.min(deTreinador.length - i, r < 0.3 ? 1 : r < 0.75 ? 2 : 3);
      const grupo = deTreinador.slice(i, i + tam);
      i += tam;
      const { treinadores: classes } = tiposDaMateria(grupo[0].materia);
      const sprite = classes[Math.floor(rolar() * classes.length)];
      const idx = treinadores.length;
      const k = rotaAgora();
      const rota = k !== undefined && trecho ? trecho.rotas[k] : undefined;
      const onde = rota ? `${rota.nome}: ` : "";
      // Batalha dupla: grupo de 2+ e time com 2+ Pokémon para pôr em campo.
      if (tam >= 2 && opts.time.length >= 2 && rolar() < CHANCE_DUPLA) {
        const [spriteD, nomeD] = DUPLAS[Math.floor(rolar() * DUPLAS.length)];
        treinadores.push({ nome: nomeD, sprite: spriteD, lider: false, dupla: true, fala: `${onde}${nomeD} barram o caminho ${destinoHistoria(regiao, opts.rumo)}: batalha dupla!` });
      } else {
        const nome = NOMES_TREINADOR[sprite] ?? "Treinador";
        treinadores.push({ nome, sprite, lider: false, fala: `${onde}${nome} barra o caminho ${destinoHistoria(regiao, opts.rumo)}!` });
      }
      for (const c of grupo) {
        const nivel = nivelCaminho(-1, 1, 2);
        const especie = rota ? especieDaRota(dex, rota, c.questaoId, c.materia, nivel, ate) : especieDaQuestao(dex, c.questaoId, c.materia, nivel, ate);
        fila.push({ ...inimigo(c, "treinador", idx, especie, nivel), ...(k !== undefined ? { rota: k } : {}) });
      }
      // um selvagem entre treinadores, quando houver (já na rota seguinte, se ela mudou)
      const s = selvagens.shift();
      if (s) fila.push(selvagemAqui(s));
    }
    if (i < deTreinador.length) reserva = [...deTreinador.slice(i).map((c) => ({ questaoId: c.questaoId, retorno: false })), ...reserva];
    for (const s of selvagens) fila.push(selvagemAqui(s));
    if (chefe) {
      const idx = treinadores.length;
      const k = rotaAgora();
      const onde = k !== undefined && trecho ? `${trecho.rotas[k].nome}: ` : "";
      const [sprite, nome] = CHEFES_ROTA[Math.floor(rolar() * CHEFES_ROTA.length)];
      treinadores.push({ nome, sprite, lider: true, fala: `${onde}${nome} guarda o fim do trecho ${destinoHistoria(regiao, opts.rumo)}.` });
      const nivel = cap ? Math.max(2, Math.min(cap - 1, Math.max(alvoCaminho + 2, cap - 2))) : Math.min(MAX_NIVEL, base + 3);
      fila.push({ ...inimigo(chefe, "lider", idx, especieDoLider(dex, chefe.questaoId, chefe.materia, nivel, ate), nivel), ...(k !== undefined ? { rota: k } : {}) });
    }
  }

  // quantos Pokémon cada treinador tem (as Pokébolas sobre a caixa de HP)
  treinadores.forEach((t, i) => (t.total = fila.filter((e) => e.treinador === i).length));
  for (const t of treinadores) {
    const itens = bolsaDoTreinador(t, opts.insignias ?? 0, rolar);
    if (itens.length) t.itens = itens;
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
    ...(modo === "lendario" ? { lenda: lenda!.id } : {}),
    ...(modo === "rota" && REGIOES[regiao].ginasios[opts.rumo ?? -1] ? { rumo: opts.rumo } : {}),
    ...(opts.insignias ? { insignias: opts.insignias } : {}),
    ...(opts.expAll ? { expAll: true } : {}),
    ...(opts.tem?.length ? { tem: opts.tem } : {}),
    ...(modo === "ginasio" ? { premios: premiosDoGinasio(regiao, opts.ginasio!, opts.possui ?? []) } : {}),
    ...(modo === "ginasio" && opts.ajudantesVencidos ? { ajudantesAntes: opts.ajudantesVencidos } : {}),
    dinheiro: opts.dinheiro ?? DINHEIRO_INICIAL,
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
  const q = avancarPoke(p, dex);
  // Ginásio, Liga e Rastro Lendário começam na cidade (no Platô Indigo, na Liga; na entrada do
  // santuário, no rastro): Centro Pokémon e Poké Mart, para levar Ultra Balls.
  return modo === "ginasio" || modo === "liga" || modo === "lendario" ? { ...q, parada: { centro: true, loja: true } } : q;
}

// Bolsa de cura dos treinadores, como nos jogos: líderes levam 1–2 poções (melhores a cada
// insígnia), a Elite dos 4 e o Campeão levam Full Restore, o Treinador Ás e o admin da equipe
// vilã levam algumas, e um treinador comum às vezes leva uma Potion.
const CURAS_TREINADOR = ["potion", "super-potion", "hyper-potion", "full-restore"];
const faixaDeCura = (insignias: number) => (insignias < 2 ? 0 : insignias < 4 ? 1 : insignias < 7 ? 2 : 3);
export function bolsaDoTreinador(t: Treinador, insignias: number, rolar: () => number): string[] {
  const de = (n: number, faixa: number) => Array.from({ length: n }, () => CURAS_TREINADOR[Math.max(0, Math.min(3, faixa))]);
  if (t.campeao) return de(3, 3);
  if (t.elite) return de(2, 3);
  if (t.insignia !== undefined) return de(t.insignia < 2 ? 1 : 2, faixaDeCura(t.insignia));
  if (t.admin) return de(2, Math.max(1, faixaDeCura(insignias)));
  if (t.lider) return de(1, Math.min(2, faixaDeCura(insignias)));
  if (t.dupla) return [];
  return rolar() < 0.3 ? de(1, Math.min(1, faixaDeCura(insignias))) : [];
}

// O que o líder entrega além da insígnia: o item que reforça o tipo dele e, no 3º e no 6º
// ginásio, o Exp. Share e o Exp. All (se ainda não os tiver).
export function premiosDoGinasio(r: number, i: number, possui: string[]): string[] {
  const g = REGIOES[r]?.ginasios[i];
  if (!g) return [];
  const chave = PREMIO_CHAVE[i];
  return [REFORCO_DO_TIPO(g.tipo), chave && !possui.includes(chave) ? chave : null].filter((x): x is string => !!x);
}

const regiaoAtualDaPartida = (p: PartidaPoke) => (REGIOES[p.regiao ?? 0] ? (p.regiao ?? 0) : 0);

// Rota do caminho onde está o encontro (modo história), ou null.
export function rotaDoEncontro(p: PartidaPoke, e: Encontro | null | undefined): Rota | null {
  if (!e || e.rota === undefined || (p.modo ?? "rota") !== "rota") return null;
  return trechoDe(regiaoAtualDaPartida(p), p.rumo)?.rotas[e.rota] ?? null;
}

// Lobby: o trecho do caminho atual e a rota em que o jogador está.
export function rotasDoCaminho(perfil: PerfilPoke): { rotas: string[]; atual: number } | null {
  const r = regiaoAtual(perfil);
  const i = insigniasDe(perfil);
  const rumo = REGIOES[r].ginasios[i] ? i : TRECHO_VITORIA;
  const trecho = trechoDe(r, rumo);
  if (!trecho) return null;
  return { rotas: trecho.rotas.map((x) => x.nome), atual: indiceDaRota(trecho, historiaDe(perfil, r), treinadoresParaGinasio(rumo)) };
}

// Modo história: o caminho até o próximo ginásio (ou a Estrada Vitória, rumo à Liga).
export function destinoHistoria(r: number, rumo: number | undefined): string {
  const g = REGIOES[r]?.ginasios[rumo ?? -1];
  return g ? `para ${g.cidade}` : "da Estrada Vitória";
}

// ---------- planos dos modos ----------

interface Plano {
  t: Treinador;
  mons: { especie: number; nivel: number; tipo: TipoEncontro; lendario?: boolean }[];
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

function planoGinasio(dex: Dex, r: number, i: number, base: number, rolar: () => number, pular = 0): Plano[] {
  const { faixa } = REGIOES[r];
  const g = REGIOES[r].ginasios[i];
  const s = 100000 * r; // Kanto (r = 0) mantém as sementes de antes
  const nvLider = nivelDoDesafio(base, g.piso, 1);
  const nAjud = i < 4 ? 1 : 2;
  const planos: Plano[] = g.ajudantes.map((sprite, k) => ({
    t: { nome: NOMES_TREINADOR[sprite] ?? "Treinador", sprite, lider: false },
    mons: Array.from({ length: nAjud }, (_, j) => {
      const nivel = Math.max(2, nvLider - 3 + Math.floor(rolar() * 2));
      return { especie: especieDoTipo(dex, g.tipo, nivel, s + 1000 * (i + 1) + 10 * k + j, faixa), nivel, tipo: "treinador" as const };
    }),
  })).slice(Math.max(0, pular)); // ajudantes já vencidos não lutam de novo (os níveis ficam iguais)
  planos.push({
    t: { nome: g.lider, sprite: g.sprite, lider: true, insignia: i, fala: `${g.lider}, líder do Ginásio de ${g.cidade}, aceita o desafio pela ${g.insignia}!` },
    // O time dos jogos, sem evoluir: o Brock é Geodude e Onix em qualquer nível.
    mons: g.time.filter((id) => dex.especies[id]).map((especie, j, xs) => {
      const nivel = j === xs.length - 1 ? nvLider : Math.max(2, nvLider - 2);
      return { especie, nivel, tipo: "lider" as const };
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

// Nível da lenda: puxado para o dos jogos, mas no máximo 6 acima do time (Mewtwo Nv70 com
// o time no Nv47 vira Nv53) e nunca abaixo do time (Mew Nv30 não fica fácil demais).
export function nivelDaLenda(base: number, l: Lenda): number {
  return Math.max(2, Math.min(MAX_NIVEL, Math.max(base, Math.min(base + 6, Math.round((base + l.nivel) / 2) + 2))));
}

// Rastro Lendário: dois recrutas da equipe vilã, selvagens do santuário entre eles, o admin
// (ou o chefe) da equipe e, no fim, a lenda.
function planoLendario(dex: Dex, l: Lenda, base: number, rolar: () => number, ate: number): Plano[] {
  const eq = EQUIPES[l.equipe];
  const doLugar = l.selvagens.filter((id) => dex.especies[id] && id <= ate);
  const daEquipe = eq.time.filter((id) => dex.especies[id] && id <= ate);
  const sortear = (xs: number[]) => xs[Math.floor(rolar() * xs.length)] ?? 19;
  const selvagem = (): Plano => {
    const nivel = Math.max(2, base - 3 + Math.floor(rolar() * 3));
    return { t: { nome: "", sprite: "", lider: false }, mons: [{ especie: formaNoNivel(dex, sortear(doLugar.length ? doLugar : [19]), nivel, ate), nivel, tipo: "selvagem" }] };
  };
  const recruta = (k: 0 | 1): Plano => ({
    t: { nome: `Recruta da ${eq.nome}`, sprite: eq.recrutas[k], lider: false, fala: `${l.lugar}: um Recruta da ${eq.nome} bloqueia a passagem. "Essa lenda é nossa!"` },
    mons: [0, 1].map(() => {
      const nivel = Math.max(2, base - 2 + Math.floor(rolar() * 2));
      return { especie: formaNoNivel(dex, sortear(daEquipe.length ? daEquipe : [19]), nivel, ate), nivel, tipo: "treinador" as const };
    }),
  });
  const timeChefe = l.chefe.time.filter((id) => dex.especies[id] && id <= ate);
  const chefe: Plano = {
    t: { nome: l.chefe.nome, sprite: l.chefe.sprite, lider: false, admin: true, fala: `${l.chefe.nome}, ${l.chefe.titulo}, está quase alcançando ${dex.especies[l.id].n}. Vença para chegar antes!` },
    mons: (timeChefe.length ? timeChefe : daEquipe.slice(0, 2)).map((especie, j, xs) => ({ especie, nivel: Math.min(MAX_NIVEL, base + (j === xs.length - 1 ? 1 : 0)), tipo: "treinador" as const })),
  };
  const lenda: Plano = { t: { nome: "", sprite: "", lider: false }, mons: [{ especie: l.id, nivel: nivelDaLenda(base, l), tipo: "selvagem", lendario: true }] };
  return [recruta(0), selvagem(), recruta(1), selvagem(), chefe, selvagem(), lenda];
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
  !p.fim && !p.oferta && !p.dupla && !!p.atual && !p.atual.fim && p.atual.tipo === "selvagem" && !p.atual.lendario && !p.atual.turnos && (p.atual.trocas ?? 0) < MAX_TROCAS;

export function trocarSelvagem(dex: Dex, p: PartidaPoke): PartidaPoke {
  if (!podeTrocarSelvagem(p)) return p;
  const e = p.atual!;
  const [r, rng] = sortear(p.rng);
  // No caminho, o troco é outro selvagem da mesma rota (no nível dele).
  const rota = e.rota !== undefined && p.modo !== "safari" ? trechoDe(regiaoAtualDaPartida(p), p.rumo)?.rotas[e.rota] : undefined;
  const especie = rota ? sortearSelvagem(rota, r, (id) => id === e.especie)[0] : selvagemDaRegiao(dex, regiaoDe(p.habitat ?? p.regiao).faixa, e.nivel, r, e.especie, p.modo === "safari" ? p.terreno : undefined);
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
function ganharXp(dex: Dex, l: Lutador, valor: number, eventos: Evento[], ate: number, cap = MAX_NIVEL, compartilhado = false) {
  const antes = nivelDe(l);
  const hpAntes = hpMax(dex, l);
  const teto = xpDoNivel(Math.min(MAX_NIVEL, cap));
  if (l.xp >= teto) {
    eventos.push({ tipo: "cap", uid: l.uid, nivel: Math.min(MAX_NIVEL, cap) });
    // Já no nível de evoluir (evolução que ficou para trás): evolui mesmo parado no cap.
    evoluirSePuder(dex, l, eventos, ate);
    return;
  }
  l.xp = Math.min(teto, somarXp(dex.especies[l.id], l.xp, valor));
  eventos.push({ tipo: "xp", uid: l.uid, valor, ...(compartilhado ? { compartilhado } : {}) });
  subiuPara(dex, l, antes, hpAntes, eventos, ate);
}

function subiuPara(dex: Dex, l: Lutador, antes: number, hpAntes: number, eventos: Evento[], ate: number) {
  const depois = nivelDe(l);
  if (depois <= antes) return;
  eventos.push({ tipo: "nivel", uid: l.uid, nivel: depois });
  for (const g of golpesNovos(dex.especies[l.id], antes, depois)) aprender(dex, l, g, eventos);
  evoluirSePuder(dex, l, eventos, ate);
  // Subir de nível aumenta o HP máximo; o HP atual sobe junto (como nos jogos).
  if (l.hp > 0) l.hp = Math.min(hpMax(dex, l), l.hp + (hpMax(dex, l) - hpAntes));
}

function evoluirSePuder(dex: Dex, l: Lutador, eventos: Evento[], ate: number) {
  const para = l.item === "everstone" ? null : evolucaoPorNivel(dex.especies[l.id], nivelDe(l), ateParaEvoluir(l.id, ate));
  if (para && dex.especies[para]) evoluir(dex, l, para, eventos);
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

export type Slot = 0 | 1;
export type AcaoGolpe = { golpe: number; alvo?: Slot };
export type Acao = AcaoGolpe | { bola: Bola };
// Ação que gasta a vez sem responder questão (item da mochila ou troca de Pokémon): como nos
// jogos, o inimigo ataca em seguida.
export type AcaoLivre = { item: string; alvo: number } | { troca: number; slot?: Slot };

export interface OpcoesResposta {
  acertou: boolean;
  confianca: Confianca;
  acao: Acao; // do meu Pokémon no slot 0 (na batalha simples, o único)
  acao2?: AcaoGolpe; // batalha dupla: o do slot 1 (sem ela, o 1º golpe no inimigo da vez)
}

// ---------- batalha dupla ----------
// Nas duplas cada lado tem dois Pokémon em campo: `atual`/`par` do inimigo e `ativo`/`ativo2`
// meus. Continua UMA questão por turno; a "da vez" alterna entre os dois inimigos. Acertar
// faz os meus dois atacarem (cada um com golpe e alvo próprios) e os inimigos de pé revidam;
// errar deixa os dois inimigos atacarem, com 3/4 da força (dois contra-ataques num erro só
// não podem valer o dobro do erro da batalha simples).
const FATOR_DUPLA = 0.75;

const dePe = (e: Encontro | null | undefined): e is Encontro => !!e && !e.fim && e.hp > 0;
export function inimigosEmCampo(p: PartidaPoke): (Encontro | null)[] {
  return p.dupla ? [p.atual, p.par ?? null] : [p.atual];
}
export const lutaAtiva = (p: PartidaPoke) => inimigosEmCampo(p).some((e) => !!e && !e.fim);
export function slotDaVez(p: PartidaPoke): Slot {
  if (!p.dupla) return 0;
  const [a, b] = inimigosEmCampo(p);
  if (p.vez === 1 && b && !b.fim) return 1;
  return a && !a.fim ? 0 : b && !b.fim ? 1 : 0;
}
// O inimigo cuja questão está valendo (na simples, o único).
export const encontroDaVez = (p: PartidaPoke): Encontro | null => inimigosEmCampo(p)[slotDaVez(p)] ?? null;
// Índices (em p.time) dos meus Pokémon em campo, na ordem dos slots.
export function meusEmCampo(p: PartidaPoke): number[] {
  return p.dupla && p.ativo2 !== undefined && p.ativo2 >= 0 && p.ativo2 !== p.ativo && p.time[p.ativo2] ? [p.ativo, p.ativo2] : [p.ativo];
}

interface Ctx {
  dex: Dex;
  q: PartidaPoke;
  eventos: Evento[];
  rolar: () => number;
}

function novoCtx(dex: Dex, p: PartidaPoke): Ctx {
  const q: PartidaPoke = {
    ...p,
    atual: p.atual ? { ...p.atual } : null,
    ...(p.par ? { par: { ...p.par } } : {}),
    time: p.time.map((l) => ({ ...l, golpes: [...l.golpes] })),
    fila: [...p.fila],
    reserva: [...p.reserva],
    registros: [...p.registros],
    mochila: { ...p.mochila },
    novos: [...p.novos],
    vencidos: [...p.vencidos],
    parada: null,
  };
  const c: Ctx = { dex, q, eventos: [], rolar: () => 0 };
  c.rolar = () => {
    const [r, n] = sortear(c.q.rng);
    c.q.rng = n;
    return r;
  };
  return c;
}

const curar = (dex: Dex, l: Lutador, valor: number, motivo: Extract<Evento, { tipo: "cura" }>["motivo"], eventos: Evento[]) => {
  if (l.hp <= 0) return;
  const real = Math.min(Math.round(valor), hpMax(dex, l) - l.hp);
  if (real <= 0) return;
  l.hp += real;
  eventos.push({ tipo: "cura", uid: l.uid, valor: real, motivo });
};

const curarItem = (dex: Dex, l: Lutador, valor: number, eventos: Evento[], item = l.item ?? "") => {
  if (l.hp <= 0) return 0;
  const real = Math.min(Math.round(valor), hpMax(dex, l) - l.hp);
  if (real <= 0) return 0;
  l.hp += real;
  eventos.push({ tipo: "item", uid: l.uid, item, efeito: "cura", valor: real });
  return real;
};

// Golpe do meu Pokémon: reforço de tipo, Faixa/Óculos Escolhidos, Orbe da Vida...
export function multItemAtaque(item: string | undefined, g: Golpe, ef: number): number {
  if (!item) return 1;
  const [, tipo, , classe] = g;
  if (REFORCO_TIPO[item] === tipo) return 1.2;
  if (item === "life-orb") return 1.3;
  if (item === "expert-belt") return ef >= 2 ? 1.2 : 1;
  if (item === "choice-band") return classe === 0 ? 1.5 : 1;
  if (item === "choice-specs") return classe === 1 ? 1.5 : 1;
  if (item === "muscle-band") return classe === 0 ? 1.1 : 1;
  if (item === "wise-glasses") return classe === 1 ? 1.1 : 1;
  return 1;
}

// Fim do turno do Pokémon ativo: Restos, depois as frutas (status e HP), que são comidas.
function itensDoFimDoTurno(dex: Dex, l: Lutador, eventos: Evento[]) {
  const max = hpMax(dex, l);
  if (l.item === "leftovers") curarItem(dex, l, Math.max(1, Math.floor(max / 16)), eventos);
  const st = l.item ? FRUTA_STATUS[l.item] : undefined;
  if (st && l.status && (st === "*" || st === l.status)) {
    eventos.push({ tipo: "item", uid: l.uid, item: l.item!, efeito: "status" });
    eventos.push({ tipo: "acordou", uid: l.uid, status: l.status });
    l.status = "";
    l.sono = 0;
    delete l.item;
  }
  const fh = l.item ? FRUTA_HP[l.item] : undefined;
  if (fh && l.hp <= max * fh[0]) {
    const item = l.item!;
    delete l.item;
    curarItem(dex, l, fh[1] >= 1 ? fh[1] : Math.max(1, Math.floor(max * fh[1])), eventos, item);
  }
}

// Captura: mais generosa que a dos jogos (a questão já foi vencida pela resposta certa), mas
// com a mesma lógica: HP baixo, status e bola melhor ajudam. Comum (taxa 45) com HP cheio e
// Poké Bola ≈ 30%; no vermelho ≈ 75%; dormindo, +15 pontos.
export function chanceCaptura(e: Especie, bola: Bola, confianca: Confianca, fracHp = 1, comStatus = false, ctx: Parameters<typeof multBola>[2] & { lendario?: boolean } = {}): number {
  const mult = multBola(bola, e, ctx);
  if (mult === Infinity) return 1;
  // A lenda quase não cai com HP cheio: é preciso deixá-la por um fio (e, de preferência,
  // dormindo ou paralisada). Poké Bola com 1 HP ≈ 40%; Ultra ≈ 70%; com status, +12 pontos.
  if (ctx.lendario) return Math.min(1, 0.06 + 0.33 * (1 - fracHp) * mult + (comStatus ? 0.12 : 0) + (confianca === "certeza" ? 0.03 : 0));
  const base = 0.25 + (0.5 * (1 - fracHp) + 0.3 * (e.c / 255)) * mult + (comStatus ? 0.15 : 0) + (confianca === "certeza" ? 0.05 : 0);
  return Math.min(1, base);
}

const BASE_DANO = 0.5;
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
  const lider = e.tipo === "lider" || e.lendario ? 0.6 : 1;
  const frac = BASE_DANO * Math.sqrt(poder / 50) * stab * ef * relacao * lider * (critico ? 1.5 : 1) * aleatorio;
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

const comSlot = (c: Ctx, slot: Slot) => (c.q.dupla ? { slot } : {});

// Anota no inimigo quem dos meus está em campo contra ele: quem entrou e saiu no meio da
// luta continua dividindo o XP quando ele cair (como nos jogos).
function marcarParticipantes(q: PartidaPoke) {
  const uids = meusEmCampo(q).map((i) => q.time[i]).filter((l) => l && l.hp > 0).map((l) => l.uid);
  for (const e of inimigosEmCampo(q)) {
    if (!dePe(e)) continue;
    const ja = e.participantes ?? [];
    const novos = uids.filter((u) => !ja.includes(u));
    if (novos.length) e.participantes = [...ja, ...novos];
  }
}

// XP como nos jogos, no KO (e na captura, como da 6ª geração em diante): quem enfrentou o
// inimigo e segue de pé divide o XP; com Exp. Share segurado ou Exp. All ligado, os outros
// de pé levam metade. Cada um pela fórmula com o próprio nível; Ovo da Sorte ×1,5. Na dupla,
// os dois em campo lutaram e cada um leva a parte cheia, salvo se mais gente passou pelo campo.
function darXp(c: Ctx, e: Encontro, lutaram: Lutador[]) {
  const { dex, q, eventos } = c;
  const inimigo = dex.especies[e.especie];
  const uids = new Set([...(e.participantes ?? []), ...lutaram.map((l) => l.uid)]);
  const participantes = q.time.filter((l) => l.hp > 0 && uids.has(l.uid)).length;
  const emCampo = Math.max(1, lutaram.filter((l) => l.hp > 0).length);
  const fatia = participantes > emCampo ? emCampo / participantes : 1;
  for (const l of q.time) {
    if (l.hp <= 0) continue;
    const participou = uids.has(l.uid);
    const share = q.expAll || l.item === "exp-share" ? 0.5 : 0;
    const parte = participou ? Math.max(fatia, share) : share;
    if (!parte) continue;
    const xp = Math.max(1, Math.floor(xpDaVitoria(inimigo, e.nivel, nivelDe(l), e.tipo !== "selvagem") * parte * (l.item === "lucky-egg" ? 1.5 : 1)));
    if (participou) q.xp += xp;
    ganharXp(dex, l, xp, eventos, limiteDaRegiao(q.regiao), q.cap, !participou);
  }
}

function derrubar(c: Ctx, e: Encontro, slot: Slot, lutaram: Lutador[]) {
  e.hp = 0;
  e.fim = "ko";
  c.eventos.push({ tipo: "desmaiouInimigo", ...comSlot(c, slot) });
  darXp(c, e, lutaram);
}

// O inimigo ataca `eu`: forte no erro (a regra de sempre); revide mais fraco se ele segue de
// pé depois de um acerto (metade do dano, teto de 25% do HP, sem a pena da certeza); `livre`
// = eu gastei a vez com item ou troca.
function contraAtacar(c: Ctx, e: Encontro, slot: Slot, eu: Lutador, o: { revide: boolean; certeza: boolean; fator?: number; livre?: boolean; primeiro?: boolean }) {
  const { dex, eventos, rolar } = c;
  const { revide } = o;
  const inimigo = dex.especies[e.especie];
  const lider = e.tipo === "lider" || !!e.lendario;
  const gastar = (l: Lutador) => {
    delete l.item;
  };
  // O treinador pode gastar a vez com um item de cura (antes de tudo, como nos jogos).
  if (usarCuraInimigo(c, e, slot)) return;
  // Pedra do Rei: o golpe certo pode fazer o inimigo recuar (sem revide).
  if (revide && eu.item === "kings-rock" && rolar() < 0.1) {
    eventos.push({ tipo: "item", uid: eu.uid, item: "kings-rock", efeito: "recuou" });
    return;
  }
  // O inimigo pode estar sem conseguir agir.
  let preso = false;
  if (e.status === "sleep") {
    e.sono -= 1;
    if (e.sono <= 0) {
      e.status = "";
      eventos.push({ tipo: "inimigoAcordou", status: "sleep", ...comSlot(c, slot) });
    } else preso = true;
  } else if (e.status === "freeze") {
    if (rolar() < 0.2) {
      e.status = "";
      eventos.push({ tipo: "inimigoAcordou", status: "freeze", ...comSlot(c, slot) });
    } else preso = true;
  } else if (e.status === "paralysis" && rolar() < 0.25) preso = true;
  const escolha = preso ? null : escolherGolpeInimigo(c, e, eu, revide);
  if (preso) eventos.push({ tipo: "inimigoImpedido", status: e.status || "paralysis", ...comSlot(c, slot) });
  else if (eu.item === "bright-powder" && rolar() < 0.1) eventos.push({ tipo: "item", uid: eu.uid, item: "bright-powder", efeito: "esquivou" });
  else if (escolha && escolha.status) {
    // Golpe de status (Thunder Wave, Sleep Powder, Toxic...): pode errar ou não pegar.
    const g = dex.golpes[escolha.golpe];
    const cond = g[6] as Status;
    const resultado = statusImune(dex, eu, g) ? "imune" : eu.status ? "ja" : rolar() < (cond === "sleep" ? 0.7 : 0.85) ? "ok" : "errou";
    eventos.push({ tipo: "contraStatus", golpe: escolha.golpe, resultado, uid: eu.uid, ...comSlot(c, slot) });
    if (resultado === "ok") {
      eu.status = cond;
      if (cond === "sleep") eu.sono = 1 + Math.floor(rolar() * 3);
      eventos.push({ tipo: "status", uid: eu.uid, status: cond });
    }
  } else {
    const minha = dex.especies[eu.id];
    const statsI = atributos(inimigo, e.nivel);
    const statsE = atributos(minha, nivelDe(eu));
    const gi = escolha ? escolha.golpe : -1;
    const golpeI = gi >= 0 ? dex.golpes[gi] : INVESTIDA;
    const crit = rolar() < 1 / 16;
    const d = dano({ golpe: golpeI, atacante: inimigo, nivel: e.nivel, atkStats: statsI, defensor: minha, defStats: statsE, critico: crit, aleatorio: 0.85 + rolar() * 0.15 });
    // Imunidade de tipo não livra do erro: a questão acerta "de raspão". Teto por golpe (antes
    // da certeza e do líder): 45% no revide, 55% no erro; um erro só, com HP cheio, nunca
    // encerra a partida.
    let valor = d.efetividade === 0 ? Math.max(1, Math.round(hpMax(dex, eu) * 0.1)) : Math.min(d.valor, Math.ceil(hpMax(dex, eu) * (revide ? TETO_REVIDE : TETO_ERRO)));
    valor = Math.round(valor * (revide ? FATOR_REVIDE : o.certeza ? 1.5 : 1) * (lider ? 1.2 : 1) * (e.status === "burn" && golpeI[3] === 0 ? 0.5 : 1) * (o.fator ?? 1));
    const comFoco = eu.foco > 0;
    if (comFoco) {
      eu.foco -= 1;
      valor = Math.max(1, Math.round(valor / 2));
    }
    valor = Math.max(1, valor);
    // itens que seguram o golpe
    const depoisDoContra: Evento[] = [];
    if (eu.item === "eviolite" && minha.e?.length) valor = Math.max(1, Math.round((valor * 2) / 3));
    const resiste = eu.item ? FRUTA_RESISTE[eu.item] : undefined;
    if (resiste !== undefined && golpeI[1] === resiste && (d.efetividade >= 2 || resiste === 0) && d.efetividade > 0) {
      valor = Math.max(1, Math.round(valor / 2));
      depoisDoContra.push({ tipo: "item", uid: eu.uid, item: eu.item!, efeito: "resistiu" });
      gastar(eu);
    }
    // Inimigo mais rápido ataca antes do meu golpe certo: não derruba, a resposta certa ainda vale.
    let firme = false;
    if (o.primeiro && valor >= eu.hp) {
      firme = eu.hp > 1 || valor > eu.hp;
      valor = Math.max(0, eu.hp - 1);
    }
    if (valor >= eu.hp && eu.hp > 1) {
      if (eu.item === "focus-sash" && eu.hp * 2 >= hpMax(dex, eu)) {
        valor = eu.hp - 1;
        depoisDoContra.push({ tipo: "item", uid: eu.uid, item: "focus-sash", efeito: "segurou" });
        gastar(eu);
      } else if (eu.item === "focus-band" && rolar() < 0.1) {
        valor = eu.hp - 1;
        depoisDoContra.push({ tipo: "item", uid: eu.uid, item: "focus-band", efeito: "segurou" });
      }
    }
    eu.hp = Math.max(0, eu.hp - valor);
    eventos.push(
      {
        tipo: "contra",
        golpe: gi,
        dano: valor,
        efetividade: d.efetividade,
        critico: crit,
        foco: comFoco,
        uid: eu.uid,
        ...(revide ? { revide } : {}),
        ...(o.livre ? { livre: true } : {}),
        ...(o.primeiro ? { primeiro: true } : {}),
        ...(firme ? { firme } : {}),
        ...comSlot(c, slot),
      },
      ...depoisDoContra
    );
    const cond = golpeI[6] as Status;
    if (eu.hp > 0 && !eu.status && STATUS_VALIDOS.includes(cond) && !statusImune(dex, eu, golpeI) && rolar() * 100 < (golpeI[7] || 0)) {
      eu.status = cond;
      if (cond === "sleep") eu.sono = 1 + Math.floor(rolar() * 3);
      eventos.push({ tipo: "status", uid: eu.uid, status: cond });
    }
  }
}

const FATOR_REVIDE = 0.9;
const TETO_REVIDE = 0.5;
const TETO_ERRO = 0.55;

// Meu Pokémon é imune ao status do golpe (veneno em Venenoso/Aço, queimadura em Fogo...)?
function statusImune(dex: Dex, eu: Lutador, g: Golpe): boolean {
  const t = dex.especies[eu.id].t;
  const st = g[6];
  return (
    (st === "poison" && (t.includes(7) || t.includes(16))) ||
    (st === "burn" && t.includes(1)) ||
    (st === "freeze" && t.includes(5)) ||
    (st === "paralysis" && (t.includes(3) || (g[3] === 2 && efetividade(g[1], t) === 0)))
  );
}

// Esperteza do inimigo, como a IA dos jogos: o selvagem escolhe golpe a esmo; o treinador
// comum quase sempre vai no que mais dói; líder, Elite, Campeão, admin e lenda jogam sério
// (o melhor golpe e, quando vale, um golpe de status no meu Pokémon ainda saudável).
function espertezaDe(c: Ctx, e: Encontro): 0 | 1 | 2 {
  if (e.lendario) return 2;
  if (e.treinador < 0) return 0;
  const t = c.q.treinadores[e.treinador];
  return e.tipo === "lider" || t?.lider || t?.admin ? 2 : 1;
}

function escolherGolpeInimigo(c: Ctx, e: Encontro, eu: Lutador, revide: boolean): { golpe: number; status: boolean } | null {
  const { dex, rolar } = c;
  const inimigo = dex.especies[e.especie];
  const minha = dex.especies[eu.id];
  const todos = golpesNoNivel(inimigo, e.nivel);
  const ofensivos = todos.filter((x) => dex.golpes[x][2] > 0 && dex.golpes[x][3] !== 2);
  const statusUteis = todos.filter((x) => {
    const g = dex.golpes[x];
    return g[3] === 2 && STATUS_VALIDOS.includes(g[6] as Status) && !statusImune(dex, eu, g);
  });
  const esperteza = espertezaDe(c, e);
  // golpe de status só no meu Pokémon sem status e com HP para valer a pena
  const fracEu = eu.hp / hpMax(dex, eu);
  const chanceStatus = esperteza === 2 ? 0.35 : esperteza === 1 ? 0.2 : 0.15;
  if (statusUteis.length && !eu.status && fracEu > 0.4 && rolar() < (revide ? chanceStatus : chanceStatus * 0.6)) {
    // dormir > paralisar > o resto
    const peso = (x: number) => ({ sleep: 3, paralysis: 2 } as Record<string, number>)[dex.golpes[x][6]] ?? 1;
    const g = esperteza === 2 ? statusUteis.reduce((a, b) => (peso(b) > peso(a) ? b : a)) : statusUteis[Math.floor(rolar() * statusUteis.length)];
    return { golpe: g, status: true };
  }
  if (!ofensivos.length) return null;
  const statsI = atributos(inimigo, e.nivel);
  const statsE = atributos(minha, nivelDe(eu));
  const forca = (x: number) => dano({ golpe: dex.golpes[x], atacante: inimigo, nivel: e.nivel, atkStats: statsI, defensor: minha, defStats: statsE }).valor;
  const melhor = ofensivos.reduce((a, b) => (forca(b) > forca(a) ? b : a));
  if (esperteza === 2) return { golpe: melhor, status: false };
  if (esperteza === 1 && rolar() < 0.75) return { golpe: melhor, status: false };
  // a esmo, mas golpe que não afeta o meu Pokémon só se não houver outro
  const afetam = ofensivos.filter((x) => forca(x) > 0);
  const pool = afetam.length ? afetam : ofensivos;
  return { golpe: pool[Math.floor(rolar() * pool.length)], status: false };
}

// Treinador com item de cura na bolsa usa quando o Pokémon dele fica no vermelho (o líder,
// sempre; o treinador comum, quase sempre). Full Restore também tira o status. Gasta a vez.
function usarCuraInimigo(c: Ctx, e: Encontro, slot: Slot): boolean {
  const { dex, q, eventos, rolar } = c;
  if (e.treinador < 0 || e.hp <= 0) return false;
  const t = q.treinadores[e.treinador];
  if (!t?.itens?.length) return false;
  const max = atributos(dex.especies[e.especie], e.nivel).hp;
  const frac = e.hp / max;
  const serio = espertezaDe(c, e) === 2;
  if (frac > (serio ? 0.3 : 0.25) || (e.curas ?? 0) >= 2 || rolar() > (serio ? 1 : 0.8)) return false;
  // usa a melhor cura que tiver
  const ordem = ["full-restore", "hyper-potion", "super-potion", "potion"];
  const item = ordem.find((x) => t.itens!.includes(x)) ?? t.itens[0];
  const i = t.itens.indexOf(item);
  q.treinadores = q.treinadores.map((x, k) => (k === e.treinador ? { ...x, itens: x.itens!.filter((_, j) => j !== i) } : x));
  const cura = CURA_ITEM[item] ?? 20;
  const valor = Math.min(max - e.hp, cura === Infinity ? max : cura);
  e.hp += valor;
  e.curas = (e.curas ?? 0) + 1;
  const curouStatus = item === "full-restore" && !!e.status;
  if (curouStatus) {
    e.status = "";
    e.sono = 0;
  }
  eventos.push({ tipo: "itemInimigo", item, treinador: e.treinador, valor, hpInimigo: e.hp, ...(curouStatus ? { curouStatus } : {}), ...comSlot(c, slot) });
  return true;
}

// Velocidade como nos jogos (paralisia corta pela metade): o mais rápido age primeiro.
function inimigoMaisRapido(dex: Dex, e: Encontro, eu: Lutador): boolean {
  const vi = atributos(dex.especies[e.especie], e.nivel).spe * (e.status === "paralysis" ? 0.5 : 1);
  const ve = atributos(dex.especies[eu.id], nivelDe(eu)).spe * (eu.status === "paralysis" ? 0.5 : 1) * (eu.item === "quick-claw" ? 1.2 : 1);
  return vi > ve;
}

// Meu Pokémon dormindo/congelado (ou em 25% dos turnos paralisado) luta pela metade.
function meuImpedido(c: Ctx, eu: Lutador): boolean {
  const { eventos, rolar } = c;
  if (eu.status === "sleep") {
    eu.sono -= 1;
    if (eu.sono <= 0) {
      eu.status = "";
      eventos.push({ tipo: "acordou", uid: eu.uid, status: "sleep" });
      return false;
    }
    return true;
  }
  if (eu.status === "freeze") {
    if (rolar() < 0.3) {
      eu.status = "";
      eventos.push({ tipo: "acordou", uid: eu.uid, status: "freeze" });
      return false;
    }
    return true;
  }
  return eu.status === "paralysis" && rolar() < 0.25;
}

// A resposta certa faz o golpe sair: dano (tipo, STAB, nível, crítico), status ou cura.
function golpear(c: Ctx, eu: Lutador, e: Encontro, slot: Slot, idx: number, critico: boolean, impedido: boolean, lutaram: Lutador[]) {
  const { dex, eventos, rolar } = c;
  const alvo = c.q.dupla ? { alvo: slot } : {};
  if (impedido) eventos.push({ tipo: "impedido", status: eu.status || "paralysis", uid: eu.uid });
  const g = dex.golpes[idx] ?? dex.golpes[0];
  const [, , , classe, dreno, cura] = g;
  if (poderDe(g) > 0 && classe !== 2) {
    const d = danoDaResposta({ dex, eu, e, golpe: g, critico, aleatorio: 0.85 + rolar() * 0.15 });
    const valor = Math.max(1, Math.round((impedido ? d.valor / 2 : d.valor) * multItemAtaque(eu.item, g, d.efetividade)));
    // A lenda nunca desmaia: fica por um fio (1 HP), pronta para a bola.
    const tirou = e.lendario ? Math.max(0, Math.min(e.hp - 1, valor)) : Math.min(e.hp, valor);
    e.hp -= tirou;
    const firme = !!e.lendario && e.hp === 1 && valor > tirou;
    eventos.push({ tipo: "ataque", golpe: idx, efetividade: d.efetividade, critico, semEfeito: d.efetividade === 0, dano: tirou, hpInimigo: e.hp, uid: eu.uid, ...alvo, ...(firme ? { firme } : {}) });
    if (dreno > 0) curar(dex, eu, Math.max(1, ((tirou * dreno) / 100) * (eu.item === "big-root" ? 1.3 : 1)), "dreno", eventos);
    if (eu.item === "shell-bell" && tirou > 0) curarItem(dex, eu, Math.max(1, Math.floor(tirou / 8)), eventos);
    if (eu.item === "life-orb" && tirou > 0) {
      const perde = Math.min(eu.hp, Math.max(1, Math.floor(hpMax(dex, eu) / 10)));
      eu.hp -= perde;
      eventos.push({ tipo: "item", uid: eu.uid, item: "life-orb", efeito: "recuo", valor: perde });
    }
    // efeito secundário (Ember queima 10%, Thunderbolt paralisa 10%...)
    const st = statusDoGolpe(dex, g, e);
    if (e.hp > 0 && st && !st.imune && rolar() * 100 < g[7]) aplicarStatusInimigo(e, st.status, rolar, eventos, comSlot(c, slot));
    if (e.hp <= 0) derrubar(c, e, slot, lutaram);
  } else {
    eventos.push({ tipo: "ataque", golpe: idx, efetividade: 1, critico: false, semEfeito: false, dano: 0, hpInimigo: e.hp, uid: eu.uid, ...alvo });
    const st = statusDoGolpe(dex, g, e);
    if (st) {
      if (st.imune) eventos.push({ tipo: "statusFalhou", status: st.status, motivo: "imune", ...comSlot(c, slot) });
      else if (st.status === "leech-seed" ? e.semente : e.status !== "") eventos.push({ tipo: "statusFalhou", status: st.status, motivo: "ja", ...comSlot(c, slot) });
      else aplicarStatusInimigo(e, st.status, rolar, eventos, comSlot(c, slot));
    } else if (cura > 0) curar(dex, eu, (hpMax(dex, eu) * cura) / 100, "cura", eventos);
    else {
      eu.foco += 1;
      eventos.push({ tipo: "foco", uid: eu.uid });
    }
  }
}

// Bola lançada (só selvagem, só batalha simples, só com a resposta certa).
function lancarBola(c: Ctx, eu: Lutador, e: Encontro, bola: Bola, confianca: Confianca, questaoId: number) {
  const { dex, q, eventos, rolar } = c;
  const inimigo = dex.especies[e.especie];
  q.mochila[bola] -= 1;
  const chance = chanceCaptura(inimigo, bola, confianca, e.hp / atributos(inimigo, e.nivel).hp, e.status !== "" || e.semente, { nivel: e.nivel, turnos: e.turnos ?? 0, jaTem: (q.tem ?? []).includes(e.especie), lendario: !!e.lendario });
  const sucesso = rolar() < chance;
  const balancos = sucesso ? 3 : Math.floor(rolar() * 3);
  if (sucesso) {
    e.fim = "captura";
    const novo = criarMon(dex, e.especie, e.nivel, `m${Date.parse(q.iniciadaEm).toString(36)}${q.registros.length}${Math.floor(rolar() * 1e6).toString(36)}`, {
      questaoId,
      capturadoEm: q.iniciadaEm,
      ...(q.regiao ? { regiao: q.regiao } : {}),
    });
    const paraPc = q.time.length >= MAX_TIME;
    if (paraPc) q.novos.push(novo);
    else q.time.push(lutador(dex, novo));
    eventos.push({ tipo: "bola", bola, sucesso, balancos, uid: novo.uid, paraPc });
    darXp(c, e, [eu]);
  } else eventos.push({ tipo: "bola", bola, sucesso, balancos });
}

// Quem o inimigo ataca: na simples, o meu em campo; na dupla, um dos meus de pé, sorteado.
function alvoDoInimigo(c: Ctx): Lutador | null {
  const vivos = meusEmCampo(c.q)
    .map((i) => c.q.time[i])
    .filter((l) => l.hp > 0);
  if (!vivos.length) return null;
  return c.q.dupla && vivos.length > 1 ? vivos[Math.floor(c.rolar() * vivos.length)] : vivos[0];
}

// Fim do turno: veneno, queimadura e Leech Seed nos inimigos; veneno, queimadura, Restos e
// frutas nos meus; desmaios.
function fimDoTurno(c: Ctx, lutaram: Lutador[]) {
  const { dex, q, eventos } = c;
  inimigosEmCampo(q).forEach((e, k) => {
    if (!dePe(e)) return;
    const slot = k as Slot;
    const maxIni = atributos(dex.especies[e.especie], e.nivel).hp;
    const tique = (status: StatusGolpe) => {
      const t = Math.max(1, Math.floor(maxIni / 8));
      const tirou = e.lendario ? Math.max(0, Math.min(e.hp - 1, t)) : Math.min(e.hp, t);
      if (tirou <= 0) return;
      e.hp -= tirou;
      eventos.push({ tipo: "tiqueInimigo", status, dano: tirou, hpInimigo: e.hp, ...comSlot(c, slot) });
      const quem = lutaram.find((l) => l.hp > 0);
      if (status === "leech-seed" && quem) curar(dex, quem, tirou, "semente", eventos);
    };
    if (e.status === "poison" || e.status === "burn") tique(e.status);
    if (e.hp > 0 && e.semente) tique("leech-seed");
    if (e.hp <= 0) derrubar(c, e, slot, lutaram);
  });
  for (const i of meusEmCampo(q)) {
    const eu = q.time[i];
    if (eu.hp > 0 && (eu.status === "poison" || eu.status === "burn")) {
      const t = Math.max(1, Math.floor(hpMax(dex, eu) / (eu.status === "poison" ? 8 : 16)));
      eu.hp = Math.max(0, eu.hp - t);
      eventos.push({ tipo: "tique", uid: eu.uid, dano: t, status: eu.status });
    }
    if (eu.hp > 0) itensDoFimDoTurno(dex, eu, eventos);
    if (eu.hp <= 0 && !eventos.some((x) => x.tipo === "desmaiou" && x.uid === eu.uid)) {
      eu.status = "";
      eu.foco = 0;
      eventos.push({ tipo: "desmaiou", uid: eu.uid });
      if (!q.fim && !q.time.some((l) => l.hp > 0)) {
        q.fim = "derrota";
        eventos.push({ tipo: "derrota" });
      }
    }
  }
}

// O treinador ficou sem Pokémon (em campo e na fila)?
function conferirTreinadores(c: Ctx, liderDaVez: boolean) {
  const { q, eventos } = c;
  if (q.fim) return;
  for (const e of inimigosEmCampo(q)) {
    if (!e || e.treinador < 0 || !e.fim || e.fim === "fuga") continue;
    const t = e.treinador;
    if (q.vencidos.includes(t) || q.fila.some((x) => x.treinador === t) || inimigosEmCampo(q).some((x) => x && x.treinador === t && !x.fim)) continue;
    q.vencidos.push(t);
    q.recompensa = true; // avancarPoke só oferece se ainda houver luta pela frente
    const insignia = q.treinadores[t]?.insignia;
    eventos.push({ tipo: "treinadorVencido", treinador: t, lider: q.treinadores[t]?.lider ?? liderDaVez, ...(insignia !== undefined ? { insignia } : {}) });
    // Prêmio em dinheiro como nos jogos: valor-base da classe × nível do último Pokémon dele.
    const valor = premioEmDinheiro(q.treinadores[t], e.nivel);
    q.dinheiro = (q.dinheiro ?? DINHEIRO_INICIAL) + valor;
    eventos.push({ tipo: "dinheiro", valor, treinador: t });
    if (insignia !== undefined)
      for (const item of q.premios ?? []) {
        q.mochila[item] = (q.mochila[item] ?? 0) + 1;
        eventos.push({ tipo: "premio", item });
      }
  }
}

export function responderPoke(dex: Dex, p: PartidaPoke, o: OpcoesResposta): { partida: PartidaPoke; eventos: Evento[] } {
  const slotQ = slotDaVez(p);
  const e0 = inimigosEmCampo(p)[slotQ];
  const emCampo0 = meusEmCampo(p).map((i) => p.time[i]);
  if (!e0 || e0.fim || p.fim || p.oferta || !emCampo0[0] || !emCampo0.some((l) => l.hp > 0) || (!p.dupla && emCampo0[0].hp <= 0)) return { partida: p, eventos: [] };
  const bola = "bola" in o.acao ? o.acao.bola : null;
  if (bola && (e0.tipo !== "selvagem" || p.dupla || (p.mochila[bola] ?? 0) <= 0)) return { partida: p, eventos: [] };
  // Ginásio e Liga não têm mato: a questão errada volta dentro da mesma luta (reserva).
  const semMato = p.modo === "ginasio" || p.modo === "liga";
  const c = novoCtx(dex, p);
  const { q, eventos, rolar } = c;
  const inimigos = inimigosEmCampo(q);
  const e = inimigos[slotQ]!;
  const lider = e.tipo === "lider";
  const selvagem = e.tipo === "selvagem";
  const lenda = !!e.lendario;
  const maxIni = atributos(dex.especies[e.especie], e.nivel).hp;
  const questaoDaVez = e.questaoId;
  const retornoDaVez = e.retorno;

  // Meus em campo, cada um com a sua ação: crítico (a certeza; Lente de Mira / Garra Afiada de
  // vez em quando) e se está impedido de lutar direito.
  marcarParticipantes(q);
  const lutaram = meusEmCampo(q).map((i) => q.time[i]);
  const plano = lutaram.map((l, k) => {
    const acao: Acao = k === 0 ? o.acao : (o.acao2 ?? { golpe: l.golpes[0] ?? 0 });
    if (l.hp <= 0) return null;
    let critico = o.acertou && o.confianca === "certeza";
    if (o.acertou && !critico && !("bola" in acao) && (l.item === "scope-lens" || l.item === "razor-claw") && rolar() < 1 / 8) critico = true;
    return { l, acao, critico, impedido: meuImpedido(c, l) };
  });

  if (o.acertou) {
    q.combo += 1;
    // Inimigo mais rápido que o meu age antes do golpe (sem derrubar: a resposta certa vale).
    // Contra a bola não: capturar é a vez do jogador.
    const agiu = new Set<number>();
    if (!bola)
      inimigos.forEach((ini, k) => {
        if (!dePe(ini)) return;
        const alvo = alvoDoInimigo(c);
        if (!alvo || !inimigoMaisRapido(dex, ini, alvo)) return;
        agiu.add(k);
        contraAtacar(c, ini, k as Slot, alvo, { revide: true, certeza: false, primeiro: true });
      });
    for (const a of plano) {
      if (!a || a.l.hp <= 0) continue;
      if ("bola" in a.acao) {
        lancarBola(c, a.l, e, a.acao.bola, o.confianca, questaoDaVez);
        continue;
      }
      // alvo escolhido; se ele já caiu neste turno, o outro
      const quer = q.dupla ? (a.acao.alvo ?? slotQ) : 0;
      const slot = (dePe(inimigos[quer]) ? quer : inimigos.findIndex(dePe)) as Slot | -1;
      if (slot < 0) break;
      golpear(c, a.l, inimigos[slot]!, slot as Slot, a.acao.golpe ?? a.l.golpes[0], a.critico, a.impedido, lutaram);
    }
    const primeiro = lutaram.find((l) => l.hp > 0);
    if (q.combo % 3 === 0 && primeiro) curar(dex, primeiro, hpMax(dex, primeiro) * 0.1, "combo", eventos);
    // Inimigo de pé (e mais lento) revida (a bola que pegou encerra a luta antes).
    inimigos.forEach((ini, k) => {
      if (!dePe(ini) || agiu.has(k)) return;
      const alvo = alvoDoInimigo(c);
      if (alvo) contraAtacar(c, ini, k as Slot, alvo, { revide: true, certeza: false });
    });
  } else {
    q.combo = 0;
    eventos.push({ tipo: "errou" });
    inimigos.forEach((ini, k) => {
      if (!dePe(ini)) return;
      const alvo = alvoDoInimigo(c);
      if (alvo) contraAtacar(c, ini, k as Slot, alvo, { revide: false, certeza: o.confianca === "certeza", fator: q.dupla ? FATOR_DUPLA : 1 });
    });
    // A questão errada volta uma vez: selvagem mais adiante (ou na reserva, contra o chefe e
    // em ginásio/Liga). Errou de novo, fica para a revisão espaçada.
    if (!retornoDaVez) {
      if (lider || semMato || lenda) q.reserva.splice(Math.min(2, q.reserva.length), 0, { questaoId: questaoDaVez, retorno: true });
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
      eventos.push({ tipo: "voltaDepois", selvagem: !lider && !semMato && !lenda });
    }
  }

  fimDoTurno(c, lutaram);

  // O inimigo da vez segue de pé: a próxima questão vem da reserva. Sem reserva (ou na 3ª
  // questão contra ele), acabou a luta: desmaia de cansaço se eu acertei com golpe. Se eu
  // errei (ou ele escapou da bola), o selvagem foge; Pokémon de treinador não foge: volta uma
  // questão já feita nesta partida (a mais antiga, recuperação espaçada dentro da própria luta).
  // A lenda não desmaia nem foge no erro: segue até TURNOS_LENDA questões e então volta para
  // o santuário (a caçada pode ser repetida).
  e.turnos = (e.turnos ?? 0) + 1;
  if (!e.fim && !q.fim) {
    // cada cura do treinador rende um turno a mais
    const esgotou = lenda ? e.turnos >= TURNOS_LENDA : e.turnos >= MAX_TURNOS_POKEMON + (lider ? 1 : 0) + (e.curas ?? 0) && o.acertou;
    let prox = esgotou ? undefined : q.reserva.shift();
    if (!prox && !esgotou && (lenda || !selvagem)) {
      const vezes = new Map<number, number>();
      for (const r of q.registros) vezes.set(r.questaoId, (vezes.get(r.questaoId) ?? 0) + 1);
      vezes.set(questaoDaVez, (vezes.get(questaoDaVez) ?? 0) + 1);
      const [id] = [...vezes.entries()].filter(([x]) => x !== questaoDaVez).sort((a, b) => a[1] - b[1])[0] ?? [questaoDaVez];
      prox = { questaoId: id, retorno: true };
    }
    if (prox) {
      e.questaoId = prox.questaoId;
      e.retorno = prox.retorno;
    } else if (o.acertou && !bola && !lenda) {
      eventos.push({ tipo: "exausto", ...comSlot(c, slotQ) });
      derrubar(c, e, slotQ, lutaram);
    } else {
      e.fim = "fuga";
      eventos.push({ tipo: "fuga", ...comSlot(c, slotQ), ...(lenda ? { lenda } : {}) });
    }
  }
  // na dupla, a próxima questão é do outro inimigo
  if (q.dupla) q.vez = slotQ === 0 ? 1 : 0;

  conferirTreinadores(c, lider);
  q.aprender = comPendentes(p.aprender, eventos);
  q.registros.push({ questaoId: questaoDaVez, acertou: o.acertou, confianca: o.confianca, retorno: retornoDaVez, chefe: lider, capturada: e.fim === "captura" });
  return { partida: q, eventos };
}

// Item da mochila ou troca de Pokémon no meio da luta: gasta a vez, e os inimigos de pé atacam
// (como nos jogos). Não responde questão: a da vez continua valendo.
export function turnoSemQuestao(dex: Dex, p: PartidaPoke, a: AcaoLivre): { partida: PartidaPoke; eventos: Evento[] } {
  const nada = { partida: p, eventos: [] as Evento[] };
  if (p.fim || p.oferta || !lutaAtiva(p)) return nada;
  const c = novoCtx(dex, p);
  const { q, eventos } = c;
  if ("item" in a) {
    const l = q.time[a.alvo];
    if (!l || (q.mochila[a.item] ?? 0) <= 0 || !podeUsar(dex, l, a.item, limiteDaRegiao(q.regiao), q.cap)) return nada;
    q.mochila[a.item] -= 1;
    eventos.push({ tipo: "usouItem", item: a.item, uid: l.uid });
    aplicarItem(dex, l, a.item, eventos, limiteDaRegiao(q.regiao));
  } else {
    marcarParticipantes(q);
    const slot = a.slot ?? 0;
    const campo = meusEmCampo(q);
    const sai = campo[slot];
    const entra = q.time[a.troca];
    if (sai === undefined || !entra || entra.hp <= 0 || campo.includes(a.troca)) return nada;
    if (slot === 0) q.ativo = a.troca;
    else q.ativo2 = a.troca;
    eventos.push({ tipo: "trocou", slot, de: q.time[sai].uid, para: entra.uid });
  }
  marcarParticipantes(q);
  const lutaram = meusEmCampo(q).map((i) => q.time[i]);
  inimigosEmCampo(q).forEach((ini, k) => {
    if (!dePe(ini)) return;
    const alvo = alvoDoInimigo(c);
    if (alvo) contraAtacar(c, ini, k as Slot, alvo, { revide: false, certeza: false, fator: q.dupla ? FATOR_DUPLA : 1, livre: true });
  });
  fimDoTurno(c, lutaram);
  conferirTreinadores(c, false);
  q.aprender = comPendentes(p.aprender, eventos);
  return { partida: q, eventos };
}

function aplicarStatusInimigo(e: Encontro, status: StatusGolpe, rolar: () => number, eventos: Evento[], extra: { slot?: Slot } = {}) {
  if (status === "leech-seed") {
    if (e.semente) return;
    e.semente = true;
  } else {
    if (e.status) return;
    e.status = status;
    if (status === "sleep") e.sono = 1 + Math.floor(rolar() * 3);
  }
  eventos.push({ tipo: "statusInimigo", status, ...extra });
}

// A questão da vez sumiu do acervo: passa para a próxima da reserva (ou encerra a luta com
// esse Pokémon, sem XP). Não grava nada.
export function pularQuestao(p: PartidaPoke): PartidaPoke {
  const slot = slotDaVez(p);
  const e = inimigosEmCampo(p)[slot];
  if (!e || e.fim) return p;
  const reserva = [...p.reserva];
  const prox = reserva.shift();
  const novo: Encontro = prox ? { ...e, questaoId: prox.questaoId, retorno: prox.retorno } : { ...e, fim: "fuga" };
  return slot === 0 ? { ...p, reserva, atual: novo } : { ...p, reserva, par: novo };
}

// Sai da batalha dupla (os dois lados voltam a ter um Pokémon em campo).
function semDupla(p: PartidaPoke): PartidaPoke {
  if (!p.dupla && p.par === undefined && p.ativo2 === undefined) return p;
  const q = { ...p };
  delete q.dupla;
  delete q.par;
  delete q.ativo2;
  delete q.vez;
  return q;
}


// Próximo encontro, ou a recompensa de quem acabou de vencer um treinador. Na dupla, um slot
// que caiu recebe o próximo Pokémon do mesmo treinador. Começando uma batalha nova depois de
// outra, a partida para (`parada`): hora de organizar o time, usar item, passar no Centro.
export function avancarPoke(p: PartidaPoke, dex?: Dex): PartidaPoke {
  if (p.fim || p.oferta) return p;
  if (p.dupla) {
    const dono = (p.atual ?? p.par)?.treinador ?? -1;
    const q: PartidaPoke = { ...p, fila: [...p.fila] };
    let mudou = false;
    for (const k of [0, 1] as Slot[]) {
      const e = k === 0 ? q.atual : q.par;
      if (e && !e.fim) continue;
      if (dono < 0 || q.fila[0]?.treinador !== dono) continue;
      const novo = q.fila.shift()!;
      if (k === 0) q.atual = novo;
      else q.par = novo;
      mudou = true;
    }
    if (lutaAtiva(q)) return mudou ? q : p;
    p = semDupla(q);
  }
  if (p.atual && !p.atual.fim) return p; // a luta com esse Pokémon continua
  if (p.recompensa && p.fila.length > 0) return sortearOferta({ ...p, recompensa: false, atual: null }, dex);
  const q: PartidaPoke = { ...p, fila: [...p.fila], recompensa: false };
  const prox = q.fila.shift() ?? null;
  q.atual = prox;
  if (!prox) {
    q.fim = "vitoria";
    return q;
  }
  const t = q.treinadores[prox.treinador];
  if (t?.dupla && q.fila[0]?.treinador === prox.treinador) {
    q.dupla = true;
    q.par = q.fila.shift()!;
    q.vez = 0;
    const segundo = q.time.findIndex((l, i) => i !== q.ativo && l.hp > 0);
    if (segundo >= 0) q.ativo2 = segundo;
  }
  if (p.ultimoTreinador !== undefined && (prox.treinador < 0 || prox.treinador !== p.ultimoTreinador)) {
    // Antes do líder do ginásio, o time é curado sozinho; no caminho não há Centro (só a mochila).
    if (q.modo === "ginasio" && prox.tipo === "lider") {
      q.time = q.time.map((l) => (dex ? { ...l, hp: hpMax(dex, l), status: "" as Status, sono: 0, foco: 0 } : l));
      q.parada = { centro: false, curadoAuto: true };
    } else q.parada = { centro: false };
  }
  q.ultimoTreinador = prox.treinador;
  return q;
}

// Algum dos meus em campo desmaiou e há quem entrar no lugar? (slot que precisa da troca)
export function slotParaTrocar(p: PartidaPoke): Slot | null {
  if (p.fim) return null;
  const campo = meusEmCampo(p);
  if (!p.time.some((l, i) => l.hp > 0 && !campo.includes(i))) return null;
  const k = campo.findIndex((i) => (p.time[i]?.hp ?? 0) <= 0);
  return k < 0 ? null : (k as Slot);
}
export const precisaTrocar = (p: PartidaPoke) => slotParaTrocar(p) !== null;

// Troca livre (o Pokémon em campo desmaiou, ou fora da luta). No meio da luta, trocar gasta a
// vez: turnoSemQuestao.
export function trocar(p: PartidaPoke, idx: number, slot: Slot = slotParaTrocar(p) ?? 0): PartidaPoke {
  if (p.fim || !p.time[idx] || p.time[idx].hp <= 0 || meusEmCampo(p).includes(idx)) return p;
  return slot === 1 && p.dupla ? { ...p, ativo2: idx } : { ...p, ativo: idx };
}

// ---------- parada entre batalhas ----------

// Muda a ordem do time (o primeiro de pé abre a próxima luta; na dupla, os dois primeiros).
export function moverNoTime(p: PartidaPoke, de: number, para: number): PartidaPoke {
  if (!p.parada || !p.time[de] || !p.time[para] || de === para) return p;
  const time = [...p.time];
  const [m] = time.splice(de, 1);
  time.splice(para, 0, m);
  return emCampoPelaOrdem({ ...p, time });
}

function emCampoPelaOrdem(p: PartidaPoke): PartidaPoke {
  const vivos = p.time.map((l, i) => (l.hp > 0 ? i : -1)).filter((i) => i >= 0);
  const q: PartidaPoke = { ...p, ativo: vivos[0] ?? 0 };
  if (p.dupla) {
    if (vivos[1] !== undefined) q.ativo2 = vivos[1];
    else delete q.ativo2;
  }
  return q;
}

// Centro Pokémon: HP e status de todo o time, uma vez por parada que tenha um.
export function centroPokemon(dex: Dex, p: PartidaPoke): PartidaPoke {
  if (!p.parada?.centro || p.parada.curou) return p;
  const time = p.time.map((l) => ({ ...l, hp: hpMax(dex, l), status: "" as Status, sono: 0, foco: 0 }));
  return emCampoPelaOrdem({ ...p, time, parada: { ...p.parada, curou: true } });
}

// ---------- dinheiro e Poké Mart ----------

export const DINHEIRO_INICIAL = 3000; // o que a mãe dá no começo dos jogos
export const dinheiroDe = (perfil: PerfilPoke) => perfil.dinheiro ?? DINHEIRO_INICIAL;

// Valor-base do prêmio por classe de treinador (como nos jogos, × nível do último Pokémon).
export function premioEmDinheiro(t: Treinador | undefined, nivel: number): number {
  if (!t) return 0;
  const base = t.campeao ? 200 : t.elite ? 120 : t.insignia !== undefined ? 100 : t.admin ? 80 : t.lider ? 60 : t.dupla ? 48 : 28;
  return base * Math.max(1, nivel);
}

// Compra no Poké Mart. 10 Poké Balls de uma vez dão uma Premier Ball de brinde.
function comprar(dinheiro: number, mochila: Record<string, number>, insignias: number, item: string, qtd: number): { dinheiro: number; mochila: Record<string, number> } | null {
  const linha = lojaDe(insignias).find(([i]) => i === item);
  if (!linha || qtd < 1 || !Number.isInteger(qtd)) return null;
  const custo = linha[1] * qtd;
  if (custo > dinheiro) return null;
  const nova = { ...mochila, [item]: (mochila[item] ?? 0) + qtd };
  if (item === "poke-ball" && qtd >= 10) nova["premier-ball"] = (nova["premier-ball"] ?? 0) + Math.floor(qtd / 10);
  return { dinheiro: dinheiro - custo, mochila: nova };
}
export function comprarNaPartida(p: PartidaPoke, item: string, qtd = 1): PartidaPoke {
  if (!p.parada?.loja) return p;
  const r = comprar(p.dinheiro ?? DINHEIRO_INICIAL, p.mochila, p.insignias ?? 0, item, qtd);
  return r ? { ...p, ...r } : p;
}
export function comprarNoPerfil(perfil: PerfilPoke, item: string, qtd = 1): PerfilPoke {
  const r = comprar(dinheiroDe(perfil), perfil.mochila, insigniasDe(perfil), item, qtd);
  return r ? { ...perfil, ...r } : perfil;
}

export function seguirViagem(p: PartidaPoke): PartidaPoke {
  if (!p.parada) return p;
  return emCampoPelaOrdem({ ...p, parada: null });
}


// ---------- itens ----------

// Recompensa de treinador vencido: 3 itens sorteados do catálogo (4 com a Moeda Amuleto no
// time), pelos pesos de itens.ts; itens melhores aparecem com mais insígnias.
function poolOferta(insignias: number): [string, number][] {
  return Object.entries(ITENS)
    .filter(([id, x]) => x.peso > 0 && x.cat !== "chave" && x.min <= insignias && id !== "safari-ball")
    .map(([id, x]) => [id, x.peso]);
}

export function sortearOferta(p: PartidaPoke, dex?: Dex): PartidaPoke {
  let rng = p.rng;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };
  // Pedra útil para o time, se houver.
  const uteis = dex ? PEDRAS.filter((s) => p.time.some((l) => evolucaoPorPedra(dex.especies[l.id], s, ateParaEvoluir(l.id, limiteDaRegiao(p.regiao))))) : [];
  const quantos = p.time.some((l) => l.item === "amulet-coin") ? 4 : 3;
  const escolhidas: string[] = [];
  // Com alguém desmaiado, sempre há algo que ajude.
  if (p.time.some((l) => l.hp <= 0)) escolhidas.push("revive");
  const pool = poolOferta(p.insignias ?? 0);
  const total = pool.reduce((a, [, w]) => a + w, 0);
  for (let t = 0; escolhidas.length < quantos && t < 80; t++) {
    let r = rolar() * total;
    let item = pool[0][0];
    for (const [nome, w] of pool) {
      if ((r -= w) < 0) {
        item = nome;
        break;
      }
    }
    if (PEDRAS.includes(item) && uteis.length) item = uteis[Math.floor(rolar() * uteis.length)];
    if (!escolhidas.includes(item)) escolhidas.push(item);
  }
  return { ...p, oferta: escolhidas, rng };
}

export function escolherOferta(p: PartidaPoke, item: string, dex?: Dex): PartidaPoke {
  if (!p.oferta?.includes(item)) return p;
  const q: PartidaPoke = { ...p, oferta: null, mochila: { ...p.mochila, [item]: (p.mochila[item] ?? 0) + 1 } };
  return avancarPoke(q, dex);
}

// Usar item (fora a bola, que é ação de turno). Não gasta turno: o inimigo só age no erro.
export function podeUsar(dex: Dex, l: Lutador, item: string, ate = Infinity, cap = MAX_NIVEL): boolean {
  if (item === "full-restore") return l.hp > 0 && (l.hp < hpMax(dex, l) || l.status !== "");
  if (item in CURA_ITEM) return l.hp > 0 && l.hp < hpMax(dex, l);
  if (item in REVIVER) return l.hp <= 0;
  if (item in CURA_STATUS) return l.hp > 0 && l.status !== "" && (CURA_STATUS[item] === "*" || CURA_STATUS[item] === l.status);
  if (item === "rare-candy") return nivelDe(l) < Math.min(MAX_NIVEL, cap);
  if (PEDRAS.includes(item)) return evolucaoPorPedra(dex.especies[l.id], item, ateParaEvoluir(l.id, ate)) !== null;
  return false;
}

// Usar item fora da luta (na parada, no fim): não gasta vez. No meio da luta, o item gasta a
// vez e o inimigo ataca: turnoSemQuestao.
export function usarItem(dex: Dex, p: PartidaPoke, item: string, alvo: number): { partida: PartidaPoke; eventos: Evento[] } {
  const l0 = p.time[alvo];
  if (!l0 || p.fim || (p.mochila[item] ?? 0) <= 0 || !podeUsar(dex, l0, item, limiteDaRegiao(p.regiao), p.cap)) return { partida: p, eventos: [] };
  const q: PartidaPoke = { ...p, time: p.time.map((l) => ({ ...l, golpes: [...l.golpes] })), mochila: { ...p.mochila, [item]: p.mochila[item] - 1 } };
  const eventos: Evento[] = [];
  aplicarItem(dex, q.time[alvo], item, eventos, limiteDaRegiao(p.regiao));
  q.aprender = comPendentes(p.aprender, eventos);
  return { partida: q, eventos };
}

function aplicarItem(dex: Dex, l: Lutador, item: string, eventos: Evento[], ate: number) {
  if (item in CURA_ITEM || item in CURA_STATUS) {
    if (item in CURA_ITEM) curar(dex, l, Math.min(hpMax(dex, l), CURA_ITEM[item]), "item", eventos);
    if (item in CURA_STATUS && l.status) {
      eventos.push({ tipo: "acordou", uid: l.uid, status: l.status });
      l.status = "";
      l.sono = 0;
    }
  } else if (item in REVIVER) {
    l.hp = Math.max(1, Math.floor(hpMax(dex, l) * REVIVER[item]));
    eventos.push({ tipo: "cura", uid: l.uid, valor: l.hp, motivo: "item" });
  } else if (item === "rare-candy") {
    const antes = nivelDe(l);
    const hpAntes = hpMax(dex, l);
    l.xp = Math.max(l.xp, xpDoNivel(antes + 1));
    subiuPara(dex, l, antes, hpAntes, eventos, ate);
  } else {
    const para = evolucaoPorPedra(dex.especies[l.id], item, ateParaEvoluir(l.id, ate));
    if (para) evoluir(dex, l, para, eventos);
  }
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
  historiaPorRegiao?: number[]; // treinadores vencidos no caminho desde a última insígnia da região
  criadoEm?: string; // ISO; comparado com Usuario.pokeResetAt
  expAllDesligado?: boolean; // Exp. All na mochila, mas desligado pelo jogador
  dinheiro?: number; // Pokédólares (ausente = DINHEIRO_INICIAL)
  ajudantesGinasio?: Record<string, number>; // "região:ginásio" -> ajudantes já vencidos lá
  registrados?: number[]; // Pokédex: espécies que já estiveram na coleção (evoluir não apaga a anterior)
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

// Modo história: o líder do ginásio só aceita o desafio depois de X treinadores vencidos no
// caminho até a cidade (5 nos dois primeiros, crescendo até 8 nos dois últimos). Os
// treinadores do caminho contam em qualquer desfecho (fugir depois de vencer dois vale dois).
export const treinadoresParaGinasio = (i: number) => 5 + Math.floor(i / 2);
export const historiaDe = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => perfil.historiaPorRegiao?.[r] ?? 0;
export function liderLiberado(perfil: PerfilPoke, r = regiaoAtual(perfil)): boolean {
  const i = insigniasDe(perfil, r);
  return !!REGIOES[r].ginasios[i] && historiaDe(perfil, r) >= treinadoresParaGinasio(i);
}

// O caminho até o ginásio fica concluído (e fechado) quando já não falta treinador; o próximo
// abre ao ganhar a insígnia. Sem ginásio pela frente (Estrada Vitória), sempre aberto.
export const caminhoConcluido = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => liderLiberado(perfil, r);
export const faltamNoCaminho = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => {
  const i = insigniasDe(perfil, r);
  return REGIOES[r].ginasios[i] ? Math.max(0, treinadoresParaGinasio(i) - historiaDe(perfil, r)) : 0;
};
// Ajudantes do ginásio já vencidos (ficam de fora da próxima tentativa; só o líder espera).
export const chaveGinasio = (r: number, i: number) => `${r}:${i}`;
export const ajudantesVencidos = (perfil: PerfilPoke, r = regiaoAtual(perfil), i = insigniasDe(perfil, r)) => perfil.ajudantesGinasio?.[chaveGinasio(r, i)] ?? 0;

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

// ---------- Rastro Lendário ----------

// Abre antes do último ginásio da região (7 insígnias) ou sendo Campeão, para lendárias e
// míticas igual. Lendas de regiões que ficaram para trás seguem abertas.
export const rastroLiberado = (perfil: PerfilPoke, r = regiaoAtual(perfil)) => insigniasDe(perfil, r) >= INSIGNIAS_RASTRO || campeaoDe(perfil, r) > 0;
export function lendaLiberada(perfil: PerfilPoke, l: Lenda): boolean {
  const r = regiaoAtual(perfil);
  if (l.regiao > r) return false;
  return l.regiao < r || rastroLiberado(perfil, r);
}
// Como nos jogos, cada lenda é uma só: capturada, o rastro dela se fecha.
export const lendaCapturada = (perfil: PerfilPoke, id: number) => perfil.colecao.some((m) => m.id === id);

// Pokédex: capturado = está na coleção ou já esteve (antes de evoluir).
export function capturadosDex(perfil: PerfilPoke): Set<number> {
  return new Set([...(perfil.registrados ?? []), ...perfil.colecao.map((m) => m.id)]);
}

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
  return { versao: 1, colecao: [m], time: [m.uid], mochila: { ...MOCHILA_INICIAL }, insignias: 0, partidas: 0, vitorias: 0, vistos: [inicial], capturadasQuestoes: [], criadoEm: new Date().toISOString(), dinheiro: DINHEIRO_INICIAL };
}

const soMon = ({ uid, id, xp, golpes, questaoId, capturadoEm, regiao, item }: Mon): Mon => ({
  uid,
  id,
  xp,
  golpes,
  ...(questaoId ? { questaoId } : {}),
  ...(capturadoEm ? { capturadoEm } : {}),
  ...(regiao ? { regiao } : {}),
  ...(item ? { item } : {}),
});

// Troca o item que um Pokémon segura: o que ele segurava volta para a mochila. null = só tirar.
function trocarSegurado<T extends Mon>(mochila: Record<string, number>, m: T, item: string | null): { mochila: Record<string, number>; mon: T } | null {
  if (item && (!seguravel(item) || (mochila[item] ?? 0) <= 0)) return null;
  const nova = { ...mochila };
  if (m.item) nova[m.item] = (nova[m.item] ?? 0) + 1;
  if (item) nova[item] -= 1;
  for (const k of Object.keys(nova)) if (nova[k] <= 0) delete nova[k];
  const mon: T = { ...m };
  if (item) mon.item = item;
  else delete mon.item;
  return { mochila: nova, mon };
}

// Item segurado no lobby (fora de partida).
export function darItem(perfil: PerfilPoke, uid: string, item: string | null): PerfilPoke {
  const m = perfil.colecao.find((x) => x.uid === uid);
  const r = m && trocarSegurado(perfil.mochila, m, item);
  if (!r) return perfil;
  return { ...perfil, mochila: r.mochila, colecao: perfil.colecao.map((x) => (x.uid === uid ? r.mon : x)) };
}

// Item segurado no meio da jornada: só na parada entre uma batalha e outra (como nos jogos,
// mexer no item fora da luta não gasta vez). O perfil acompanha por sincronizarPerfil.
export function darItemNaPartida(p: PartidaPoke, idx: number, item: string | null): PartidaPoke {
  const l = p.time[idx];
  if (!p.parada || p.fim || !l) return p;
  const r = trocarSegurado(p.mochila, l, item);
  if (!r) return p;
  return { ...p, mochila: r.mochila, time: p.time.map((x, i) => (i === idx ? r.mon : x)) };
}

// Itens-chave já ganhos (na mochila ou segurados por alguém): não repetem como prêmio.
export const itensPossuidos = (perfil: PerfilPoke) => [
  ...Object.keys(perfil.mochila).filter((k) => perfil.mochila[k] > 0),
  ...perfil.colecao.map((m) => m.item).filter((x): x is string => !!x),
];
export const expAllLigado = (perfil: PerfilPoke) => (perfil.mochila["exp-all"] ?? 0) > 0 && !perfil.expAllDesligado;

// Leva o que aconteceu na partida para o perfil: níveis, golpes, evoluções, capturas e a
// mochila. Idempotente (pode rodar a cada turno). Estatísticas só somam uma vez, no fim.
export function sincronizarPerfil(perfil: PerfilPoke, p: PartidaPoke): PerfilPoke {
  const porUid = new Map(perfil.colecao.map((m) => [m.uid, m]));
  for (const l of [...p.time, ...p.novos]) porUid.set(l.uid, soMon(l));
  const colecao = [...porUid.values()];
  const vistos = new Set(perfil.vistos);
  if (p.atual) vistos.add(p.atual.especie);
  if (p.par) vistos.add(p.par.especie);
  for (const l of [...p.time, ...p.novos]) vistos.add(l.id);
  const registrados = new Set([...(perfil.registrados ?? []), ...colecao.map((m) => m.id)]);
  const capt = new Set(perfil.capturadasQuestoes);
  for (const m of [...p.time, ...p.novos]) if (m.questaoId) capt.add(m.questaoId);
  const novo: PerfilPoke = {
    ...perfil,
    colecao,
    time: p.time.map((l) => l.uid),
    mochila: semSafari(p.mochila),
    vistos: [...vistos],
    capturadasQuestoes: [...capt],
    registrados: [...registrados],
    ...(p.dinheiro !== undefined ? { dinheiro: p.dinheiro } : {}),
  };
  if (p.modo === "ginasio" && p.ginasio !== undefined) {
    const k = chaveGinasio(REGIOES[p.regiao ?? 0] ? (p.regiao ?? 0) : 0, p.ginasio);
    const ajud = (p.ajudantesAntes ?? 0) + p.vencidos.filter((i) => !p.treinadores[i]?.lider).length;
    if (ajud > (perfil.ajudantesGinasio?.[k] ?? 0)) novo.ajudantesGinasio = { ...perfil.ajudantesGinasio, [k]: ajud };
  }
  if (p.fim && perfil.ultimaContada !== p.iniciadaEm) {
    novo.partidas += 1;
    const rp = REGIOES[p.regiao ?? 0] ? (p.regiao ?? 0) : 0;
    if ((p.modo ?? "rota") === "rota" && p.vencidos.length && rp === regiaoAtual(novo)) {
      const lista = REGIOES.map((_, i) => historiaDe(novo, i));
      lista[rp] += p.vencidos.length;
      novo.historiaPorRegiao = lista;
    }
    if (p.fim === "vitoria") {
      novo.vitorias += 1;
      const venceu = (f: (t: Treinador) => boolean) => p.treinadores.some((t, i) => f(t) && p.vencidos.includes(i));
      const r = REGIOES[p.regiao ?? 0] ? (p.regiao ?? 0) : 0;
      if (p.modo === "ginasio" && p.ginasio !== undefined && venceu((t) => t.insignia === p.ginasio)) {
        const lista = REGIOES.map((_, i) => insigniasDe(novo, i));
        lista[r] = Math.max(lista[r], p.ginasio + 1);
        novo.insigniasPorRegiao = lista;
        if (r === 0) novo.ginasios = lista[0];
        const historia = REGIOES.map((_, i) => historiaDe(novo, i));
        historia[r] = 0; // o caminho até o próximo ginásio começa do zero
        novo.historiaPorRegiao = historia;
        if (novo.ajudantesGinasio) {
          const resto = { ...novo.ajudantesGinasio };
          delete resto[chaveGinasio(r, p.ginasio)];
          novo.ajudantesGinasio = resto;
        }
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
