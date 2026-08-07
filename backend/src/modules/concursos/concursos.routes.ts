// Multi-concurso: cada usuário tem N concursos, cada um com seu próprio conjunto de
// questões e progresso. Nenhum dado atravessa concursos.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import type { Prisma } from "@prisma/client";

export const concursosRouter = Router();
concursosRouter.use(requireAuth);

const concursoInput = z.object({
  nome: z.string().min(1).max(120),
  iniciais: z.string().min(1).max(6),
  banca: z.string().min(1).max(60),
  ano: z.number().int().min(2000).max(2100),
  cargo: z.string().min(1).max(120),
  dataProva: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  metaDiaria: z.number().int().min(1).max(500).default(30),
});

function parseData(v: string): Date {
  return v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00`);
}

// GET /concursos — lista os concursos do usuário com contadores (respondidas, no banco, dias).
concursosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const concursos = await prisma.concurso.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "asc" },
    });

    // Contadores por concurso.
    const [porBanco, respondidas] = await Promise.all([
      prisma.questao.groupBy({
        by: ["concursoId"],
        where: { concursoId: { in: concursos.map((c) => c.id) } },
        _count: { _all: true },
      }),
      prisma.answer.findMany({
        where: { userId: req.userId!, concursoId: { in: concursos.map((c) => c.id) } },
        select: { concursoId: true, questaoId: true },
      }),
    ]);

    const bancoMap = new Map(porBanco.map((g) => [g.concursoId, g._count._all]));
    const respMap = new Map<string, Set<number>>();
    for (const a of respondidas) {
      if (!a.concursoId) continue;
      (respMap.get(a.concursoId) ?? respMap.set(a.concursoId, new Set()).get(a.concursoId)!).add(a.questaoId);
    }

    const hoje = Date.now();
    const lista = concursos.map((c) => {
      const noBanco = bancoMap.get(c.id) ?? 0;
      const feitas = respMap.get(c.id)?.size ?? 0;
      const diasProva = Math.max(0, Math.ceil((c.dataProva.getTime() - hoje) / 864e5));
      const estado = noBanco === 0 ? "VAZIO" : c.arquivado ? "PAUSADO" : "EM_CURSO";
      return { ...c, noBanco, respondidas: feitas, diasProva, estado };
    });

    res.json({ concursos: lista });
  })
);

// POST /concursos — cria um concurso (começa vazio).
concursosRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = concursoInput.parse(req.body);
    const concurso = await prisma.concurso.create({
      data: {
        userId: req.userId!,
        nome: data.nome,
        iniciais: data.iniciais.toUpperCase(),
        banca: data.banca,
        ano: data.ano,
        cargo: data.cargo,
        dataProva: parseData(data.dataProva),
        metaDiaria: data.metaDiaria,
      },
    });
    res.status(201).json({ concurso });
  })
);

const patchSchema = concursoInput.partial().extend({ arquivado: z.boolean().optional() });

// PATCH /concursos/:id — atualiza campos (data, meta, arquivar…).
concursosRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existente = await prisma.concurso.findFirst({ where: { id, userId: req.userId! } });
    if (!existente) throw new HttpError(404, "Concurso não encontrado.");
    const p = patchSchema.parse(req.body);
    const concurso = await prisma.concurso.update({
      where: { id },
      data: {
        ...(p.nome !== undefined ? { nome: p.nome } : {}),
        ...(p.iniciais !== undefined ? { iniciais: p.iniciais.toUpperCase() } : {}),
        ...(p.banca !== undefined ? { banca: p.banca } : {}),
        ...(p.ano !== undefined ? { ano: p.ano } : {}),
        ...(p.cargo !== undefined ? { cargo: p.cargo } : {}),
        ...(p.dataProva !== undefined ? { dataProva: parseData(p.dataProva) } : {}),
        ...(p.metaDiaria !== undefined ? { metaDiaria: p.metaDiaria } : {}),
        ...(p.arquivado !== undefined ? { arquivado: p.arquivado } : {}),
      },
    });
    res.json({ concurso });
  })
);

const reaproveitarSchema = z.object({
  fromConcursoId: z.string().min(1),
  materias: z.array(z.string()).optional(), // se omitido, todas as matérias de nome equivalente
});

// POST /concursos/:id/reaproveitar — copia questões de matérias equivalentes de outro
// concurso do usuário para este. Duplica o conteúdo com novos IDs (globais).
concursosRouter.post(
  "/:id/reaproveitar",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { fromConcursoId, materias } = reaproveitarSchema.parse(req.body);

    const [destino, origem] = await Promise.all([
      prisma.concurso.findFirst({ where: { id, userId: req.userId! } }),
      prisma.concurso.findFirst({ where: { id: fromConcursoId, userId: req.userId! } }),
    ]);
    if (!destino || !origem) throw new HttpError(404, "Concurso de origem/destino não encontrado.");

    const fonte = await prisma.questao.findMany({
      where: { concursoId: fromConcursoId, ...(materias?.length ? { materia: { in: materias } } : {}) },
    });
    if (fonte.length === 0) {
      return res.json({ ok: true, copiadas: 0 });
    }

    const max = await prisma.questao.aggregate({ _max: { id: true } });
    let proximo = (max._max.id ?? 0) + 1;

    await prisma.questao.createMany({
      data: fonte.map((q) => ({
        id: proximo++,
        concursoId: id,
        modulo: q.modulo,
        materia: q.materia,
        assunto: q.assunto,
        dificuldade: q.dificuldade,
        textoBaseKey: q.textoBaseKey,
        enunciado: q.enunciado,
        codigo: q.codigo,
        linguagem: q.linguagem,
        alternativas: q.alternativas as Prisma.InputJsonValue,
        gabarito: q.gabarito,
        explicacao: q.explicacao,
        loteNome: `Reaproveitadas de ${origem.iniciais}`,
      })),
    });

    res.json({ ok: true, copiadas: fonte.length });
  })
);
