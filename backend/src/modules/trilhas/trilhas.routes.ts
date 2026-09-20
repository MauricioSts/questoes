// Trilhas: o que o usuário escolhe antes de começar a estudar. A trilha é dona do
// acervo compartilhado; entrar nela cria o Concurso pessoal (progresso, meta, caderno)
// apontando para ela. Sem isso, uma conta nova via Concurso vazio.
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { montarRanking, VOLUME_MINIMO_TAXA } from "../../lib/ranking.js";

export const trilhasRouter = Router();
trilhasRouter.use(requireAuth);

// Meta diária inicial de quem entra numa trilha. O usuário ajusta depois nas metas.
const META_DIARIA_PADRAO = 30;

// GET /trilhas: as trilhas publicadas, com o tamanho do acervo e se o usuário já entrou.
trilhasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [trilhas, meus] = await Promise.all([
      prisma.trilha.findMany({ where: { publicada: true }, orderBy: { ordem: "asc" } }),
      prisma.concurso.findMany({
        where: { userId: req.userId!, trilhaId: { not: null } },
        select: { id: true, trilhaId: true },
      }),
    ]);

    const porTrilha = new Map(meus.map((c) => [c.trilhaId!, c.id]));
    const contagens = await prisma.questao.groupBy({
      by: ["trilhaId", "materia"],
      where: { trilhaId: { in: trilhas.map((t) => t.id) } },
      _count: { _all: true },
    });

    const lista = trilhas.map((t) => {
      const linhas = contagens.filter((c) => c.trilhaId === t.id);
      return {
        id: t.id,
        nome: t.nome,
        cargo: t.cargo,
        iniciais: t.iniciais,
        banca: t.banca,
        orgao: t.orgao,
        ano: t.ano,
        descricao: t.descricao,
        dataProva: t.dataProva?.toISOString() ?? null,
        questoes: linhas.reduce((s, c) => s + c._count._all, 0),
        materias: linhas.length,
        // Concurso do usuário nessa trilha, quando já entrou. O cliente usa para
        // mostrar "continuar" em vez de "começar" e para não criar duplicata.
        concursoId: porTrilha.get(t.id) ?? null,
      };
    });

    res.json({ trilhas: lista });
  })
);

// POST /trilhas/:id/entrar: idempotente. Se o usuário já segue a trilha, devolve o
// concurso que ele já tem — dois cliques no cartão não viram dois concursos.
trilhasRouter.post(
  "/:id/entrar",
  asyncHandler(async (req, res) => {
    const trilha = await prisma.trilha.findFirst({
      where: { id: req.params.id, publicada: true },
    });
    if (!trilha) throw new HttpError(404, "Trilha não encontrada.");

    const existente = await prisma.concurso.findFirst({
      where: { userId: req.userId!, trilhaId: trilha.id },
    });
    if (existente) return res.json({ concurso: existente, jaSeguia: true });

    // Sem data de prova na trilha, joga um ano à frente: o app conta os dias restantes
    // em vários lugares e uma data no passado apareceria como prova vencida.
    const dataProva =
      trilha.dataProva ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    const concurso = await prisma.concurso.create({
      data: {
        userId: req.userId!,
        trilhaId: trilha.id,
        nome: `${trilha.nome}: ${trilha.cargo}`,
        iniciais: trilha.iniciais.toUpperCase(),
        banca: trilha.banca,
        ano: trilha.ano,
        cargo: trilha.cargo,
        dataProva,
        metaDiaria: META_DIARIA_PADRAO,
      },
    });
    res.status(201).json({ concurso, jaSeguia: false });
  })
);

// GET /trilhas/:id/ranking: placar da trilha. As respostas chegam pelo Concurso que cada
// usuário criou ao entrar nela — é o único vínculo entre Answer e Trilha, já que a
// resposta guarda concursoId, não trilhaId.
trilhasRouter.get(
  "/:id/ranking",
  asyncHandler(async (req, res) => {
    const trilha = await prisma.trilha.findFirst({
      where: { id: req.params.id, publicada: true },
    });
    if (!trilha) throw new HttpError(404, "Trilha não encontrada.");

    const concursos = await prisma.concurso.findMany({
      where: { trilhaId: trilha.id },
      select: { id: true, userId: true, user: { select: { nome: true } } },
    });

    const concursoIds = concursos.map((c) => c.id);
    // Um usuário pode ter mais de um concurso na mesma trilha (não deveria, mas o banco
    // permite): soma tudo sob o mesmo userId.
    const nomePorUser = new Map(concursos.map((c) => [c.userId, c.user.nome]));

    const grupos = concursoIds.length
      ? await prisma.answer.groupBy({
          by: ["userId", "acertou"],
          where: { concursoId: { in: concursoIds } },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [];

    const porUser = new Map<string, { acertos: number; respondidas: number; ultima: Date | null }>();
    for (const g of grupos) {
      const atual = porUser.get(g.userId) ?? { acertos: 0, respondidas: 0, ultima: null };
      atual.respondidas += g._count._all;
      if (g.acertou) atual.acertos += g._count._all;
      const max = g._max.createdAt;
      if (max && (!atual.ultima || max > atual.ultima)) atual.ultima = max;
      porUser.set(g.userId, atual);
    }

    const linhas = montarRanking(
      [...porUser.entries()].map(([userId, v]) => ({
        userId,
        nome: nomePorUser.get(userId) ?? "Anônimo",
        acertos: v.acertos,
        respondidas: v.respondidas,
        ultimaResposta: v.ultima,
      }))
    );

    res.json({
      trilha: {
        id: trilha.id,
        nome: trilha.nome,
        cargo: trilha.cargo,
        iniciais: trilha.iniciais,
        banca: trilha.banca,
        orgao: trilha.orgao,
      },
      // Quantos entraram na trilha (inclui quem ainda não respondeu nada e por isso
      // não aparece nas linhas).
      seguidores: new Set(concursos.map((c) => c.userId)).size,
      volumeMinimoTaxa: VOLUME_MINIMO_TAXA,
      voceId: req.userId!,
      linhas,
    });
  })
);
