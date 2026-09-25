// MOTOR DA BATALHA (roguelite da revisão espaçada). Funções puras: a tela chama, guarda
// o resultado e anima os eventos devolvidos. Nada aqui fala com a rede.
//
// O que o jogo NÃO pode fazer é piorar o estudo. Por isso:
// - As questões vêm da fila da revisão espaçada (as mais atrasadas primeiro). Só quando
//   ela não enche a partida entram questões nunca respondidas. O sorteio do roguelite
//   mexe em recompensas, nunca em QUAIS questões caem.
// - Cada ataque é uma resposta de verdade (gravada como Answer, contexto BATALHA): o
//   agendamento, a meta do dia e a ofensiva enxergam a partida como estudo.
// - Errar sempre custa HP. Nenhuma relíquia torna o chute gratuito.
// - O golpe é uma aposta de confiança ("tenho certeza" x "na dúvida"): acertar com
//   certeza vale crítico, errar com certeza dói mais. Erro com certeza é o que mais se
//   aprende quando corrigido (efeito de hipercorreção), e o placar de calibragem no fim
//   mostra se a sua certeza merece confiança.
// - A questão errada foge e VOLTA algumas lutas depois, com as alternativas em outra
//   ordem: reaprender no mesmo dia, espaçado, e não decorando a posição.
// - Depois de errar, escrever em uma frase por que o gabarito está certo cura HP
//   (autoexplicação). As lições podem ir para o Caderno no fim.

export type Confianca = "certeza" | "duvida";
export type TipoEncontro = "revisao" | "nova" | "chefe";

export interface Encontro {
  questaoId: number;
  tipo: TipoEncontro;
  nivel: number; // nível na revisão espaçada (acertos seguidos); 0 para nova
  retorno: boolean; // voltou depois de fugir
}

export type ItemId = "pocao" | "baga" | "elixir" | "lente" | "amuleto" | "tomo";
export const PASSIVAS: ItemId[] = ["lente", "amuleto", "tomo"];

export interface Registro {
  questaoId: number;
  acertou: boolean;
  confianca: Confianca;
  retorno: boolean;
  chefe: boolean;
  capturada: boolean;
}

export interface Partida {
  versao: 1;
  concursoId: string | null;
  iniciadaEm: string;
  fila: Encontro[];
  atual: Encontro | null;
  hp: number;
  hpMax: number;
  pocoes: number;
  escudos: number;
  reliquias: ItemId[];
  combo: number;
  xp: number;
  andar: number;
  derrotadosNoAndar: number;
  totalEncontros: number;
  registros: Registro[];
  licoes: Record<number, string>;
  jaErradas: number[]; // questões com erro antes da partida: vencê-las é "capturar"
  oferta: ItemId[] | null; // recompensa do andar esperando escolha
  fim: null | "vitoria" | "derrota" | "fuga";
  rng: number;
}

export type Evento =
  | { tipo: "acerto"; critico: boolean; xp: number; captura: boolean }
  | { tipo: "erro"; dano: number; bloqueado: boolean; volta: boolean }
  | { tipo: "cura"; valor: number; motivo: "combo" | "lente" | "licao" | "pocao" | "elixir" }
  | { tipo: "derrota" };

export const HP_MAX = 100;
export const DANO: Record<Confianca, number> = { certeza: 30, duvida: 20 };
export const MULT_CHEFE = 1.5;
export const POR_ANDAR = 4;
export const CURA_POCAO = 35;
export const CURA_ELIXIR = 50;
export const MIN_LICAO = 12; // caracteres para contar como lição escrita
const ALVO_ENCONTROS = 10; // lutas comuns por partida (sem o chefe)
const MAX_REVISOES = 12;
const DISTANCIA_RETORNO = 3;

// ---------- sorteio ----------

