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

// Ranking da trilha: placar compartilhado por quem segue o mesmo acervo.
export interface LinhaRanking {
  userId: string;
  nome: string; // nome público ("Maurício S."), já encurtado no servidor
  iniciais: string;
  acertos: number;
  respondidas: number;
  taxa: number; // 0..1
  ultimaResposta: string | null;
  posicao: number; // posição por acertos, com empate compartilhado
  elegivelTaxa: boolean; // tem volume mínimo para disputar o ranking por taxa
}

export interface RankingTrilha {
  trilha: { id: string; nome: string; cargo: string; iniciais: string; banca: string; orgao: string };
  seguidores: number;
  volumeMinimoTaxa: number;
  voceId: string;
  linhas: LinhaRanking[];
}

export async function carregarRanking(trilhaId: string): Promise<RankingTrilha> {
  return api<RankingTrilha>(`/trilhas/${trilhaId}/ranking`);
}

// Só a minha linha do placar, para o painel — o dashboard não baixa a lista inteira.
export interface MinhaPosicao {
  trilha: { id: string; nome: string; iniciais: string };
  seguidores: number;
  participantes: number;
  eu: { posicao: number; acertos: number; respondidas: number; taxa: number } | null;
  acima: { nome: string; acertos: number } | null;
  lider: { nome: string; acertos: number } | null;
}

export async function carregarMinhaPosicao(trilhaId: string): Promise<MinhaPosicao> {
  return api<MinhaPosicao>(`/trilhas/${trilhaId}/ranking/eu`);
}
