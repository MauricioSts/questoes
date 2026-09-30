// Batalha Pokémon: o jogo roda no aparelho (localStorage); aqui só chega o resumo que
// aparece no perfil público do ranking.
import { Router } from "express";
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
