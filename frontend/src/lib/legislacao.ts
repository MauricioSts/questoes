// Legislação: identifica as questões da matéria de legislação e o ciclo "dia sim,
// dia não" em que o usuário deve revisá-las.
import type { Questao } from "../types/questao";
import { todas } from "./questoesRepo";

// A matéria no banco é "Legislação (SI e Proteção de Dados)"; casamos por prefixo
// para tolerar variações de nome.
export function ehQuestaoLegislacao(q: Questao): boolean {
  return q.materia.toLowerCase().includes("legisl");
}

export function questoesLegislacao(): Questao[] {
  return todas().filter(ehQuestaoLegislacao);
}

// Âncora do ciclo de 2 dias: 09/07/2026 é "dia de legislação". A partir daí,
// alterna a cada dia (par de dias desde a âncora → dia de legislação).
const ANCORA = Date.UTC(2026, 6, 9);

// Meia-noite local (em ms UTC) de uma data — para contar dias de calendário.
function diaLocal(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ehDiaDeLegislacao(d = new Date()): boolean {
  const dias = Math.round((diaLocal(d) - ANCORA) / 864e5);
  return ((dias % 2) + 2) % 2 === 0;
}
