// Aviso por Telegram. Alternativa ao SMTP para o pedido de conta não depender de
// servidor de e-mail: sem TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID, enviar() devolve
// false e quem chamou cai no próximo canal (o registro joga o link no log).
import { env } from "../config/env.js";

export async function enviarTelegram(texto: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: texto,
      // O link de aprovação não pode virar preview clicável por engano: quem abre
      // o link é o admin, e só o POST do formulário aprova.
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) throw new Error(`Telegram respondeu ${r.status}: ${await r.text()}`);
  return true;
}
