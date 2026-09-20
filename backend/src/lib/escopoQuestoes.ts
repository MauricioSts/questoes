// Escopo do acervo de um concurso. Uma questão chega ao usuário por dois caminhos:
// pela TRILHA que o concurso segue (acervo compartilhado) ou pelo concursoId (lote
// importado direto naquele concurso, e os lotes antigos). Contar só por concursoId
// dá zero para quem entrou por trilha — era o que fazia o cartão do concurso dizer
// "0 no banco" e marcar VAZIO. Todo lugar que conta ou lista questões de um concurso
// usa este helper, para o número exibido bater com o que /questoes serve.
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export async function escopoQuestoes(
  concursoId: string | undefined,
  userId: string
): Promise<Prisma.QuestaoWhereInput> {
  if (!concursoId) return {}; // sem concurso ativo: comportamento legado, acervo inteiro
  const concurso = await prisma.concurso.findFirst({
    where: { id: concursoId, userId },
    select: { trilhaId: true },
  });
  if (!concurso) return { concursoId }; // concurso de outro usuário: não vaza acervo
  return concurso.trilhaId
    ? { OR: [{ trilhaId: concurso.trilhaId }, { concursoId }] }
    : { concursoId };
}
