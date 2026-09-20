// Rotas de autenticação: register (conta pendente de aprovação), aprovacao, login,
// refresh, logout.
// Fluxo de token: access token JWT curto (15m) + refresh token opaco (30d) guardado
// como hash no banco. O refresh é rotacionado a cada uso e revogado no logout.
import express, { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { requireAuth } from "../../middleware/auth.js";
import { ehAdmin } from "../../middleware/admin.js";
import { enviarEmail, escaparHtml } from "../../lib/email.js";
import { enviarTelegram } from "../../lib/telegram.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../lib/jwt.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(200),
  nome: z.string().trim().min(1).max(80),
});

const aprovacaoSchema = z.object({
  token: z.string().min(1),
  acao: z.enum(["aprovar", "recusar"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function publicUser(u: { id: string; email: string; nome: string; metaDiaria: number }) {
  // `admin` decide o que o cliente mostra (botão de importar). Quem manda de verdade
  // é o requireAdmin no servidor: esconder o botão é conveniência, não segurança.
  return { id: u.id, email: u.email, nome: u.nome, metaDiaria: u.metaDiaria, admin: ehAdmin(u.email) };
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

// Cada pedido de conta dispara um e-mail para o admin, então o registro é limitado
// por IP (em memória: basta para um processo só atrás do Caddy).
const JANELA_PEDIDOS_MS = 60 * 60 * 1000;
const MAX_PEDIDOS_POR_JANELA = 5;
const pedidosPorIp = new Map<string, number[]>();

function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  const recentes = (pedidosPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_PEDIDOS_MS);
  const excedeu = recentes.length >= MAX_PEDIDOS_POR_JANELA;
  if (!excedeu) recentes.push(agora);
  pedidosPorIp.set(ip, recentes);
  return excedeu;
}

// Manda para o admin o link da página de aprovação. Tenta e-mail e Telegram: basta
// um dos dois chegar. Se nenhum canal estiver configurado ou ambos falharem, o link
// vai para o log do pm2 para o pedido não se perder.
async function avisarAdmin(user: { nome: string; email: string }, token: string) {
  const link = `${env.API_PUBLIC_URL}/auth/aprovacao?token=${token}`;
  const texto = `${user.nome} <${user.email}> pediu uma conta no devconcursado.\n\nAprovar ou recusar: ${link}\n`;

  const canais: Array<[string, () => Promise<boolean>]> = [
    [
      "e-mail",
      () =>
        enviarEmail({
          para: env.ADMIN_EMAIL,
          assunto: `Novo pedido de conta: ${user.nome}`,
          texto,
          html:
            `<p><strong>${escaparHtml(user.nome)}</strong> (${escaparHtml(user.email)}) pediu uma conta no devconcursado.</p>` +
            `<p><a href="${link}">Abrir o pedido para aprovar ou recusar</a></p>` +
            `<p style="color:#888;font-size:12px">O link abre uma página de confirmação; nada muda até você clicar em Aprovar ou Recusar.</p>`,
        }),
    ],
    ["telegram", () => enviarTelegram(texto)],
  ];

  let entregue = false;
  for (const [nome, enviar] of canais) {
    try {
      if (await enviar()) entregue = true;
    } catch (err) {
      console.error(`[aprovacao] falha no canal ${nome} para o pedido de ${user.email}`, err);
    }
  }
  if (!entregue) console.warn(`[aprovacao] nenhum canal configurado. Pedido de ${user.email}: ${link}`);
}

// Registro: só abre com REGISTRO_ABERTO=true no .env. A conta nasce com aprovado=false
// e não recebe tokens; o login fica barrado até o admin aprovar pelo link do e-mail.
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    if (!env.REGISTRO_ABERTO) throw new HttpError(403, "Criação de conta desativada");
    const { email, password, nome } = registerSchema.parse(req.body);
    if (excedeuLimite(req.ip ?? "desconhecido")) {
      throw new HttpError(429, "Muitos pedidos de conta. Tente de novo mais tarde");
    }
    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      throw new HttpError(
        409,
        existe.aprovado ? "E-mail já cadastrado" : "Já existe um pedido para este e-mail aguardando autorização"
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");
    const user = await prisma.user.create({
      data: { email, passwordHash, nome, aprovado: false, aprovacaoTokenHash: hashToken(token) },
    });
    await avisarAdmin(user, token);
    res.status(202).json({ pendente: true });
  })
);

// Página HTML mínima servida pela própria API para o link do e-mail.
function pagina(titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${titulo} · devconcursado</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:#0f0b1f;color:#ece8ff;font:15px/1.5 system-ui,sans-serif}
main{width:100%;max-width:420px;box-sizing:border-box;background:#1a1430;border:1px solid #2e2650;border-radius:16px;padding:28px}
h1{margin:0 0 14px;font-size:20px}.m{color:#9d95c0;font-size:13px}a{color:#b3a8ff}
form{display:flex;gap:10px;margin-top:22px}
button{flex:1;padding:12px;border-radius:10px;font:600 15px system-ui,sans-serif;cursor:pointer;border:0;background:#6d5cff;color:#fff}
button.r{background:transparent;border:1px solid #7a3a58;color:#ffa3bd}
</style></head><body><main><h1>${titulo}</h1>${corpo}</main></body></html>`;
}

const LINK_INVALIDO = pagina(
  "Link inválido",
  `<p class="m">Este pedido não existe mais: já foi aprovado ou recusado, ou o link está incompleto.</p>`
);

// GET só mostra o pedido; a ação exige o POST do formulário. Assim um scanner de
// links do provedor de e-mail que abra a URL não aprova nem recusa ninguém.
authRouter.get(
  "/aprovacao",
  asyncHandler(async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const user = token
      ? await prisma.user.findUnique({ where: { aprovacaoTokenHash: hashToken(token) } })
      : null;
    if (!user) return res.status(404).type("html").send(LINK_INVALIDO);

    const quando = user.createdAt.toLocaleString("pt-BR", { timeZone: env.USER_TIMEZONE });
    res.type("html").send(
      pagina(
        "Pedido de conta",
        `<p><strong>${escaparHtml(user.nome)}</strong><br>${escaparHtml(user.email)}</p>` +
          `<p class="m">Pedido feito em ${quando}.</p>` +
          `<form method="post" action="aprovacao">` +
          `<input type="hidden" name="token" value="${escaparHtml(token)}">` +
          `<button name="acao" value="aprovar">Aprovar</button>` +
          `<button name="acao" value="recusar" class="r">Recusar</button>` +
          `</form>`
      )
    );
  })
);

authRouter.post(
  "/aprovacao",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    const parsed = aprovacaoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).type("html").send(LINK_INVALIDO);
    const { token, acao } = parsed.data;
    const user = await prisma.user.findUnique({ where: { aprovacaoTokenHash: hashToken(token) } });
    if (!user) return res.status(404).type("html").send(LINK_INVALIDO);

    const quem = `<strong>${escaparHtml(user.nome)}</strong> (${escaparHtml(user.email)})`;
    if (acao === "aprovar") {
      await prisma.user.update({
        where: { id: user.id },
        data: { aprovado: true, aprovacaoTokenHash: null },
      });
      const app = escaparHtml(env.corsOrigins[0]);
      return res
        .type("html")
        .send(pagina("Conta aprovada", `<p>${quem} já pode entrar em <a href="${app}">${app}</a>.</p>`));
    }

    // O token só existe enquanto a conta está pendente, então apagar aqui nunca
    // atinge conta aprovada. A conta pendente não tem dados além do próprio User.
    await prisma.user.delete({ where: { id: user.id } });
    res.type("html").send(pagina("Pedido recusado", `<p>O pedido de ${quem} foi apagado.</p>`));
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email: emailBruto, password } = loginSchema.parse(req.body);
    const email = emailBruto.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Credenciais inválidas");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Credenciais inválidas");
    // Checado depois da senha para não revelar a quem não sabe a senha que a conta existe.
    if (!user.aprovado) throw new HttpError(403, "Conta aguardando autorização do administrador");

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
