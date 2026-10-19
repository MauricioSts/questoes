// Exercícios práticos e execuções no sandbox. A API NÃO roda código: só valida, insere a
// execução na fila (tabela Execucao) e devolve o resultado que o worker do sandbox
// (serviço separado, sandbox/worker) gravou. Testes ocultos nunca saem daqui.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { resultadoPublico } from "../../lib/saidaSandbox.js";
import { LINGUAGENS, LINGUAGENS_VERIFICACAO, hashCodigo } from "../../lib/sandboxCodigo.js";

// hashCodigo mora em lib/sandboxCodigo.ts (o importador e os scripts de lote também usam).
export { hashCodigo };

export const exerciciosRouter = Router();
export const execucoesRouter = Router();
exerciciosRouter.use(requireAuth);
execucoesRouter.use(requireAuth);

export const MAX_CODIGO_BYTES = 64 * 1024;
export const EXECUCOES_POR_MINUTO = 10;
// Fila cheia = o worker não está dando conta (ou caiu): recusa em vez de acumular.
const MAX_FILA = 40;

// Código: string até 64 KB em UTF-8 e sem NUL (nenhum compilador aceita, e o Postgres
// recusa \0 em text — melhor um 400 claro do que um 500).
const codigoSchema = z
  .string()
  .min(1, "Código vazio.")
  .refine((c) => Buffer.byteLength(c, "utf8") <= MAX_CODIGO_BYTES, "Código passa de 64 KB.")
  .refine((c) => !c.includes("\u0000"), "Código com caractere nulo.");

// Limite por usuário contado no próprio banco (vale entre reinícios e entre processos).
async function conferirLimites(userId: string) {
  const [recentes, naFila] = await Promise.all([
    prisma.execucao.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 60_000) } } }),
    prisma.execucao.count({ where: { status: { in: ["fila", "rodando"] } } }),
  ]);
  if (recentes >= EXECUCOES_POR_MINUTO) {
    throw new HttpError(429, `Limite de ${EXECUCOES_POR_MINUTO} execuções por minuto. Espere um pouco.`, "LIMITE_EXECUCOES");
  }
  if (naFila >= MAX_FILA) {
    throw new HttpError(503, "O sandbox está ocupado. Tente de novo em alguns segundos.", "SANDBOX_OCUPADO");
  }
}

// ---------------------------------------------------------------- exercícios

const listaSchema = z.object({ trilhaId: z.string().min(1).max(100) });

// GET /exercicios?trilhaId=: exercícios publicados da trilha, com o que o usuário já resolveu.
exerciciosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { trilhaId } = listaSchema.parse(req.query);
    const exercicios = await prisma.exercicio.findMany({
      where: { trilhaId, publicado: true },
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
      select: { id: true, titulo: true, linguagem: true, modo: true, dificuldade: true, topico: true },
    });
    const ultimas = await prisma.execucao.findMany({
      where: { userId: req.userId!, exercicioId: { in: exercicios.map((e) => e.id) }, status: "concluida" },
      select: { exercicioId: true, resultado: true },
    });
    const resolvidos = new Set(
      ultimas
        .filter((u) => {
          const r = u.resultado as { passou?: number; total?: number } | null;
          return !!r && typeof r.total === "number" && r.total > 0 && r.passou === r.total;
        })
        .map((u) => u.exercicioId)
    );
    res.json({ exercicios: exercicios.map((e) => ({ ...e, resolvido: resolvidos.has(e.id) })) });
  })
);

