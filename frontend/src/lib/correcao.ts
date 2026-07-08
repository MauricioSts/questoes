// Correção de acerto/erro — feita 100% no frontend (o backend não conhece o gabarito).
import type { Questao, Alternativa } from "../types/questao";

export function corrigir(questao: Questao, marcada: Alternativa): boolean {
  return questao.gabarito === marcada;
}

// Monta o payload de resultado a ser enviado ao backend (snapshots inclusos).
export interface ResultadoResposta {
  questaoId: number;
  moduloSnapshot: string;
  materiaSnapshot: string;
  assuntoSnapshot: string;
  dificuldadeSnapshot: string;
  alternativaMarcada: Alternativa;
  acertou: boolean;
  tempoSegundos?: number;
  contexto: "ESTUDO" | "FLASH" | "SIMULADO" | "TOPICO";
}

export function montarResultado(
  questao: Questao,
  marcada: Alternativa,
  contexto: ResultadoResposta["contexto"],
  tempoSegundos?: number
): ResultadoResposta {
  return {
    questaoId: questao.id,
    moduloSnapshot: questao.modulo,
    materiaSnapshot: questao.materia,
    assuntoSnapshot: questao.assunto,
    dificuldadeSnapshot: questao.dificuldade,
    alternativaMarcada: marcada,
    acertou: corrigir(questao, marcada),
    tempoSegundos,
    contexto,
  };
}
