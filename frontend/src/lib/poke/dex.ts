// POKÉDEX DA BATALHA: dados da PokéAPI (gerações 1–5) pré-gerados em src/data/pokedex.json
// por scripts/gerar-pokedex.mjs, e as contas do jogo (atributos, dano, tipos, XP,
// evolução). Funções puras: o motor (motor.ts) e os testes usam direto; a tela só carrega
// o JSON uma vez, sob demanda, para não pesar o resto do app.

export type Golpe = [nome: string, tipo: number, poder: number, classe: 0 | 1 | 2, dreno: number, cura: number, condicao: string, chance: number, critico: number];
export type Evo = [para: number, tipo: "l" | "i" | "t" | "f", valor: number | string];

export interface Especie {
  n: string;
  t: number[];
  s: [number, number, number, number, number, number]; // hp atk def spa spd spe
  a: string;
  c: number;
  l: 0 | 1;
  g: [number, number][]; // [golpe, nível]
  e?: Evo[];
  p?: number;
}

export interface Dex {
  tipos: string[];
  golpes: Golpe[];
  especies: Record<string, Especie>;
}

let cache: Promise<Dex> | null = null;
export function carregarDex(): Promise<Dex> {
  cache ??= import("../../data/pokedex.json").then((m) => (m.default ?? m) as unknown as Dex);
  return cache;
}

export const MAX_NIVEL = 100;
export const MAX_GOLPES = 4;

// ---------- tipos ----------

export const NOME_TIPO = [
  "Normal", "Fogo", "Água", "Elétrico", "Planta", "Gelo", "Lutador", "Veneno", "Terra",
  "Voador", "Psíquico", "Inseto", "Pedra", "Fantasma", "Dragão", "Sombrio", "Aço", "Fada",
];
export const COR_TIPO = [
  "#A8A77A", "#EE8130", "#6390F0", "#F7D02C", "#7AC74C", "#96D9D6", "#C22E28", "#A33EA1", "#E2BF65",
  "#A98FF3", "#F95587", "#A6B91A", "#B6A136", "#735797", "#6F35FC", "#705746", "#B7B7CE", "#D685AD",
];

// Tabela de tipos atual (com Fada): só o que difere de 1×. [atacante] -> "defensor:mult"
const N = 0, FI = 1, WA = 2, EL = 3, GR = 4, IC = 5, FG = 6, PO = 7, GD = 8, FL = 9, PS = 10, BU = 11, RO = 12, GH = 13, DR = 14, DA = 15, ST = 16, FA = 17;
const TABELA: Record<number, [number[], number[], number[]]> = {
  // [super efetivo, pouco efetivo, sem efeito]
  [N]: [[], [RO, ST], [GH]],
  [FI]: [[GR, IC, BU, ST], [FI, WA, RO, DR], []],
  [WA]: [[FI, GD, RO], [WA, GR, DR], []],
  [EL]: [[WA, FL], [EL, GR, DR], [GD]],
  [GR]: [[WA, GD, RO], [FI, GR, PO, FL, BU, DR, ST], []],
  [IC]: [[GR, GD, FL, DR], [FI, WA, IC, ST], []],
  [FG]: [[N, IC, RO, DA, ST], [PO, FL, PS, BU, FA], [GH]],
  [PO]: [[GR, FA], [PO, GD, RO, GH], [ST]],
  [GD]: [[FI, EL, PO, RO, ST], [GR, BU], [FL]],
  [FL]: [[GR, FG, BU], [EL, RO, ST], []],
  [PS]: [[FG, PO], [PS, ST], [DA]],
  [BU]: [[GR, PS, DA], [FI, FG, PO, FL, GH, ST, FA], []],
  [RO]: [[FI, IC, FL, BU], [FG, GD, ST], []],
  [GH]: [[PS, GH], [DA], [N]],
  [DR]: [[DR], [ST], [FA]],
  [DA]: [[PS, GH], [FG, DA, FA], []],
  [ST]: [[IC, RO, FA], [FI, WA, EL, ST], []],
  [FA]: [[FG, DR, DA], [FI, PO, ST], []],
};

