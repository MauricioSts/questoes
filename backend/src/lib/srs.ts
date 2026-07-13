// Repetição espaçada (SRS) para o modo Revisar.
// A partir do histórico de respostas de cada questão, calcula quando ela deve
// voltar para revisão: quanto mais acertos consecutivos, maior o intervalo.
// Erro reseta o intervalo (a questão volta a ser cobrada em breve).

// Intervalos (em dias) por nº de acertos consecutivos ao final do histórico.
// streak 0 (último foi erro) → revê em 1 dia; 1 acerto → 3 dias; e assim por diante.
export const INTERVALOS_DIAS = [1, 3, 7, 16, 35, 60];

const DIA_MS = 864e5;

export interface AnswerRev {
  questaoId: number;
  acertou: boolean;
  createdAt: Date;
  moduloSnapshot: string;
  materiaSnapshot: string;
  assuntoSnapshot: string;
  dificuldadeSnapshot: string;
}

export interface ItemRevisao {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade: string;
  streak: number; // acertos consecutivos ao final do histórico
  tentativas: number;
  ultimaData: Date;
  dueDate: Date; // quando a questão fica "pronta" para revisão
}

// Deriva o estado de revisão de cada questão a partir do histórico completo.
export function calcularRevisoes(answers: AnswerRev[]): ItemRevisao[] {
  // Agrupa por questão preservando ordem cronológica (asc).
  const porQuestao = new Map<number, AnswerRev[]>();
  for (const a of [...answers].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())) {
    const bucket = porQuestao.get(a.questaoId) ?? [];
    bucket.push(a);
    porQuestao.set(a.questaoId, bucket);
  }

  const itens: ItemRevisao[] = [];
  for (const [questaoId, hist] of porQuestao) {
    // Acertos consecutivos contados do fim para o começo (reseta no primeiro erro).
    let streak = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].acertou) streak++;
      else break;
    }
    const ultima = hist[hist.length - 1];
    const intervalo = INTERVALOS_DIAS[Math.min(streak, INTERVALOS_DIAS.length - 1)];
    const dueDate = new Date(ultima.createdAt.getTime() + intervalo * DIA_MS);
    itens.push({
      questaoId,
      modulo: ultima.moduloSnapshot,
      materia: ultima.materiaSnapshot,
      assunto: ultima.assuntoSnapshot,
      dificuldade: ultima.dificuldadeSnapshot,
      streak,
      tentativas: hist.length,
      ultimaData: ultima.createdAt,
      dueDate,
    });
  }
  return itens;
}

// Questões prontas para revisar agora (dueDate <= agora), mais atrasadas primeiro.
export function revisoesPendentes(answers: AnswerRev[], agora: Date = new Date()): ItemRevisao[] {
  return calcularRevisoes(answers)
    .filter((i) => i.dueDate.getTime() <= agora.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}
