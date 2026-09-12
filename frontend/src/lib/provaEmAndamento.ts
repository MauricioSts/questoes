// Prova de simulado em andamento, guardada no navegador a cada marcação.
// Sair sem querer, apertar F5, o celular matar a aba: a prova continua lá, com as
// mesmas questões, as marcações feitas e o que restava no cronômetro. Sem isso, o
// simulado só existia na memória da página e sumia junto com ela.
// Fica em localStorage (e não no backend) de propósito: precisa gravar a cada clique,
// funcionar offline e nunca depender de rede no meio da prova.
import { getConcursoId } from "./concurso";
import type { Alternativa } from "../types/questao";

const KEY = "q_prova_andamento";

export interface ProvaEmAndamento {
  concursoId: string | null;
  questaoIds: number[]; // a prova sorteada, na ordem em que foi montada
  marcadas: [number, Alternativa][];
  tempos: [number, number][]; // segundos creditados a cada questão
  iniciadaEm: number;
  restanteSegundos: number | null; // cronômetro; null = prova sem cronômetro
  salvaEm: number;
}

export function carregarProva(): ProvaEmAndamento | null {
  try {
    const bruto = localStorage.getItem(KEY);
    if (!bruto) return null;
    const p = JSON.parse(bruto) as ProvaEmAndamento;
    if (!Array.isArray(p.questaoIds) || p.questaoIds.length === 0) return null;
    // Prova de outro concurso não serve: as questões nem estão carregadas.
    if (p.concursoId !== getConcursoId()) return null;
    return p;
  } catch {
    return null;
  }
}

export function salvarProva(p: Omit<ProvaEmAndamento, "concursoId" | "salvaEm">): void {
  try {
    const completo: ProvaEmAndamento = {
      ...p,
      concursoId: getConcursoId(),
      salvaEm: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(completo));
  } catch {
    // storage cheio ou bloqueado: a prova segue na memória, só não sobrevive ao F5.
  }
}

export function descartarProva(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada a fazer
  }
}
