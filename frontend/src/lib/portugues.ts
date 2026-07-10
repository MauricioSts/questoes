// Português: identifica as questões de Língua Portuguesa e o ciclo "dia sim, dia
// não" em que o usuário deve revisá-las. Espelha o comportamento de legislacao.ts,
// mas com âncora deslocada em 1 dia — assim os dias de português e de legislação
// se alternam.
import type { Questao } from "../types/questao";
import { todas } from "./questoesRepo";

// A matéria no banco é "Língua Portuguesa"; casamos por prefixo "portugu" para
// tolerar variações de nome/acentuação.
export function ehQuestaoPortugues(q: Questao): boolean {
  return q.materia.toLowerCase().includes("portugu");
}

export function questoesPortugues(): Questao[] {
  return todas().filter(ehQuestaoPortugues);
}

// Âncora do ciclo de 2 dias: 10/07/2026 é "dia de português" (começa hoje).
const ANCORA = Date.UTC(2026, 6, 10);

// Meia-noite local (em ms UTC) de uma data — para contar dias de calendário.
function diaLocal(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ehDiaDePortugues(d = new Date()): boolean {
  const dias = Math.round((diaLocal(d) - ANCORA) / 864e5);
  return ((dias % 2) + 2) % 2 === 0;
}
