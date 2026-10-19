// Exercícios práticos da trilha do concurso ativo. A lista é guardada por trilha no módulo:
// a navegação (só mostra "Exercícios" quando há algum) e a página usam a mesma busca.
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useConcurso } from "../store/concurso";
import type { ExercicioResumo } from "../lib/execucao";

const cache = new Map<string, Promise<ExercicioResumo[]>>();

function buscar(trilhaId: string, forcar = false): Promise<ExercicioResumo[]> {
  const atual = cache.get(trilhaId);
  if (atual && !forcar) return atual;
  const p = api<{ exercicios: ExercicioResumo[] }>(`/exercicios?trilhaId=${encodeURIComponent(trilhaId)}`)
    .then((r) => (Array.isArray(r?.exercicios) ? r.exercicios : []))
    .catch((err) => {
      cache.delete(trilhaId); // erro não fica em cache: a próxima visita tenta de novo
      throw err;
    });
  cache.set(trilhaId, p);
  return p;
}

// Depois de uma execução: o "resolvido" da lista pode ter mudado.
export function invalidarExercicios() {
  cache.clear();
}

export function useExercicios() {
  const { ativo, loading: carregandoConcurso } = useConcurso();
  const trilhaId = ativo?.trilhaId ?? null;
  const [exercicios, setExercicios] = useState<ExercicioResumo[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(
    (forcar = false) => {
      if (!trilhaId) {
        setExercicios([]);
        return () => {};
      }
      let vivo = true;
      setErro(false);
      buscar(trilhaId, forcar)
        .then((l) => vivo && setExercicios(l))
        .catch(() => {
          if (!vivo) return;
          setErro(true);
          setExercicios([]);
        });
      return () => {
        vivo = false;
      };
    },
    [trilhaId]
  );

  useEffect(() => {
    if (carregandoConcurso) return;
    setExercicios(null);
    return carregar();
  }, [carregar, carregandoConcurso]);

  return {
    exercicios,
    carregando: exercicios === null,
    erro,
    recarregar: () => carregar(true),
    temExercicios: !!exercicios && exercicios.length > 0,
  };
}
