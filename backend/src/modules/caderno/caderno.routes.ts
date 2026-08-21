// Caderno: páginas de anotação tipo Notion, escopadas por usuário + concurso + matéria.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";

export const cadernoRouter = Router();
cadernoRouter.use(requireAuth);

// Garante que o concurso pertence ao usuário (isolamento entre concursos).
async function assertConcurso(userId: string, concursoId: string) {
  const c = await prisma.concurso.findFirst({ where: { id: concursoId, userId } });
  if (!c) throw new HttpError(404, "Concurso não encontrado.");
}

// GET /caderno?concursoId=: páginas do concurso, mais recentes primeiro.
cadernoRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const concursoId = String(req.query.concursoId ?? "");
    if (!concursoId) throw new HttpError(400, "concursoId é obrigatório.");
    await assertConcurso(req.userId!, concursoId);
    const paginas = await prisma.paginaCaderno.findMany({
      where: { userId: req.userId!, concursoId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ paginas });
  })
);

// O conteúdo é HTML do editor rico (já saneado no cliente). O teto de 400k caracteres
// existe só para barrar payload absurdo — uma página de anotação fica na casa dos KB.
const CONTEUDO_MAX = 400_000;
const formato = z.enum(["html", "texto"]);

const createSchema = z.object({
  concursoId: z.string().min(1),
  materia: z.string().min(1).max(120),
  titulo: z.string().max(200).default(""),
  conteudo: z.string().max(CONTEUDO_MAX).default(""),
  formato: formato.default("html"),
});

// POST /caderno: cria uma página.
cadernoRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    await assertConcurso(req.userId!, data.concursoId);
    const pagina = await prisma.paginaCaderno.create({
      data: { ...data, userId: req.userId! },
    });
    res.status(201).json({ pagina });
  })
);

const patchSchema = z.object({
  titulo: z.string().max(200).optional(),
  conteudo: z.string().max(CONTEUDO_MAX).optional(),
  materia: z.string().min(1).max(120).optional(),
  formato: formato.optional(),
});

// PATCH /caderno/:id: salva título/conteúdo/matéria (debounce no cliente).
cadernoRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existente = await prisma.paginaCaderno.findFirst({ where: { id, userId: req.userId! } });
    if (!existente) throw new HttpError(404, "Página não encontrada.");
    const p = patchSchema.parse(req.body);
    const pagina = await prisma.paginaCaderno.update({ where: { id }, data: p });
    res.json({ pagina });
  })
);

// DELETE /caderno/:id: remove a página.
cadernoRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const existente = await prisma.paginaCaderno.findFirst({ where: { id, userId: req.userId! } });
    if (!existente) throw new HttpError(404, "Página não encontrada.");
    await prisma.paginaCaderno.delete({ where: { id } });
    res.status(204).end();
  })
);
