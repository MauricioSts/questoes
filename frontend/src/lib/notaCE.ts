// Simulado certo/errado (Cebraspe) montado e corrigido pelo perfil da prova da trilha
// (docs/perfis/*.json, servido por GET /provas/perfil): grupos P1..Pn, itens de cada
// grupo, peso, pontos por acerto/erro/branco, mínimos por grupo e no total.
//
// O acervo quase nunca tem os 170 itens da prova. Aí a prova sai menor e os mínimos
// e o tempo encolhem na mesma proporção: passar no simulado de 58 itens quer dizer
// manter o aproveitamento que a prova inteira exige.
import type { Questao } from "../types/questao";

export interface PerfilProva {
  perfil: string;
  cargo?: string;
  duracao_minutos: number | null;
  pontuacao: { acerto: number; erro: number; branco: number };
  nota_minima_geral: number | null;
  grupos: {
    grupo: string;
    nome: string;
    itens?: number;
    nota_minima: number | null;
    peso: number;
    disciplinas: { nome: string; itens: number | null }[];
  }[];
}

// Itens do grupo na prova real: o total do grupo, ou a soma das disciplinas.
export function itensDoGrupo(g: PerfilProva["grupos"][number]): number {
  return g.itens ?? g.disciplinas.reduce((s, d) => s + (d.itens ?? 0), 0);
}

export const itensDaProva = (p: PerfilProva) => p.grupos.reduce((s, g) => s + itensDoGrupo(g), 0);

type Rng = () => number;

function embaralhar<T>(a: T[], rng: Rng): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export interface ComposicaoGrupo {
  grupo: string;
  nome: string;
  alvo: number; // itens na prova real
  obtido: number; // itens que o acervo deu
}

// Monta a prova: por grupo, comandos inteiros sorteados até o tamanho do grupo (os itens
// de um comando nunca se separam, como no caderno); dentro do grupo, na ordem das
// disciplinas do perfil e dos itens no comando.
export function montarSimuladoCE(
  todas: Questao[],
  perfil: PerfilProva,
  rng: Rng = Math.random
): { questoes: Questao[]; composicao: ComposicaoGrupo[] } {
  const questoes: Questao[] = [];
  const composicao: ComposicaoGrupo[] = [];
  for (const g of perfil.grupos) {
    const alvo = itensDoGrupo(g);
    const porComando = new Map<string, Questao[]>();
    for (const q of todas) {
      if (q.formato !== "CERTO_ERRADO" || q.comando?.grupo !== g.grupo) continue;
      const lista = porComando.get(q.comando.id) ?? [];
      lista.push(q);
      porComando.set(q.comando.id, lista);
    }
    const escolhidos: Questao[][] = [];
    let n = 0;
    for (const itens of embaralhar([...porComando.values()], rng)) {
      if (n + itens.length > alvo) continue;
      escolhidos.push([...itens].sort((a, b) => a.id - b.id));
      n += itens.length;
      if (n === alvo) break;
    }
    const ordemDisciplina = new Map(g.disciplinas.map((d, i) => [d.nome, i]));
    escolhidos.sort(
      (a, b) =>
        (ordemDisciplina.get(a[0].materia) ?? 99) - (ordemDisciplina.get(b[0].materia) ?? 99) || a[0].id - b[0].id
    );
    questoes.push(...escolhidos.flat());
    composicao.push({ grupo: g.grupo, nome: g.nome, alvo, obtido: n });
  }
  return { questoes, composicao };
}

// Tempo da prova na proporção dos itens, arredondado para cima em 5 minutos.
export function duracaoProporcional(perfil: PerfilProva, itens: number): number | null {
  if (!perfil.duracao_minutos) return null;
  const total = itensDaProva(perfil);
  if (!total || itens >= total) return perfil.duracao_minutos;
  return Math.max(5, Math.ceil((perfil.duracao_minutos * itens) / total / 5) * 5);
}

export interface RespostaCE {
  grupo: string;
  marcada?: "C" | "E";
  acertou: boolean;
}

export interface NotaGrupo {
  grupo: string;
  nome: string;
  acertos: number;
  erros: number;
  brancos: number;
  pontos: number;
  maximo: number;
  minimo: number; // mínimo do edital, na proporção dos itens deste simulado
  aprovado: boolean;
}

export interface NotaCE {
  grupos: NotaGrupo[];
  pontos: number;
  maximo: number;
  minimo: number;
  aprovado: boolean;
  motivos: string[]; // por que foi eliminado (vazio quando aprovado)
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function notaCE(perfil: PerfilProva, respostas: RespostaCE[]): NotaCE {
  const { acerto, erro, branco } = perfil.pontuacao;
  const grupos: NotaGrupo[] = [];
  let maximoOficial = 0;
  for (const g of perfil.grupos) {
    maximoOficial += itensDoGrupo(g) * acerto * g.peso;
    const doGrupo = respostas.filter((r) => r.grupo === g.grupo);
    if (doGrupo.length === 0) continue;
    const acertos = doGrupo.filter((r) => r.marcada && r.acertou).length;
    const brancos = doGrupo.filter((r) => !r.marcada).length;
    const erros = doGrupo.length - acertos - brancos;
    const pontos = g.peso * (acertos * acerto + erros * erro + brancos * branco);
    const maximo = g.peso * acerto * doGrupo.length;
    const alvo = itensDoGrupo(g);
    const minimo = g.nota_minima == null ? -Infinity : (g.nota_minima * doGrupo.length) / Math.max(1, alvo);
    grupos.push({ grupo: g.grupo, nome: g.nome, acertos, erros, brancos, pontos, maximo, minimo, aprovado: pontos >= minimo });
  }
  const pontos = grupos.reduce((s, g) => s + g.pontos, 0);
  const maximo = grupos.reduce((s, g) => s + g.maximo, 0);
  const minimo =
    perfil.nota_minima_geral == null ? -Infinity : (perfil.nota_minima_geral * maximo) / Math.max(1, maximoOficial);
  const motivos = grupos
    .filter((g) => !g.aprovado)
    .map((g) => `${g.grupo}: ${fmt(g.pontos)} pontos, abaixo do mínimo de ${fmt(g.minimo)}`);
  if (pontos < minimo) motivos.push(`Total: ${fmt(pontos)} pontos, abaixo do mínimo de ${fmt(minimo)}`);
  return { grupos, pontos, maximo, minimo, aprovado: motivos.length === 0, motivos };
}

export { fmt as formatarPontos };
