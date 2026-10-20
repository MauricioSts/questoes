// Discursiva: o tema (enunciado + padrão de resposta) é da trilha e quem cria é o admin;
// as tentativas são de cada usuário. A folha tem limite de linhas e de caracteres por
// linha (do perfil da trilha, copiado no tema), e a nota é a autoavaliação do próprio
// usuário, de 0 ao valor do tema. O padrão de resposta só aparece depois da primeira
// tentativa: ver a resposta antes de escrever acaba com o treino.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { ehAdmin, requireAdmin } from "../../middleware/admin.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { lerPerfil, contarLinhas, regraDiscursiva, validarTextoDiscursiva } from "../../lib/perfilTrilha.js";

export const discursivasRouter = Router();
discursivasRouter.use(requireAuth);

// Teto de tamanho do corpo, só para não aceitar lixo: o limite de verdade é o de linhas.
const MAX_TEXTO = 20_000;

// A trilha é visível para a conta? Admin vê todas; os demais, as publicadas que aparecem
// na escolha e as que já seguem (mesmo que tenham saído da vitrine).
async function trilhaVisivel(trilhaId: string, userId: string, email?: string): Promise<boolean> {
  if (ehAdmin(email)) return !!(await prisma.trilha.findUnique({ where: { id: trilhaId }, select: { id: true } }));
  const [trilha, segue] = await Promise.all([
    prisma.trilha.findFirst({
      where: { id: trilhaId, publicada: true, OR: [{ donoId: userId }, { visibilidade: "publica" }] },
      select: { id: true },
    }),
    prisma.concurso.findFirst({ where: { userId, trilhaId }, select: { id: true } }),
  ]);
  return !!(trilha || segue);
}

async function exigirTrilhaVisivel(trilhaId: string, userId: string, email?: string) {
  if (!(await trilhaVisivel(trilhaId, userId, email))) throw new HttpError(404, "Trilha não encontrada.");
}

async function discursivaVisivel(id: string, userId: string, email?: string) {
  const d = await prisma.discursiva.findUnique({ where: { id } });
  if (!d) throw new HttpError(404, "Discursiva não encontrada.");
  await exigirTrilhaVisivel(d.trilhaId, userId, email);
  return d;
}

const notaSchema = (valor: number) =>
  z.number().min(0, "A nota vai de 0 ao valor da questão.").max(valor, `A nota vai de 0 a ${valor}.`);

const tentativaSelect = { id: true, texto: true, nota: true, createdAt: true } as const;

// GET /discursivas?trilhaId=: temas da trilha, com quantas tentativas o usuário já fez.
// Sem tema (ou trilha fora do alcance da conta): { discursivas: [] }.
// padraoResposta = null até a primeira tentativa dele naquele tema (admin sempre vê).
discursivasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const trilhaId = z.string().min(1).parse(req.query.trilhaId);
    // Trilha que não existe (ou que a conta não enxerga) responde lista vazia, não 404:
    // para o cliente é só "esta trilha não tem discursiva".
    if (!(await trilhaVisivel(trilhaId, req.userId!, req.userEmail))) {
      res.json({ discursivas: [] });
      return;
    }
    const admin = ehAdmin(req.userEmail);
    const [temas, minhas] = await Promise.all([
      prisma.discursiva.findMany({ where: { trilhaId }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] }),
      prisma.tentativaDiscursiva.groupBy({
        by: ["discursivaId"],
        where: { userId: req.userId!, discursiva: { trilhaId } },
        _count: { _all: true },
      }),
    ]);
    const tentativasPor = new Map(minhas.map((m) => [m.discursivaId, m._count._all]));
    res.json({
      discursivas: temas.map((d) => {
        const tentativas = tentativasPor.get(d.id) ?? 0;
        return {
          id: d.id,
          trilhaId: d.trilhaId,
          enunciado: d.enunciado,
          maxLinhas: d.maxLinhas,
          caracteresPorLinha: d.caracteresPorLinha,
          valor: d.valor,
          ordem: d.ordem,
          tentativas,
          padraoResposta: admin || tentativas > 0 ? d.padraoResposta : null,
        };
      }),
    });
  })
);

const criarSchema = z.object({
  trilhaId: z.string().min(1),
  enunciado: z.string().trim().min(1).max(MAX_TEXTO),
  padraoResposta: z.string().trim().min(1).max(MAX_TEXTO),
  maxLinhas: z.number().int().positive().max(500).optional(),
  caracteresPorLinha: z.number().int().positive().max(500).optional(),
  valor: z.number().positive().max(1000).optional(),
  ordem: z.number().int().optional(),
});

