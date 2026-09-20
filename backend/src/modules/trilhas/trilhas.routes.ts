// Trilhas: o que o usuário escolhe antes de começar a estudar. A trilha é dona do
// acervo compartilhado; entrar nela cria o Concurso pessoal (progresso, meta, caderno)
// apontando para ela. Sem isso, uma conta nova via Concurso vazio.
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";

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
