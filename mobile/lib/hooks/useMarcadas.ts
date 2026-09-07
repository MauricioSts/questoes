// Questões marcadas para depois. PUT/DELETE são idempotentes no backend, então o
// otimismo aqui é seguro: erro de rede só desfaz o estado local.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import * as repo from "@/lib/questoesRepo";
import type { Questao } from "@/types/questao";

export function useMarcadas(concursoId: string | null) {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api<{ ids: number[] }>("/marcadas");
      setIds(new Set(r.ids));
    } catch {
      // sem rede a lista fica como está; marcar/desmarcar segue funcionando local
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar, concursoId]);

  const alternar = useCallback(
    async (questaoId: number) => {
      const marcada = ids.has(questaoId);

      // Otimista: a lista muda na hora, o servidor confirma depois.
      setIds((s) => {
        const n = new Set(s);
        if (marcada) n.delete(questaoId);
        else n.add(questaoId);
        return n;
      });

      try {
        await api(`/marcadas/${questaoId}`, { method: marcada ? "DELETE" : "PUT" });
      } catch {
        // desfaz: sem isto a interface mentiria sobre o que está salvo
        setIds((s) => {
          const n = new Set(s);
          if (marcada) n.add(questaoId);
          else n.delete(questaoId);
          return n;
        });
      }
    },
    [ids]
  );

  const questoes = (): Questao[] => repo.getQuestoes([...ids]);

  return { ids, questoes, alternar, carregando, recarregar };
}