// GET /exercicios/:id: enunciado, código inicial e só os testes VISÍVEIS (os ocultos
// aparecem apenas como contagem).
exerciciosRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).max(100).parse(req.params.id);
    const ex = await prisma.exercicio.findFirst({
      where: { id, publicado: true },
      include: {
        testes: {
          where: { oculto: false },
          orderBy: { ordem: "asc" },
          select: { nome: true, entrada: true, saidaEsperada: true },
        },
      },
    });
    if (!ex) throw new HttpError(404, "Exercício não encontrado.");
    const ocultos = await prisma.testeExercicio.count({ where: { exercicioId: id, oculto: true } });
    const ultima = await prisma.execucao.findFirst({
      where: { userId: req.userId!, exercicioId: id },
      orderBy: { createdAt: "desc" },
      select: { codigo: true },
    });
    res.json({
      id: ex.id,
      trilhaId: ex.trilhaId,
      titulo: ex.titulo,
      enunciado: ex.enunciado,
      linguagem: ex.linguagem,
      modo: ex.modo,
      dificuldade: ex.dificuldade,
      topico: ex.topico,
      codigoInicial: ex.codigoInicial,
      // O seed do SQL é a estrutura do banco que o aluno consulta: precisa ver. Já os dados
      // dos testes ocultos ficam em TesteExercicio.entrada, que não sai daqui.
      seedSql: ex.modo === "sql" ? ex.seedSql : null,
      testesVisiveis: ex.testes,
      testesOcultos: ocultos,
      ultimoCodigo: ultima?.codigo ?? null,
    });
  })
);

// ---------------------------------------------------------------- execuções

const execSchema = z.object({ exercicioId: z.string().min(1).max(100), codigo: codigoSchema });

// POST /execucoes: enfileira o código do usuário contra os testes do exercício.
execucoesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { exercicioId, codigo } = execSchema.parse(req.body);
    const ex = await prisma.exercicio.findFirst({
      where: { id: exercicioId, publicado: true },
      select: { id: true, linguagem: true },
    });
    if (!ex) throw new HttpError(404, "Exercício não encontrado.");
    // A linguagem vem do exercício (cadastrado pelo admin), não do cliente — e ainda
    // passa pela lista de permissão.
    const linguagem = z.enum(LINGUAGENS).parse(ex.linguagem);
    await conferirLimites(req.userId!);
    const e = await prisma.execucao.create({
      data: {
        userId: req.userId!,
        exercicioId: ex.id,
        finalidade: "exercicio",
        linguagem,
        codigo,
        hash: hashCodigo(linguagem, codigo),
      },
      select: { id: true, status: true },
    });
    res.status(202).json(e);
  })
);

const verificarSchema = z.object({ linguagem: z.enum(LINGUAGENS_VERIFICACAO), codigo: codigoSchema });

// POST /execucoes/verificar (admin): roda o código de uma questão "qual a saída / qual o
// erro" sem testes. É a execução que o importador exige antes de aceitar a questão.
execucoesRouter.post(
  "/verificar",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { linguagem, codigo } = verificarSchema.parse(req.body);
    const naFila = await prisma.execucao.count({ where: { status: { in: ["fila", "rodando"] } } });
    if (naFila >= MAX_FILA) throw new HttpError(503, "O sandbox está ocupado.", "SANDBOX_OCUPADO");
    const e = await prisma.execucao.create({
      data: { userId: req.userId!, finalidade: "verificacao", linguagem, codigo, hash: hashCodigo(linguagem, codigo) },
      select: { id: true, status: true },
    });
    res.status(202).json(e);
  })
);

// GET /execucoes/:id: estado e resultado (só do próprio usuário). O cliente consulta até
// o status sair de fila/rodando.
execucoesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).max(40).parse(req.params.id);
    const e = await prisma.execucao.findFirst({
      where: { id, userId: req.userId! },
      select: { id: true, status: true, exercicioId: true, linguagem: true, resultado: true, createdAt: true, concluidoEm: true },
    });
    if (!e) throw new HttpError(404, "Execução não encontrada.");
    const posicao =
      e.status === "fila"
        ? await prisma.execucao.count({ where: { status: "fila", createdAt: { lt: e.createdAt } } })
        : 0;
    res.json({
      id: e.id,
      status: e.status,
      exercicioId: e.exercicioId,
      linguagem: e.linguagem,
      posicaoNaFila: posicao,
      resultado: resultadoPublico(e.resultado),
    });
  })
);
