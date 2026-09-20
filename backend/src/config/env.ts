// Leitura e validação das variáveis de ambiente. Falha cedo se algo essencial faltar.
import "dotenv/config"; // carrega o .env antes de ler process.env
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  USER_TIMEZONE: z.string().default("America/Fortaleza"),
  // Criação de conta. Fica fechada a menos que se ligue no .env (REGISTRO_ABERTO=true);
  // ligada, a conta nasce pendente e só entra depois que ADMIN_EMAIL aprova pelo link.
  REGISTRO_ABERTO: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ADMIN_EMAIL: z.string().email().default("contatomauriciosts@gmail.com"),
  // URL pública da API: base dos links de aprovação que vão no e-mail.
  API_PUBLIC_URL: z.string().url().default("http://localhost:3333"),
  // SMTP de saída. Sem SMTP_HOST o e-mail não sai e o link de aprovação vai para o log.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Aviso por Telegram: usado quando não há SMTP, para o pedido de conta chegar
  // mesmo sem servidor de e-mail. Sem os dois, o link só vai para o log.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// CORS_ORIGIN pode ser lista separada por vírgula.
export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((s) => s.trim()),
};
