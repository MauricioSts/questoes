// Agenda da discursiva semanal: cada tema de um lote abre numa terça, à meia-noite do
// fuso do usuário, um por semana. Antes disso o usuário pode ADIANTAR, mas só o próximo
// da fila: a lista nunca mostra os enunciados das semanas seguintes.
import { env } from "../config/env.js";
import { localWeekdayIndex, startOfLocalDay } from "./date.js";

const TERCA = 1; // localWeekdayIndex: 0=segunda … 6=domingo
const DIA_MS = 864e5;

// Meia-noite local da primeira terça a partir de `de` (a própria, se `de` cair numa terça).
export function tercaAPartirDe(de: Date, timeZone = env.USER_TIMEZONE): Date {
  const dias = (TERCA - localWeekdayIndex(de, timeZone) + 7) % 7;
  // Meio-dia evita cair no dia errado se o fuso tiver horário de verão.
  return startOfLocalDay(new Date(startOfLocalDay(de, timeZone).getTime() + dias * DIA_MS + DIA_MS / 2), timeZone);
}

// `n` terças seguidas, a partir de `primeira` (que já deve ser uma terça).
export function tercasSeguidas(primeira: Date, n: number, timeZone = env.USER_TIMEZONE): Date[] {
  return Array.from({ length: n }, (_, i) =>
    startOfLocalDay(new Date(primeira.getTime() + i * 7 * DIA_MS + DIA_MS / 2), timeZone)
  );
}

// Primeira terça livre para um lote novo: a semana seguinte à última já agendada, ou a
// terça de hoje em diante quando a fila está vazia (ou toda no passado).
export function primeiraTercaLivre(ultimaAgendada: Date | null, agora = new Date(), timeZone = env.USER_TIMEZONE): Date {
  const hoje = tercaAPartirDe(agora, timeZone);
  if (!ultimaAgendada) return hoje;
  const depois = tercaAPartirDe(new Date(ultimaAgendada.getTime() + DIA_MS), timeZone);
  return depois > hoje ? depois : hoje;
}

// O tema está aberto para este usuário? Sem data, ou com a data já passada, ou se ele já
// escreveu uma tentativa (adiantou e entregou).
export function temaAberto(liberaEm: Date | null, tentativas: number, agora = new Date()): boolean {
  return !liberaEm || liberaEm <= agora || tentativas > 0;
}
