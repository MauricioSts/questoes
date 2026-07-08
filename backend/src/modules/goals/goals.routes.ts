// Meta diária e streak. Derivados por query sobre Answer (sem tabela dedicada).
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { startOfToday, localDateKey } from "../../lib/date.js";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

// GET /goals/today — respondidas hoje vs meta + streak de dias batendo a meta.
goalsRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const meta = user?.metaDiaria ?? 70;

    const inicioHoje = startOfToday();
    const respondidasHoje = await prisma.answer.count({
      where: { userId: req.userId!, createdAt: { gte: inicioHoje } },
    });

    const streak = await calcularStreak(req.userId!, meta);

    res.json({
      meta,
      respondidasHoje,
      cumpriuHoje: respondidasHoje >= meta,
      streak,
    });
  })
);

// Conta dias consecutivos (fuso do usuário) em que bateu a meta.
// Se hoje ainda não bateu, o streak considera a sequência que termina ontem
// (não quebra até o dia virar).
async function calcularStreak(userId: string, meta: number): Promise<number> {
  const desde = new Date(Date.now() - 120 * 864e5); // janela suficiente
  const answers = await prisma.answer.findMany({
    where: { userId, createdAt: { gte: desde } },
    select: { createdAt: true },
  });

  const porDia = new Map<string, number>();
  for (const a of answers) {
    const dia = localDateKey(a.createdAt);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  const hojeKey = localDateKey(new Date());
  const bateuHoje = (porDia.get(hojeKey) ?? 0) >= meta;

  let streak = 0;
  // Se hoje não bateu, começamos a contar a partir de ontem.
  let cursor = new Date(startOfToday().getTime());
  if (!bateuHoje) cursor = new Date(cursor.getTime() - 864e5);

  while (true) {
    const key = localDateKey(cursor);
    if ((porDia.get(key) ?? 0) >= meta) {
      streak++;
      cursor = new Date(cursor.getTime() - 864e5);
    } else {
      break;
    }
  }
  return streak;
}
