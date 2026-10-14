// Trilhas: o que o usuário escolhe antes de começar a estudar. A trilha é dona do
// acervo compartilhado; entrar nela cria o Concurso pessoal (progresso, meta, caderno)
// apontando para ela. Sem isso, uma conta nova via Concurso vazio.
import { Router } from "express";
import { z } from "zod";
import type { Prisma, Trilha } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { montarRanking, nomeExibicao, VOLUME_MINIMO_TAXA } from "../../lib/ranking.js";
import type { Vitrine } from "../poke/poke.routes.js";
import {
  MAX_QUESTOES_POR_ENVIO,
  MAX_QUESTOES_TRILHA,
  MIN_QUESTOES_VITRINE,
  dadosQuestao,
  iniciaisTrilha,
  nomeCompleto,
  questaoComunidadeSchema,
  regrasCriacao,
  slugTrilha,
  trilhaSchema,
  type Visibilidade,
} from "../../lib/trilhaComunidade.js";

export const trilhasRouter = Router();
trilhasRouter.use(requireAuth);

// Meta diária inicial de quem entra numa trilha. O usuário ajusta depois nas metas.
const META_DIARIA_PADRAO = 30;

// Trilhas que este usuário enxerga: oficiais publicadas, as da comunidade que são
// públicas e já têm questões suficientes, e as dele (sempre, até as vazias e privadas).
function trilhasVisiveis(userId: string): Prisma.TrilhaWhereInput {
  return {
    publicada: true,
    OR: [{ donoId: null }, { donoId: userId }, { visibilidade: "publica" }],
  };
}

// GET /trilhas: as trilhas visíveis, com o tamanho do acervo, se o usuário já entrou e
// se ele pode criar mais uma.
trilhasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const [trilhas, meus, criacao] = await Promise.all([
      prisma.trilha.findMany({
        where: trilhasVisiveis(userId),
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
        include: { dono: { select: { nome: true } } },
      }),
      prisma.concurso.findMany({
        where: { userId, trilhaId: { not: null } },
        select: { id: true, trilhaId: true },
      }),
      regrasCriacao(userId, req.userEmail),
    ]);

    const porTrilha = new Map(meus.map((c) => [c.trilhaId!, c.id]));
    const [contagens, seguidores] = await Promise.all([
      prisma.questao.groupBy({
        by: ["trilhaId", "materia"],
        where: { trilhaId: { in: trilhas.map((t) => t.id) } },
        _count: { _all: true },
      }),
      prisma.concurso.groupBy({
        by: ["trilhaId"],
        where: { trilhaId: { in: trilhas.map((t) => t.id) } },
        _count: { userId: true },
      }),
    ]);
    const seguidoresPor = new Map(seguidores.map((g) => [g.trilhaId!, g._count.userId]));

    const lista = trilhas
      .map((t) => {
        const linhas = contagens.filter((c) => c.trilhaId === t.id);
        const souDono = t.donoId === userId;
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
          seguidores: seguidoresPor.get(t.id) ?? 0,
          tipo: t.tipo,
          oficial: t.donoId === null,
          autor: t.dono ? nomeExibicao(t.dono.nome) : null,
          visibilidade: t.visibilidade as Visibilidade,
          souDono,
          // Concurso do usuário nessa trilha, quando já entrou. O cliente usa para
          // mostrar "continuar" em vez de "começar" e para não criar duplicata.
          concursoId: porTrilha.get(t.id) ?? null,
        };
      })
      // Da comunidade, só entra na vitrine com acervo mínimo (ou se já sigo / sou dono).
      .filter((t) => t.oficial || t.souDono || t.concursoId || t.questoes >= MIN_QUESTOES_VITRINE);

    res.json({ trilhas: lista, criacao });
  })
);

// Cria o Concurso pessoal de quem entra numa trilha (ou devolve o que já existe).
async function entrar(userId: string, trilha: Trilha) {
  const existente = await prisma.concurso.findFirst({ where: { userId, trilhaId: trilha.id } });
  if (existente) return { concurso: existente, jaSeguia: true };

  // Sem data de prova na trilha, joga um ano à frente: o app conta os dias restantes
  // em vários lugares e uma data no passado apareceria como prova vencida.
  const dataProva = trilha.dataProva ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1));

  const concurso = await prisma.concurso.create({
    data: {
      userId,
      trilhaId: trilha.id,
      nome: nomeCompleto(trilha),
      iniciais: trilha.iniciais.toUpperCase(),
      banca: trilha.banca,
      ano: trilha.ano,
      cargo: trilha.cargo,
      dataProva,
      metaDiaria: META_DIARIA_PADRAO,
    },
  });
  return { concurso, jaSeguia: false };
}

