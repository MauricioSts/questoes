// Montagem da fila de questões das batalhas (clássica e Pokémon): a revisão espaçada do
// dia (mais atrasadas primeiro) e, para completar, questões nunca respondidas das matérias
// em que mais erro.
import type { Questao } from "../types/questao";
import { getQuestao, todas } from "./questoesRepo";
import { carregarRevisao } from "./revisao";
import { api } from "./api";
import type { Candidata } from "./batalha";

export interface HistoricoQ {
  questaoId: number;
  tentativas: number;
  acertos: number;
  erros: number;
}

function embaralhar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Questões nunca respondidas, começando pelas matérias em que mais erro, em rodízio (uma
// de cada matéria por vez) para a partida não virar um bloco de uma matéria só.
export function novasPorFraqueza(hist: Map<number, HistoricoQ>): Candidata[] {
  const taxa = new Map<string, { a: number; t: number }>();
  const porMateria = new Map<string, Questao[]>();
  for (const q of todas()) {
    const h = hist.get(q.id);
    if (h) {
      const m = taxa.get(q.materia) ?? { a: 0, t: 0 };
      m.a += h.acertos;
      m.t += h.tentativas;
      taxa.set(q.materia, m);
    } else {
      porMateria.set(q.materia, [...(porMateria.get(q.materia) ?? []), q]);
    }
  }
  const acerto = (m: string) => {
    const x = taxa.get(m);
    return x && x.t > 0 ? x.a / x.t : 0.5;
  };
  const filas = [...porMateria.entries()]
    .sort((a, b) => acerto(a[0]) - acerto(b[0]))
    .map(([, qs]) => embaralhar(qs));
  const saida: Candidata[] = [];
  while (filas.some((f) => f.length)) {
    for (const f of filas) {
      const q = f.shift();
      if (q) saida.push({ questaoId: q.id, materia: q.materia, nivel: 0, erros: 0, dificuldade: q.dificuldade });
    }
  }
  return saida;
}

export async function carregarFilaBatalha(): Promise<{ hist: Map<number, HistoricoQ>; pendentes: Candidata[] }> {
  const [fila, h] = await Promise.all([carregarRevisao(), api<{ questoes: HistoricoQ[] }>("/answers/por-questao")]);
  const hist = new Map(h.questoes.map((x) => [x.questaoId, x]));
  const pendentes = fila.questoes
    .map((i): Candidata | null => {
      const q = getQuestao(i.questaoId);
      if (!q) return null;
      return { questaoId: q.id, materia: q.materia, nivel: i.streak ?? 0, erros: hist.get(q.id)?.erros ?? 0, dificuldade: q.dificuldade };
    })
    .filter((c): c is Candidata => c !== null);
  return { hist, pendentes };
}
