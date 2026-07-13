// Rotas de respostas. O backend só persiste o RESULTADO (com snapshots); nunca vê
// enunciado/alternativas/gabarito. A correção (acertou) vem pronta do frontend.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { calcularStats } from "../../lib/stats.js";
import { calcularStreakUsuario } from "../../lib/streak.js";
import { revisoesPendentes } from "../../lib/srs.js";
import { startOfWeekWindow } from "../../lib/date.js";

export const answersRouter = Router();
answersRouter.use(requireAuth);

const answerSchema = z.object({
  clientId: z.string().min(1).max(64).optional(), // id do cliente p/ deduplicar reenvios
  questaoId: z.number().int(),
  moduloSnapshot: z.string().min(1),
  materiaSnapshot: z.string().min(1),
  assuntoSnapshot: z.string().min(1),
  dificuldadeSnapshot: z.string().min(1),
  alternativaMarcada: z.string().min(1),
  acertou: z.boolean(),
  tempoSegundos: z.number().int().nonnegative().optional(),
  contexto: z.enum(["ESTUDO", "FLASH", "SIMULADO", "TOPICO"]),
});

// POST /answers — registra uma resposta. Idempotente por clientId: um reenvio
// da fila offline com o mesmo clientId não cria duplicata.
answersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = answerSchema.parse(req.body);
    try {
      const answer = await prisma.answer.create({ data: { ...data, userId: req.userId! } });
      res.status(201).json({ id: answer.id });
    } catch (e) {
      // P2002 = violação de unique (clientId já registrado) → resposta já existe.
      if (data.clientId && (e as { code?: string }).code === "P2002") {
        const existente = await prisma.answer.findUnique({ where: { clientId: data.clientId } });
        res.status(200).json({ id: existente?.id, duplicate: true });
        return;
      }
      throw e;
    }
  })
);

// POST /answers/batch — registra um lote (usado no simulado: 70 de uma vez).
// skipDuplicates ignora respostas cujo clientId já foi registrado (reenvio offline).
answersRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const lote = z.array(answerSchema).min(1).parse(req.body);
    const created = await prisma.answer.createMany({
      data: lote.map((a) => ({ ...a, userId: req.userId! })),
      skipDuplicates: true,
    });
    res.status(201).json({ count: created.count });
  })
);

// GET /answers/ids — conjuntos de IDs respondidos e (algum dia) errados pelo usuário.
// Usado nos filtros "só não respondidas" / "só erradas" (modo Estudo e Tópico).
answersRouter.get(
  "/ids",
  asyncHandler(async (req, res) => {
    const rows = await prisma.answer.findMany({
      where: { userId: req.userId! },
      select: { questaoId: true, acertou: true },
    });
    const respondidas = new Set<number>();
    const erradas = new Set<number>();
    for (const r of rows) {
      respondidas.add(r.questaoId);
      if (!r.acertou) erradas.add(r.questaoId);
    }
    res.json({ respondidas: [...respondidas], erradas: [...erradas] });
  })
);

// GET /answers/export — backup completo do progresso do usuário (JSON).
answersRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const [user, answers, notas, marcadas] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { email: true, nome: true, metaDiaria: true, createdAt: true },
      }),
      prisma.answer.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "asc" } }),
      prisma.nota.findMany({ where: { userId: req.userId! } }),
      prisma.marcada.findMany({ where: { userId: req.userId! } }),
    ]);
    res.json({ exportadoEm: new Date().toISOString(), user, answers, notas, marcadas });
  })
);

// GET /answers/stats?period=7d|30d|all — agregados p/ dashboard "onde estou errando".
answersRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const period = String(req.query.period ?? "all");
    let desde: Date | undefined;
    if (period === "7d") desde = new Date(Date.now() - 7 * 864e5);
    else if (period === "30d") desde = new Date(Date.now() - 30 * 864e5);
    const stats = await calcularStats(req.userId!, desde);
    // Streak sempre considera o histórico completo (independe do período do filtro).
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const streak = await calcularStreakUsuario(req.userId!, user?.metaDiaria ?? 70);
    res.json({ ...stats, streak });
  })
);

// GET /answers/wrong?modulo=II&limit=10 — IDs de questões erradas priorizadas (Flash).
// Prioriza: mais vezes errada, e erro mais recente como desempate.
answersRouter.get(
  "/wrong",
  asyncHandler(async (req, res) => {
    const modulo = req.query.modulo ? String(req.query.modulo) : undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 100);

    const grupos = await prisma.answer.groupBy({
      by: ["questaoId"],
      where: { userId: req.userId!, acertou: false, ...(modulo ? { moduloSnapshot: modulo } : {}) },
      _count: { questaoId: true },
      _max: { createdAt: true },
    });

    const ordenados = grupos
      .sort((a, b) => {
        const c = b._count.questaoId - a._count.questaoId;
        if (c !== 0) return c;
        return (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0);
      })
      .slice(0, limit)
      .map((g) => ({ questaoId: g.questaoId, erros: g._count.questaoId, ultimoErro: g._max.createdAt }));

    res.json({ ids: ordenados.map((o) => o.questaoId), detalhes: ordenados });
  })
);