function proximo(rng: number): [number, number] {
  let a = (rng + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  a = a >>> 0;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

// ---------- montagem ----------

export interface Candidata {
  questaoId: number;
  materia: string;
  nivel: number;
  erros: number; // erros no histórico inteiro
  dificuldade: string;
}

// Intercala por matéria mantendo a prioridade: pega sempre a primeira da lista cuja
// matéria difere da anterior. Intercalar matérias ajuda a discriminar qual conhecimento
// cada questão pede (em vez de responder no embalo do bloco).
export function intercalar<T extends { materia: string }>(itens: T[]): T[] {
  const resto = [...itens];
  const saida: T[] = [];
  while (resto.length) {
    const ant = saida[saida.length - 1]?.materia;
    const i = resto.findIndex((x) => x.materia !== ant);
    saida.push(...resto.splice(i === -1 ? 0 : i, 1));
  }
  return saida;
}

export function montarPartida(opts: {
  pendentes: Candidata[]; // fila da revisão espaçada, mais atrasadas primeiro
  novas: Candidata[]; // nunca respondidas, na ordem de preferência
  concursoId: string | null;
  semente?: number;
  agora?: Date;
}): Partida | null {
  const revisoes = opts.pendentes.slice(0, MAX_REVISOES);
  const faltam = Math.max(0, ALVO_ENCONTROS + 1 - revisoes.length);
  const novas = opts.novas.slice(0, faltam);
  const pool = [...revisoes, ...novas];
  if (pool.length === 0) return null;

  // Chefe: a questão em que mais errei. Sem histórico de erro, a mais difícil.
  let chefe: Candidata | undefined;
  if (pool.length > 1) {
    const peso = (c: Candidata) => c.erros * 10 + (c.dificuldade === "dificil" ? 2 : c.dificuldade === "media" ? 1 : 0);
    chefe = pool.reduce((m, c) => (peso(c) > peso(m) ? c : m), pool[0]);
  }
  const comuns = intercalar(pool.filter((c) => c !== chefe));
  const ehRevisao = new Set(revisoes.map((r) => r.questaoId));
  const encontro = (c: Candidata, tipo?: TipoEncontro): Encontro => ({
    questaoId: c.questaoId,
    tipo: tipo ?? (ehRevisao.has(c.questaoId) ? "revisao" : "nova"),
    nivel: c.nivel,
    retorno: false,
  });
  const fila = [...comuns.map((c) => encontro(c)), ...(chefe ? [encontro(chefe, "chefe")] : [])];

  const p: Partida = {
    versao: 1,
    concursoId: opts.concursoId,
    iniciadaEm: (opts.agora ?? new Date()).toISOString(),
    fila,
    atual: null,
    hp: HP_MAX,
    hpMax: HP_MAX,
    pocoes: 1,
    escudos: 0,
    reliquias: [],
    combo: 0,
    xp: 0,
    andar: 1,
    derrotadosNoAndar: 0,
    totalEncontros: fila.length,
    registros: [],
    licoes: {},
    jaErradas: pool.filter((c) => c.erros > 0).map((c) => c.questaoId),
    oferta: null,
    fim: null,
    rng: opts.semente ?? Date.now() >>> 0,
  };
  return avancar(p);
}

// ---------- turno ----------

export function xpDoAcerto(e: Encontro, confianca: Confianca, dificuldade: string): number {
  if (e.tipo === "chefe") return 40;
  if (e.retorno) return 8;
  const base = dificuldade === "dificil" ? 15 : dificuldade === "media" ? 12 : 10;
  return confianca === "certeza" ? base * 2 : base;
}

export function responder(
  p: Partida,
  acertou: boolean,
  confianca: Confianca,
  dificuldade: string
): { partida: Partida; eventos: Evento[] } {
  const e = p.atual;
  if (!e || p.fim) return { partida: p, eventos: [] };
  const q: Partida = { ...p, registros: [...p.registros], fila: [...p.fila] };
  const eventos: Evento[] = [];
  const chefe = e.tipo === "chefe";
  const cura = (valor: number, motivo: Extract<Evento, { tipo: "cura" }>["motivo"]) => {
    const real = Math.min(valor, q.hpMax - q.hp);
    if (real <= 0) return;
    q.hp += real;
    eventos.push({ tipo: "cura", valor: real, motivo });
  };

  if (acertou) {
    const captura = q.jaErradas.includes(e.questaoId) || e.retorno;
    const xp = xpDoAcerto(e, confianca, dificuldade) + (captura ? 5 : 0);
    q.xp += xp;
    q.combo += 1;
    if (!chefe) q.derrotadosNoAndar += 1;
    eventos.push({ tipo: "acerto", critico: confianca === "certeza", xp, captura });
    if (confianca === "certeza" && q.reliquias.includes("lente")) cura(5, "lente");
    if (q.combo % 3 === 0) cura(q.reliquias.includes("amuleto") ? 20 : 10, "combo");
    q.registros.push({ questaoId: e.questaoId, acertou, confianca, retorno: e.retorno, chefe, capturada: captura });
  } else {
    q.combo = 0;
    let dano = Math.round(DANO[confianca] * (chefe ? MULT_CHEFE : 1));
    const bloqueado = q.escudos > 0;
    if (bloqueado) {
      q.escudos -= 1;
      dano = 0;
    }
    q.hp = Math.max(0, q.hp - dano);
    // Uma volta só: se errar de novo, fica para a revisão espaçada de amanhã.
    const volta = !e.retorno;
    if (volta) {
      const retorno: Encontro = { ...e, retorno: true };
      if (chefe) q.fila.push(retorno);
      else {
        const temChefe = q.fila[q.fila.length - 1]?.tipo === "chefe";
        const limite = q.fila.length - (temChefe ? 1 : 0);
        q.fila.splice(Math.min(DISTANCIA_RETORNO, limite), 0, retorno);
      }
    }
    eventos.push({ tipo: "erro", dano, bloqueado, volta });
    q.registros.push({ questaoId: e.questaoId, acertou, confianca, retorno: e.retorno, chefe, capturada: false });
    if (q.hp <= 0) {
      q.fim = "derrota";
      eventos.push({ tipo: "derrota" });
    }
  }
  return { partida: q, eventos };
}

// Próxima luta, ou a recompensa do andar quando ele acabou.
export function avancar(p: Partida): Partida {
  if (p.fim || p.oferta) return p;
  const q: Partida = { ...p, fila: [...p.fila] };
  const restamComuns = q.fila.some((e) => e.tipo !== "chefe");
  if (q.derrotadosNoAndar >= POR_ANDAR && q.fila.length > 0) {
    q.andar += 1;
    q.derrotadosNoAndar = 0;
    q.atual = null;
    return sortearOferta(q, !restamComuns);
  }
  const prox = q.fila.shift() ?? null;
  q.atual = prox;
  if (!prox) q.fim = "vitoria";
  return q;
}

export function sortearOferta(p: Partida, antesDoChefe = false): Partida {
  const opcoes: ItemId[] = (["pocao", "baga", "elixir", "lente", "amuleto", "tomo"] as ItemId[]).filter(
    (i) => !(PASSIVAS.includes(i) && p.reliquias.includes(i))
  );
  let rng = p.rng;
  const escolhidas: ItemId[] = [];
  // Antes do chefe sempre há algo que cure: chegar ao chefe sem saída é frustração, não desafio.
  if (antesDoChefe) escolhidas.push(p.hp < p.hpMax / 2 ? "elixir" : "pocao");
  while (escolhidas.length < 3 && escolhidas.length < opcoes.length) {
    const [r, novo] = proximo(rng);
    rng = novo;
    const item = opcoes[Math.floor(r * opcoes.length)];
    if (!escolhidas.includes(item)) escolhidas.push(item);
  }
  return { ...p, oferta: escolhidas, rng };
}

export function escolherItem(p: Partida, item: ItemId): Partida {
  if (!p.oferta?.includes(item)) return p;
  const q: Partida = { ...p, oferta: null, reliquias: [...p.reliquias] };
  if (item === "pocao") q.pocoes += 1;
  else if (item === "baga") q.escudos += 1;
  else if (item === "elixir") q.hp = Math.min(q.hpMax, q.hp + CURA_ELIXIR);
  else q.reliquias.push(item);
  return avancar(q);
}

export function usarPocao(p: Partida): { partida: Partida; curou: number } {
  if (p.pocoes <= 0 || p.hp >= p.hpMax || p.fim) return { partida: p, curou: 0 };
  const curou = Math.min(CURA_POCAO, p.hpMax - p.hp);
  return { partida: { ...p, pocoes: p.pocoes - 1, hp: p.hp + curou }, curou };
}

// Lição escrita depois de um erro: cura uma vez por questão.
export function registrarLicao(p: Partida, questaoId: number, texto: string): { partida: Partida; curou: number } {
  const limpo = texto.trim();
  if (limpo.length < MIN_LICAO || p.fim === "derrota") return { partida: p, curou: 0 };
  const nova = !p.licoes[questaoId];
  const q: Partida = { ...p, licoes: { ...p.licoes, [questaoId]: limpo } };
  if (!nova) return { partida: q, curou: 0 };
  const curou = Math.min(p.reliquias.includes("tomo") ? 20 : 10, q.hpMax - q.hp);
  q.hp += curou;
  return { partida: q, curou };
}

export function fugir(p: Partida): Partida {
  return p.fim ? p : { ...p, fim: "fuga", oferta: null };
}

// ---------- resumo ----------

export interface Resumo {
  respondidas: number;
  acertos: number;
  capturadas: number[];
  certeza: { total: number; acertos: number };
  duvida: { total: number; acertos: number };
  recuperadas: number; // erradas na partida e acertadas na volta
  erradas: number[]; // ficaram erradas: voltam amanhã na revisão espaçada
}

export function resumir(p: Partida): Resumo {
  const r = p.registros;
  const faixa = (c: Confianca) => {
    const xs = r.filter((x) => x.confianca === c);
    return { total: xs.length, acertos: xs.filter((x) => x.acertou).length };
  };
  const ultimaPorQuestao = new Map<number, Registro>();
  for (const x of r) ultimaPorQuestao.set(x.questaoId, x);
  return {
    respondidas: r.length,
    acertos: r.filter((x) => x.acertou).length,
    capturadas: [...new Set(r.filter((x) => x.capturada).map((x) => x.questaoId))],
    certeza: faixa("certeza"),
    duvida: faixa("duvida"),
    recuperadas: r.filter((x) => x.retorno && x.acertou).length,
    erradas: [...ultimaPorQuestao.values()].filter((x) => !x.acertou).map((x) => x.questaoId),
  };
}

// Nível do parceiro a partir do XP acumulado em todas as partidas.
export function nivelDoXp(xp: number): { nivel: number; atual: number; proximo: number } {
  const nivel = Math.floor(Math.sqrt(xp / 40)) + 1;
  const base = 40 * (nivel - 1) ** 2;
  const prox = 40 * nivel ** 2;
  return { nivel, atual: xp - base, proximo: prox - base };
}
