// MONTAGEM DE SESSÕES — regra de negócio que roda no FRONTEND (tem o JSON).
// O backend só fornece IDs (erradas, semana); aqui decidimos a composição final.
import type { Questao, Dificuldade } from "../types/questao";
import { PROPORCAO_SIMULADO, PESO_ERRADA } from "../config/prova";

// ---------- utilitários de sorteio ----------

type Rng = () => number;

// Embaralha (Fisher-Yates) com rng injetável para testes determinísticos.
export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Amostragem ponderada SEM reposição: itens com maior peso têm mais chance de sair.
export function sampleWeighted<T>(
  itens: { item: T; peso: number }[],
  n: number,
  rng: Rng = Math.random
): T[] {
  const pool = itens.map((x) => ({ ...x }));
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.peso, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].peso;
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}

// ---------- FLASH: 10 questões do Módulo II já erradas ----------

export interface FlashInput {
  idsErradosPriorizados: number[]; // do backend: /answers/wrong?modulo=II (ordem = prioridade)
  todasModuloII: Questao[]; // do JSON
  respondidasIds: Set<number>; // para saber quais ainda não foram respondidas
  quantidade?: number; // default 10
}

export interface FlashResult {
  questoes: Questao[];
  completadoComNaoRespondidas: boolean; // true se faltaram erradas e completamos
  faltaram: boolean; // true se nem assim fechou a quantidade
}

// Prioriza as erradas (na ordem do backend); se faltar, completa com Módulo II ainda
// não respondidas; se ainda faltar, completa com qualquer Módulo II. Nunca quebra.
export function montarFlash(input: FlashInput): FlashResult {
  const n = input.quantidade ?? 10;
  const porId = new Map(input.todasModuloII.map((q) => [q.id, q]));
  const escolhidas: Questao[] = [];
  const usados = new Set<number>();

  // 1) erradas priorizadas (que existem no JSON e são Módulo II)
  for (const id of input.idsErradosPriorizados) {
    if (escolhidas.length >= n) break;
    const q = porId.get(id);
    if (q && !usados.has(id)) {
      escolhidas.push(q);
      usados.add(id);
    }
  }

  let completadoComNaoRespondidas = false;

  // 2) completar com Módulo II não respondidas
  if (escolhidas.length < n) {
    const naoRespondidas = shuffle(
      input.todasModuloII.filter((q) => !usados.has(q.id) && !input.respondidasIds.has(q.id))
    );
    for (const q of naoRespondidas) {
      if (escolhidas.length >= n) break;
      escolhidas.push(q);
      usados.add(q.id);
      completadoComNaoRespondidas = true;
    }
  }

  // 3) completar com qualquer Módulo II restante
  if (escolhidas.length < n) {
    const resto = shuffle(input.todasModuloII.filter((q) => !usados.has(q.id)));
    for (const q of resto) {
      if (escolhidas.length >= n) break;
      escolhidas.push(q);
      usados.add(q.id);
    }
  }

  return {
    questoes: escolhidas,
    completadoComNaoRespondidas,
    faltaram: escolhidas.length < n,
  };
}

// ---------- SIMULADO: 70 questões mantendo a proporção, ênfase nas erradas ----------

export interface SemanaItem {
  questaoId: number;
  erros: number; // erros na semana
  total: number;
}

export interface SimuladoInput {
  semana: SemanaItem[]; // do backend: /answers/week (respondidas nos últimos 7 dias)
  todas: Questao[]; // do JSON
  rng?: Rng;
}

// Sorteia dentre as questões da semana (ênfase nas erradas). Se faltar volume numa
// matéria pra fechar a proporção, completa com questões daquela matéria não vistas
// na semana, mantendo o total e a proporção.
export function montarSimulado(input: SimuladoInput): Questao[] {
  const rng = input.rng ?? Math.random;
  const semanaMap = new Map(input.semana.map((s) => [s.questaoId, s]));
  const jaEscolhidos = new Set<number>();
  const resultado: Questao[] = [];

  // Módulo I: por matéria, conforme a proporção.
  for (const [materia, alvo] of Object.entries(PROPORCAO_SIMULADO.moduloI)) {
    const candidatas = input.todas.filter((q) => q.modulo === "I" && q.materia === materia);
    selecionarGrupo(candidatas, alvo, semanaMap, jaEscolhidos, resultado, rng);
  }

  // Módulo II: total, sorteio livre entre as matérias específicas.
  const candidatasII = input.todas.filter((q) => q.modulo === "II");
  selecionarGrupo(
    candidatasII,
    PROPORCAO_SIMULADO.moduloIITotal,
    semanaMap,
    jaEscolhidos,
    resultado,
    rng
  );

  return shuffle(resultado, rng);
}

