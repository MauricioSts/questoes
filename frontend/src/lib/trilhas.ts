// Trilhas: o acervo que o usuário escolhe seguir. É o primeiro passo de uma conta nova —
// sem trilha, o app não tem questões para servir.
import { api } from "./api";

export interface Trilha {
  id: string;
  nome: string;
  cargo: string;
  iniciais: string;
  banca: string;
  orgao: string;
  ano: number;
  descricao: string;
  dataProva: string | null;
  questoes: number;
  materias: number;
  concursoId: string | null; // preenchido quando o usuário já segue esta trilha
}

export async function listarTrilhas(): Promise<Trilha[]> {
  const { trilhas } = await api<{ trilhas: Trilha[] }>("/trilhas");
  return trilhas;
}

// Idempotente no servidor: clicar duas vezes devolve o mesmo concurso.
export async function entrarNaTrilha(id: string): Promise<{ concursoId: string }> {
  const r = await api<{ concurso: { id: string } }>(`/trilhas/${id}/entrar`, { method: "POST" });
  return { concursoId: r.concurso.id };
}
