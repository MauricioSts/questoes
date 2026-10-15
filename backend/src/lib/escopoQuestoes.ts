// Escopo do acervo de um concurso. Uma questão chega ao usuário por três caminhos:
// pela TRILHA que o concurso segue (acervo compartilhado), por um VÍNCULO dessa trilha
// (QuestaoTrilha: questão de outra trilha que também vale nesta, sem duplicar a linha) ou
// pelo concursoId (lote importado direto naquele concurso, e os lotes antigos). Contar
// só por concursoId dá zero para quem entrou por trilha — era o que fazia o cartão do
// concurso dizer "0 no banco" e marcar VAZIO. Todo lugar que conta ou lista questões de
// um concurso usa este helper, para o número exibido bater com o que /questoes serve.
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export function escopoDaTrilha(trilhaId: string, concursoId?: string): Prisma.QuestaoWhereInput {
  return {
    OR: [
      { trilhaId },
      { vinculos: { some: { trilhaId } } },
      ...(concursoId ? [{ concursoId }] : []),
    ],
  };
}

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
  return concurso.trilhaId ? escopoDaTrilha(concurso.trilhaId, concursoId) : { concursoId };
}

// Matéria de cada questão DENTRO de uma trilha: o vínculo pode renomear (na Dataprev a
// questão é "Desenvolvimento de Software"; na trilha Java, "Streams e lambdas"). Devolve
// só as que têm nome próprio na trilha; as demais usam Questao.materia.
export async function materiasDoVinculo(trilhaId: string | null | undefined, ids?: number[]): Promise<Map<number, string>> {
  if (!trilhaId) return new Map();
  const vs = await prisma.questaoTrilha.findMany({
    where: { trilhaId, materia: { not: null }, ...(ids ? { questaoId: { in: ids } } : {}) },
    select: { questaoId: true, materia: true },
  });
  return new Map(vs.map((v) => [v.questaoId, v.materia!]));
}

// Questões do escopo com a matéria já resolvida para a trilha do concurso.
export async function questoesComMateria(
  concursoId: string | undefined,
  userId: string,
  where: Prisma.QuestaoWhereInput
): Promise<{ id: number; materia: string; origem: string }[]> {
  const [linhas, concurso] = await Promise.all([
    prisma.questao.findMany({ where, select: { id: true, materia: true, origem: true } }),
    concursoId ? prisma.concurso.findFirst({ where: { id: concursoId, userId }, select: { trilhaId: true } }) : null,
  ]);
  const renomeadas = await materiasDoVinculo(concurso?.trilhaId);
  return linhas.map((q) => ({ ...q, materia: renomeadas.get(q.id) ?? q.materia }));
}
