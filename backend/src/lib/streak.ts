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

// Janela do modo férias. Enquanto `ativo`, todo dia a partir de `desde` (inclusive)
// é considerado férias. Depois de desligado, a janela é [desde, ate] (inclusive) —
// guardar isso é o que impede a ofensiva de quebrar retroativamente ao voltar.
export interface FeriasWindow {
  ativo: boolean;
  desde: Date | null;
  ate: Date | null;
}

// Conta dias consecutivos (fuso do usuário) em que bateu a meta.
// Sábado e domingo são dias de descanso: não contam para o streak nem o quebram
// — são apenas pulados. Dias dentro do modo férias têm o mesmo tratamento.
// Se hoje ainda não bateu (e não é dia de descanso), a sequência considera o
// último dia útil (não quebra até o dia virar).
export function calcularStreak(
  porDia: Map<string, number>,
  meta: number,
  ferias?: FeriasWindow
): number {
  const bateuNoDia = (cursor: Date) => (porDia.get(localDateKey(cursor)) ?? 0) >= meta;
  // localWeekdayIndex: seg=0 … sáb=5, dom=6.
  const ehFimDeSemana = (cursor: Date) => {
    const wd = localWeekdayIndex(cursor);
    return wd === 5 || wd === 6;
  };
  // Dia coberto pelo modo férias (comparação por dia local, não por instante).
  const ehFerias = (cursor: Date) => {
    if (!ferias?.desde) return false;
    const k = localDateKey(cursor);
    if (k < localDateKey(ferias.desde)) return false;
    if (ferias.ativo) return true; // ligado: qualquer dia a partir de "desde"
    return ferias.ate ? k <= localDateKey(ferias.ate) : false;
  };
  const ehDescanso = (cursor: Date) => ehFimDeSemana(cursor) || ehFerias(cursor);
  const diaAntes = (cursor: Date) => new Date(cursor.getTime() - 864e5);

  let cursor = startOfToday();
  // Hoje ainda em aberto: se não é descanso e ainda não bateu, começa de ontem.
  if (!ehDescanso(cursor) && !bateuNoDia(cursor)) cursor = diaAntes(cursor);

  let streak = 0;
  while (true) {
    if (ehDescanso(cursor)) {
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
export async function calcularStreakUsuario(
  userId: string,
  meta: number,
  ferias?: FeriasWindow
): Promise<number> {
  const porDia = await contarPorDia(userId);
  return calcularStreak(porDia, meta, ferias);
}
