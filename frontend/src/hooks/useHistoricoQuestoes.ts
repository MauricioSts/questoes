// Histórico por questão: quantas vezes foi refeita e quantas vezes eu errei.
// Uma chamada só, no início da sessão, alimenta o selo de todas as questões dela.
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export interface HistoricoQuestao {
  questaoId: number;
  tentativas: number;
  acertos: number;
  erros: number;
  acertouUltima: boolean;
  ultima: string;
}

export type MapaHistorico = Map<number, HistoricoQuestao>;

export function useHistoricoQuestoes(): { mapa: MapaHistorico; recarregar: () => void } {
  const [mapa, setMapa] = useState<MapaHistorico>(new Map());

  const recarregar = useCallback(() => {
    api<{ questoes: HistoricoQuestao[] }>("/answers/por-questao")
      .then((d) => setMapa(new Map(d.questoes.map((h) => [h.questaoId, h]))))
      .catch(() => setMapa(new Map())); // offline: o selo simplesmente não aparece
  }, []);

  useEffect(recarregar, [recarregar]);

  return { mapa, recarregar };
}
