// Conjuntos de IDs respondidos e errados (para filtros de sessão), mais a hora da última
// resposta de cada questão. Cai para vazio se offline.
import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

export interface Progresso {
  respondidas: Set<number>;
  erradas: Set<number>;
  ultima: Map<number, number>; // questaoId → ms da última resposta
  carregando: boolean;
  recarregar: () => void;
}

export function useProgresso(): Progresso {
  const [respondidas, setRespondidas] = useState<Set<number>>(new Set());
  const [erradas, setErradas] = useState<Set<number>>(new Set());
  const [ultima, setUltima] = useState<Map<number, number>>(new Map());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(() => {
    setCarregando(true);
    api<{ respondidas: number[]; erradas: number[]; ultima?: Record<string, number> }>("/answers/ids")
      .then((d) => {
        setRespondidas(new Set(d.respondidas));
        setErradas(new Set(d.erradas));
        setUltima(new Map(Object.entries(d.ultima ?? {}).map(([id, t]) => [Number(id), t])));
      })
      .catch(() => {
        setRespondidas(new Set());
        setErradas(new Set());
        setUltima(new Map());
      })
      .finally(() => setCarregando(false));
  }, []);

  useEffect(recarregar, [recarregar]);

  return { respondidas, erradas, ultima, carregando, recarregar };
}
