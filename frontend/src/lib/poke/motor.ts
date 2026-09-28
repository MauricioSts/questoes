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
// Funções puras: a tela chama, guarda o resultado e anima os eventos.
import type { Confianca, Candidata, Registro } from "../batalha";
import { intercalar } from "../batalha";
import {
  MAX_GOLPES,
  MAX_NIVEL,
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
}

export interface Lutador extends Mon {
  hp: number;
  status: Status;
  sono: number; // turnos de sono restantes
  foco: number; // próximos contra-ataques pela metade
}

export type TipoEncontro = "treinador" | "selvagem" | "lider";

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
  fim?: "ko" | "captura" | "fuga";
}

export interface QuestaoReserva {
  questaoId: number;
  retorno: boolean;
}

export interface Treinador {
  nome: string;
  sprite: string;
  lider: boolean;
}

export type Bola = "poke-ball" | "great-ball" | "ultra-ball";
export const BOLAS: Bola[] = ["poke-ball", "great-ball", "ultra-ball"];
export const MULT_BOLA: Record<Bola, number> = { "poke-ball": 1, "great-ball": 1.5, "ultra-ball": 2 };

export const PEDRAS = ["fire-stone", "water-stone", "thunder-stone", "leaf-stone", "moon-stone", "sun-stone", "shiny-stone", "dusk-stone", "dawn-stone", "ice-stone"];
export type Item = Bola | "potion" | "super-potion" | "hyper-potion" | "revive" | "full-heal" | "rare-candy" | (string & {});

