// Conjuntos de IDs respondidos e errados (para filtros de sessão). Cai para vazio se offline.
import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

export interface Progresso {
  respondidas: Set<number>;
  erradas: Set<number>;
  carregando: boolean;
  recarregar: () => void;
}

export function useProgresso(): Progresso {
  const [respondidas, setRespondidas] = useState<Set<number>>(new Set());
  const [erradas, setErradas] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(() => {
    setCarregando(true);
    api<{ respondidas: number[]; erradas: number[] }>("/answers/ids")
      .then((d) => {
        setRespondidas(new Set(d.respondidas));
        setErradas(new Set(d.erradas));
      })
      .catch(() => {
        setRespondidas(new Set());
        setErradas(new Set());
      })
      .finally(() => setCarregando(false));
  }, []);

  useEffect(recarregar, [recarregar]);

  return { respondidas, erradas, carregando, recarregar };
}
