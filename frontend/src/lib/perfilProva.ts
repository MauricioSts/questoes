// Cache do perfil da prova (GET /provas/perfil) por concurso, fora do hook para o login
// e o estado dos concursos poderem limpá-lo sem import circular.
//
// O servidor devolve `perfil` só quando a prova é certo/errado (um front antigo nunca
// abre o SimuladoCE no TJPB) e `perfilTrilha` sempre, completo. Aqui vale o completo; a
// decisão de abrir o SimuladoCE é do ehPerfilCertoErrado.
import { api } from "./api";
import type { PerfilProva } from "./notaCE";

export interface PerfilDaTrilha {
  id: string;
  dados: PerfilProva;
}

const cache = new Map<string, Promise<PerfilDaTrilha | null>>();

export function buscarPerfilProva(concursoId: string): Promise<PerfilDaTrilha | null> {
  const atual = cache.get(concursoId);
  if (atual) return atual;
  const p = api<{ perfil?: PerfilDaTrilha | null; perfilTrilha?: PerfilDaTrilha | null }>(
    `/provas/perfil?concursoId=${encodeURIComponent(concursoId)}`
  )
    .then((r) => r?.perfilTrilha ?? r?.perfil ?? null)
    .catch(() => {
      cache.delete(concursoId); // offline: não guarda o erro, a próxima visita tenta de novo
      return null;
    });
  cache.set(concursoId, p);
  return p;
}

// Logout (outro usuário pode entrar) e recarga/troca de concursos (trilha trocada, perfil
// novo no servidor): a próxima leitura busca de novo.
export function limparPerfisProva() {
  cache.clear();
}
