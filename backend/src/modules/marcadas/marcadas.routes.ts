// "Marcar questão pra revisar depois" — flag booleana por questão/usuário.
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

export const marcadasRouter = Router();
marcadasRouter.use(requireAuth);

// GET /marcadas — lista de questaoIds marcados.
marcadasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const marcadas = await prisma.marcada.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      select: { questaoId: true, createdAt: true },
    });
    res.json({ ids: marcadas.map((m) => m.questaoId), marcadas });
  })
);

// PUT /marcadas/:questaoId — marca (idempotente).
marcadasRouter.put(
  "/:questaoId",
  asyncHandler(async (req, res) => {
    const questaoId = Number(req.params.questaoId);
    await prisma.marcada.upsert({
      where: { userId_questaoId: { userId: req.userId!, questaoId } },
      update: {},
      create: { userId: req.userId!, questaoId },
    });
    res.status(204).end();
  })
);

// DELETE /marcadas/:questaoId — desmarca (idempotente).
marcadasRouter.delete(
  "/:questaoId",
  asyncHandler(async (req, res) => {
    const questaoId = Number(req.params.questaoId);
    await prisma.marcada.deleteMany({ where: { userId: req.userId!, questaoId } });
    res.status(204).end();
  })
);