// POST /trilhas/:id/entrar: idempotente. Se o usuário já segue a trilha, devolve o
// concurso que ele já tem — dois cliques no cartão não viram dois concursos.
trilhasRouter.post(
  "/:id/entrar",
  asyncHandler(async (req, res) => {
    const trilha = await prisma.trilha.findFirst({
      where: { id: req.params.id, ...trilhasVisiveis(req.userId!) },
    });
    if (!trilha) throw new HttpError(404, "Trilha não encontrada.");
    const r = await entrar(req.userId!, trilha);
    res.status(r.jaSeguia ? 200 : 201).json(r);
  })
);

// ---- Trilhas da comunidade: criar, editar e escrever no acervo (só o dono) ----

// POST /trilhas: cria a trilha e já entra nela.
trilhasRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const dados = trilhaSchema.parse(req.body);
    const regras = await regrasCriacao(req.userId!, req.userEmail);
    if (!regras.podeCriar) {
      throw new HttpError(402, `No plano Free dá para criar ${regras.limiteFree} trilha. Assine o Premium para criar mais.`, "PREMIUM");
    }
    if (dados.visibilidade === "privada" && !regras.podePrivada) {
      throw new HttpError(402, "Trilha privada é um recurso Premium.", "PREMIUM");
    }
    const trilha = await prisma.trilha.create({
      data: {
        id: slugTrilha(dados.nome, dados.cargo),
        tipo: dados.tipo,
        nome: dados.nome,
        cargo: dados.cargo,
        iniciais: iniciaisTrilha(dados.nome),
        banca: dados.banca,
        orgao: dados.orgao,
        ano: dados.ano,
        descricao: dados.descricao,
        dataProva: dados.dataProva ? new Date(dados.dataProva) : null,
        visibilidade: dados.visibilidade,
        donoId: req.userId!,
        ordem: 1000, // oficiais primeiro
      },
    });
    const { concurso } = await entrar(req.userId!, trilha);
    res.status(201).json({ trilha, concurso });
  })
);

async function trilhaDoDono(id: string, userId: string) {
  const trilha = await prisma.trilha.findFirst({ where: { id, donoId: userId } });
  if (!trilha) throw new HttpError(404, "Trilha não encontrada.");
  return trilha;
}

// GET /trilhas/:id/editar: dados da trilha + questões completas (com gabarito), para o dono.
trilhasRouter.get(
  "/:id/editar",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const [questoes, regras] = await Promise.all([
      prisma.questao.findMany({
        where: { trilhaId: trilha.id },
        orderBy: { id: "asc" },
        select: {
          id: true, materia: true, assunto: true, dificuldade: true, enunciado: true,
          alternativas: true, gabarito: true, explicacao: true,
        },
      }),
      regrasCriacao(req.userId!, req.userEmail),
    ]);
    res.json({
      trilha: {
        id: trilha.id,
        nome: trilha.nome,
        cargo: trilha.cargo,
        banca: trilha.banca,
        orgao: trilha.orgao,
        ano: trilha.ano,
        descricao: trilha.descricao,
        dataProva: trilha.dataProva?.toISOString().slice(0, 10) ?? null,
        visibilidade: trilha.visibilidade,
        tipo: trilha.tipo,
      },
      questoes,
      podePrivada: regras.podePrivada,
      minQuestoesVitrine: MIN_QUESTOES_VITRINE,
      maxQuestoes: MAX_QUESTOES_TRILHA,
    });
  })
);

// PATCH /trilhas/:id: edita os dados da trilha (dono).
trilhasRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const dados = trilhaSchema.partial().parse(req.body);
    if (dados.visibilidade === "privada" && trilha.visibilidade !== "privada") {
      const { podePrivada } = await regrasCriacao(req.userId!, req.userEmail);
      if (!podePrivada) throw new HttpError(402, "Trilha privada é um recurso Premium.", "PREMIUM");
    }
    const atualizada = await prisma.trilha.update({
      where: { id: trilha.id },
      data: {
        ...dados,
        ...(dados.nome ? { iniciais: iniciaisTrilha(dados.nome) } : {}),
        dataProva: dados.dataProva === undefined ? undefined : dados.dataProva ? new Date(dados.dataProva) : null,
      },
    });
    res.json({ trilha: atualizada });
  })
);

