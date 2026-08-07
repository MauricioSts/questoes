// Chamadas tipadas dos recursos multi-concurso: concursos, caderno, post-its e heatmap.
import { api } from "./api";
import type { Concurso } from "../store/concurso";

export interface NovoConcurso {
  nome: string;
  iniciais: string;
  banca: string;
  ano: number;
  cargo: string;
  dataProva: string; // YYYY-MM-DD
  metaDiaria: number;
}

export function criarConcurso(data: NovoConcurso) {
  return api<{ concurso: Concurso }>("/concursos", { method: "POST", body: data });
}

export function atualizarConcurso(id: string, data: Partial<NovoConcurso> & { arquivado?: boolean }) {
  return api<{ concurso: Concurso }>(`/concursos/${id}`, { method: "PATCH", body: data });
}

export function reaproveitarQuestoes(id: string, fromConcursoId: string, materias?: string[]) {
  return api<{ ok: boolean; copiadas: number }>(`/concursos/${id}/reaproveitar`, {
    method: "POST",
    body: { fromConcursoId, materias },
  });
}

// ---------- Caderno ----------
export interface PaginaCaderno {
  id: string;
  concursoId: string;
  materia: string;
  titulo: string;
  conteudo: string;
  updatedAt: string;
}

export function listarPaginas(concursoId: string) {
  return api<{ paginas: PaginaCaderno[] }>(`/caderno?concursoId=${encodeURIComponent(concursoId)}`);
}
export function criarPagina(concursoId: string, materia: string) {
  return api<{ pagina: PaginaCaderno }>("/caderno", { method: "POST", body: { concursoId, materia } });
}
export function salvarPagina(id: string, data: { titulo?: string; conteudo?: string; materia?: string }) {
  return api<{ pagina: PaginaCaderno }>(`/caderno/${id}`, { method: "PATCH", body: data });
}
export function excluirPagina(id: string) {
  return api(`/caderno/${id}`, { method: "DELETE" });
}

// ---------- Post-its ----------
export type CorPostIt = "amber" | "sage" | "rose" | "slate";
export interface PostIt {
  id: string;
  concursoId: string;
  x: number;
  y: number;
  texto: string;
  cor: CorPostIt;
}

export function listarPostits(concursoId: string) {
  return api<{ postits: PostIt[] }>(`/postits?concursoId=${encodeURIComponent(concursoId)}`);
}
export function criarPostit(concursoId: string, data: { x: number; y: number; cor: CorPostIt }) {
  return api<{ postit: PostIt }>("/postits", { method: "POST", body: { concursoId, ...data } });
}
export function salvarPostit(id: string, data: Partial<Pick<PostIt, "x" | "y" | "texto" | "cor">>) {
  return api<{ postit: PostIt }>(`/postits/${id}`, { method: "PATCH", body: data });
}
export function excluirPostit(id: string) {
  return api(`/postits/${id}`, { method: "DELETE" });
}

// ---------- Heatmap ----------
export interface DiaHeatmap {
  dia: string; // YYYY-MM-DD
  total: number;
}
export interface PeriodoFerias {
  inicio: string; // YYYY-MM-DD
  fim: string | null; // null = em aberto
}
export function carregarHeatmap(concursoId: string, from: string, to: string) {
  const qs = `concursoId=${encodeURIComponent(concursoId)}&from=${from}&to=${to}`;
  return api<{ dias: DiaHeatmap[]; periodos: PeriodoFerias[] }>(`/stats/heatmap?${qs}`);
}

// Matérias por edital já mapeadas — usadas no estado "concurso vazio".
export const MATERIAS_POR_EDITAL: Record<string, string[]> = {
  "Dataprev": [
    "Língua Portuguesa", "Língua Inglesa", "Raciocínio Lógico-Matemático",
    "Atualidades e IA", "Legislação (SI e Proteção de Dados)",
    "Engenharia de Software", "Banco de Dados", "Infraestrutura", "Segurança da Informação",
  ],
  "Banco do Brasil": [
    "Português", "Inglês", "Matemática", "Atualidades do Mercado Financeiro",
    "Conhecimentos Bancários", "Vendas e Negociação", "TI",
  ],
  "INSS": [
    "Português", "Raciocínio Lógico", "Ética", "Direito Constitucional",
    "Direito Administrativo", "Seguridade Social", "Informática",
  ],
};
