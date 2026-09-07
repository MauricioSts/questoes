// GET /answers/erradas: histórico de erro por questão, com dois eixos independentes.
//
// `periodo` recorta quais respostas contam; `estado` decide se questão já recuperada
// continua na lista. "pendentes" é o que a aba Revisar consome; "todas" serve de base
// de estudo em Meus Erros — uma questão que você já acertou depois continua ali,
// marcada por `acertouUltima`.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import * as repo from "@/lib/questoesRepo";
import type { Questao } from "@/types/questao";

export type PeriodoErros = "7d" | "30d" | "all";
export type EstadoErros = "pendentes" | "todas";

export interface QuestaoErrada {
  questaoId: number;
  erros: number;
  acertouUltima: boolean;
  alternativaMarcada: string;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade: string;
  ultimoErro: string | null;
  ultimaData: string;
}

export function useErros(
  concursoId: string | null,
  periodo: PeriodoErros = "30d",
  estado: EstadoErros = "todas"
) {
  const [itens, setItens] = useState<QuestaoErrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await api<{ questoes: QuestaoErrada[] }>(
        `/answers/erradas?period=${periodo}&estado=${estado}`
      );
      setItens(r.questoes);
    } catch {
      setErro("Não foi possível carregar seus erros.");
    } finally {
      setCarregando(false);
    }
  }, [periodo, estado]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, concursoId]);

  /** As questões completas, para montar uma sessão só com o que foi errado. */
  const questoes = (): Questao[] => repo.getQuestoes(itens.map((i) => i.questaoId));

  return { itens, questoes, carregando, erro, recarregar };
}
