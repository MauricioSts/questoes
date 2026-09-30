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

// GET /poke/save: o jogo salvo (tudo null se ainda não jogou).
pokeRouter.get(
  "/save",
  asyncHandler(async (req, res) => {
    const s = await prisma.pokeSave.findUnique({ where: { userId: req.userId! } });
    res.json({ perfil: s?.perfil ?? null, partida: s?.partida ?? null, jogador: s?.jogador ?? null, atualizadoEm: s?.updatedAt ?? null });
  })
);

// PUT /poke/save: grava só os campos enviados (null apaga).
pokeRouter.put(
  "/save",
  asyncHandler(async (req, res) => {
    const b = SaveSchema.parse(req.body);
    const dados = {
      ...(b.perfil !== undefined ? { perfil: json(b.perfil) } : {}),
      ...(b.partida !== undefined ? { partida: json(b.partida) } : {}),
      ...(b.jogador !== undefined ? { jogador: b.jogador } : {}),
    };
    await prisma.pokeSave.upsert({ where: { userId: req.userId! }, create: { userId: req.userId!, ...dados }, update: dados });
    res.status(204).end();
  })
);