export function efetividade(tipoGolpe: number, defensor: number[]): number {
  const [sup, pouco, nada] = TABELA[tipoGolpe] ?? [[], [], []];
  let m = 1;
  for (const d of defensor) {
    if (nada.includes(d)) return 0;
    if (sup.includes(d)) m *= 2;
    if (pouco.includes(d)) m *= 0.5;
  }
  return m;
}

// ---------- sprites ----------

const SPR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";
export const spriteFrente = (id: number) => `${SPR}/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
export const spriteCostas = (id: number) => `${SPR}/pokemon/versions/generation-v/black-white/animated/back/${id}.gif`;
export const spriteEstatico = (id: number) => `${SPR}/pokemon/${id}.png`;
export const spriteItem = (nome: string) => `${SPR}/items/${nome}.png`;
export const spriteTreinador = (nome: string) => `https://play.pokemonshowdown.com/sprites/trainers/${nome}.png`;

// ---------- atributos ----------

export interface Atributos {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

// Fórmula das gerações 3+ com IV fixo 15 e sem EV (todo mundo do mesmo jeito).
export function atributos(e: Especie, nivel: number): Atributos {
  const [hp, atk, def, spa, spd, spe] = e.s;
  const outro = (b: number) => Math.floor(((2 * b + 15) * nivel) / 100) + 5;
  return { hp: Math.floor(((2 * hp + 15) * nivel) / 100) + nivel + 10, atk: outro(atk), def: outro(def), spa: outro(spa), spd: outro(spd), spe: outro(spe) };
}

// Curva "médio-rápida": XP total para estar no nível n.
export const xpDoNivel = (n: number) => (n <= 1 ? 0 : n ** 3);
export function nivelDoXpPoke(xp: number): number {
  let n = 1;
  while (n < MAX_NIVEL && xpDoNivel(n + 1) <= xp) n++;
  return n;
}

// XP de derrubar um Pokémon (fórmula escalonada da geração 5). Sem "experiência base" no
// JSON, ela sai da soma dos atributos base / 5 (Bulbasaur: 318/5 ≈ 64, o valor real).
export function xpDaVitoria(inimigo: Especie, nivelInimigo: number, nivelMeu: number, treinador: boolean): number {
  const base = inimigo.s.reduce((a, b) => a + b, 0) / 5;
  const escala = ((2 * nivelInimigo + 10) / (nivelInimigo + nivelMeu + 10)) ** 2.5;
  return Math.max(1, Math.floor(((base * nivelInimigo) / 5) * escala * (treinador ? 1.5 : 1)) + 1);
}

// Dano da geração 5 (sem aleatório: quem chama sorteia 0,85–1).
export function dano(opts: {
  golpe: Golpe;
  atacante: Especie;
  nivel: number;
  atkStats: Atributos;
  defensor: Especie;
  defStats: Atributos;
  critico?: boolean;
  aleatorio?: number;
}): { valor: number; efetividade: number } {
  const [, tipo, poder, classe] = opts.golpe;
  const ef = efetividade(tipo, opts.defensor.t);
  if (poder <= 0 || classe === 2 || ef === 0) return { valor: 0, efetividade: ef };
  const a = classe === 0 ? opts.atkStats.atk : opts.atkStats.spa;
  const d = classe === 0 ? opts.defStats.def : opts.defStats.spd;
  const stab = opts.atacante.t.includes(tipo) ? 1.5 : 1;
  const base = Math.floor(Math.floor((Math.floor((2 * opts.nivel) / 5 + 2) * poder * a) / d) / 50) + 2;
  const v = base * stab * ef * (opts.critico ? 1.5 : 1) * (opts.aleatorio ?? 1);
  return { valor: Math.max(1, Math.floor(v)), efetividade: ef };
}

// ---------- golpes e evolução ----------

// Os 4 últimos golpes aprendidos até o nível (como um Pokémon selvagem nos jogos).
export function golpesNoNivel(e: Especie, nivel: number): number[] {
  const ate = e.g.filter(([, lv]) => lv <= nivel).map(([g]) => g);
  const unicos = [...new Set(ate.reverse())].reverse();
  return unicos.slice(-MAX_GOLPES);
}

// Golpes novos que a espécie aprende exatamente ao chegar em (de, ate].
export function golpesNovos(e: Especie, de: number, ate: number): number[] {
  return e.g.filter(([, lv]) => lv > de && lv <= ate).map(([g]) => g);
}

// Troca e amizade não existem aqui: viram evolução por nível, no 32 (explicado na tela).
export const NIVEL_TROCA_AMIZADE = 32;

// Ritmo de evolução: cada estágio (do nível em que a forma surgiu até o nível em que evolui)
// leva cerca de 5 lutas contra treinador (2–3 Pokémon cada) de acertos. A fórmula da geração 5
// sozinha pedia umas 16 lutas do Bulbasaur Nv5 ao Ivysaur.
export const LUTAS_POR_EVOLUCAO = 5;
const KOS_POR_EVOLUCAO = LUTAS_POR_EVOLUCAO * 2.5;
const NIVEL_INICIAL = 5;

const nivelDeEntrada = new WeakMap<Dex, Map<number, number>>();
// Nível em que a forma `id` aparece por evolução (5 para quem não evolui de ninguém por nível).
function nivelEmQueSurge(dex: Dex, id: number): number {
  let mapa = nivelDeEntrada.get(dex);
  if (!mapa) {
    mapa = new Map();
    for (const e of Object.values(dex.especies))
      for (const [para, tipo, valor] of e.e ?? []) {
        const nv = tipo === "l" ? Number(valor) : tipo === "t" || tipo === "f" ? NIVEL_TROCA_AMIZADE : null;
        if (nv !== null && !mapa.has(para)) mapa.set(para, nv);
      }
    nivelDeEntrada.set(dex, mapa);
  }
  return mapa.get(id) ?? NIVEL_INICIAL;
}

function nivelDaProximaEvolucao(e: Especie): number | null {
  let menor: number | null = null;
  for (const [, tipo, valor] of e.e ?? []) {
    const nv = tipo === "l" ? Number(valor) : tipo === "t" || tipo === "f" ? NIVEL_TROCA_AMIZADE : null;
    if (nv !== null && (menor === null || nv < menor)) menor = nv;
  }
  return menor;
}

// XP mínimo por Pokémon derrubado para evoluir em ~LUTAS_POR_EVOLUCAO lutas. Sem evolução
// por nível pela frente, 0 (vale só a fórmula dos jogos).
export function xpMinimoPorVitoria(dex: Dex, id: number, nivelAtual: number): number {
  const e = dex.especies[id];
  const alvo = e && nivelDaProximaEvolucao(e);
  if (!alvo || nivelAtual >= alvo) return 0;
  const inicio = Math.min(nivelEmQueSurge(dex, id), nivelAtual);
  return Math.ceil((xpDoNivel(alvo) - xpDoNivel(inicio)) / KOS_POR_EVOLUCAO);
}

// `ate`: maior número da Pokédex que já existe na região da jornada (evoluções de gerações
// seguintes, como Golbat -> Crobat em Kanto, esperam a região chegar).
export function evolucaoPorNivel(e: Especie, nivel: number, ate = Infinity): number | null {
  for (const [para, tipo, valor] of e.e ?? []) {
    if (para > ate) continue;
    if (tipo === "l" && nivel >= Number(valor)) return para;
    if ((tipo === "t" || tipo === "f") && nivel >= NIVEL_TROCA_AMIZADE) return para;
  }
  return null;
}

export function evolucaoPorPedra(e: Especie, pedra: string, ate = Infinity): number | null {
  return e.e?.find(([para, tipo, valor]) => tipo === "i" && valor === pedra && para <= ate)?.[0] ?? null;
}

// Forma que um Pokémon "de treinador" teria nesse nível (inimigos evoluem sozinhos; pedra
// conta como nível 30).
export function formaNoNivel(dex: Dex, id: number, nivel: number, ate = Infinity): number {
  let atual = id;
  for (let passo = 0; passo < 3; passo++) {
    const e = dex.especies[atual];
    const prox = (e?.e ?? []).find(([para, tipo, valor]) =>
      para <= ate && (tipo === "l" ? nivel >= Number(valor) : nivel >= (tipo === "i" ? 30 : NIVEL_TROCA_AMIZADE))
    );
    if (!prox || !dex.especies[prox[0]]) break;
    atual = prox[0];
  }
  return atual;
}

// Iniciais das gerações 1–5 + Pikachu e Eevee.
export const INICIAIS = [1, 4, 7, 25, 133, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501];
