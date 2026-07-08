// Sessão de estudo em andamento (uma por usuário). Guarda só a ordem dos IDs e o cursor,
// permitindo sair no meio e retomar de onde parou. O conteúdo das questões continua no
// frontend; as respostas seguem persistidas individualmente em Answer.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

export const sessaoRouter = Router();
sessaoRouter.use(requireAuth);

const putSchema = z.object({
  contexto: z.enum(["ESTUDO", "FLASH", "SIMULADO", "TOPICO"]).default("ESTUDO"),
  questaoIds: z.array(z.number().int()).min(1),
  cursor: z.number().int().min(0).default(0),
});

const cursorSchema = z.object({
  cursor: z.number().int().min(0),
});

// GET /sessao — retorna a sessão ativa do usuário (ou null).
sessaoRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const sessao = await prisma.sessaoAtiva.findUnique({ where: { userId: req.userId! } });
    res.json({ sessao });
  })
);

// PUT /sessao — cria/substitui a sessão ativa (ao iniciar uma nova sessão de estudo).
sessaoRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { contexto, questaoIds, cursor } = putSchema.parse(req.body);
    const sessao = await prisma.sessaoAtiva.upsert({
      where: { userId: req.userId! },
      update: { contexto, questaoIds, cursor },
      create: { userId: req.userId!, contexto, questaoIds, cursor },
    });
    res.json({ sessao });
  })
);

// PATCH /sessao/cursor — atualiza só o cursor (conforme o usuário avança/volta).
sessaoRouter.patch(
  "/cursor",
  asyncHandler(async (req, res) => {
    const { cursor } = cursorSchema.parse(req.body);
    // updateMany evita 404 se a sessão já foi encerrada em outra aba.
    await prisma.sessaoAtiva.updateMany({
      where: { userId: req.userId! },
      data: { cursor },
    });
    res.status(204).end();
  })
);

// DELETE /sessao — encerra a sessão ativa (ao finalizar). Idempotente.
sessaoRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await prisma.sessaoAtiva.deleteMany({ where: { userId: req.userId! } });
    res.status(204).end();
  })
);
