// Revisão espaçada (SRS): fila do dia e reinício da fila.
import { api } from "./api";
import { getConcursoId } from "./concurso";

export interface ItemRevisao {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade?: string;
  streak?: number; // acertos consecutivos → define o intervalo até a próxima revisão
  tentativas?: number;
  ultimaData?: string;
  dueDate?: string;
}

export interface FilaRevisao {
  total: number;
  ids: number[];
  questoes: ItemRevisao[];
  resetadoEm: string | null; // último reinício da fila (null = nunca reiniciada)
}

export function carregarRevisao(limite = 200) {
  return api<FilaRevisao>(`/answers/revisao?limit=${limite}`);
}

// Zera a fila do SRS sem apagar respostas: o servidor grava a data do reinício e passa a
// agendar só a partir dela. Estatística, ofensiva e "meus erros" não mudam.
export function resetarRevisao() {
  return api<{ ok: boolean; resetadoEm: string }>("/answers/revisao/reset", {
    method: "POST",
    body: { concursoId: getConcursoId() ?? undefined },
  });
}

// Intervalos do agendamento, em dias, por nº de acertos consecutivos (espelha lib/srs.ts
// do backend). Serve para explicar a mecânica na própria tela.
export const INTERVALOS_DIAS = [1, 3, 7, 16, 35, 60];
