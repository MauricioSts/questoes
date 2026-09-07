// Repositório do conteúdo de questões, em memória. É populado em runtime pelo
// QuestoesProvider (que carrega do IndexedDB). É a ÚNICA fonte de enunciado/gabarito no app.
import type { Questao, Modulo, Dificuldade, Origem, Prova } from "../types/questao";

let _questoes: Questao[] = [];
let _textos: Record<string, string> = {};
let _provas: Record<string, Prova> = {};
let _porId = new Map<number, Questao>();

// Substitui o conjunto de questões em memória (chamado após carregar/importar).
export function setDados(
  questoes: Questao[],
  textos: Record<string, string>,
  provas: Record<string, Prova> = {}
) {
  _questoes = questoes;
  _textos = textos;
  _provas = provas;
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

// --- procedência ---

export function getProva(chave?: string): Prova | undefined {
  return chave ? _provas[chave] : undefined;
}

export function todasProvas(): Record<string, Prova> {
  return _provas;
}

// Origem efetiva: lote antigo não tem o campo e conta como "autoral".
export function origemDe(q: Questao): Origem {
  return q.origem ?? "autoral";
}

// Rótulo curto de procedência: "FGV · TCE-TO · 2022 · Q37" para questão de prova,
// e o nome da origem para as demais. Serve de selo na tela e de linha no export.
export function rotuloOrigem(q: Questao): string {
  const origem = origemDe(q);
  const prova = getProva(q.prova);
  if (prova) {
    const partes = [prova.banca, prova.orgao, String(prova.ano)];
    if (q.numero) partes.push(`Q${q.numero}`);
    const base = partes.join(" · ");
    return origem === "adaptada" ? `Adaptada de ${base}` : base;
  }
  if (origem === "gerada") return "Gerada para reforço";
  if (origem === "adaptada") return "Adaptada";
  if (origem === "oficial") return "De prova (não identificada)";
  return "Autoral";
}

export function bancas(): string[] {
  const set = new Set<string>();
  for (const q of _questoes) {
    const p = getProva(q.prova);
    if (p) set.add(p.banca);
  }
  return [...set].sort();
}

export function anosDeProva(): number[] {
  const set = new Set<number>();
  for (const q of _questoes) {
    const p = getProva(q.prova);
    if (p) set.add(p.ano);
  }
  return [...set].sort((a, b) => b - a);
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
  origem?: Origem;
  banca?: string;
  ano?: number;
}

export function filtrar(f: FiltroQuestoes): Questao[] {
  return _questoes.filter((q) => {
    const prova = getProva(q.prova);
    return (
      (!f.modulo || q.modulo === f.modulo) &&
      (!f.materia || q.materia === f.materia) &&
      (!f.assunto || q.assunto === f.assunto) &&
      (!f.dificuldade || q.dificuldade === f.dificuldade) &&
      (!f.origem || origemDe(q) === f.origem) &&
      (!f.banca || prova?.banca === f.banca) &&
      (!f.ano || prova?.ano === f.ano)
    );
  });
}
