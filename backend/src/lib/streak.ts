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

// Conta dias consecutivos (fuso do usuário) em que bateu a meta.
// Domingo é dia de descanso: não conta para o streak nem o quebra — é apenas
// pulado. Se hoje ainda não bateu (e não é domingo), a sequência considera o
// último dia útil (não quebra até o dia virar).
export function calcularStreak(porDia: Map<string, number>, meta: number): number {
  const bateuNoDia = (cursor: Date) => (porDia.get(localDateKey(cursor)) ?? 0) >= meta;
  const ehDomingo = (cursor: Date) => localWeekdayIndex(cursor) === 6;
  const diaAntes = (cursor: Date) => new Date(cursor.getTime() - 864e5);

  let cursor = startOfToday();
  // Hoje ainda em aberto: se não é domingo e ainda não bateu, começa de ontem.
  if (!ehDomingo(cursor) && !bateuNoDia(cursor)) cursor = diaAntes(cursor);

  let streak = 0;
  while (true) {
    if (ehDomingo(cursor)) {
      // Descanso: pula sem contar nem quebrar a sequência.
      cursor = diaAntes(cursor);
      continue;
    }
    if (bateuNoDia(cursor)) {
      streak++;
      cursor = diaAntes(cursor);
    } else {
      break;
    }
  }
  return streak;
}

// Conveniência: calcula o streak do usuário direto do banco.
export async function calcularStreakUsuario(userId: string, meta: number): Promise<number> {
  const porDia = await contarPorDia(userId);
  return calcularStreak(porDia, meta);
}
