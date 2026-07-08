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
  opts: { deslocarSeColidir: boolean }
): Promise<ImportarResultado> {
  try {
    const r = await api<Omit<ImportarResultado, "ok">>("/questoes/import", {
      method: "POST",
      body: { questoes, textosBase, deslocarSeColidir: opts.deslocarSeColidir },
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

export async function limparTudo(): Promise<void> {
  await api("/questoes", { method: "DELETE" });
  await idbLimparTudo();
}
