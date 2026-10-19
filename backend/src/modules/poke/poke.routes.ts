// Batalha Pokémon: as regras rodam no aparelho, mas o jogo (perfil, partida e treinador)
// fica salvo aqui (/poke/save), e o resumo público do ranking vai em /poke/vitrine.
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

export const pokeRouter = Router();
pokeRouter.use(requireAuth);

const inteiro = (max: number) => z.number().int().min(0).max(max);

// Vai para outras pessoas: só números e ids, nada de texto livre além do sprite.
export const VitrineSchema = z.object({
  treinador: z.string().regex(/^[a-z0-9-]{1,30}$/),
  regiao: inteiro(20),
  insignias: inteiro(200),
  campeao: inteiro(10000),
  capturados: inteiro(100000),
  vistos: inteiro(2000),
  partidas: inteiro(1000000),
  vitorias: inteiro(1000000),
  time: z.array(z.object({ id: z.number().int().min(1).max(2000), nivel: z.number().int().min(1).max(100) })).max(6),
});
export type Vitrine = z.infer<typeof VitrineSchema>;

// PUT /poke/vitrine: publica o resumo atual do perfil.
pokeRouter.put(
  "/vitrine",
  asyncHandler(async (req, res) => {
    const dados = VitrineSchema.parse(req.body);
    await prisma.pokeVitrine.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, dados },
      update: { dados },
    });
    res.status(204).end();
  })
);

// Estado do jogo, no formato do frontend. Só confere a forma de fora: quem joga é o dono.
const ObjetoJogo = z.record(z.unknown()).nullable();
const SaveSchema = z.object({
  perfil: ObjetoJogo.optional(),
  partida: ObjetoJogo.optional(),
  jogador: z.string().regex(/^[a-z0-9-]{1,30}$/).optional(),
});
const json = (v: Record<string, unknown> | null) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonObject));

// Trilha da jornada (?trilhaId=). Sem ela vale só a jornada compartilhada, como antes.
const TrilhaQuery = z.string().min(1).max(100).optional();

// GET /poke/save?trilhaId=: o jogo salvo (tudo null se ainda não jogou).
// jornada: "compartilhada" (PokeSave, a mesma em todas as trilhas que escolheram
// continuar) ou "separada" (a desta trilha, que começou do zero). perguntar: a pessoa
// já tem jornada de outra trilha e ainda não escolheu o que fazer nesta.
pokeRouter.get(
  "/save",
  asyncHandler(async (req, res) => {
    const trilhaId = TrilhaQuery.parse(req.query.trilhaId);
    const [s, t] = await Promise.all([
      prisma.pokeSave.findUnique({ where: { userId: req.userId! } }),
      trilhaId ? prisma.pokeSaveTrilha.findUnique({ where: { userId_trilhaId: { userId: req.userId!, trilhaId } } }) : null,
    ]);
    if (t?.separada) {
      return res.json({ perfil: t.perfil ?? null, partida: t.partida ?? null, jogador: s?.jogador ?? null, atualizadoEm: t.updatedAt, jornada: "separada", perguntar: false });
    }
    const perguntar = !!trilhaId && !t && !!s?.perfil && !!s.ultimaTrilhaId && s.ultimaTrilhaId !== trilhaId;
    res.json({ perfil: s?.perfil ?? null, partida: s?.partida ?? null, jogador: s?.jogador ?? null, atualizadoEm: s?.updatedAt ?? null, jornada: "compartilhada", perguntar });
  })
);

// PUT /poke/save?trilhaId=: grava só os campos enviados (null apaga), na jornada que a
// trilha usa. O treinador escolhido (jogador) é da conta, vale em todas as jornadas.
pokeRouter.put(
  "/save",
  asyncHandler(async (req, res) => {
    const b = SaveSchema.parse(req.body);
    const trilhaId = TrilhaQuery.parse(req.query.trilhaId);
    const jogo = {
      ...(b.perfil !== undefined ? { perfil: json(b.perfil) } : {}),
      ...(b.partida !== undefined ? { partida: json(b.partida) } : {}),
    };
    const t = trilhaId
      ? await prisma.pokeSaveTrilha.findUnique({ where: { userId_trilhaId: { userId: req.userId!, trilhaId } } })
      : null;
    if (t?.separada) {
      if (Object.keys(jogo).length) {
        await prisma.pokeSaveTrilha.update({ where: { userId_trilhaId: { userId: req.userId!, trilhaId: trilhaId! } }, data: jogo });
      }
      if (b.jogador !== undefined) {
        await prisma.pokeSave.upsert({ where: { userId: req.userId! }, create: { userId: req.userId!, jogador: b.jogador }, update: { jogador: b.jogador } });
      }
      return res.status(204).end();
    }
    const dados = {
      ...jogo,
      ...(b.jogador !== undefined ? { jogador: b.jogador } : {}),
      // Jogou a jornada compartilhada nesta trilha: ela vira a "última", e a trilha fica
      // marcada como "continua a compartilhada" (não pergunta de novo).
      ...(trilhaId && Object.keys(jogo).length ? { ultimaTrilhaId: trilhaId } : {}),
    };
    await prisma.pokeSave.upsert({ where: { userId: req.userId! }, create: { userId: req.userId!, ...dados }, update: dados });
    if (trilhaId && !t && Object.keys(jogo).length) {
      await prisma.pokeSaveTrilha.create({ data: { userId: req.userId!, trilhaId, separada: false } });
    }
    res.status(204).end();
  })
);

// POST /poke/jornada: escolhe a jornada da trilha. separada=true começa uma jornada do
// zero só nesta trilha (apaga a separada anterior, se houver); separada=false volta a
// usar a compartilhada (a separada desta trilha é apagada).
pokeRouter.post(
  "/jornada",
  asyncHandler(async (req, res) => {
    const { trilhaId, separada } = z.object({ trilhaId: z.string().min(1).max(100), separada: z.boolean() }).parse(req.body);
    const chave = { userId_trilhaId: { userId: req.userId!, trilhaId } };
    const dados = { separada, perfil: Prisma.DbNull, partida: Prisma.DbNull };
    await prisma.pokeSaveTrilha.upsert({ where: chave, create: { userId: req.userId!, trilhaId, ...dados }, update: dados });
    res.json({ jornada: separada ? "separada" : "compartilhada" });
  })
);

