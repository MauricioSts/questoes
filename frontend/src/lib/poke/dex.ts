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
  x?: number; // XP base (base_experience da PokéAPI)
  r?: number; // curva de crescimento: índice em CURVAS
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
// Maior número da Pokédex que aparece na jornada (fim de Unova). Acima disso só existem os
// iniciais de Kalos, Alola, Galar e Paldea (scripts/adicionar-iniciais.mjs): nunca surgem
// como inimigos e evoluem sem o limite de geração da região.
export const ULTIMO_DA_JORNADA = 649;
const acimaDoLimite = (para: number, ate: number) => para > ate && para <= ULTIMO_DA_JORNADA;
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
// Black/White só tem animação até o #649; os iniciais de Kalos em diante usam os do Showdown.
export const spriteFrente = (id: number) =>
  id > ULTIMO_DA_JORNADA ? `${SPR}/pokemon/other/showdown/${id}.gif` : `${SPR}/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
export const spriteCostas = (id: number) =>
  id > ULTIMO_DA_JORNADA ? `${SPR}/pokemon/other/showdown/back/${id}.gif` : `${SPR}/pokemon/versions/generation-v/black-white/animated/back/${id}.gif`;
export const spriteEstatico = (id: number) => `${SPR}/pokemon/${id}.png`;
const SPRITE_ITEM: Record<string, string> = { "exp-all": "exp-share" }; // sem sprite próprio na PokéAPI
export const spriteItem = (nome: string) => `${SPR}/items/${SPRITE_ITEM[nome] ?? nome}.png`;
export const spriteTreinador = (nome: string) => `https://play.pokemonshowdown.com/sprites/trainers/${nome}.png`;

// Quem o jogador pode ser na arena (sprites de treinador do Showdown), agrupados por região
// na tela de escolha (a ordem aqui é a ordem dos grupos).
export const TREINADORES_JOGADOR: { sprite: string; nome: string; regiao: string }[] = [
  { sprite: "red", nome: "Red", regiao: "Kanto" },
  { sprite: "blue", nome: "Blue", regiao: "Kanto" },
  { sprite: "ash", nome: "Ash", regiao: "Kanto" },
  { sprite: "chase", nome: "Chase", regiao: "Kanto" },
  { sprite: "elaine", nome: "Elaine", regiao: "Kanto" },
  { sprite: "ethan", nome: "Ethan", regiao: "Johto" },
  { sprite: "lyra", nome: "Lyra", regiao: "Johto" },
  { sprite: "kris", nome: "Kris", regiao: "Johto" },
  { sprite: "brendan", nome: "Brendan", regiao: "Hoenn" },
  { sprite: "may", nome: "May", regiao: "Hoenn" },
  { sprite: "lucas", nome: "Lucas", regiao: "Sinnoh" },
  { sprite: "dawn", nome: "Dawn", regiao: "Sinnoh" },
  { sprite: "hilbert", nome: "Hilbert", regiao: "Unova" },
  { sprite: "hilda", nome: "Hilda", regiao: "Unova" },
  { sprite: "nate", nome: "Nate", regiao: "Unova" },
  { sprite: "rosa", nome: "Rosa", regiao: "Unova" },
  { sprite: "calem", nome: "Calem", regiao: "Kalos" },
  { sprite: "serena", nome: "Serena", regiao: "Kalos" },
  { sprite: "elio", nome: "Elio", regiao: "Alola" },
  { sprite: "selene", nome: "Selene", regiao: "Alola" },
  { sprite: "victor", nome: "Victor", regiao: "Galar" },
  { sprite: "gloria", nome: "Gloria", regiao: "Galar" },
  { sprite: "florian-s", nome: "Florian", regiao: "Paldea" },
  { sprite: "juliana-s", nome: "Juliana", regiao: "Paldea" },
];

// Cenário de batalha (fundos da 6ª geração do Showdown) pelo tipo do lugar.
const CENARIO_TIPO = [
  "meadow", "earthycave", "orassea", "city", "forest", "icecave", "aquacordetown", "darkmeadow", "orasdesert",
  "skypillar", "library", "forest", "earthycave", "dampcave", "elite4drake", "darkcity", "city", "meadow",
];
export const cenario = (tipo: number | "campeao" | null) =>
  `https://play.pokemonshowdown.com/sprites/gen6bgs/bg-${tipo === "campeao" ? "elite4drake" : tipo === null ? "meadow" : (CENARIO_TIPO[tipo] ?? "meadow")}.jpg`;

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

// O `xp` salvo de cada Pokémon está na curva "médio-rápida" (n³): o nível sai dele sem
// precisar da espécie. As outras curvas dos jogos entram na hora de somar XP (somarXp): o
// XP real ganho vira a mesma fração do nível na curva da espécie, então um Pokémon de curva
// lenta pede tanto XP real por nível quanto nos jogos.
export const xpDoNivel = (n: number) => (n <= 1 ? 0 : n ** 3);
export function nivelDoXpPoke(xp: number): number {
  let n = 1;
  while (n < MAX_NIVEL && xpDoNivel(n + 1) <= xp) n++;
  return n;
}

