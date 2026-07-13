// Meta diária e streak. Derivados por query sobre Answer (sem tabela dedicada).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { startOfToday, weekDayKeys } from "../../lib/date.js";
import { contarPorDia, calcularStreak } from "../../lib/streak.js";
import { revisoesPendentes } from "../../lib/srs.js";

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
    // Acertos de hoje → aproveitamento do dia no dashboard.
    const acertosHoje = await prisma.answer.count({
      where: { userId: req.userId!, createdAt: { gte: inicioHoje }, acertou: true },
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

    // Total de questões realizadas de todos os tempos (conta repetições — cada
    // resposta registrada, não só questões distintas). É o "quanto já resolvi".
    const respondidasSempre = await prisma.answer.count({
      where: { userId: req.userId! },
    });

    // Legislação: total de questões da matéria + quantas (distintas) foram feitas
    // hoje — para o feedback de "dia de legislação concluído" no dashboard.
    const legislacaoWhere = { materia: { contains: "legisl", mode: "insensitive" as const } };
    const legislacaoTotal = await prisma.questao.count({ where: legislacaoWhere });
    const legislacaoDistintasHoje = await prisma.answer.findMany({
      where: {
        userId: req.userId!,
        createdAt: { gte: inicioHoje },
        materiaSnapshot: { contains: "legisl", mode: "insensitive" },
      },
      distinct: ["questaoId"],
      select: { questaoId: true },
    });
    const legislacaoFeitasHoje = legislacaoDistintasHoje.length;

    // Português: mesmo cálculo da legislação, para o "dia de português" no dashboard.
    const portuguesWhere = { materia: { contains: "portugu", mode: "insensitive" as const } };
    const portuguesTotal = await prisma.questao.count({ where: portuguesWhere });
    const portuguesDistintasHoje = await prisma.answer.findMany({
      where: {
        userId: req.userId!,
        createdAt: { gte: inicioHoje },
        materiaSnapshot: { contains: "portugu", mode: "insensitive" },
      },
      distinct: ["questaoId"],
      select: { questaoId: true },
    });
    const portuguesFeitasHoje = portuguesDistintasHoje.length;

    // Revisão espaçada: quantas questões estão "prontas" para revisar hoje (SRS).
    const answersRevisao = await prisma.answer.findMany({
      where: { userId: req.userId! },
      select: {
        questaoId: true,
        acertou: true,
        createdAt: true,
        moduloSnapshot: true,
        materiaSnapshot: true,
        assuntoSnapshot: true,
        dificuldadeSnapshot: true,
      },
    });
    const revisaoPendente = revisoesPendentes(answersRevisao).length;

    // Progresso de tempo até a prova (0–100%): quanto do período desde a criação
    // da conta até a data da prova já passou. Só faz sentido com data definida.
    const dataProva = user?.dataProva ?? null;
    let progressoTempo: number | null = null;
    if (dataProva && user) {
      const inicio = user.createdAt.getTime();
      const fim = dataProva.getTime();
      const agora = Date.now();
      progressoTempo =
        fim > inicio ? Math.min(100, Math.max(0, Math.round(((agora - inicio) / (fim - inicio)) * 100))) : 100;
    }

    res.json({
      meta,
      respondidasHoje,
      acertosHoje,
      cumpriuHoje: respondidasHoje >= meta,
      streak,
      semana, // 7 booleans: seg→dom da semana atual bateram a meta
      hojeIdx, // índice de hoje no array acima (0=seg … 6=dom)
      dataProva,
      totalQuestoes,
      respondidasTotal,
      respondidasSempre, // total de respostas de todos os tempos (com repetições)
      progressoPlano,
      progressoTempo, // % do tempo até a prova decorrido (null se sem data)
      legislacaoTotal,
      legislacaoFeitasHoje,
      portuguesTotal,
      portuguesFeitasHoje,
      revisaoPendente, // nº de questões prontas para revisão espaçada (SRS)
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
