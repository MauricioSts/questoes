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
  // Assinatura pelo Mercado Pago. Sem MP_ACCESS_TOKEN a cobrança fica desligada: ninguém
  // é limitado e o registro continua passando pela aprovação do admin.
  MP_ACCESS_TOKEN: z.string().optional(),
  // Assinatura secreta do webhook (painel do Mercado Pago). Sem ela a notificação é
  // aceita sem conferir a assinatura; o estado continua vindo de uma consulta à API.
  MP_WEBHOOK_SECRET: z.string().optional(),
  PLANO_MENSAL_VALOR: z.coerce.number().positive().default(19.9),
  PLANO_ANUAL_VALOR: z.coerce.number().positive().default(179.9),
  // Questões por dia de quem não assina.
  LIMITE_GRATIS_DIA: z.coerce.number().int().positive().default(10),
  // Leitura de prova em PDF por IA (Groq). Sem a chave o recurso fica desligado.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODELO: z.string().default("openai/gpt-oss-120b"),
  // Páginas é a moeda: quantas páginas de PDF cada plano lê por mês, e o teto por arquivo.
  PDF_PAGINAS_MES_FREE: z.coerce.number().int().min(0).default(5),
  PDF_PAGINAS_MES_PREMIUM: z.coerce.number().int().min(0).default(100),
  PDF_MAX_PAGINAS: z.coerce.number().int().positive().default(10),
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