// Seleciona `alvo` questões de um grupo: sorteia dentre as da semana com ênfase nas
// erradas (peso maior) e, se faltar volume, completa com questões do grupo não vistas
// na semana — mantendo a proporção.
function selecionarGrupo(
  candidatas: Questao[],
  alvo: number,
  semanaMap: Map<number, SemanaItem>,
  jaEscolhidos: Set<number>,
  resultado: Questao[],
  rng: Rng
) {
  const daSemana = candidatas.filter((q) => semanaMap.has(q.id) && !jaEscolhidos.has(q.id));
  const ponderadas = daSemana.map((q) => ({
    item: q,
    peso: (semanaMap.get(q.id)?.erros ?? 0) > 0 ? PESO_ERRADA : 1,
  }));
  const sorteadas = sampleWeighted(ponderadas, alvo, rng);
  for (const q of sorteadas) {
    resultado.push(q);
    jaEscolhidos.add(q.id);
  }
  // completa com não vistas na semana mantendo a proporção
  let faltam = alvo - sorteadas.length;
  if (faltam > 0) {
    const naoVistas = shuffle(
      candidatas.filter((q) => !semanaMap.has(q.id) && !jaEscolhidos.has(q.id)),
      rng
    );
    for (const q of naoVistas) {
      if (faltam <= 0) break;
      resultado.push(q);
      jaEscolhidos.add(q.id);
      faltam--;
    }
  }
}

// ---------- TÓPICO: estudo dirigido ----------

export interface TopicoInput {
  materia?: string;
  assunto?: string;
  dificuldade?: Dificuldade;
  quantidade: number;
  incluirRespondidas: boolean;
  priorizarErradas?: boolean;
  todas: Questao[];
  respondidasIds: Set<number>;
  erradasIds?: Set<number>;
  rng?: Rng;
}

export function montarTopico(input: TopicoInput): Questao[] {
  const rng = input.rng ?? Math.random;
  let pool = input.todas.filter(
    (q) =>
      (!input.materia || q.materia === input.materia) &&
      (!input.assunto || q.assunto === input.assunto) &&
      (!input.dificuldade || q.dificuldade === input.dificuldade)
  );
  if (!input.incluirRespondidas) {
    pool = pool.filter((q) => !input.respondidasIds.has(q.id));
  }

  if (input.priorizarErradas && input.erradasIds) {
    const ponderadas = pool.map((q) => ({
      item: q,
      peso: input.erradasIds!.has(q.id) ? PESO_ERRADA : 1,
    }));
    return sampleWeighted(ponderadas, input.quantidade, rng);
  }
  return shuffle(pool, rng).slice(0, input.quantidade);
}

// ---------- Nota do simulado ----------

import { PESOS, NOTA_CORTE_PONTOS } from "../config/prova";

export interface ResultadoSimulado {
  pontos: number;
  totalPontosPossivel: number;
  acertos: number;
  total: number;
  aprovadoEstimado: boolean;
}

// Calcula a nota ponderada real: Módulo I peso 1, Módulo II peso 2,5.
export function calcularNotaSimulado(
  respostas: { modulo: "I" | "II"; acertou: boolean }[]
): ResultadoSimulado {
  let pontos = 0;
  let totalPontosPossivel = 0;
  let acertos = 0;
  for (const r of respostas) {
    const peso = PESOS[r.modulo];
    totalPontosPossivel += peso;
    if (r.acertou) {
      pontos += peso;
      acertos++;
    }
  }
  return {
    pontos,
    totalPontosPossivel,
    acertos,
    total: respostas.length,
    aprovadoEstimado: pontos >= NOTA_CORTE_PONTOS,
  };
}
