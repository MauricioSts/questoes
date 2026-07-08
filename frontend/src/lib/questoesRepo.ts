// Repositório do conteúdo de questões, em memória. É populado em runtime pelo
// QuestoesProvider (que carrega do IndexedDB). É a ÚNICA fonte de enunciado/gabarito no app.
import type { Questao, Modulo, Dificuldade } from "../types/questao";

let _questoes: Questao[] = [];
let _textos: Record<string, string> = {};
let _porId = new Map<number, Questao>();

// Substitui o conjunto de questões em memória (chamado após carregar/importar).
export function setDados(questoes: Questao[], textos: Record<string, string>) {
  _questoes = questoes;
  _textos = textos;
  _porId = new Map(questoes.map((q) => [q.id, q]));
}

export function todas(): Questao[] {
  return _questoes;
}

export function totalQuestoes(): number {
  return _questoes.length;
}

export function getQuestao(id: number): Questao | undefined {
  return _porId.get(id);
}

export function getQuestoes(ids: number[]): Questao[] {
  return ids.map((id) => _porId.get(id)).filter((q): q is Questao => !!q);
}

export function getTextoBase(chave?: string): string | undefined {
  return chave ? _textos[chave] : undefined;
}

// --- listas para filtros da UI ---
export function materias(modulo?: Modulo): string[] {
  const set = new Set<string>();
  for (const q of _questoes) if (!modulo || q.modulo === modulo) set.add(q.materia);
  return [...set].sort();
}

export function assuntos(materia?: string): string[] {
  const set = new Set<string>();
  for (const q of _questoes) if (!materia || q.materia === materia) set.add(q.assunto);
  return [...set].sort();
}

export interface FiltroQuestoes {
  modulo?: Modulo;
  materia?: string;
  assunto?: string;
  dificuldade?: Dificuldade;
}

export function filtrar(f: FiltroQuestoes): Questao[] {
  return _questoes.filter(
    (q) =>
      (!f.modulo || q.modulo === f.modulo) &&
      (!f.materia || q.materia === f.materia) &&
      (!f.assunto || q.assunto === f.assunto) &&
      (!f.dificuldade || q.dificuldade === f.dificuldade)
  );
}
