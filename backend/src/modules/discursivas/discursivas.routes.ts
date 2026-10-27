// Discursiva: o tema (enunciado + padrão de resposta) é da trilha e quem cria é o admin;
// as tentativas são de cada usuário. A folha tem limite de linhas e de caracteres por
// linha (do perfil da trilha, copiado no tema), e a nota é a autoavaliação do próprio
// usuário, de 0 ao valor do tema. O padrão de resposta só aparece depois da primeira
// tentativa: ver a resposta antes de escrever acaba com o treino.
// Temas de lote abrem um por semana (terça, liberaEm); antes disso só o próximo da fila
// pode ser adiantado. A resposta pode ser digitada ou a foto da folha escrita à mão.
import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { ehAdmin, requireAdmin } from "../../middleware/admin.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { conferirPerfil, contarLinhas, regraDiscursiva, validarTextoDiscursiva } from "../../lib/perfilTrilha.js";
import { temaAberto } from "../../lib/agendaDiscursiva.js";

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

// Próximo tema fechado da trilha para o usuário: o de liberaEm mais cedo entre os que
// ele ainda não abriu (data futura e nenhuma tentativa). É o único que dá para adiantar.
async function proximoFechado(trilhaId: string, userId: string, agora = new Date()) {
  return prisma.discursiva.findFirst({
    where: { trilhaId, liberaEm: { gt: agora }, tentativas: { none: { userId } } },
    orderBy: [{ liberaEm: "asc" }, { ordem: "asc" }],
  });
}

// Tema que a conta pode abrir: da trilha visível e já aberto, ou o próximo da fila
// (adiantar). Os seguintes respondem 404, como se não existissem.
async function discursivaVisivel(id: string, userId: string, email?: string) {
  const d = await prisma.discursiva.findUnique({ where: { id } });
  if (!d) throw new HttpError(404, "Discursiva não encontrada.");
  await exigirTrilhaVisivel(d.trilhaId, userId, email);
  if (ehAdmin(email) || !d.liberaEm || d.liberaEm <= new Date()) return d;
  const feitas = await prisma.tentativaDiscursiva.count({ where: { discursivaId: d.id, userId } });
  if (feitas > 0) return d;
  const proximo = await proximoFechado(d.trilhaId, userId);
  if (proximo?.id !== d.id) throw new HttpError(404, "Discursiva não encontrada.");
  return d;
}

// Fotos da folha: JPEG/PNG/WebP, comprimidas no cliente. O teto aqui é folga, não meta.
const MAX_BYTES_FOTO = 6 * 1024 * 1024;
const MAX_FOTOS_TENTATIVA = 6;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

