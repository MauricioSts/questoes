// Desempenho por procedência: "como estou na prova AMAZUL/FGV", "como vou nas autorais".
// Os números vêm prontos do servidor (GET /stats/procedencia), que é o único lugar onde o
// banco de questões, as respostas e as marcações estão juntos.
import { api } from "./api";

export interface GrupoProcedencia {
  chave: string;
  tipo: "prova" | "origem";
  rotulo: string; // "FGV · AMAZUL · 2024" | "Autoral"
  banca?: string;
  orgao?: string;
  ano?: number;
  cargo?: string;
  url?: string;
  total: number; // questões desta prova/origem no banco do concurso
  respondidas: number; // questões distintas já respondidas
  faltam: number; // total - respondidas
  certas: number; // questões cujo último resultado foi acerto
  erradas: number; // questões cujo último resultado foi erro
  marcadas: number;
  tentativas: number; // respostas registradas (conta repetição)
  tentativasCertas: number;
  taxa: number | null; // tentativasCertas / tentativas
}

export interface ResumoProcedencia {
  provas: GrupoProcedencia[];
  origens: GrupoProcedencia[];
  geral: GrupoProcedencia;
}

export function carregarProcedencia() {
  return api<ResumoProcedencia>("/stats/procedencia");
}
