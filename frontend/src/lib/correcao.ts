// Correção de acerto/erro — feita 100% no frontend (o backend não conhece o gabarito).
import type { Questao, Alternativa } from "../types/questao";

export function corrigir(questao: Questao, marcada: Alternativa): boolean {
  return questao.gabarito === marcada;
}

// Gera um id único para a resposta (idempotência da fila offline).
function gerarId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Monta o payload de resultado a ser enviado ao backend (snapshots inclusos).
export interface ResultadoResposta {
  clientId: string; // id único gerado no cliente p/ deduplicar reenvios da fila offline
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
    clientId: gerarId(),
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
