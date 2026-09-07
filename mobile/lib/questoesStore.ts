// Fonte da verdade das questões = BACKEND. O SQLite é só cache offline: ao carregar,
// busca da API e atualiza o cache; se estiver offline, lê do cache.
//
// Porte de frontend/src/lib/questoesStore.ts, reduzido ao que o app de estudo usa.
// As funções de curadoria (importar lote, excluir, adotar órfãs) ficam de fora: são
// exclusivas da conta de curadoria e o mobile não precisa delas por enquanto (SDD §7.2).
import type { Prova, Questao } from "@/types/questao";
import { api } from "./api";
import { getConcursoId } from "./concurso";
import { gravarAcervo, lerKV, lerQuestoesCache } from "./db";

export interface DadosCarregados {
  questoes: Questao[];
  textosBase: Record<string, string>;
  provas: Record<string, Prova>;
}

/** Lê o acervo do cache local, sem rede. Síncrono: serve para o primeiro render. */
export function lerCache(): DadosCarregados {
  const concursoId = getConcursoId();
  return {
    questoes: lerQuestoesCache<Questao>(concursoId),
    textosBase: lerKV<Record<string, string>>(concursoId, "textos_base") ?? {},
    provas: lerKV<Record<string, Prova>>(concursoId, "provas") ?? {},
  };
}

/**
 * Carrega da API e atualiza o cache; em falha (offline) devolve o cache.
 *
 * `veioDoCache` diz à interface se o que está na tela pode estar velho — no web isso
 * não existia porque o PWA sempre abria online.
 */
export async function carregarTudo(): Promise<DadosCarregados & { veioDoCache: boolean }> {
  const concursoId = getConcursoId();
  try {
    const d = await api<DadosCarregados>("/questoes");
    const provas = d.provas ?? {};
    gravarAcervo(concursoId, d.questoes, { textos_base: d.textosBase, provas });
    return { ...d, provas, veioDoCache: false };
  } catch {
    return { ...lerCache(), veioDoCache: true };
  }
}
