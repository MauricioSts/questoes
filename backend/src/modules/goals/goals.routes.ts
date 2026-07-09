// Meta diária e streak. Derivados por query sobre Answer (sem tabela dedicada).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { startOfToday, localDateKey, weekDayKeys } from "../../lib/date.js";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

// GET /goals/today — respondidas hoje vs meta + streak + progresso geral do plano.
goalsRouter.get(
  "/today",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const meta = user?.metaDiaria ?? 70;

    const inicioHoje = startOfToday();
    const respondidasHoje = await prisma.answer.count({
      where: { userId: req.userId!, createdAt: { gte: inicioHoje } },
    });

    // Uma única passada nas respostas → mapa dia→quantidade, base do streak e da semana.
    const porDia = await contarPorDia(req.userId!);
    const streak = calcularStreak(porDia, meta);

    // Calendário da ofensiva: cada dia da semana atual (seg→dom) bateu a meta?
    const { keys, hojeIdx } = weekDayKeys();
    const semana = keys.map((k) => (porDia.get(k) ?? 0) >= meta);

    // Total de questões no sistema (banco compartilhado) e quantas o usuário já
    // respondeu ao menos uma vez (distinct por questaoId).
    const totalQuestoes = await prisma.questao.count();
    const respondidasDistintas = await prisma.answer.findMany({
      where: { userId: req.userId! },
      distinct: ["questaoId"],
      select: { questaoId: true },
    });
    const respondidasTotal = respondidasDistintas.length;
    const progressoPlano = totalQuestoes > 0 ? Math.round((respondidasTotal / totalQuestoes) * 100) : 0;

    res.json({
      meta,
      respondidasHoje,
      cumpriuHoje: respondidasHoje >= meta,
      streak,
      semana, // 7 booleans: seg→dom da semana atual bateram a meta
      hojeIdx, // índice de hoje no array acima (0=seg … 6=dom)
      dataProva: user?.dataProva ?? null,
      totalQuestoes,
      respondidasTotal,
      progressoPlano,
    });
  })
);

// PATCH /goals/prova — define/atualiza a data alvo da prova do usuário.
const provaSchema = z.object({
  // aceita "YYYY-MM-DD" ou ISO; null limpa a data.
  dataProva: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable(),
});

goalsRouter.patch(
  "/prova",
  asyncHandler(async (req, res) => {
    const { dataProva } = provaSchema.parse(req.body);
    const valor = dataProva ? new Date(dataProva) : null;
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { dataProva: valor },
    });
    res.json({ dataProva: user.dataProva });
  })
);

// PATCH /goals/meta — define/atualiza a meta diária de questões do usuário.
const metaSchema = z.object({
  metaDiaria: z.number().int().min(1).max(500),
});

goalsRouter.patch(
  "/meta",
  asyncHandler(async (req, res) => {
    const { metaDiaria } = metaSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { metaDiaria },
    });
    res.json({ metaDiaria: user.metaDiaria });
  })
);

// Mapa "YYYY-MM-DD" (fuso do usuário) → nº de questões respondidas naquele dia.
// Janela de 120 dias é suficiente para streak e para a semana atual.
async function contarPorDia(userId: string): Promise<Map<string, number>> {
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
// Se hoje ainda não bateu, o streak considera a sequência que termina ontem
// (não quebra até o dia virar).
function calcularStreak(porDia: Map<string, number>, meta: number): number {
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
