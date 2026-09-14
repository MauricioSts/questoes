// Envio de e-mail por SMTP. Sem SMTP_HOST configurado não há transporte: enviar()
// devolve false e quem chamou decide o que fazer (o registro joga o link no log).
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporte: Transporter | null = null;

function obterTransporte(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporte ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporte;
}

export async function enviarEmail(msg: { para: string; assunto: string; texto: string; html: string }) {
  const t = obterTransporte();
  if (!t) return false;
  await t.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to: msg.para,
    subject: msg.assunto,
    text: msg.texto,
    html: msg.html,
  });
  return true;
}

export function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