// DELETE /trilhas/:id: apaga a trilha e o acervo dela. Recusado se outra pessoa já
// segue: apagar levaria junto o estudo dela.
trilhasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const outros = await prisma.concurso.count({ where: { trilhaId: trilha.id, userId: { not: req.userId! } } });
    if (outros > 0) {
      throw new HttpError(409, `Esta trilha tem ${outros} ${outros === 1 ? "pessoa estudando" : "pessoas estudando"} e não pode ser apagada.`);
    }
    const ids = (await prisma.questao.findMany({ where: { trilhaId: trilha.id }, select: { id: true } })).map((q) => q.id);
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questaoId: { in: ids } } }),
      prisma.nota.deleteMany({ where: { questaoId: { in: ids } } }),
      prisma.marcada.deleteMany({ where: { questaoId: { in: ids } } }),
      prisma.questao.deleteMany({ where: { id: { in: ids } } }),
      prisma.concurso.deleteMany({ where: { trilhaId: trilha.id, userId: req.userId! } }),
      prisma.trilha.delete({ where: { id: trilha.id } }),
    ]);
    res.status(204).end();
  })
);

const envioSchema = z.object({
  questoes: z.array(questaoComunidadeSchema).min(1).max(MAX_QUESTOES_POR_ENVIO),
});

// POST /trilhas/:id/questoes: adiciona questões (uma do formulário ou várias do JSON).
// O id é global (Questao.id é Int compartilhado com o acervo oficial), então a reserva
// dos ids acontece sob um lock da transação: dois envios ao mesmo tempo não colidem.
trilhasRouter.post(
  "/:id/questoes",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const { questoes } = envioSchema.parse(req.body);

    const criadas = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7311)`;
      const total = await tx.questao.count({ where: { trilhaId: trilha.id } });
      if (total + questoes.length > MAX_QUESTOES_TRILHA) {
        throw new HttpError(400, `Uma trilha comporta até ${MAX_QUESTOES_TRILHA} questões (esta tem ${total}).`);
      }
      const { _max } = await tx.questao.aggregate({ _max: { id: true } });
      const inicio = (_max.id ?? 0) + 1;
      await tx.questao.createMany({
        data: questoes.map((q, i) => ({
          id: inicio + i,
          trilhaId: trilha.id,
          ...dadosQuestao(q),
          loteNome: "comunidade",
        })),
      });
      return { inicio, n: questoes.length };
    });
    res.status(201).json({ adicionadas: criadas.n, ids: Array.from({ length: criadas.n }, (_, i) => criadas.inicio + i) });
  })
);

// PUT /trilhas/:id/questoes/:qid: corrige uma questão da trilha.
trilhasRouter.put(
  "/:id/questoes/:qid",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const qid = Number(req.params.qid);
    const q = questaoComunidadeSchema.parse(req.body);
    const r = await prisma.questao.updateMany({ where: { id: qid, trilhaId: trilha.id }, data: dadosQuestao(q) });
    if (r.count === 0) throw new HttpError(404, "Questão não encontrada.");
    res.json({ ok: true });
  })
);

// DELETE /trilhas/:id/questoes/:qid: remove uma questão (e as respostas dadas a ela).
trilhasRouter.delete(
  "/:id/questoes/:qid",
  asyncHandler(async (req, res) => {
    const trilha = await trilhaDoDono(req.params.id, req.userId!);
    const qid = Number(req.params.qid);
    const existe = await prisma.questao.findFirst({ where: { id: qid, trilhaId: trilha.id }, select: { id: true } });
    if (!existe) throw new HttpError(404, "Questão não encontrada.");
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questaoId: qid } }),
      prisma.nota.deleteMany({ where: { questaoId: qid } }),
      prisma.marcada.deleteMany({ where: { questaoId: qid } }),
      prisma.questao.delete({ where: { id: qid } }),
    ]);
    res.status(204).end();
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
