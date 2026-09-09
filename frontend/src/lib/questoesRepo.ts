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

// Prova à qual a questão pertence para fins de filtro/estatística: a prova de onde o
// texto saiu e, quando não há, a prova de que o lote foi montado. É o que faz "questões
// da prova AMAZUL/FGV" incluir as autorais escritas junto com aquele lote.
export function provaDe(q: Questao): string | undefined {
  return q.prova ?? q.prova_base;
}

// Rótulo de uma prova pela chave: "FGV · AMAZUL · 2024".
export function rotuloProva(chave: string): string {
  const p = _provas[chave];
  if (!p) return chave;
  return [p.banca, p.orgao, String(p.ano)].join(" · ");
}

export interface ProvaComContagem {
  chave: string;
  rotulo: string;
  banca: string;
  orgao: string;
  ano: number;
  total: number; // questões do banco atual que pertencem a esta prova
}

// Provas presentes no conjunto carregado, com quantas questões cada uma tem.
// Alimenta o seletor de prova das sessões (só mostra prova que tem questão).
export function provasComContagem(): ProvaComContagem[] {
  const contagem = new Map<string, number>();
  for (const q of _questoes) {
    const chave = provaDe(q);
    if (chave) contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([chave, total]) => {
      const p = _provas[chave];
      return {
        chave,
        rotulo: rotuloProva(chave),
        banca: p?.banca ?? "",
        orgao: p?.orgao ?? "",
        ano: p?.ano ?? 0,
        total,
      };
    })
    .sort((a, b) => b.ano - a.ano || b.total - a.total || a.rotulo.localeCompare(b.rotulo));
}

export function bancas(): string[] {
  const set = new Set<string>();
  for (const q of _questoes) {
    const p = getProva(provaDe(q));
    if (p) set.add(p.banca);
  }
  return [...set].sort();
}

export function anosDeProva(): number[] {
  const set = new Set<number>();
  for (const q of _questoes) {
    const p = getProva(provaDe(q));
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
  prova?: string; // chave da prova (origem ou prova-base do lote)
}

export function filtrar(f: FiltroQuestoes): Questao[] {
  return _questoes.filter((q) => {
    // A banca/ano do filtro seguem a mesma prova usada por `prova`: senão uma questão
    // autoral do lote da FGV não apareceria ao filtrar banca = FGV.
    const chaveProva = provaDe(q);
    const prova = getProva(chaveProva);
    return (
      (!f.modulo || q.modulo === f.modulo) &&
      (!f.materia || q.materia === f.materia) &&
      (!f.assunto || q.assunto === f.assunto) &&
      (!f.dificuldade || q.dificuldade === f.dificuldade) &&
      (!f.origem || origemDe(q) === f.origem) &&
      (!f.banca || prova?.banca === f.banca) &&
      (!f.ano || prova?.ano === f.ano) &&
      (!f.prova || chaveProva === f.prova)
    );
  });
}
