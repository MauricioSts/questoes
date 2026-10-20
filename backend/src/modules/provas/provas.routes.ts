// Perfil da prova certo/errado da trilha do concurso e histórico de simulados C/E.
// A nota é calculada no aparelho (lib/notaCE.ts do frontend) com o perfil daqui; o
// servidor guarda o resultado de cada conta, que só serve ao histórico dela mesma.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { formatoDoPerfil } from "../../lib/perfilTrilha.js";
import type { Prisma } from "@prisma/client";

export const provasRouter = Router();
provasRouter.use(requireAuth);

async function concursoDoUsuario(concursoId: string, userId: string) {
  const c = await prisma.concurso.findFirst({
    where: { id: concursoId, userId },
    select: { id: true, trilha: { select: { perfilProva: true } } },
  });
  if (!c) throw new HttpError(404, "Concurso não encontrado.");
  return c;
}

// GET /provas/perfil?concursoId=: perfil da prova da trilha. `perfil` só vem quando a
// prova é certo/errado (o cliente abre o simulado C/E quando ele existe; null = simulado
// de múltipla escolha de sempre). `perfilTrilha` vem para qualquer formato (TJPB é
// múltipla escolha com discursiva e aviso de conteúdo provisório).
provasRouter.get(
  "/perfil",
  asyncHandler(async (req, res) => {
    const concursoId = z.string().min(1).parse(req.query.concursoId);
    const c = await concursoDoUsuario(concursoId, req.userId!);
    const p = c.trilha?.perfilProva;
    const completo = p ? { id: p.id, nome: p.nome, dados: p.dados } : null;
    const ce = p ? formatoDoPerfil(p.dados) === "CERTO_ERRADO" : false;
    res.json({ perfil: ce ? completo : null, perfilTrilha: completo });
  })
);

const placarSchema = {
  acertos: z.number().int().min(0),
  erros: z.number().int().min(0),
  brancos: z.number().int().min(0),
  pontos: z.number(),
  maximo: z.number(),
  minimo: z.number(),
  aprovado: z.boolean(),
};

const grupoSchema = z.object({
  grupo: z.string().min(1).max(10),
  ...placarSchema,
  // Só as disciplinas com mínimo no perfil (opcional: resultados antigos não têm).
  disciplinas: z
    .array(z.object({ nome: z.string().min(1).max(200), ...placarSchema }))
    .max(30)
    .optional(),
});

const resultadoSchema = z.object({
  concursoId: z.string().min(1),
  perfilProvaId: z.string().min(1),
  dados: z.object({
    grupos: z.array(grupoSchema).min(1).max(10),
    pontos: z.number(),
    maximo: z.number(),
    minimo: z.number(),
    aprovado: z.boolean(),
    motivos: z.array(z.string().max(300)).max(20),
    itens: z
      .array(z.object({ questaoId: z.number().int(), marcada: z.enum(["C", "E"]).nullable() }))
      .max(500),
    duracaoSegundos: z.number().int().min(0).nullable(),
  }),
});

// POST /provas/resultados: guarda o resultado de um simulado C/E.
provasRouter.post(
  "/resultados",
  asyncHandler(async (req, res) => {
    const { concursoId, perfilProvaId, dados } = resultadoSchema.parse(req.body);
    await concursoDoUsuario(concursoId, req.userId!);
    const r = await prisma.resultadoProva.create({
      data: { userId: req.userId!, concursoId, perfilProvaId, dados: dados as Prisma.InputJsonValue },
      select: { id: true, createdAt: true },
    });
    res.status(201).json(r);
  })
);

// GET /provas/resultados?concursoId=: os últimos 50 simulados C/E do concurso.
provasRouter.get(
  "/resultados",
  asyncHandler(async (req, res) => {
    const concursoId = z.string().min(1).parse(req.query.concursoId);
    const resultados = await prisma.resultadoProva.findMany({
      where: { userId: req.userId!, concursoId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, perfilProvaId: true, dados: true, createdAt: true },
    });
    res.json({ resultados });
  })
);
