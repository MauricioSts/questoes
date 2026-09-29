// Repetição espaçada (SRS) para o modo Revisar.
// A partir do histórico de respostas de cada questão, calcula quando ela deve
// voltar para revisão: quanto mais acertos consecutivos, maior o intervalo.
// Erro reseta o intervalo (a questão volta a ser cobrada em breve).
//
// Acerto só conta se veio DEPOIS de um intervalo mínimo desde a resposta anterior. Os dados
// do dono mostraram por quê: refazendo um erro no mesmo dia ele acertava 85%; refazendo
// 14+ dias depois, 19%. Acerto logo em seguida é memória da letra, não do conteúdo — então
// é neutro: não avança o intervalo nem reseta. Erro sempre conta.

// Intervalos (em dias) por nº de acertos consecutivos ao final do histórico.
// streak 0 (último foi erro) → revê em 1 dia; 1 acerto → 3 dias; e assim por diante.
export const INTERVALOS_DIAS = [1, 3, 7, 16, 35, 60];

const DIA_MS = 864e5;

// Intervalo mínimo para um acerto contar. 20h (e não 24h) para que estudar todo dia em
// horários diferentes não faça o acerto de ontem à noite "não contar" hoje de manhã.
export const INTERVALO_MIN_ACERTO_MS = 20 * 3600e3;

// Questão dominada = acertada depois de ficar pelo menos 7 dias sem ver, sem erro depois.
export const DIAS_DOMINIO = 7;

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
  streak: number; // acertos consecutivos ao final do histórico (só os que contam)
  dominada: boolean; // acertou após ≥ DIAS_DOMINIO dias sem ver, e não errou depois
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
    // Percorre em ordem: erro zera; acerto conta só se veio depois do intervalo mínimo
    // desde a última resposta que CONTOU (acerto rápido não move a base do agendamento).
    let streak = 0;
    let dominada = false;
    let base: Date | null = null;
    for (const a of hist) {
      const desde = base ? a.createdAt.getTime() - base.getTime() : Infinity;
      if (!a.acertou) {
        streak = 0;
        dominada = false;
        base = a.createdAt;
      } else if (desde >= INTERVALO_MIN_ACERTO_MS) {
        streak++;
        if (base && desde >= DIAS_DOMINIO * DIA_MS) dominada = true;
        base = a.createdAt;
      }
    }
    const ultima = hist[hist.length - 1];
    const intervalo = INTERVALOS_DIAS[Math.min(streak, INTERVALOS_DIAS.length - 1)];
    const dueDate = new Date(base!.getTime() + intervalo * DIA_MS);
    itens.push({
      questaoId,
      modulo: ultima.moduloSnapshot,
      materia: ultima.materiaSnapshot,
      assunto: ultima.assuntoSnapshot,
      dificuldade: ultima.dificuldadeSnapshot,
      streak,
      dominada,
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
