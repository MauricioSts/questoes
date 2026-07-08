// Agregações de estatística "onde estou errando".
// Trabalha só com os snapshots do Answer (não precisa do JSON de questões).
import { prisma } from "../prisma.js";
import { localDateKey } from "./date.js";

export interface TaxaItem {
  chave: string; // matéria ou "matéria › assunto"
  materia: string;
  assunto?: string;
  total: number;
  acertos: number;
  taxa: number; // 0..1
}

export interface StatsResumo {
  totalRespondidas: number;
  totalAcertos: number;
  taxaGlobal: number;
  porDia: { dia: string; total: number; acertos: number }[];
  porMateria: TaxaItem[];
  porAssunto: TaxaItem[];
  pontosFracos: TaxaItem[]; // assuntos com menor taxa (volume mínimo), pior -> melhor
}

const VOLUME_MINIMO_PONTO_FRACO = 3;

export interface AnswerLike {
  acertou: boolean;
  materiaSnapshot: string;
  assuntoSnapshot: string;
  createdAt: Date;
}

export async function calcularStats(userId: string, desde?: Date): Promise<StatsResumo> {
  const answers = await prisma.answer.findMany({
    where: { userId, ...(desde ? { createdAt: { gte: desde } } : {}) },
    select: {
      acertou: true,
      materiaSnapshot: true,
      assuntoSnapshot: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return agregarStats(answers);
}

// Agregação pura (sem banco) — testável isoladamente.
export function agregarStats(answers: AnswerLike[]): StatsResumo {
  const totalRespondidas = answers.length;
  const totalAcertos = answers.filter((a) => a.acertou).length;

  // --- por dia (para o gráfico de linha/área) ---
  const diaMap = new Map<string, { total: number; acertos: number }>();
  for (const a of answers) {
    const dia = localDateKey(a.createdAt);
    const cur = diaMap.get(dia) ?? { total: 0, acertos: 0 };
    cur.total++;
    if (a.acertou) cur.acertos++;
    diaMap.set(dia, cur);
  }
  const porDia = [...diaMap.entries()]
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  // --- por matéria e por assunto ---
  const porMateria = agrupar(answers, (a) => a.materiaSnapshot, (a) => ({
    materia: a.materiaSnapshot,
  }));
  const porAssunto = agrupar(
    answers,
    (a) => `${a.materiaSnapshot}›${a.assuntoSnapshot}`,
    (a) => ({ materia: a.materiaSnapshot, assunto: a.assuntoSnapshot })
  );

  // --- pontos fracos: assuntos com volume mínimo, ordenados do pior pro melhor ---
  const pontosFracos = porAssunto
    .filter((i) => i.total >= VOLUME_MINIMO_PONTO_FRACO)
    .sort((a, b) => a.taxa - b.taxa || b.total - a.total);

  return {
    totalRespondidas,
    totalAcertos,
    taxaGlobal: totalRespondidas ? totalAcertos / totalRespondidas : 0,
    porDia,
    porMateria: porMateria.sort((a, b) => a.taxa - b.taxa),
    porAssunto,
    pontosFracos,
  };
}

function agrupar<T extends { acertou: boolean }>(
  itens: T[],
  chaveFn: (i: T) => string,
  metaFn: (i: T) => { materia: string; assunto?: string }
): TaxaItem[] {
  const map = new Map<string, TaxaItem>();
  for (const it of itens) {
    const chave = chaveFn(it);
    const meta = metaFn(it);
    const cur =
      map.get(chave) ?? { chave, ...meta, total: 0, acertos: 0, taxa: 0 };
    cur.total++;
    if (it.acertou) cur.acertos++;
    map.set(chave, cur);
  }
  return [...map.values()].map((i) => ({ ...i, taxa: i.total ? i.acertos / i.total : 0 }));
}
