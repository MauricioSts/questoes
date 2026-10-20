// Perfil da prova (docs/perfis/*.json) da trilha do concurso ativo. A busca é guardada
// por concurso (lib/perfilProva): o Simulado, a Home, a Discursiva e a navegação leem o
// mesmo perfil sem repetir a chamada.
import { useEffect, useState } from "react";
import { useConcurso } from "../store/concurso";
import { buscarPerfilProva, type PerfilDaTrilha } from "../lib/perfilProva";

export type { PerfilDaTrilha };

// undefined enquanto carrega; null quando a trilha não tem perfil (ou sem conexão).
export function usePerfilProva(): PerfilDaTrilha | null | undefined {
  const { ativo, loading, concursos } = useConcurso();
  const concursoId = ativo?.trilhaId ? ativo.id : null;
  // Guardado junto com o concurso de origem: ao trocar de concurso, o perfil do anterior
  // não aparece nem por um instante (volta a undefined até chegar o novo).
  const [lido, setLido] = useState<{ concursoId: string; perfil: PerfilDaTrilha | null } | null>(null);

  // concursos: cada recarga limpa o cache (store/concurso), então o perfil vem de novo.
  useEffect(() => {
    if (loading || !concursoId) return;
    let vivo = true;
    buscarPerfilProva(concursoId).then((perfil) => vivo && setLido({ concursoId, perfil }));
    return () => {
      vivo = false;
    };
  }, [concursoId, loading, concursos]);

  if (loading) return undefined;
  if (!concursoId) return null;
  return lido?.concursoId === concursoId ? lido.perfil : undefined;
}
