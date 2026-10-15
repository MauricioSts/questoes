// Código de 6 dígitos por e-mail: a segunda etapa do login e a confirmação para ligar
// a verificação em duas etapas. O cliente recebe um "desafio" opaco que amarra o código
// a esta tentativa; no banco ficam só hashes. 10 minutos de validade, 5 tentativas.
import crypto from "node:crypto";
import { prisma } from "../prisma.js";
import { HttpError } from "../middleware/error.js";
import { enviarEmail } from "./email.js";

export type Finalidade = "login" | "ativar";

const VALIDADE_MS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const INTERVALO_REENVIO_MS = 60 * 1000;

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
// O desafio entra no hash do código: sem ele, o mesmo código de 6 dígitos teria
// sempre o mesmo hash e uma tabela de 1 milhão de entradas o revelaria.
const hashCodigo = (desafio: string, codigo: string) => sha256(`${desafio}:${codigo}`);
const novoCodigo = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export function mascararEmail(email: string): string {
  const [nome, dominio] = email.split("@");
  if (!nome || !dominio) return email;
  return `${nome.slice(0, 2)}${"•".repeat(Math.max(1, nome.length - 2))}@${dominio}`;
}

async function mandar(email: string, codigo: string, finalidade: Finalidade) {
  const motivo = finalidade === "login" ? "entrar no devconcursado" : "ligar a verificação em duas etapas";
  let enviado: boolean;
  try {
    enviado = await enviarEmail({
      para: email,
      assunto: `${codigo} é o seu código do devconcursado`,
      texto: `Seu código para ${motivo}: ${codigo}\n\nVale por 10 minutos. Se não foi você, troque a sua senha.\n`,
      html:
        `<p>Seu código para ${motivo}:</p>` +
        `<p style="font:700 28px/1.2 monospace;letter-spacing:6px">${codigo}</p>` +
        `<p style="color:#888;font-size:12px">Vale por 10 minutos. Se não foi você, troque a sua senha.</p>`,
    });
  } catch (err) {
    console.error(`[codigo] falha ao enviar para ${email}`, err);
    throw new HttpError(502, "Não foi possível enviar o código por e-mail. Tente de novo em instantes");
  }
  // Sem SMTP (desenvolvimento) o código vai para o log, como o link de aprovação.
  if (!enviado) console.warn(`[codigo] SMTP não configurado. Código de ${email} (${finalidade}): ${codigo}`);
}

// Cria um código novo (descarta os anteriores da mesma finalidade) e manda por e-mail.
export async function emitirCodigo(user: { id: string; email: string }, finalidade: Finalidade) {
  const desafio = crypto.randomBytes(32).toString("hex");
  const codigo = novoCodigo();
  await prisma.$transaction([
    prisma.codigoEmail.deleteMany({ where: { userId: user.id, finalidade } }),
    prisma.codigoEmail.create({
      data: {
        userId: user.id,
        finalidade,
        desafioHash: sha256(desafio),
        codigoHash: hashCodigo(desafio, codigo),
        expiresAt: new Date(Date.now() + VALIDADE_MS),
      },
    }),
  ]);
  await mandar(user.email, codigo, finalidade);
  return { desafio, email: mascararEmail(user.email) };
}

// Troca o código do mesmo desafio por um novo, no máximo uma vez por minuto.
export async function reenviarCodigo(desafio: string) {
  const registro = await prisma.codigoEmail.findUnique({
    where: { desafioHash: sha256(desafio) },
    include: { user: true },
  });
  if (!registro) throw new HttpError(400, "Código expirado. Comece de novo");
  const espera = registro.createdAt.getTime() + INTERVALO_REENVIO_MS - Date.now();
  if (espera > 0) throw new HttpError(429, `Aguarde ${Math.ceil(espera / 1000)}s para pedir outro código`);
  const codigo = novoCodigo();
  await prisma.codigoEmail.update({
    where: { id: registro.id },
    data: {
      codigoHash: hashCodigo(desafio, codigo),
      tentativas: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + VALIDADE_MS),
    },
  });
  await mandar(registro.user.email, codigo, registro.finalidade as Finalidade);
}

// Confere o código e o consome. Devolve o userId dono do desafio. Erro de digitação
// gasta uma tentativa; na quinta o desafio morre e é preciso começar de novo.
export async function conferirCodigo(desafio: string, codigo: string, finalidade: Finalidade) {
  const registro = await prisma.codigoEmail.findUnique({ where: { desafioHash: sha256(desafio) } });
  if (!registro || registro.finalidade !== finalidade || registro.expiresAt < new Date()) {
    if (registro) await prisma.codigoEmail.delete({ where: { id: registro.id } }).catch(() => {});
    throw new HttpError(400, "Código expirado. Comece de novo");
  }
  const esperado = Buffer.from(registro.codigoHash);
  const recebido = Buffer.from(hashCodigo(desafio, codigo.trim()));
  if (!crypto.timingSafeEqual(esperado, recebido)) {
    const tentativas = registro.tentativas + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      await prisma.codigoEmail.delete({ where: { id: registro.id } }).catch(() => {});
      throw new HttpError(400, "Tentativas esgotadas. Comece de novo");
    }
    await prisma.codigoEmail.update({ where: { id: registro.id }, data: { tentativas } });
    const restam = MAX_TENTATIVAS - tentativas;
    throw new HttpError(400, `Código incorreto. ${restam === 1 ? "Resta 1 tentativa" : `Restam ${restam} tentativas`}`);
  }
  // deleteMany: se outra requisição consumiu o mesmo código ao mesmo tempo, só uma vence.
  const { count } = await prisma.codigoEmail.deleteMany({ where: { id: registro.id } });
  if (count === 0) throw new HttpError(400, "Código expirado. Comece de novo");
  return registro.userId;
}
