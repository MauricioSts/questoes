// Mural de post-its arrastáveis da Home, escopado por usuário + concurso.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";

export const postitsRouter = Router();
postitsRouter.use(requireAuth);

async function assertConcurso(userId: string, concursoId: string) {
  const c = await prisma.concurso.findFirst({ where: { id: concursoId, userId } });
  if (!c) throw new HttpError(404, "Concurso não encontrado.");
}

// GET /postits?concursoId= — notas do concurso.
postitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const concursoId = String(req.query.concursoId ?? "");
    if (!concursoId) throw new HttpError(400, "concursoId é obrigatório.");
    await assertConcurso(req.userId!, concursoId);
    const postits = await prisma.postIt.findMany({
      where: { userId: req.userId!, concursoId },
      orderBy: { createdAt: "asc" },
    });
    res.json({ postits });
  })
);

const createSchema = z.object({
  concursoId: z.string().min(1),
  x: z.number().default(0),
  y: z.number().default(0),
  texto: z.string().default(""),
  cor: z.enum(["amber", "sage", "rose", "slate"]).default("amber"),
});

// POST /postits — cria uma nota.
postitsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    await assertConcurso(req.userId!, data.concursoId);
    const postit = await prisma.postIt.create({ data: { ...data, userId: req.userId! } });
    res.status(201).json({ postit });
  })
);

const patchSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  texto: z.string().optional(),
  cor: z.enum(["amber", "sage", "rose", "slate"]).optional(),
});

// PATCH /postits/:id — move/edita (debounce no cliente).
postitsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existente = await prisma.postIt.findFirst({ where: { id, userId: req.userId! } });
    if (!existente) throw new HttpError(404, "Nota não encontrada.");
    const p = patchSchema.parse(req.body);
    const postit = await prisma.postIt.update({ where: { id }, data: p });
    res.json({ postit });
  })
);

// DELETE /postits/:id — remove a nota.
postitsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existente = await prisma.postIt.findFirst({ where: { id, userId: req.userId! } });
    if (!existente) throw new HttpError(404, "Nota não encontrada.");
    await prisma.postIt.delete({ where: { id } });
    res.status(204).end();
  })
);
