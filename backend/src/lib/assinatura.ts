// Regras da assinatura: planos, quem tem acesso completo e como o estado do Mercado Pago
// vira o estado guardado no banco.
import { prisma } from "../prisma.js";
import { env } from "../config/env.js";
import { ehAdmin } from "../middleware/admin.js";
import { buscarPreapproval, type Preapproval } from "./mercadopago.js";

export const PLANOS = {
  mensal: { nome: "Mensal", meses: 1, valor: env.PLANO_MENSAL_VALOR },
  anual: { nome: "Anual", meses: 12, valor: env.PLANO_ANUAL_VALOR },
} as const;
export type PlanoId = keyof typeof PLANOS;

// Sem token do Mercado Pago não há como assinar, então nada é cobrado nem limitado.
export function pagamentosAtivos(): boolean {
  return !!env.MP_ACCESS_TOKEN;
}

interface EstadoAssinatura {
  status: string;
  proximaCobranca: Date | null;
  validoAte: Date | null;
}

// Autorizada vale enquanto o Mercado Pago a mantiver assim; cancelada ou pausada vale
// até o fim do período que já foi pago.
export function assinaturaDaAcesso(a: Pick<EstadoAssinatura, "status" | "validoAte"> | null, agora = new Date()): boolean {
  if (!a) return false;
  return a.status === "authorized" || (!!a.validoAte && a.validoAte > agora);
}

// Estado a gravar a partir do que o Mercado Pago devolveu. Ao sair de "authorized", a
// data da cobrança que não vai mais acontecer vira o fim do acesso.
export function proximoEstado(mp: Pick<Preapproval, "status" | "next_payment_date">, anterior: EstadoAssinatura | null): EstadoAssinatura {
  if (mp.status === "authorized") {
    return {
      status: mp.status,
      proximaCobranca: mp.next_payment_date ? new Date(mp.next_payment_date) : null,
      validoAte: null,
    };
  }
  const pago = anterior?.status === "authorized" ? anterior.proximaCobranca : null;
  return { status: mp.status, proximaCobranca: null, validoAte: anterior?.validoAte ?? pago };
}

export type MotivoAcesso = "desligado" | "admin" | "cortesia" | "assinatura";

export async function acessoDoUsuario(userId: string, email: string | undefined): Promise<MotivoAcesso | null> {
  if (!pagamentosAtivos()) return "desligado";
  if (ehAdmin(email)) return "admin";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cortesia: true, assinatura: { select: { status: true, validoAte: true } } },
  });
  if (user?.cortesia) return "cortesia";
  return assinaturaDaAcesso(user?.assinatura ?? null) ? "assinatura" : null;
}

// Consulta a assinatura no Mercado Pago e grava o estado dela. É o único caminho que
// escreve o status: webhook e retorno do checkout só dizem QUAL assinatura olhar.
export async function sincronizarAssinatura(preapprovalId: string): Promise<void> {
  const mp = await buscarPreapproval(preapprovalId);
  const userId = mp.external_reference;
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { assinatura: true } });
  if (!user) return;

  const atual = user.assinatura;
  if (atual && atual.mpPreapprovalId !== mp.id) {
    // Outra assinatura da mesma pessoa (clicou em assinar mais de uma vez). Só troca a
    // que está guardada se esta foi a que ela de fato pagou.
    if (mp.status !== "authorized") return;
    if (atual.status === "authorized") {
      console.warn(`[assinatura] ${user.email} tem duas assinaturas autorizadas: ${atual.mpPreapprovalId} e ${mp.id}`);
      return;
    }
  }

  const plano: PlanoId = (mp.auto_recurring?.frequency ?? 1) >= 12 ? "anual" : "mensal";
  const dados = { plano, mpPreapprovalId: mp.id, ...proximoEstado(mp, atual) };
  await prisma.assinatura.upsert({
    where: { userId },
    create: { userId, ...dados },
    update: dados,
  });
}