// POST /discursivas (admin): cria um tema. Limites e valor que não vierem no corpo saem do
// perfil da trilha (perfil.discursiva); sem perfil com discursiva, têm de vir no corpo.
discursivasRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const dados = criarSchema.parse(req.body);
    const trilha = await prisma.trilha.findUnique({
      where: { id: dados.trilhaId },
      select: { id: true, perfilProva: { select: { dados: true } } },
    });
    if (!trilha) throw new HttpError(404, "Trilha não encontrada.");
    const regra = regraDiscursiva(trilha.perfilProva ? lerPerfil(trilha.perfilProva.dados) : null);
    const maxLinhas = dados.maxLinhas ?? regra?.maxLinhas;
    const caracteresPorLinha = dados.caracteresPorLinha ?? regra?.caracteresPorLinha;
    const valor = dados.valor ?? regra?.valor;
    if (maxLinhas === undefined || caracteresPorLinha === undefined || valor === undefined) {
      throw new HttpError(400, "O perfil da trilha não tem discursiva: informe maxLinhas, caracteresPorLinha e valor.");
    }
    const ordem = dados.ordem ?? (await prisma.discursiva.count({ where: { trilhaId: trilha.id } }));
    const discursiva = await prisma.discursiva.create({
      data: {
        trilhaId: trilha.id,
        enunciado: dados.enunciado,
        padraoResposta: dados.padraoResposta,
        maxLinhas,
        caracteresPorLinha,
        valor,
        ordem,
      },
    });
    res.status(201).json({ discursiva });
  })
);

// GET /discursivas/:id/tentativas: as tentativas do usuário neste tema, da mais nova à
// mais antiga. Com ao menos uma, vem também o padrão de resposta.
discursivasRouter.get(
  "/:id/tentativas",
  asyncHandler(async (req, res) => {
    const d = await discursivaVisivel(req.params.id, req.userId!, req.userEmail);
    const tentativas = await prisma.tentativaDiscursiva.findMany({
      where: { discursivaId: d.id, userId: req.userId! },
      orderBy: { createdAt: "desc" },
      select: tentativaSelect,
    });
    res.json({
      tentativas: tentativas.map((t) => ({ ...t, linhas: contarLinhas(t.texto, d.caracteresPorLinha) })),
      padraoResposta: tentativas.length > 0 || ehAdmin(req.userEmail) ? d.padraoResposta : null,
    });
  })
);

// POST /discursivas/:id/tentativas { texto, nota? }: grava uma resposta. Recusa texto que
// não cabe na folha (linhas de até caracteresPorLinha, respeitando as quebras do texto).
discursivasRouter.post(
  "/:id/tentativas",
  asyncHandler(async (req, res) => {
    const d = await discursivaVisivel(req.params.id, req.userId!, req.userEmail);
    const { texto, nota } = z
      .object({ texto: z.string().max(MAX_TEXTO), nota: notaSchema(d.valor).nullable().optional() })
      .parse(req.body);
    const erro = validarTextoDiscursiva(texto, d);
    if (erro) throw new HttpError(400, erro);
    const tentativa = await prisma.tentativaDiscursiva.create({
      data: { discursivaId: d.id, userId: req.userId!, texto, nota: nota ?? null },
      select: tentativaSelect,
    });
    res.status(201).json({
      tentativa: { ...tentativa, linhas: contarLinhas(texto, d.caracteresPorLinha) },
      padraoResposta: d.padraoResposta,
    });
  })
);

// PATCH /discursivas/tentativas/:id { nota }: dá (ou tira, com null) a nota de uma
// tentativa. Só o dono; a de outra pessoa responde 404, sem dizer que existe.
discursivasRouter.patch(
  "/tentativas/:id",
  asyncHandler(async (req, res) => {
    const t = await prisma.tentativaDiscursiva.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, discursiva: { select: { valor: true } } },
    });
    if (!t) throw new HttpError(404, "Tentativa não encontrada.");
    const { nota } = z.object({ nota: notaSchema(t.discursiva.valor).nullable() }).parse(req.body);
    const tentativa = await prisma.tentativaDiscursiva.update({ where: { id: t.id }, data: { nota }, select: tentativaSelect });
    res.json({ tentativa });
  })
);
