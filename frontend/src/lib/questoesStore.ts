// Fonte da verdade das questões = BACKEND (Postgres). O IndexedDB é só cache offline:
// ao carregar, buscamos da API e atualizamos o cache; se estiver offline, lemos do cache.
import type { Questao } from "../types/questao";
import { api, ApiError } from "./api";
import { idbGetAllQuestoes, idbPutQuestoes, idbSetKV, idbGetKV, idbLimparTudo } from "./idb";

export interface DadosCarregados {
  questoes: Questao[];
  textosBase: Record<string, string>;
}

// Carrega da API; em sucesso atualiza o cache offline; em falha (offline) usa o cache.
export async function carregarTudo(): Promise<DadosCarregados> {
  try {
    const d = await api<DadosCarregados>("/questoes");
    await idbLimparTudo();
    await idbPutQuestoes(d.questoes);
    await idbSetKV("textos_base", d.textosBase);
    return d;
  } catch {
    const [questoes, textosBase] = await Promise.all([
      idbGetAllQuestoes<Questao>(),
      idbGetKV<Record<string, string>>("textos_base"),
    ]);
    return { questoes, textosBase: textosBase ?? {} };
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
export async function importarLote(
  questoes: Questao[],
  textosBase: Record<string, string>,
  opts: { deslocarSeColidir: boolean; nomeLote?: string }
): Promise<ImportarResultado> {
  try {
    const r = await api<Omit<ImportarResultado, "ok">>("/questoes/import", {
      method: "POST",
      body: {
        questoes,
        textosBase,
        deslocarSeColidir: opts.deslocarSeColidir,
        nomeLote: opts.nomeLote,
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
  quantidade: number;
  idMin: number | null;
  idMax: number | null;
  criadoEm: string;
}

export async function listarLotes(): Promise<Lote[]> {
  const r = await api<{ lotes: Lote[] }>("/questoes/lotes");
  return r.lotes;
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