// Confere pela assinatura do arquivo, não pelo Content-Type que o cliente declarou.
function tipoDaFoto(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const notaSchema = (valor: number) =>
  z.number().min(0, "A nota vai de 0 ao valor da questão.").max(valor, `A nota vai de 0 a ${valor}.`);

const tentativaSelect = {
  id: true,
  texto: true,
  nota: true,
  origem: true,
  createdAt: true,
  fotos: { select: { id: true }, orderBy: { createdAt: "asc" } },
} as const;

type TentativaLida = { texto: string; fotos: { id: string }[] } & Record<string, unknown>;
// Fotos vão como lista de ids (a imagem em si sai pelo GET /discursivas/fotos/:id).
const tentativaJson = (t: TentativaLida, caracteresPorLinha: number) => ({
  ...t,
  fotos: t.fotos.map((f) => f.id),
  linhas: contarLinhas(t.texto, caracteresPorLinha),
});

const temaJson = (d: {
  id: string;
  trilhaId: string;
  titulo: string | null;
  enunciado: string;
  padraoResposta: string | null;
  maxLinhas: number;
  caracteresPorLinha: number;
  valor: number;
  ordem: number;
  liberaEm: Date | null;
}) => ({
  id: d.id,
  trilhaId: d.trilhaId,
  titulo: d.titulo,
  enunciado: d.enunciado,
  maxLinhas: d.maxLinhas,
  caracteresPorLinha: d.caracteresPorLinha,
  valor: d.valor,
  ordem: d.ordem,
  liberaEm: d.liberaEm,
  temPadrao: d.padraoResposta != null,
});

// GET /discursivas?trilhaId=: temas abertos da trilha, com quantas tentativas o usuário já
// fez, mais o próximo da fila (`proxima`: só título e data, para adiantar) e quantos vêm
// depois dele (`restantes`). Sem tema (ou trilha fora do alcance): { discursivas: [] }.
// padraoResposta = null até a primeira tentativa dele naquele tema (admin sempre vê).
discursivasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const trilhaId = z.string().min(1).parse(req.query.trilhaId);
    // Trilha que não existe (ou que a conta não enxerga) responde lista vazia, não 404:
    // para o cliente é só "esta trilha não tem discursiva".
    if (!(await trilhaVisivel(trilhaId, req.userId!, req.userEmail))) {
      res.json({ discursivas: [], proxima: null, restantes: 0 });
      return;
    }
    const admin = ehAdmin(req.userEmail);
    const agora = new Date();
    const [temas, minhas] = await Promise.all([
      prisma.discursiva.findMany({ where: { trilhaId }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] }),
      prisma.tentativaDiscursiva.groupBy({
        by: ["discursivaId"],
        where: { userId: req.userId!, discursiva: { trilhaId } },
        _count: { _all: true },
      }),
    ]);
    const tentativasPor = new Map(minhas.map((m) => [m.discursivaId, m._count._all]));
    const abertos = temas.filter((d) => admin || temaAberto(d.liberaEm, tentativasPor.get(d.id) ?? 0, agora));
    const fechados = temas
      .filter((d) => !abertos.includes(d))
      .sort((a, b) => a.liberaEm!.getTime() - b.liberaEm!.getTime() || a.ordem - b.ordem);
    const proxima = fechados[0];
    res.json({
      discursivas: abertos.map((d) => {
        const tentativas = tentativasPor.get(d.id) ?? 0;
        return {
          ...temaJson(d),
          tentativas,
          padraoResposta: admin || tentativas > 0 ? d.padraoResposta : null,
        };
      }),
      proxima: proxima ? { id: proxima.id, titulo: proxima.titulo, liberaEm: proxima.liberaEm } : null,
      restantes: Math.max(0, fechados.length - 1),
    });
  })
);

// GET /discursivas/:id: o tema inteiro (sem o padrão de resposta). Serve para adiantar o
// próximo da fila; os temas além dele respondem 404.
discursivasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const d = await discursivaVisivel(req.params.id, req.userId!, req.userEmail);
    res.json({ discursiva: { ...temaJson(d), padraoResposta: null } });
  })
);

const criarSchema = z.object({
  trilhaId: z.string().min(1),
  titulo: z.string().trim().min(1).max(200).optional(),
  enunciado: z.string().trim().min(1).max(MAX_TEXTO),
  padraoResposta: z.string().trim().min(1).max(MAX_TEXTO).optional(),
  liberaEm: z.coerce.date().optional(),
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
    let perfil = null;
    if (trilha.perfilProva) {
      const conferido = conferirPerfil(trilha.perfilProva.dados);
      if (!conferido.ok) throw new HttpError(500, `Perfil de prova da trilha ${trilha.id} está malformado (${conferido.erro}).`);
      perfil = conferido.perfil;
    }
    const regra = regraDiscursiva(perfil);
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
        titulo: dados.titulo ?? null,
        enunciado: dados.enunciado,
        padraoResposta: dados.padraoResposta ?? null,
        liberaEm: dados.liberaEm ?? null,
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
      tentativas: tentativas.map((t) => tentativaJson(t, d.caracteresPorLinha)),
      padraoResposta: tentativas.length > 0 || ehAdmin(req.userEmail) ? d.padraoResposta : null,
    });
  })
);

