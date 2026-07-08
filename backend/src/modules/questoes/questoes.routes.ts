// Banco de questões no servidor: importar lote, listar e limpar.
// O conteúdo é compartilhado (não por usuário). A correção de acerto segue no frontend.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import type { Prisma } from "@prisma/client";

export const questoesRouter = Router();
questoesRouter.use(requireAuth);

const questaoSchema = z.object({
  id: z.number().int(),
  modulo: z.enum(["I", "II"]),
  materia: z.string().min(1),
  assunto: z.string().min(1),
  dificuldade: z.enum(["facil", "media", "dificil"]),
  texto_base: z.string().optional(),
  enunciado: z.string().min(1),
  codigo: z.string().optional(),
  linguagem: z.string().optional(),
  alternativas: z.record(z.string()),
  gabarito: z.string().min(1),
  explicacao: z.string().default(""),
});

const importSchema = z.object({
  questoes: z.array(questaoSchema).min(1),
  textosBase: z.record(z.string()).default({}),
  deslocarSeColidir: z.boolean().default(true),
});

// GET /questoes — todas as questões + textos base (para o frontend popular o app).
questoesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [linhas, textos] = await Promise.all([
      prisma.questao.findMany({ orderBy: { id: "asc" } }),
      prisma.textoBase.findMany(),
    ]);
    const questoes = linhas.map((q) => ({
      id: q.id,
      modulo: q.modulo,
      materia: q.materia,
      assunto: q.assunto,
      dificuldade: q.dificuldade,
      texto_base: q.textoBaseKey ?? undefined,
      enunciado: q.enunciado,
      codigo: q.codigo ?? undefined,
      linguagem: q.linguagem ?? undefined,
      alternativas: q.alternativas,
      gabarito: q.gabarito,
      explicacao: q.explicacao,
    }));
    const textosBase = Object.fromEntries(textos.map((t) => [t.chave, t.texto]));
    res.json({ questoes, textosBase });
  })
);

// POST /questoes/import — importa um lote. Trata colisão de IDs igual ao combinado:
// - deslocarSeColidir=false: recusa o lote inteiro (409) listando os IDs em conflito.
// - deslocarSeColidir=true : renumera o lote para começar após o maior ID existente.
questoesRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const { questoes, textosBase, deslocarSeColidir } = importSchema.parse(req.body);

    // valida gabarito ↔ alternativas (defesa extra além do frontend)
    for (const q of questoes) {
      if (!q.alternativas[q.gabarito]) {
        throw new HttpError(400, `Questão ${q.id}: gabarito "${q.gabarito}" não existe nas alternativas.`);
      }
    }

    const existentes = await prisma.questao.findMany({ select: { id: true } });
    const idsExistentes = new Set(existentes.map((q) => q.id));
    const maxId = existentes.reduce((m, q) => Math.max(m, q.id), 0);

    const colisoes = questoes.map((q) => q.id).filter((id) => idsExistentes.has(id));

    let aGravar = questoes;
    let deslocamento: number | undefined;

    if (colisoes.length > 0) {
      if (!deslocarSeColidir) {
        return res.status(409).json({ error: "IDs em conflito", colisoes });
      }
      const minLote = questoes.reduce((m, q) => Math.min(m, q.id), Infinity);
      deslocamento = maxId - minLote + 1;
      aGravar = questoes.map((q) => ({ ...q, id: q.id + deslocamento! }));
    }

    // grava numa transação: questões + textos base (upsert)
    await prisma.$transaction([
      prisma.questao.createMany({
        data: aGravar.map((q) => ({
          id: q.id,
          modulo: q.modulo,
          materia: q.materia,
          assunto: q.assunto,
          dificuldade: q.dificuldade,
          textoBaseKey: q.texto_base ?? null,
          enunciado: q.enunciado,
          codigo: q.codigo ?? null,
          linguagem: q.linguagem ?? null,
          alternativas: q.alternativas as Prisma.InputJsonValue,
          gabarito: q.gabarito,
          explicacao: q.explicacao,
        })),
      }),
      ...Object.entries(textosBase).map(([chave, texto]) =>
        prisma.textoBase.upsert({ where: { chave }, update: { texto }, create: { chave, texto } })
      ),
    ]);

    const ids = aGravar.map((q) => q.id);
    const totalAgora = await prisma.questao.count();
    res.status(201).json({
      ok: true,
      adicionadas: aGravar.length,
      deslocamento,
      faixaFinal: [Math.min(...ids), Math.max(...ids)],
      totalAgora,
    });
  })
);

// DELETE /questoes — limpa o banco de questões (admin).
questoesRouter.delete(
  "/",
  asyncHandler(async (_req, res) => {
    await prisma.$transaction([prisma.questao.deleteMany(), prisma.textoBase.deleteMany()]);
    res.status(204).end();
  })
);
