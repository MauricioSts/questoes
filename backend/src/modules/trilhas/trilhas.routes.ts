// Trilhas: o que o usuário escolhe antes de começar a estudar. A trilha é dona do
// acervo compartilhado; entrar nela cria o Concurso pessoal (progresso, meta, caderno)
// apontando para ela. Sem isso, uma conta nova via Concurso vazio.
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { montarRanking, nomeExibicao, VOLUME_MINIMO_TAXA } from "../../lib/ranking.js";
import type { Vitrine } from "../poke/poke.routes.js";

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

// Linhas do ranking de uma trilha. As respostas chegam pelo Concurso que cada usuário
// cria ao entrar nela — é o único vínculo entre Answer e Trilha, já que a resposta
// guarda concursoId, não trilhaId.
async function linhasDaTrilha(trilhaId: string) {
  const concursos = await prisma.concurso.findMany({
    where: { trilhaId },
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

  // Seguidores inclui quem entrou e ainda não respondeu nada (não aparece nas linhas).
  return { linhas, seguidores: new Set(concursos.map((c) => c.userId)).size, concursoIds, concursos };
}

async function trilhaPublicada(id: string) {
  const trilha = await prisma.trilha.findFirst({ where: { id, publicada: true } });
  if (!trilha) throw new HttpError(404, "Trilha não encontrada.");
  return trilha;
}

// GET /trilhas/:id/ranking: placar completo da trilha.
trilhasRouter.get(
  "/:id/ranking",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaPublicada(req.params.id);
    const { linhas, seguidores } = await linhasDaTrilha(trilha.id);
    // Avatar = treinador escolhido na Batalha Pokémon, quando a pessoa já jogou.
    const vitrines = await prisma.pokeVitrine.findMany({
      where: { userId: { in: linhas.map((l) => l.userId) } },
      select: { userId: true, dados: true },
    });
    const treinadorDe = new Map(vitrines.map((v) => [v.userId, (v.dados as unknown as Vitrine).treinador]));

    res.json({
      trilha: {
        id: trilha.id,
        nome: trilha.nome,
        cargo: trilha.cargo,
        iniciais: trilha.iniciais,
        banca: trilha.banca,
        orgao: trilha.orgao,
      },
      seguidores,
      volumeMinimoTaxa: VOLUME_MINIMO_TAXA,
      voceId: req.userId!,
      linhas: linhas.map((l) => ({ ...l, treinador: treinadorDe.get(l.userId) ?? null })),
    });
  })
);

// GET /trilhas/:id/ranking/eu: só a minha linha, para o painel. Existe separado do placar
// inteiro porque o dashboard não precisa (nem deve, quando a trilha crescer) baixar a
// lista de todo mundo para mostrar uma posição.
trilhasRouter.get(
  "/:id/ranking/eu",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaPublicada(req.params.id);
    const { linhas, seguidores } = await linhasDaTrilha(trilha.id);

    const indice = linhas.findIndex((l) => l.userId === req.userId!);
    const eu = indice >= 0 ? linhas[indice] : null;
    // Quem está logo à frente: é o que transforma a posição em próximo passo
    // ("faltam 12 acertos para passar Bruno L.").
    const acima = indice > 0 ? linhas[indice - 1] : null;

    res.json({
      trilha: { id: trilha.id, nome: trilha.nome, iniciais: trilha.iniciais },
      seguidores,
      participantes: linhas.length, // quem já respondeu ao menos uma questão
      eu: eu && {
        posicao: eu.posicao,
        acertos: eu.acertos,
        respondidas: eu.respondidas,
        taxa: eu.taxa,
      },
      acima: acima && { nome: acima.nome, acertos: acima.acertos },
      lider: linhas[0] ? { nome: linhas[0].nome, acertos: linhas[0].acertos } : null,
    });
  })
);

// GET /trilhas/:id/ranking/:userId: perfil público de quem está no placar — números do
// estudo NA TRILHA e o resumo da Batalha Pokémon. Só abre para quem segue a trilha,
// o mesmo universo que o placar já expõe.
trilhasRouter.get(
  "/:id/ranking/:userId",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaPublicada(req.params.id);
    const alvo = req.params.userId;
    const { linhas, concursos } = await linhasDaTrilha(trilha.id);
    const ids = concursos.filter((c) => c.userId === alvo).map((c) => c.id);
    if (!ids.length) throw new HttpError(404, "Essa pessoa não segue a trilha.");
    const nome = concursos.find((c) => c.userId === alvo)!.user.nome;
    const linha = linhas.find((l) => l.userId === alvo) ?? null;
    const onde = { userId: alvo, concursoId: { in: ids } };

    const [porContexto, porMateria, extremos, dias, vitrine] = await Promise.all([
      prisma.answer.groupBy({ by: ["contexto", "acertou"], where: onde, _count: { _all: true } }),
      prisma.answer.groupBy({ by: ["materiaSnapshot", "acertou"], where: onde, _count: { _all: true } }),
      prisma.answer.aggregate({ where: onde, _min: { createdAt: true }, _max: { createdAt: true } }),
      prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(DISTINCT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date) AS n
        FROM "Answer" WHERE "userId" = ${alvo} AND "concursoId" = ANY(${ids})`,
      prisma.pokeVitrine.findUnique({ where: { userId: alvo } }),
    ]);

    const batalha = { respondidas: 0, acertos: 0 };
    for (const g of porContexto) {
      if (g.contexto !== "BATALHA") continue;
      batalha.respondidas += g._count._all;
      if (g.acertou) batalha.acertos += g._count._all;
    }

    const materias = new Map<string, { acertos: number; respondidas: number }>();
    for (const g of porMateria) {
      const m = materias.get(g.materiaSnapshot) ?? { acertos: 0, respondidas: 0 };
      m.respondidas += g._count._all;
      if (g.acertou) m.acertos += g._count._all;
      materias.set(g.materiaSnapshot, m);
    }
    // Pontos fortes: mais acertos, com volume mínimo para a taxa dizer alguma coisa.
    const fortes = [...materias.entries()]
      .map(([materia, v]) => ({ materia, ...v, taxa: v.acertos / v.respondidas }))
      .filter((m) => m.respondidas >= 5)
      .sort((a, b) => b.acertos - a.acertos)
      .slice(0, 4);

    res.json({
      userId: alvo,
      nome: nomeExibicao(nome),
      voce: alvo === req.userId,
      posicao: linha?.posicao ?? null,
      participantes: linhas.length,
      acertos: linha?.acertos ?? 0,
      respondidas: linha?.respondidas ?? 0,
      taxa: linha?.taxa ?? 0,
      desde: extremos._min.createdAt?.toISOString() ?? null,
      ultimaResposta: extremos._max.createdAt?.toISOString() ?? null,
      diasEstudados: Number(dias[0]?.n ?? 0),
      batalha,
      materias: fortes,
      poke: vitrine ? { ...(vitrine.dados as unknown as Vitrine), atualizadoEm: vitrine.updatedAt.toISOString() } : null,
    });
  })
);