export interface PartidaPoke {
  versao: 3;
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
  | { tipo: "nivel"; uid: string; nivel: number }
  | { tipo: "aprendeu"; uid: string; golpe: number; esqueceu: number | null }
  | { tipo: "evolui"; uid: string; de: number; para: number }
  | { tipo: "cura"; uid: string; valor: number; motivo: "dreno" | "cura" | "combo" | "licao" | "item" | "semente" }
  | { tipo: "foco"; uid: string }
  | { tipo: "errou" }
  | { tipo: "contra"; golpe: number; dano: number; efetividade: number; critico: boolean; foco: boolean }
  | { tipo: "status"; uid: string; status: Status }
  | { tipo: "tique"; uid: string; dano: number; status: Status }
  | { tipo: "acordou"; uid: string; status: Status }
  | { tipo: "desmaiou"; uid: string }
  | { tipo: "fuga" }
  | { tipo: "treinadorVencido"; treinador: number; lider: boolean }
  | { tipo: "derrota" };

export const MIN_LICAO = 12;
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
const LIDERES = ["brock", "misty", "elesa", "clay", "lenora", "skyla", "drayden", "iris", "burgh", "roxie", "marlon", "brycen", "cynthia"];
const NOMES_TREINADOR: Record<string, string> = {
  teacher: "Professora", schoolkidf: "Estudante", lass: "Moça", artist: "Artista", sailor: "Marinheiro",
  swimmerf: "Nadadora", backpacker: "Mochileiro", pilot: "Piloto", policeman: "Policial", gentleman: "Cavalheiro",
  veteran: "Veterano", blackbelt: "Faixa-preta", psychic: "Médium", psychicf: "Médium", scientist: "Cientista",
  pokemaniac: "Pokémaníaco", scientistf: "Cientista", clerk: "Analista", worker: "Operário", hiker: "Alpinista",
  guitarist: "Guitarrista", clerkf: "Analista", burglar: "Hacker", youngster: "Garoto", acetrainer: "Treinador Ás",
  acetrainerf: "Treinadora Ás", bugcatcher: "Caçador de Insetos", fisherman: "Pescador", birdkeeper: "Criador de Aves",
  waitress: "Garçonete",
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function tiposDaMateria(materia: string): { tipos: number[] | null; treinadores: string[] } {
  const m = semAcento(materia);
  const achou = TIPOS_DA_MATERIA.find(([re]) => re.test(m));
  return achou ? { tipos: achou[1], treinadores: achou[2] } : { tipos: null, treinadores: TREINADORES_GERAIS };
}

// Espécies "de base" (sem pré-evolução, não lendárias), por tipo. Memorizado por dex.
const bases = new WeakMap<Dex, Map<number | "todas", number[]>>();
function basesPorTipo(dex: Dex, tipo: number | "todas"): number[] {
  let mapa = bases.get(dex);
  if (!mapa) bases.set(dex, (mapa = new Map()));
  let lista = mapa.get(tipo);
  if (!lista) {
    lista = Object.entries(dex.especies)
      .filter(([, e]) => !e.p && !e.l && (tipo === "todas" || e.t.includes(tipo)))
      .map(([id]) => Number(id));
    mapa.set(tipo, lista);
  }
  return lista;
}

// A mesma questão é sempre o mesmo Pokémon (na forma do nível em que aparece): a questão
// #123 "é um Gengar" e o aluno reconhece a velha conhecida.
export function especieDaQuestao(dex: Dex, questaoId: number, materia: string, nivel: number): number {
  const { tipos } = tiposDaMateria(materia);
  const tipo = tipos ? tipos[Math.floor(hash(questaoId) * tipos.length)] : "todas";
  const pool = basesPorTipo(dex, tipo);
  const base = pool[Math.floor(hash(questaoId + 7919) * pool.length)] ?? 1;
  return formaNoNivel(dex, base, nivel);
}

// O líder usa uma forma final forte; com o time já alto, pode ser um lendário.
function especieDoLider(dex: Dex, questaoId: number, materia: string, nivel: number): number {
  const { tipos } = tiposDaMateria(materia);
  const finais = Object.entries(dex.especies)
    .filter(([, e]) => !e.e?.length && (nivel >= 45 || !e.l) && (!tipos || e.t.some((t) => tipos.includes(t))))
    .map(([id, e]) => ({ id: Number(id), soma: e.s.reduce((a, b) => a + b, 0) }))
    .filter((x) => x.soma >= 450)
    .sort((a, b) => a.id - b.id);
  if (!finais.length) return especieDaQuestao(dex, questaoId, materia, nivel);
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
  semente?: number;
  agora?: Date;
}): PartidaPoke | null {
  const { dex } = opts;
  if (!opts.time.length) return null;
  const revisoes = opts.pendentes.slice(0, MAX_REVISOES);
  const faltam = Math.max(0, ALVO_QUESTOES - revisoes.length);
  const pool = [...revisoes, ...opts.novas.slice(0, faltam)];
  if (pool.length === 0) return null;
  let rng = opts.semente ?? Date.now() >>> 0;
  const rolar = () => {
    const [r, n] = sortear(rng);
    rng = n;
    return r;
  };

  // Líder de Ginásio: a questão em que mais errei (sem erro, a mais difícil).
  let chefe: Candidata | undefined;
  if (pool.length > 1) {
    const peso = (c: Candidata) => c.erros * 10 + (c.dificuldade === "dificil" ? 2 : c.dificuldade === "media" ? 1 : 0);
    chefe = pool.reduce((m, c) => (peso(c) > peso(m) ? c : m), pool[0]);
  }
  const base = nivelMedio(opts.time);
  const nivelEntre = (d0: number, d1: number) => Math.max(2, Math.min(MAX_NIVEL, base + d0 + Math.floor(rolar() * (d1 - d0 + 1))));

  const comuns = intercalar(pool.filter((c) => c !== chefe));
  const treinadores: Treinador[] = [];
  const fila: Encontro[] = [];
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
  const ehRevisao = new Set(revisoes.map((r) => r.questaoId));
  // Cada Pokémon aguenta ~2 acertos: só parte das questões abre um Pokémon; as outras ficam
  // na reserva para os turnos seguintes. Questões que já me derrubaram aparecem selvagens
  // (dá para capturar); o resto vem em grupos de 2–3 por treinador.
  const orcamento = Math.max(2, Math.round(pool.length / QUESTOES_POR_POKEMON) - (chefe ? 1 : 0));
  const selvagens = comuns.filter((c) => c.erros > 0 && ehRevisao.has(c.questaoId)).slice(0, Math.max(1, Math.round(orcamento / 3)));
  const outras = comuns.filter((c) => !selvagens.includes(c));
  const nTreinador = Math.max(0, orcamento - selvagens.length);
  const deTreinador = outras.slice(0, nTreinador);
  const reserva: QuestaoReserva[] = outras.slice(nTreinador).map((c) => ({ questaoId: c.questaoId, retorno: false }));
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
      fila.push(inimigo(c, "treinador", idx, especieDaQuestao(dex, c.questaoId, c.materia, nivel), nivel));
    }
    // um selvagem entre treinadores, quando houver
    const s = selvagens.shift();
    if (s) {
      const nivel = nivelEntre(-2, 0);
      fila.push(inimigo(s, "selvagem", -1, especieDaQuestao(dex, s.questaoId, s.materia, nivel), nivel));
    }
  }
  for (const s of selvagens) {
    const nivel = nivelEntre(-2, 0);
    fila.push(inimigo(s, "selvagem", -1, especieDaQuestao(dex, s.questaoId, s.materia, nivel), nivel));
  }
  if (chefe) {
    const idx = treinadores.length;
    const sprite = LIDERES[Math.floor(rolar() * LIDERES.length)];
    treinadores.push({ nome: `Líder ${sprite[0].toUpperCase()}${sprite.slice(1)}`, sprite, lider: true });
    const nivel = Math.min(MAX_NIVEL, base + 3);
    fila.push(inimigo(chefe, "lider", idx, especieDoLider(dex, chefe.questaoId, chefe.materia, nivel), nivel));
  }

  const p: PartidaPoke = {
    versao: 3,
    concursoId: opts.concursoId,
    iniciadaEm: (opts.agora ?? new Date()).toISOString(),
    treinadores,
    fila,
    atual: null,
    reserva,
    chaves,
    time: opts.time.slice(0, MAX_TIME).map((m) => lutador(dex, m)),
    ativo: 0,
    mochila: { ...opts.mochila },
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

// ---------- XP, nível, golpes, evolução ----------

// Dá XP a um lutador e devolve os eventos de nível/golpe/evolução. Muta `l`.
function ganharXp(dex: Dex, l: Lutador, valor: number, eventos: Evento[]) {
  const antes = nivelDe(l);
  const hpAntes = hpMax(dex, l);
  l.xp = Math.min(xpDoNivel(MAX_NIVEL), l.xp + valor);
  eventos.push({ tipo: "xp", uid: l.uid, valor });
  subiuPara(dex, l, antes, hpAntes, eventos);
}

function subiuPara(dex: Dex, l: Lutador, antes: number, hpAntes: number, eventos: Evento[]) {
  const depois = nivelDe(l);
  if (depois <= antes) return;
  eventos.push({ tipo: "nivel", uid: l.uid, nivel: depois });
  for (const g of golpesNovos(dex.especies[l.id], antes, depois)) aprender(dex, l, g, eventos);
  const para = evolucaoPorNivel(dex.especies[l.id], depois);
  if (para && dex.especies[para]) evoluir(dex, l, para, eventos);
  // Subir de nível aumenta o HP máximo; o HP atual sobe junto (como nos jogos).
  if (l.hp > 0) l.hp = Math.min(hpMax(dex, l), l.hp + (hpMax(dex, l) - hpAntes));
}

// Com 4 golpes, esquece o mais fraco (status conta como 0), a não ser que o novo seja ainda
// mais fraco: aí não aprende.
function aprender(dex: Dex, l: Lutador, g: number, eventos: Evento[]) {
  if (l.golpes.includes(g)) return;
  if (l.golpes.length < MAX_GOLPES) {
    l.golpes = [...l.golpes, g];
    eventos.push({ tipo: "aprendeu", uid: l.uid, golpe: g, esqueceu: null });
    return;
  }
  const valor = (x: number) => {
    const m = dex.golpes[x];
    return m[2] + (m[5] > 0 || m[4] > 0 ? 60 : 0) + (dex.especies[l.id].t.includes(m[1]) ? 20 : 0);
  };
  const pior = l.golpes.reduce((a, b) => (valor(b) < valor(a) ? b : a), l.golpes[0]);
  if (valor(g) < valor(pior)) return;
  l.golpes = l.golpes.map((x) => (x === pior ? g : x));
  eventos.push({ tipo: "aprendeu", uid: l.uid, golpe: g, esqueceu: pior });
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
  const [, tipo, poder, classe] = golpe;
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
  const darXp = () => {
    if (eu.hp <= 0) return;
    const piso = xpMinimoPorVitoria(dex, eu.id, nivelDe(eu)) * Math.max(1, multXp);
    const xp = Math.round(Math.max(xpDaVitoria(inimigo, e.nivel, nivelDe(eu), !selvagem) * multXp, piso));
    q.xp += xp;
    ganharXp(dex, eu, xp, eventos);
  };
  const derrubar = () => {
    e.hp = 0;
    e.fim = "ko";
    eventos.push({ tipo: "desmaiouInimigo" });
    darXp();
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
      const [, , poder, classe, dreno, cura] = g;
      if (poder > 0 && classe !== 2) {
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
  } else {
    q.combo = 0;
    eventos.push({ tipo: "errou" });
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
      let valor = d.efetividade === 0 ? Math.max(1, Math.round(hpMax(dex, eu) * 0.1)) : Math.min(d.valor, Math.ceil(hpMax(dex, eu) * 0.4));
      valor = Math.round(valor * (o.confianca === "certeza" ? 1.5 : 1) * (lider ? 1.2 : 1) * (e.status === "burn" && golpeI[3] === 0 ? 0.5 : 1));
      const comFoco = eu.foco > 0;
      if (comFoco) {
        eu.foco -= 1;
        valor = Math.max(1, Math.round(valor / 2));
      }
      valor = Math.max(1, valor);
      eu.hp = Math.max(0, eu.hp - valor);
      eventos.push({ tipo: "contra", golpe: gi, dano: valor, efetividade: d.efetividade, critico: crit, foco: comFoco });
      const cond = golpeI[6] as Status;
      if (eu.hp > 0 && !eu.status && STATUS_VALIDOS.includes(cond) && rolar() * 100 < (golpeI[7] || 0)) {
        eu.status = cond;
        if (cond === "sleep") eu.sono = 1 + Math.floor(rolar() * 3);
        eventos.push({ tipo: "status", uid: eu.uid, status: cond });
      }
    }
    // A questão errada volta uma vez: selvagem mais adiante (ou na reserva, contra o líder).
    // Errou de novo, fica para a revisão espaçada.
    if (!retornoDaVez) {
      if (lider) q.reserva.splice(Math.min(2, q.reserva.length), 0, { questaoId: questaoDaVez, retorno: true });
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
      eventos.push({ tipo: "voltaDepois", selvagem: !lider });
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
  // contra ele), acabou a luta: desmaia de cansaço se eu acertei com golpe, foge se eu errei
  // ou se escapou da bola.
  e.turnos = (e.turnos ?? 0) + 1;
  if (!e.fim && !q.fim) {
    const prox = e.turnos >= MAX_TURNOS_POKEMON && o.acertou ? undefined : q.reserva.shift();
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
    q.recompensa = !lider;
    eventos.push({ tipo: "treinadorVencido", treinador: e.treinador, lider });
  }

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
  const uteis = dex ? PEDRAS.filter((s) => p.time.some((l) => evolucaoPorPedra(dex.especies[l.id], s))) : [];
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
export function podeUsar(dex: Dex, l: Lutador, item: string): boolean {
  if (item in CURA_ITEM) return l.hp > 0 && l.hp < hpMax(dex, l);
  if (item === "revive") return l.hp <= 0;
  if (item === "full-heal") return l.hp > 0 && l.status !== "";
  if (item === "rare-candy") return nivelDe(l) < MAX_NIVEL;
  if (PEDRAS.includes(item)) return evolucaoPorPedra(dex.especies[l.id], item) !== null;
  return false;
}

export function usarItem(dex: Dex, p: PartidaPoke, item: string, alvo: number): { partida: PartidaPoke; eventos: Evento[] } {
  const l0 = p.time[alvo];
  if (!l0 || p.fim || (p.mochila[item] ?? 0) <= 0 || !podeUsar(dex, l0, item)) return { partida: p, eventos: [] };
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
    subiuPara(dex, l, antes, hpAntes, eventos);
  } else {
    const para = evolucaoPorPedra(dex.especies[l.id], item);
    if (para) evoluir(dex, l, para, eventos);
  }
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
}

export const MOCHILA_INICIAL: Record<string, number> = { "poke-ball": 5, potion: 3 };

export function perfilInicial(dex: Dex, inicial: number, uid = `m${Date.now().toString(36)}`): PerfilPoke {
  const m = criarMon(dex, inicial, 5, uid);
  return { versao: 1, colecao: [m], time: [m.uid], mochila: { ...MOCHILA_INICIAL }, insignias: 0, partidas: 0, vitorias: 0, vistos: [inicial], capturadasQuestoes: [] };
}

const soMon = ({ uid, id, xp, golpes, questaoId, capturadoEm }: Mon): Mon => ({ uid, id, xp, golpes, ...(questaoId ? { questaoId } : {}), ...(capturadoEm ? { capturadoEm } : {}) });

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
    mochila: { ...p.mochila },
    vistos: [...vistos],
    capturadasQuestoes: [...capt],
  };
  if (p.fim && perfil.ultimaContada !== p.iniciadaEm) {
    novo.partidas += 1;
    if (p.fim === "vitoria") {
      novo.vitorias += 1;
      if (p.treinadores.some((t, i) => t.lider && p.vencidos.includes(i))) novo.insignias += 1;
    }
    novo.ultimaContada = p.iniciadaEm;
  }
  return novo;
}