// GET /answers/erradas — questões cujo ÚLTIMO resultado foi erro (para a aba "Revisar").
// Assim que o usuário acerta numa revisão, a questão deixa de aparecer aqui.
answersRouter.get(
  "/erradas",
  asyncHandler(async (req, res) => {
    const rows = await prisma.answer.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "asc" },
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

    // Reduz para o estado atual de cada questão (a última resposta vence, pois está em ordem asc).
    const map = new Map<
      number,
      {
        questaoId: number;
        modulo: string;
        materia: string;
        assunto: string;
        dificuldade: string;
        erros: number;
        tentativas: number;
        acertouUltima: boolean;
        ultimaData: Date;
      }
    >();
    for (const r of rows) {
      const cur =
        map.get(r.questaoId) ?? {
          questaoId: r.questaoId,
          modulo: r.moduloSnapshot,
          materia: r.materiaSnapshot,
          assunto: r.assuntoSnapshot,
          dificuldade: r.dificuldadeSnapshot,
          erros: 0,
          tentativas: 0,
          acertouUltima: false,
          ultimaData: r.createdAt,
        };
      cur.tentativas++;
      if (!r.acertou) cur.erros++;
      cur.acertouUltima = r.acertou;
      cur.ultimaData = r.createdAt;
      cur.modulo = r.moduloSnapshot;
      cur.materia = r.materiaSnapshot;
      cur.assunto = r.assuntoSnapshot;
      cur.dificuldade = r.dificuldadeSnapshot;
      map.set(r.questaoId, cur);
    }

    const erradas = [...map.values()]
      .filter((x) => !x.acertouUltima)
      .sort((a, b) => b.erros - a.erros || b.ultimaData.getTime() - a.ultimaData.getTime());

    res.json({ ids: erradas.map((x) => x.questaoId), questoes: erradas });
  })
);

// GET /answers/revisao?limit=30 — questões prontas para revisão espaçada (SRS) hoje.
// Ordena as mais atrasadas primeiro. Também informa o total pendente (para o card da home).
answersRouter.get(
  "/revisao",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 60), 200);
    const answers = await prisma.answer.findMany({
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
    const pendentes = revisoesPendentes(answers);
    const recorte = pendentes.slice(0, limit);
    res.json({
      total: pendentes.length,
      ids: recorte.map((i) => i.questaoId),
      questoes: recorte,
    });
  })
);

// GET /answers/simulados — histórico de simulados anteriores, com as respostas de cada um.
// Não há coluna de sessão: um simulado é um lote enviado de uma vez (mesmo instante), então
// agrupamos as respostas de contexto SIMULADO por proximidade de tempo (gap > 30min = novo).
answersRouter.get(
  "/simulados",
  asyncHandler(async (req, res) => {
    const rows = await prisma.answer.findMany({
      where: { userId: req.userId!, contexto: "SIMULADO" },
      orderBy: { createdAt: "asc" },
      select: {
        questaoId: true,
        alternativaMarcada: true,
        acertou: true,
        tempoSegundos: true,
        moduloSnapshot: true,
        materiaSnapshot: true,
        assuntoSnapshot: true,
        dificuldadeSnapshot: true,
        createdAt: true,
      },
    });

    const GAP_MS = 30 * 60 * 1000; // >30min entre respostas = simulado diferente
    interface Sessao {
      id: string;
      data: Date;
      total: number;
      acertos: number;
      tempoTotalSegundos: number;
      respostas: (Omit<(typeof rows)[number], "createdAt">)[];
    }
    const sessoes: Sessao[] = [];
    let ultima: Date | null = null;
    for (const r of rows) {
      const { createdAt, ...resto } = r;
      if (!ultima || createdAt.getTime() - ultima.getTime() > GAP_MS) {
        sessoes.push({
          id: createdAt.toISOString(),
          data: createdAt,
          total: 0,
          acertos: 0,
          tempoTotalSegundos: 0,
          respostas: [],
        });
      }
      const s = sessoes[sessoes.length - 1];
      s.total++;
      if (resto.acertou) s.acertos++;
      s.tempoTotalSegundos += resto.tempoSegundos ?? 0;
      s.respostas.push(resto);
      ultima = createdAt;
    }

    // Mais recentes primeiro.
    sessoes.reverse();
    res.json({ simulados: sessoes });
  })
);

// GET /answers/week — questões respondidas nos últimos 7 dias + flag de erro (Simulado).
// O frontend usa isso para sortear mantendo a proporção, com ênfase nas erradas.
answersRouter.get(
  "/week",
  asyncHandler(async (req, res) => {
    const desde = startOfWeekWindow();
    const answers = await prisma.answer.findMany({
      where: { userId: req.userId!, createdAt: { gte: desde } },
      select: {
        questaoId: true,
        acertou: true,
        moduloSnapshot: true,
        materiaSnapshot: true,
      },
    });

    // Agrega por questão: quantos erros na semana (para ponderar sorteio).
    const map = new Map<
      number,
      { questaoId: number; modulo: string; materia: string; erros: number; total: number }
    >();
    for (const a of answers) {
      const cur =
        map.get(a.questaoId) ?? {
          questaoId: a.questaoId,
          modulo: a.moduloSnapshot,
          materia: a.materiaSnapshot,
          erros: 0,
          total: 0,
        };
      cur.total++;
      if (!a.acertou) cur.erros++;
      map.set(a.questaoId, cur);
    }

    res.json({ desde, questoes: [...map.values()] });
  })
);
