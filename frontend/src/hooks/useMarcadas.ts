// Lista e alterna questões marcadas "revisar depois".
import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

export function useMarcadas() {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(() => {
    setCarregando(true);
    api<{ ids: number[] }>("/marcadas")
      .then((d) => setIds(new Set(d.ids)))
      .catch(() => setIds(new Set()))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(recarregar, [recarregar]);

  const alternar = useCallback(async (questaoId: number) => {
    // atualização otimista
    let marcar = false;
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(questaoId)) next.delete(questaoId);
      else {
        next.add(questaoId);
        marcar = true;
      }
      return next;
    });
    try {
      await api(`/marcadas/${questaoId}`, { method: marcar ? "PUT" : "DELETE" });
    } catch {
      recarregar(); // reverte em caso de erro
    }
  }, [recarregar]);

  return { ids, carregando, alternar, recarregar };
}
