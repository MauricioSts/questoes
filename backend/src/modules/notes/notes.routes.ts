// Anotações por questão (uma por questão por usuário) + questões marcadas "revisar depois".
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

export const notesRouter = Router();
notesRouter.use(requireAuth);

// GET /notes — todas as anotações do usuário.
notesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const notas = await prisma.nota.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ notas });
  })
);

// GET /notes/:questaoId — anotação de uma questão (ou null).
notesRouter.get(
  "/:questaoId",
  asyncHandler(async (req, res) => {
    const questaoId = Number(req.params.questaoId);
    const nota = await prisma.nota.findUnique({
      where: { userId_questaoId: { userId: req.userId!, questaoId } },
    });
    res.json({ nota });
  })
);

const putSchema = z.object({ texto: z.string() });

// PUT /notes/:questaoId — cria/atualiza (upsert). Texto vazio remove a nota.
notesRouter.put(
  "/:questaoId",
  asyncHandler(async (req, res) => {
    const questaoId = Number(req.params.questaoId);
    const { texto } = putSchema.parse(req.body);

    if (texto.trim() === "") {
      await prisma.nota.deleteMany({ where: { userId: req.userId!, questaoId } });
      return res.json({ nota: null });
    }

    const nota = await prisma.nota.upsert({
      where: { userId_questaoId: { userId: req.userId!, questaoId } },
      update: { texto },
      create: { userId: req.userId!, questaoId, texto },
    });
    res.json({ nota });
  })
);