export const CURVAS = ["medium", "fast", "medium-slow", "slow", "slow-then-very-fast", "fast-then-very-slow"] as const;
// XP total para estar no nível n em cada curva (fórmulas dos jogos).
export function xpDaCurva(curva: number, n: number): number {
  if (n <= 1) return 0;
  const c = n ** 3;
  switch (curva) {
    case 1:
      return Math.floor((4 * c) / 5);
    case 2:
      return Math.max(0, Math.floor((6 * c) / 5 - 15 * n * n + 100 * n - 140));
    case 3:
      return Math.floor((5 * c) / 4);
    case 4: // errática
      if (n < 50) return Math.floor((c * (100 - n)) / 50);
      if (n < 68) return Math.floor((c * (150 - n)) / 100);
      if (n < 98) return Math.floor((c * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((c * (160 - n)) / 100);
    case 5: // flutuante
      if (n < 15) return Math.floor((c * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n < 36) return Math.floor((c * (n + 14)) / 50);
      return Math.floor((c * (Math.floor(n / 2) + 32)) / 50);
    default:
      return c;
  }
}

// Soma `real` pontos de XP (os números dos jogos) a um `xp` salvo, pela curva da espécie.
export function somarXp(e: Especie, xp: number, real: number): number {
  const curva = e.r ?? 0;
  let x = xp;
  let resto = real;
  while (resto > 0) {
    const n = nivelDoXpPoke(x);
    if (n >= MAX_NIVEL) break;
    const a = xpDoNivel(n);
    const b = xpDoNivel(n + 1);
    const faixa = Math.max(1, xpDaCurva(curva, n + 1) - xpDaCurva(curva, n));
    const falta = ((b - x) / (b - a)) * faixa; // XP real que falta para o próximo nível
    if (resto >= falta) {
      x = b;
      resto -= falta;
    } else {
      x += Math.max(1, Math.floor((resto / faixa) * (b - a)));
      resto = 0;
    }
  }
  return Math.min(x, xpDoNivel(MAX_NIVEL));
}

// XP de derrubar um Pokémon: fórmula escalonada da geração 5, com o XP base real da espécie
// (treinador ×1,5; Ovo da Sorte ×1,5 fica com quem chama). `nivelMeu` é o de quem recebe.
export function xpDaVitoria(inimigo: Especie, nivelInimigo: number, nivelMeu: number, treinador: boolean): number {
  const base = inimigo.x ?? inimigo.s.reduce((a, b) => a + b, 0) / 5;
  const escala = ((2 * nivelInimigo + 10) / (nivelInimigo + nivelMeu + 10)) ** 2.5;
  return Math.floor(((base * nivelInimigo) / 5) * escala * (treinador ? 1.5 : 1)) + 1;
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

// `ate`: maior número da Pokédex que já existe na região da jornada (evoluções de gerações
// seguintes, como Golbat -> Crobat em Kanto, esperam a região chegar).
export function evolucaoPorNivel(e: Especie, nivel: number, ate = Infinity): number | null {
  for (const [para, tipo, valor] of e.e ?? []) {
    if (acimaDoLimite(para, ate)) continue;
    if (tipo === "l" && nivel >= Number(valor)) return para;
    if ((tipo === "t" || tipo === "f") && nivel >= NIVEL_TROCA_AMIZADE) return para;
  }
  return null;
}

export function evolucaoPorPedra(e: Especie, pedra: string, ate = Infinity): number | null {
  return e.e?.find(([para, tipo, valor]) => tipo === "i" && valor === pedra && !acimaDoLimite(para, ate))?.[0] ?? null;
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

// Iniciais de cada região (Kanto com Pikachu e Eevee), na tela do primeiro Pokémon.
export const INICIAIS_POR_REGIAO: { regiao: string; ids: number[] }[] = [
  { regiao: "Kanto", ids: [1, 4, 7, 25, 133] },
  { regiao: "Johto", ids: [152, 155, 158] },
  { regiao: "Hoenn", ids: [252, 255, 258] },
  { regiao: "Sinnoh", ids: [387, 390, 393] },
  { regiao: "Unova", ids: [495, 498, 501] },
  { regiao: "Kalos", ids: [650, 653, 656] },
  { regiao: "Alola", ids: [722, 725, 728] },
  { regiao: "Galar", ids: [810, 813, 816] },
  { regiao: "Paldea", ids: [906, 909, 912] },
];
export const INICIAIS = INICIAIS_POR_REGIAO.flatMap((g) => g.ids);
