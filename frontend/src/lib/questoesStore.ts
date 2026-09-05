// Fonte da verdade das questões = BACKEND (Postgres). O IndexedDB é só cache offline:
// ao carregar, buscamos da API e atualizamos o cache; se estiver offline, lemos do cache.
import type { Questao, Prova } from "../types/questao";
import { api, ApiError } from "./api";
import { getConcursoId } from "./concurso";
import { idbGetAllQuestoes, idbPutQuestoes, idbSetKV, idbGetKV, idbLimparTudo } from "./idb";

export interface DadosCarregados {
  questoes: Questao[];
  textosBase: Record<string, string>;
  provas: Record<string, Prova>;
}

// Carrega da API; em sucesso atualiza o cache offline; em falha (offline) usa o cache.
export async function carregarTudo(): Promise<DadosCarregados> {
  try {
    const d = await api<DadosCarregados>("/questoes");
    await idbLimparTudo();
    await idbPutQuestoes(d.questoes);
    await idbSetKV("textos_base", d.textosBase);
    await idbSetKV("provas", d.provas ?? {});
    return { ...d, provas: d.provas ?? {} };
  } catch {
    const [questoes, textosBase, provas] = await Promise.all([
      idbGetAllQuestoes<Questao>(),
      idbGetKV<Record<string, string>>("textos_base"),
      idbGetKV<Record<string, Prova>>("provas"),
    ]);
    return { questoes, textosBase: textosBase ?? {}, provas: provas ?? {} };
  }
}

export interface ImportarResultado {
  ok: boolean;
  adicionadas?: number;
  deslocamento?: number;
  faixaFinal?: [number, number];
  totalAgora?: number;
  colisoes?: number[]; // preenchido quando o backend recusa por conflito de IDs
}

// Envia o lote para o backend. A decisão de colisão (recusar x deslocar) é feita no servidor.
// O concurso ativo vai junto: sem ele a questão nasce sem concurso e GET /questoes (que
// filtra por concursoId) nunca a devolve, ou seja, o lote some do app.
export async function importarLote(
  questoes: Questao[],
  textosBase: Record<string, string>,
  opts: { deslocarSeColidir: boolean; nomeLote?: string; provas?: Record<string, Prova> }
): Promise<ImportarResultado> {
  try {
    const r = await api<Omit<ImportarResultado, "ok">>("/questoes/import", {
      method: "POST",
      body: {
        questoes,
        textosBase,
        provas: opts.provas ?? {},
        deslocarSeColidir: opts.deslocarSeColidir,
        nomeLote: opts.nomeLote,
        concursoId: getConcursoId() ?? undefined,
      },
    });
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const body = e.body as { colisoes?: number[] } | undefined;
      return { ok: false, colisoes: body?.colisoes ?? [] };
    }
    throw e;
  }
}

export interface ExcluirLoteResultado {
  ok: boolean;
  excluidas: number;
  naoEncontradas: number[];
  totalAgora: number;
}

// Exclui só as questões com os IDs informados (mantém o resto e o histórico de respostas).
export async function excluirLote(ids: number[]): Promise<ExcluirLoteResultado> {
  return api<ExcluirLoteResultado>("/questoes/excluir-lote", {
    method: "POST",
    body: { ids },
  });
}

export async function limparTudo(): Promise<void> {
  await api("/questoes", { method: "DELETE" });
  await idbLimparTudo();
}

// Um lote = todas as questões importadas juntas (mesmo createdAt). `chave` é o createdAt ISO.
export interface Lote {
  chave: string;
  nome: string | null;
  concursoId: string | null; // null = lote órfão (não aparece em nenhum concurso)
  quantidade: number;
  idMin: number | null;
  idMax: number | null;
  criadoEm: string;
}

export interface ListaLotes {
  lotes: Lote[];
  semConcurso: number; // total de questões órfãs (todas as importações)
}

export async function listarLotes(): Promise<ListaLotes> {
  const r = await api<ListaLotes>("/questoes/lotes");
  return { lotes: r.lotes, semConcurso: r.semConcurso ?? 0 };
}

// Vincula ao concurso ativo as questões que ficaram sem concurso (conserto dos lotes
// importados antes de o import passar a enviar o concurso).
export async function adotarOrfas(
  concursoId: string,
  chave?: string
): Promise<{ ok: boolean; adotadas: number; totalAgora: number }> {
  return api("/questoes/adotar-orfas", { method: "POST", body: { concursoId, chave } });
}

// Exclui um lote inteiro pela chave (createdAt ISO). Preserva o histórico de respostas.
export async function excluirLoteGrupo(
  chave: string
): Promise<{ ok: boolean; excluidas: number; totalAgora: number }> {
  return api("/questoes/excluir-lote-grupo", { method: "POST", body: { chave } });
}

// Interpreta uma lista de IDs digitada: aceita separação por vírgula/espaço/linha e
// intervalos "a-b" (ex.: "1, 3, 5-8, 12" → [1,3,5,6,7,8,12]). Ignora lixo e ordena único.
export function parseIdsInput(texto: string): number[] {
  const ids = new Set<number>();
  for (const parte of texto.split(/[\s,;]+/)) {
    if (!parte) continue;
    const intervalo = parte.match(/^(\d+)-(\d+)$/);
    if (intervalo) {
      let a = Number(intervalo[1]);
      let b = Number(intervalo[2]);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) ids.add(i);
    } else if (/^\d+$/.test(parte)) {
      ids.add(Number(parte));
    }
  }
  return [...ids].sort((x, y) => x - y);
}
