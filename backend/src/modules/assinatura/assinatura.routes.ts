// Assinatura pelo Mercado Pago: estado do usuário, checkout, cancelamento e webhook.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/error.js";
import { startOfToday } from "../../lib/date.js";
import {
  PLANOS,
  acessoDoUsuario,
  DIAS_BATALHA_FREE,
  fimBatalhaFree,
  assinaturaDaAcesso,
  pagamentosAtivos,
  sincronizarAssinatura,
} from "../../lib/assinatura.js";
import {
  MercadoPagoError,
  assinaturaWebhookValida,
  cancelarPreapproval,
  criarPreapproval,
  preapprovalDaCobranca,
} from "../../lib/mercadopago.js";

export const assinaturaRouter = Router();

// POST /assinatura/webhook: notificação do Mercado Pago (sem login). O corpo só diz qual
// assinatura mudou; o estado é lido da API com o nosso token, então uma notificação
// forjada não libera acesso a ninguém.
assinaturaRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const tipo = String(req.body?.type ?? req.query.type ?? req.query.topic ?? "");
    const id = String(req.body?.data?.id ?? req.query["data.id"] ?? req.query.id ?? "");
    console.log(`[assinatura] webhook tipo=${tipo || "-"} id=${id || "-"}`);
    if (!id) return res.status(200).end();

    if (env.MP_WEBHOOK_SECRET) {
      const valida = assinaturaWebhookValida({
        segredo: env.MP_WEBHOOK_SECRET,
        xSignature: req.header("x-signature"),
        xRequestId: req.header("x-request-id"),
        dataId: String(req.query["data.id"] ?? id),
      });
      if (!valida) {
        console.warn("[assinatura] webhook com assinatura inválida", {
          query: req.query,
          xSignature: req.header("x-signature"),
          xRequestId: req.header("x-request-id"),
        });
        return res.status(401).end();
      }
    }

    try {
      if (tipo === "subscription_preapproval") {
        await sincronizarAssinatura(id);
      } else if (tipo === "subscription_authorized_payment") {
        const preapprovalId = await preapprovalDaCobranca(id);
        if (preapprovalId) await sincronizarAssinatura(preapprovalId);
      }
    } catch (err) {
      // 404 = id que não é desta conta (teste do painel, por exemplo): não adianta o
      // Mercado Pago reenviar. Qualquer outra falha devolve 500 para ele tentar de novo.
      if (!(err instanceof MercadoPagoError && err.status === 404)) throw err;
    }
    res.status(200).end();
  })
);

assinaturaRouter.use(requireAuth);

// GET /assinatura: o que o cliente precisa para decidir o que mostrar e o que travar.
assinaturaRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [motivo, assinatura, usadasHoje, user] = await Promise.all([
      acessoDoUsuario(req.userId!, req.userEmail),
      prisma.assinatura.findUnique({ where: { userId: req.userId! } }),
      prisma.answer.count({ where: { userId: req.userId!, createdAt: { gte: startOfToday() } } }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: { createdAt: true } }),
    ]);
    const batalhaFreeAte = user ? fimBatalhaFree(user.createdAt) : null;
    res.json({
      pagamentosAtivos: pagamentosAtivos(),
      premium: motivo !== null,
      motivo,
      assinatura: assinatura && {
        plano: assinatura.plano,
        status: assinatura.status,
        proximaCobranca: assinatura.proximaCobranca,
        validoAte: assinatura.validoAte,
      },
      planos: Object.entries(PLANOS).map(([id, p]) => ({ id, ...p })),
      limiteGratisDia: env.LIMITE_GRATIS_DIA,
      usadasHoje,
      // Até quando a Batalha vale no plano gratuito (null = conta sumiu). Para quem tem
      // acesso completo é só informativo: a Batalha está sempre liberada.
      batalhaFreeAte,
      diasBatalhaFree: DIAS_BATALHA_FREE,
      pdfPaginasMes: { free: env.PDF_PAGINAS_MES_FREE, premium: env.PDF_PAGINAS_MES_PREMIUM },
    });
  })
);

const checkoutSchema = z.object({
  plano: z.enum(["mensal", "anual"]),
  // E-mail da conta do Mercado Pago de quem paga, quando não é o do cadastro.
  emailPagador: z.string().trim().toLowerCase().email().optional(),
});

// POST /assinatura/checkout: cria a assinatura pendente e devolve a URL de pagamento.
assinaturaRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    if (!pagamentosAtivos()) throw new HttpError(503, "Assinatura indisponível no momento");
    const { plano, emailPagador } = checkoutSchema.parse(req.body);
    const atual = await prisma.assinatura.findUnique({ where: { userId: req.userId! } });
    if (atual?.status === "authorized") throw new HttpError(409, "Você já tem uma assinatura ativa");

    const p = PLANOS[plano];
    let mp;
    try {
      mp = await criarPreapproval({
        motivo: `devconcursado: plano ${p.nome.toLowerCase()}`,
        userId: req.userId!,
        emailPagador: emailPagador ?? req.userEmail!,
        meses: p.meses,
        valor: p.valor,
        urlRetorno: `${env.corsOrigins[0]}/assinatura`,
      });
    } catch (err) {
      console.error("[assinatura] falha ao criar a assinatura no Mercado Pago", err);
      throw new HttpError(502, "O Mercado Pago recusou o pedido. Confira o e-mail da sua conta Mercado Pago e tente de novo");
    }
    if (!mp.init_point) throw new HttpError(502, "O Mercado Pago não devolveu o link de pagamento");

    // validoAte fica: quem cancelou e está reassinando não perde o período já pago.
    const dados = { plano, mpPreapprovalId: mp.id, status: mp.status, proximaCobranca: null };
    await prisma.assinatura.upsert({
      where: { userId: req.userId! },
      create: { userId: req.userId!, ...dados },
      update: dados,
    });
    res.json({ url: mp.init_point });
  })
);

// POST /assinatura/sincronizar: relê a assinatura no Mercado Pago. O cliente chama na
// volta do checkout, para o acesso não depender de o webhook já ter chegado.
assinaturaRouter.post(
  "/sincronizar",
  asyncHandler(async (req, res) => {
    const atual = await prisma.assinatura.findUnique({ where: { userId: req.userId! } });
    if (atual && pagamentosAtivos()) await sincronizarAssinatura(atual.mpPreapprovalId);
    res.status(204).end();
  })
);

// POST /assinatura/cancelar: para as cobranças. O acesso segue até o fim do período pago.
assinaturaRouter.post(
  "/cancelar",
  asyncHandler(async (req, res) => {
    const atual = await prisma.assinatura.findUnique({ where: { userId: req.userId! } });
    if (!atual || atual.status !== "authorized") throw new HttpError(409, "Não há assinatura ativa para cancelar");
    try {
      await cancelarPreapproval(atual.mpPreapprovalId);
      await sincronizarAssinatura(atual.mpPreapprovalId);
    } catch (err) {
      // Sem isso a pessoa via "Erro interno" e não sabia se as cobranças tinham parado.
      if (!(err instanceof MercadoPagoError)) throw err;
      console.error(`[assinatura] falha ao cancelar ${atual.mpPreapprovalId} no Mercado Pago`, err);
      throw new HttpError(502, "O Mercado Pago não confirmou o cancelamento. Tente de novo em instantes ou cancele pelo app do Mercado Pago");
    }
    const depois = await prisma.assinatura.findUnique({ where: { userId: req.userId! } });
    res.json({ premium: assinaturaDaAcesso(depois), validoAte: depois?.validoAte ?? null });
  })
);
