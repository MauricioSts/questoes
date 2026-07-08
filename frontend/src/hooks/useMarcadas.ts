// Lista e alterna questões marcadas "revisar depois".
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api";

export function useMarcadas() {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);
  // Espelho síncrono de `ids`: o updater do setIds roda tarde demais para decidir
  // PUT vs DELETE antes do fetch, então lemos a associação atual daqui.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const recarregar = useCallback(() => {
    setCarregando(true);
    api<{ ids: number[] }>("/marcadas")
      .then((d) => setIds(new Set(d.ids)))
      .catch(() => setIds(new Set()))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(recarregar, [recarregar]);

  const alternar = useCallback(async (questaoId: number) => {
    const marcar = !idsRef.current.has(questaoId);
    // atualização otimista
    setIds((prev) => {
      const next = new Set(prev);
      if (marcar) next.add(questaoId);
      else next.delete(questaoId);
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
