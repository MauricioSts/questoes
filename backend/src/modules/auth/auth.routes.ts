// Rotas de autenticação: register, login, refresh, logout.
// Fluxo de token: access token JWT curto (15m) + refresh token opaco (30d) guardado
// como hash no banco. O refresh é rotacionado a cada uso e revogado no logout.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../lib/jwt.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function publicUser(u: { id: string; email: string; nome: string; metaDiaria: number }) {
  return { id: u.id, email: u.email, nome: u.nome, metaDiaria: u.metaDiaria };
}

// Emite um par access+refresh e persiste o hash do refresh.
async function issueTokens(user: { id: string; email: string }) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const { token, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  return { accessToken, refreshToken: token };
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, nome } = registerSchema.parse(req.body);
    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) throw new HttpError(409, "E-mail já cadastrado");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, nome } });
    const tokens = await issueTokens(user);
    res.status(201).json({ user: publicUser(user), ...tokens });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Credenciais inválidas");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Credenciais inválidas");

    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  })
);

// Rotaciona o refresh token: valida o antigo, revoga e emite um novo par.
authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new HttpError(401, "Refresh token inválido ou expirado");
    }

    // rotação: apaga o antigo e emite novo
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await issueTokens(stored.user);
    res.json({ user: publicUser(stored.user), ...tokens });
  })
);

// Logout: revoga o refresh token informado (idempotente).
authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await prisma.refreshToken.deleteMany({
        where: { tokenHash: hashToken(parsed.data.refreshToken) },
      });
    }
    res.status(204).end();
  })
);

// Dados do usuário logado.
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    res.json({ user: publicUser(user) });
  })
);
