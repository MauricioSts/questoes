// Cálculo de ofensiva (streak). Extraído para ser reutilizado pelo dashboard
// (/goals/today) e pela tela de estatísticas (/answers/stats).
import { prisma } from "../prisma.js";
import { localDateKey, startOfToday, localWeekdayIndex } from "./date.js";

// Mapa "YYYY-MM-DD" (fuso do usuário) → nº de questões respondidas naquele dia.
// Janela de 120 dias é suficiente para streak e para a semana atual.
export async function contarPorDia(userId: string): Promise<Map<string, number>> {
  const desde = new Date(Date.now() - 120 * 864e5);
  const answers = await prisma.answer.findMany({
    where: { userId, createdAt: { gte: desde } },
    select: { createdAt: true },
  });
  const porDia = new Map<string, number>();
  for (const a of answers) {
    const dia = localDateKey(a.createdAt);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  return porDia;
}

// Período do modo férias. `fim` null = período em aberto (modo ligado agora).
// Vários períodos são guardados (histórico) → ligar/desligar de novo não apaga os
// anteriores, e a ofensiva não quebra retroativamente.
export interface FeriasPeriodo {
  inicio: Date;
  fim: Date | null;
}

// Conta dias consecutivos (fuso do usuário) em que bateu a meta.
// Regras:
// - Bateu a meta no dia → conta (inclusive em fim de semana / férias: estudar sempre conta).
// - Não bateu, mas é fim de semana ou dia de férias → pula (protege, não quebra).
// - Não bateu e é dia útil normal → quebra a sequência.
// Se hoje ainda não bateu (e não é descanso), a sequência considera o último dia útil.
export function calcularStreak(
  porDia: Map<string, number>,
  meta: number,
  periodos: FeriasPeriodo[] = []
): number {
  const bateuNoDia = (cursor: Date) => (porDia.get(localDateKey(cursor)) ?? 0) >= meta;
  // localWeekdayIndex: seg=0 … sáb=5, dom=6.
  const ehFimDeSemana = (cursor: Date) => {
    const wd = localWeekdayIndex(cursor);
    return wd === 5 || wd === 6;
  };
  // Dia coberto por ALGUM período de férias (comparação por dia local).
  const ehFerias = (cursor: Date) => {
    const k = localDateKey(cursor);
    return periodos.some((p) => {
      if (k < localDateKey(p.inicio)) return false;
      return p.fim ? k <= localDateKey(p.fim) : true; // fim null = em aberto
    });
  };
  const ehDescanso = (cursor: Date) => ehFimDeSemana(cursor) || ehFerias(cursor);
  const diaAntes = (cursor: Date) => new Date(cursor.getTime() - 864e5);

  let cursor = startOfToday();
  // Hoje ainda em aberto: se não é descanso e ainda não bateu, começa de ontem.
  if (!ehDescanso(cursor) && !bateuNoDia(cursor)) cursor = diaAntes(cursor);

  let streak = 0;
  while (true) {
    if (bateuNoDia(cursor)) {
      // Bateu a meta: conta mesmo em descanso (estudar sempre conta).
      streak++;
      cursor = diaAntes(cursor);
      continue;
    }
    if (ehDescanso(cursor)) {
      // Não bateu, mas é descanso (fim de semana ou férias): pula sem quebrar.
      cursor = diaAntes(cursor);
      continue;
    }
    break;
  }
  return streak;
}

// Carrega os períodos de férias do usuário do banco.
export async function carregarFeriasPeriodos(userId: string): Promise<FeriasPeriodo[]> {
  const rows = await prisma.feriasPeriodo.findMany({
    where: { userId },
    select: { inicio: true, fim: true },
    orderBy: { inicio: "asc" },
  });
  return rows;
}

// Conveniência: calcula o streak do usuário direto do banco.
export async function calcularStreakUsuario(userId: string, meta: number): Promise<number> {
  const [porDia, periodos] = await Promise.all([contarPorDia(userId), carregarFeriasPeriodos(userId)]);
  return calcularStreak(porDia, meta, periodos);
}
