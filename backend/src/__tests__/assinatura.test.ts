// O acesso pago depende de duas contas: até quando uma assinatura vale e se o webhook
// veio mesmo do Mercado Pago.
import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { assinaturaDaAcesso, proximoEstado } from "../lib/assinatura.js";
import { assinaturaWebhookValida } from "../lib/mercadopago.js";

const agora = new Date("2026-10-13T12:00:00Z");
const amanha = new Date("2026-10-14T12:00:00Z");
const ontem = new Date("2026-10-12T12:00:00Z");

describe("assinaturaDaAcesso", () => {
  it("nega quem nunca assinou ou não terminou o pagamento", () => {
    expect(assinaturaDaAcesso(null, agora)).toBe(false);
    expect(assinaturaDaAcesso({ status: "pending", validoAte: null }, agora)).toBe(false);
  });

  it("libera assinatura autorizada", () => {
    expect(assinaturaDaAcesso({ status: "authorized", validoAte: null }, agora)).toBe(true);
  });

  it("cancelada vale só até o fim do período pago", () => {
    expect(assinaturaDaAcesso({ status: "cancelled", validoAte: amanha }, agora)).toBe(true);
    expect(assinaturaDaAcesso({ status: "cancelled", validoAte: ontem }, agora)).toBe(false);
    expect(assinaturaDaAcesso({ status: "cancelled", validoAte: null }, agora)).toBe(false);
  });
});

describe("proximoEstado", () => {
  it("autorizada guarda a próxima cobrança e limpa o fim do acesso", () => {
    const e = proximoEstado(
      { status: "authorized", next_payment_date: amanha.toISOString() },
      { status: "cancelled", proximaCobranca: null, validoAte: ontem }
    );
    expect(e).toEqual({ status: "authorized", proximaCobranca: amanha, validoAte: null });
  });

  it("ao cancelar, o acesso vai até a cobrança que não vai mais acontecer", () => {
    const e = proximoEstado(
      { status: "cancelled", next_payment_date: null },
      { status: "authorized", proximaCobranca: amanha, validoAte: null }
    );
    expect(e).toEqual({ status: "cancelled", proximaCobranca: null, validoAte: amanha });
  });

  it("notificação repetida de cancelamento não apaga o fim do acesso", () => {
    const e = proximoEstado(
      { status: "cancelled", next_payment_date: null },
      { status: "cancelled", proximaCobranca: null, validoAte: amanha }
    );
    expect(e.validoAte).toEqual(amanha);
  });

  it("pendente sem histórico não libera nada", () => {
    const e = proximoEstado({ status: "pending", next_payment_date: null }, null);
    expect(assinaturaDaAcesso(e, agora)).toBe(false);
  });
});

describe("assinaturaWebhookValida", () => {
  const segredo = "segredo-de-teste";
  const assinar = (id: string, requestId: string, ts: string) =>
    crypto.createHmac("sha256", segredo).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");

  it("aceita a assinatura certa, com o id em minúsculas", () => {
    const v1 = assinar("abc123", "req-1", "1700000000");
    expect(
      assinaturaWebhookValida({ segredo, xSignature: `ts=1700000000,v1=${v1}`, xRequestId: "req-1", dataId: "ABC123" })
    ).toBe(true);
  });

  it("recusa id trocado, segredo errado ou cabeçalho ausente", () => {
    const v1 = assinar("abc123", "req-1", "1700000000");
    const base = { segredo, xSignature: `ts=1700000000,v1=${v1}`, xRequestId: "req-1", dataId: "abc123" };
    expect(assinaturaWebhookValida({ ...base, dataId: "outro" })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, segredo: "outro-segredo" })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: undefined })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: "v1=abc" })).toBe(false);
  });
});
