// Perfil da prova (docs/perfis/*.json) da trilha do concurso ativo. A busca é guardada
// por concurso no módulo: o Simulado, a Home, a Discursiva e a navegação leem o mesmo
// perfil sem repetir a chamada.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useConcurso } from "../store/concurso";
import type { PerfilProva } from "../lib/notaCE";

export interface PerfilDaTrilha {
  id: string;
  dados: PerfilProva;
}

const cache = new Map<string, Promise<PerfilDaTrilha | null>>();

function buscar(concursoId: string): Promise<PerfilDaTrilha | null> {
  const atual = cache.get(concursoId);
  if (atual) return atual;
  const p = api<{ perfil: PerfilDaTrilha | null }>(`/provas/perfil?concursoId=${encodeURIComponent(concursoId)}`)
    .then((r) => r?.perfil ?? null)
    .catch(() => {
      cache.delete(concursoId); // offline: não guarda o erro, a próxima visita tenta de novo
      return null;
    });
  cache.set(concursoId, p);
  return p;
}

// undefined enquanto carrega; null quando a trilha não tem perfil (ou sem conexão).
export function usePerfilProva(): PerfilDaTrilha | null | undefined {
  const { ativo, loading } = useConcurso();
  const concursoId = ativo?.trilhaId ? ativo.id : null;
  const [perfil, setPerfil] = useState<PerfilDaTrilha | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    if (!concursoId) {
      setPerfil(null);
      return;
    }
    setPerfil(undefined);
    let vivo = true;
    buscar(concursoId).then((p) => vivo && setPerfil(p));
    return () => {
      vivo = false;
    };
  }, [concursoId, loading]);

  return perfil;
}
