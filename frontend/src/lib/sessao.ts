// Sessão de estudo em andamento (persistida no backend). Permite sair no meio e retomar.
// O backend guarda só a ordem dos IDs + cursor; o conteúdo continua no frontend.
import { api } from "./api";
import type { Contexto } from "../types/questao";

export interface SessaoAtiva {
  contexto: Contexto;
  questaoIds: number[];
  cursor: number;
}

// Retorna a sessão ativa do usuário (ou null se não houver).
export async function getSessaoAtiva(): Promise<SessaoAtiva | null> {
  try {
    const { sessao } = await api<{ sessao: SessaoAtiva | null }>("/sessao");
    return sessao;
  } catch {
    return null;
  }
}

// Cria/substitui a sessão ativa ao iniciar uma nova sessão de estudo.
export async function salvarSessao(contexto: Contexto, questaoIds: number[], cursor = 0): Promise<void> {
  try {
    await api("/sessao", { method: "PUT", body: { contexto, questaoIds, cursor } });
  } catch {
    // sem conexão: a sessão continua funcionando localmente, só não persiste o retomar.
  }
}

// Atualiza só o cursor conforme o usuário avança/volta.
export async function atualizarCursor(cursor: number): Promise<void> {
  try {
    await api("/sessao/cursor", { method: "PATCH", body: { cursor } });
  } catch {
    // silencioso
  }
}

// Encerra a sessão ativa (ao finalizar).
export async function encerrarSessao(): Promise<void> {
  try {
    await api("/sessao", { method: "DELETE" });
  } catch {
    // silencioso
  }
}
