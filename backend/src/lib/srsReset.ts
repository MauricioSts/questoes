// Reinício da revisão espaçada (SRS).
//
// O agendamento do SRS é DERIVADO do histórico de Answer (ver lib/srs.ts): não existe
// tabela de estado a limpar. Zerar a fila apagando respostas destruiria estatística,
// ofensiva, "meus erros" e progresso no banco — que saem das mesmas linhas. Então o
// reinício é um marco de data: a partir dele o SRS só olha respostas mais novas, e a
// questão volta a ser agendada na próxima vez que for respondida.
import { prisma } from "../prisma.js";

// Data a partir da qual as respostas contam para o SRS (null = histórico inteiro).
// Escopo: o concurso ativo quando há um; senão o marco do próprio usuário.
export async function srsDesde(userId: string, concursoId?: string): Promise<Date | null> {
  if (concursoId) {
    const c = await prisma.concurso.findFirst({
      where: { id: concursoId, userId },
      select: { srsResetAt: true },
    });
    return c?.srsResetAt ?? null;
  }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { srsResetAt: true } });
  return u?.srsResetAt ?? null;
}

// Filtro Prisma pronto para as consultas de SRS.
export function filtroSrs(desde: Date | null): { createdAt?: { gt: Date } } {
  return desde ? { createdAt: { gt: desde } } : {};
}

// Marca "agora" como reinício do SRS no escopo pedido. Devolve a data gravada.
export async function marcarSrsReset(userId: string, concursoId?: string): Promise<Date> {
  const agora = new Date();
  if (concursoId) {
    const c = await prisma.concurso.findFirst({ where: { id: concursoId, userId }, select: { id: true } });
    if (c) {
      await prisma.concurso.update({ where: { id: c.id }, data: { srsResetAt: agora } });
      return agora;
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { srsResetAt: agora } });
  return agora;
}