// POST /discursivas/:id/tentativas { texto, nota?, comFoto?, origem? }: grava uma
// resposta. Recusa texto que não cabe na folha (linhas de até caracteresPorLinha,
// respeitando as quebras do texto). Com comFoto, o texto pode vir vazio: a resposta é a
// foto, enviada logo depois no POST /tentativas/:id/fotos.
discursivasRouter.post(
  "/:id/tentativas",
  asyncHandler(async (req, res) => {
    const d = await discursivaVisivel(req.params.id, req.userId!, req.userEmail);
    const { texto, nota, comFoto, origem } = z
      .object({
        texto: z.string().max(MAX_TEXTO).default(""),
        nota: notaSchema(d.valor).nullable().optional(),
        comFoto: z.boolean().optional(),
        origem: z.enum(["TREINO", "SIMULADO"]).default("TREINO"),
      })
      .parse(req.body);
    if (!(comFoto && !texto.trim())) {
      const erro = validarTextoDiscursiva(texto, d);
      if (erro) throw new HttpError(400, erro);
    }
    const tentativa = await prisma.tentativaDiscursiva.create({
      data: { discursivaId: d.id, userId: req.userId!, texto, nota: nota ?? null, origem },
      select: tentativaSelect,
    });
    res.status(201).json({
      tentativa: tentativaJson(tentativa, d.caracteresPorLinha),
      padraoResposta: d.padraoResposta,
    });
  })
);

// Tentativa do próprio usuário; a de outra pessoa responde 404, sem dizer que existe.
async function tentativaDoUsuario(id: string, userId: string) {
  const t = await prisma.tentativaDiscursiva.findFirst({
    where: { id, userId },
    select: { id: true, texto: true, discursiva: { select: { valor: true, caracteresPorLinha: true } }, _count: { select: { fotos: true } } },
  });
  if (!t) throw new HttpError(404, "Tentativa não encontrada.");
  return t;
}

// POST /discursivas/tentativas/:id/fotos: o corpo é a própria imagem (uma por chamada).
discursivasRouter.post(
  "/tentativas/:id/fotos",
  express.raw({ type: TIPOS_FOTO, limit: MAX_BYTES_FOTO }),
  asyncHandler(async (req, res) => {
    const t = await tentativaDoUsuario(req.params.id, req.userId!);
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, "Envie a foto (JPEG, PNG ou WebP).");
    const mime = tipoDaFoto(req.body);
    if (!mime) throw new HttpError(400, "O arquivo não é uma imagem JPEG, PNG ou WebP.");
    if (t._count.fotos >= MAX_FOTOS_TENTATIVA) throw new HttpError(400, `No máximo ${MAX_FOTOS_TENTATIVA} fotos por tentativa.`);
    const foto = await prisma.fotoDiscursiva.create({
      data: { tentativaId: t.id, mime, dados: req.body, bytes: req.body.length },
      select: { id: true },
    });
    res.status(201).json({ foto: foto.id });
  })
);

// GET /discursivas/fotos/:id: a imagem, só para o dono da tentativa.
discursivasRouter.get(
  "/fotos/:id",
  asyncHandler(async (req, res) => {
    const foto = await prisma.fotoDiscursiva.findFirst({
      where: { id: req.params.id, tentativa: { userId: req.userId! } },
      select: { mime: true, dados: true },
    });
    if (!foto) throw new HttpError(404, "Foto não encontrada.");
    res.setHeader("Content-Type", foto.mime);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(Buffer.from(foto.dados));
  })
);

// DELETE /discursivas/tentativas/:id: apaga a tentativa (e as fotos dela).
discursivasRouter.delete(
  "/tentativas/:id",
  asyncHandler(async (req, res) => {
    const t = await tentativaDoUsuario(req.params.id, req.userId!);
    await prisma.tentativaDiscursiva.delete({ where: { id: t.id } });
    res.status(204).end();
  })
);

// PATCH /discursivas/tentativas/:id { nota }: dá (ou tira, com null) a nota de uma
// tentativa. Só o dono; a de outra pessoa responde 404, sem dizer que existe.
discursivasRouter.patch(
  "/tentativas/:id",
  asyncHandler(async (req, res) => {
    const t = await prisma.tentativaDiscursiva.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true, discursiva: { select: { valor: true, caracteresPorLinha: true } } },
    });
    if (!t) throw new HttpError(404, "Tentativa não encontrada.");
    const { nota } = z.object({ nota: notaSchema(t.discursiva.valor).nullable() }).parse(req.body);
    const tentativa = await prisma.tentativaDiscursiva.update({ where: { id: t.id }, data: { nota }, select: tentativaSelect });
    res.json({ tentativa: tentativaJson(tentativa, t.discursiva.caracteresPorLinha) });
  })
);
