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
  naVitrine?: boolean; // false = pública com menos questões que o mínimo (só dono, quem segue e admin veem)
  seguidores: number;
  oficial: boolean; // criada pelo admin; as demais são da comunidade
  autor: string | null; // nome público de quem criou ("Ana S."), null nas oficiais
  visibilidade: Visibilidade;
  tipo: TipoTrilha;
  souDono: boolean;
}

export type Visibilidade = "publica" | "privada";
export type TipoTrilha = "concurso" | "escola" | "vestibular" | "outro";

// Rótulos do formulário e selo do cartão por tipo. Só "nome" é obrigatório; campo com
// rótulo null não aparece naquele tipo (escola não tem banca nem órgão).
export const TIPOS: Record<
  TipoTrilha,
  { nome: string; selo: string; campos: { nome: string; exNome: string; cargo: string | null; exCargo: string; banca: string | null; orgao: string | null; data: string } }
> = {
  concurso: {
    nome: "Concurso",
    selo: "Concurso",
    campos: { nome: "Concurso ou órgão", exNome: "Banco do Brasil", cargo: "Cargo", exCargo: "Escriturário", banca: "Banca", orgao: "Órgão", data: "Data da prova (se já saiu)" },
  },
  escola: {
    nome: "Escola ou faculdade",
    selo: "Escola",
    campos: { nome: "Matéria ou disciplina", exNome: "Biologia", cargo: "Turma ou série", exCargo: "3º ano do ensino médio", banca: null, orgao: "Escola", data: "Data da prova" },
  },
  vestibular: {
    nome: "Vestibular ou ENEM",
    selo: "Vestibular",
    campos: { nome: "Vestibular", exNome: "ENEM", cargo: "Curso desejado", exCargo: "Medicina", banca: "Organizadora", orgao: null, data: "Data da prova" },
  },
  outro: {
    nome: "Outro",
    selo: "Estudo livre",
    campos: { nome: "Nome da trilha", exNome: "Inglês para viagem", cargo: "Subtítulo", exCargo: "Vocabulário básico", banca: null, orgao: null, data: "Data alvo" },
  },
};

// "Banco do Brasil: Escriturário", ou só o nome quando não há cargo.
export const nomeCompleto = (t: { nome: string; cargo: string }) => (t.cargo ? `${t.nome}: ${t.cargo}` : t.nome);

// O que o usuário pode criar: Free cria 1 trilha pública; Premium, quantas quiser.
export interface RegrasCriacao {
  premium: boolean;
  minhas: number;
  podeCriar: boolean;
  podePrivada: boolean;
  limiteFree: number;
}

export async function listarTrilhas(): Promise<{ trilhas: Trilha[]; criacao: RegrasCriacao }> {
  return api<{ trilhas: Trilha[]; criacao: RegrasCriacao }>("/trilhas");
}

// ---- Trilha da comunidade (edição pelo dono) ----

export type Letra = "A" | "B" | "C" | "D" | "E";
export const LETRAS: Letra[] = ["A", "B", "C", "D", "E"];

export interface DadosTrilha {
  tipo: TipoTrilha;
  nome: string;
  cargo: string;
  banca: string;
  orgao: string;
  ano: number;
  descricao: string;
  dataProva: string | null; // YYYY-MM-DD
  visibilidade: Visibilidade;
}

export interface QuestaoEditavel {
  materia: string;
  assunto: string;
  dificuldade: "facil" | "media" | "dificil";
  enunciado: string;
  alternativas: Partial<Record<Letra, string>>;
  gabarito: Letra;
  explicacao: string;
}

// Saldo de páginas de PDF lidas por IA no mês.
export interface SaldoPdf {
  disponivel: boolean;
  premium: boolean;
  limiteMes: number;
  usadasMes: number;
  restantes: number;
  maxPorPdf: number;
}

// Questão como a IA leu do PDF: prévia para revisar (o gabarito pode faltar).
export interface QuestaoLida extends Omit<QuestaoEditavel, "gabarito" | "dificuldade" | "explicacao"> {
  numero: number | null;
  gabarito: Letra | null;
}

export function lerPdf(id: string, arquivo: File, opcoes: { materia: string; gabarito: string }) {
  const q = new URLSearchParams({ materia: opcoes.materia, gabarito: opcoes.gabarito });
  return api<{ questoes: QuestaoLida[]; paginas: number; restantes: number }>(`/trilhas/${id}/pdf?${q}`, {
    method: "POST",
    arquivo,
  });
}

export interface EdicaoTrilha {
  pdf: SaldoPdf;
  trilha: DadosTrilha & { id: string };
  questoes: (QuestaoEditavel & { id: number; loteNome: string | null; createdAt: string })[];
  podePrivada: boolean;
  minQuestoesVitrine: number;
  maxQuestoes: number;
}

export function criarTrilha(dados: DadosTrilha) {
  return api<{ trilha: { id: string }; concurso: { id: string } }>("/trilhas", { method: "POST", body: dados });
}
export function carregarEdicao(id: string) {
  return api<EdicaoTrilha>(`/trilhas/${id}/editar`);
}
export function salvarTrilha(id: string, dados: Partial<DadosTrilha>) {
  return api(`/trilhas/${id}`, { method: "PATCH", body: dados });
}
export function apagarTrilha(id: string) {
  return api(`/trilhas/${id}`, { method: "DELETE" });
}
// `lote` dá nome ao envio (o que aparece na lista de lotes e se exclui de uma vez).
// Sem nome, a questão entra no lote "Adicionadas à mão".
export function adicionarQuestoes(id: string, questoes: QuestaoEditavel[], lote?: string) {
  return api<{ adicionadas: number }>(`/trilhas/${id}/questoes`, { method: "POST", body: { questoes, lote } });
}
export function excluirQuestoes(id: string, ids: number[]) {
  return api<{ excluidas: number }>(`/trilhas/${id}/questoes/excluir`, { method: "POST", body: { ids } });
}
export function editarQuestao(id: string, qid: number, q: QuestaoEditavel) {
  return api(`/trilhas/${id}/questoes/${qid}`, { method: "PUT", body: q });
}
export function excluirQuestao(id: string, qid: number) {
  return api(`/trilhas/${id}/questoes/${qid}`, { method: "DELETE" });
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
  treinador?: string | null; // sprite de treinador da Batalha Pokémon (avatar)
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

// Perfil público de quem está no placar: estudo na trilha + resumo da Batalha Pokémon.
export interface PerfilRanking {
  userId: string;
  nome: string;
  voce: boolean;
  posicao: number | null;
  participantes: number;
  acertos: number;
  respondidas: number;
  taxa: number;
  desde: string | null;
  ultimaResposta: string | null;
  diasEstudados: number;
  batalha: { respondidas: number; acertos: number };
  materias: { materia: string; acertos: number; respondidas: number; taxa: number }[];
  poke: {
    treinador: string;
    regiao: number;
    insignias: number;
    campeao: number;
    capturados: number;
    vistos: number;
    partidas: number;
    vitorias: number;
    time: { id: number; nivel: number }[];
    atualizadoEm: string;
  } | null;
}

export async function carregarPerfilRanking(trilhaId: string, userId: string): Promise<PerfilRanking> {
  return api<PerfilRanking>(`/trilhas/${trilhaId}/ranking/${userId}`);
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
