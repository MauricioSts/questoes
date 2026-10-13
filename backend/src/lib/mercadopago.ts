// Cliente mínimo da API de assinaturas do Mercado Pago (preapproval sem plano associado).
// A assinatura nasce "pending" e devolve o init_point: é lá que a pessoa informa o cartão.
import crypto from "node:crypto";
import { env } from "../config/env.js";

const BASE = "https://api.mercadopago.com";

export interface Preapproval {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string | null;
  init_point?: string;
  next_payment_date?: string | null;
  auto_recurring?: { frequency?: number; frequency_type?: string; transaction_amount?: number };
}

export class MercadoPagoError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function mp<T>(method: string, caminho: string, corpo?: unknown): Promise<T> {
  if (!env.MP_ACCESS_TOKEN) throw new MercadoPagoError(503, "MP_ACCESS_TOKEN não configurado");
  const r = await fetch(`${BASE}${caminho}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const dados = (await r.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!r.ok || !dados) {
    throw new MercadoPagoError(r.status, dados?.message ?? `Mercado Pago respondeu ${r.status}`);
  }
  return dados;
}

export function criarPreapproval(p: {
  motivo: string;
  userId: string;
  emailPagador: string;
  meses: number;
  valor: number;
  urlRetorno: string;
}): Promise<Preapproval> {
  return mp<Preapproval>("POST", "/preapproval", {
    reason: p.motivo,
    external_reference: p.userId,
    payer_email: p.emailPagador,
    back_url: p.urlRetorno,
    auto_recurring: {
      frequency: p.meses,
      frequency_type: "months",
      transaction_amount: p.valor,
      currency_id: "BRL",
    },
    status: "pending",
  });
}

export function buscarPreapproval(id: string): Promise<Preapproval> {
  return mp<Preapproval>("GET", `/preapproval/${encodeURIComponent(id)}`);
}

export function cancelarPreapproval(id: string): Promise<Preapproval> {
  return mp<Preapproval>("PUT", `/preapproval/${encodeURIComponent(id)}`, { status: "cancelled" });
}

// Cobrança de uma assinatura: a notificação traz o id da cobrança, não o da assinatura.
export async function preapprovalDaCobranca(id: string): Promise<string | null> {
  const c = await mp<{ preapproval_id?: string }>("GET", `/authorized_payments/${encodeURIComponent(id)}`);
  return c.preapproval_id ?? null;
}

// Confere o cabeçalho x-signature ("ts=...,v1=...") do webhook: HMAC-SHA256, com a
// assinatura secreta, do manifesto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
export function assinaturaWebhookValida(p: {
  segredo: string;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string;
}): boolean {
  const partes = new Map(
    (p.xSignature ?? "").split(",").map((par) => {
      const [k, ...v] = par.split("=");
      return [k.trim(), v.join("=").trim()] as const;
    })
  );
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;
  // O Mercado Pago assina o id em minúsculas quando ele é alfanumérico.
  const manifesto = `id:${p.dataId.toLowerCase()};request-id:${p.xRequestId ?? ""};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", p.segredo).update(manifesto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
