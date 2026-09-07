// Envio de respostas com fila offline.
//
// Porte de frontend/src/lib/answers.ts. Três diferenças, todas obrigatórias no mobile:
//
// 1. A fila vive em SQLite, não em localStorage — sobrevive a limpeza de dados e não
//    tem teto de quota (SDD §6.4).
// 2. A remoção é por clientId, e não "esvazia tudo". No web a janela entre enviar e
//    limpar é curta; no celular a requisição pode ficar minutos em voo numa rede ruim,
//    e o usuário segue respondendo. Esvaziar tudo apagaria essas respostas novas.
// 3. O gatilho de sincronização é NetInfo + volta do app ao primeiro plano, no lugar
//    do evento `online` do navegador.
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { api } from "./api";
import { filaContar, filaEnfileirar, filaLer, filaRemover } from "./db";
import type { ResultadoResposta } from "./correcao";

export function pendentes(): number {
  return filaContar();
}

// Envia (ou enfileira) uma resposta e tenta sincronizar a fila.
export async function enviarResposta(r: ResultadoResposta): Promise<void> {
  filaEnfileirar([r]);
  await flushQueue();
}

// Envia um lote (simulado). Se falhar, fica na fila para a próxima sincronização.
export async function enviarLote(rs: ResultadoResposta[]): Promise<void> {
  filaEnfileirar(rs);
  await flushQueue();
}

let sincronizando = false;

// Sincroniza a fila pendente em lote. Silencioso se offline.
export async function flushQueue(): Promise<void> {
  // Sem esta trava, o gatilho de rede e o de primeiro plano podem disparar juntos e
  // mandar o mesmo lote duas vezes. O backend deduplica por clientId, mas é tráfego à toa.
  if (sincronizando) return;

  const fila = filaLer<ResultadoResposta>();
  if (fila.length === 0) return;

  sincronizando = true;
  try {
    await api("/answers/batch", { method: "POST", body: fila });
    filaRemover(fila.map((r) => r.clientId));
  } catch {
    // segue offline; tentaremos de novo no próximo gatilho
  } finally {
    sincronizando = false;
  }
}

/** Liga os gatilhos de sincronização. Chamado uma vez, no bootstrap. */
export function iniciarSincronizacao(): () => void {
  const desinscreverRede = NetInfo.addEventListener((estado) => {
    if (estado.isConnected && estado.isInternetReachable !== false) void flushQueue();
  });

  const inscricaoApp = AppState.addEventListener("change", (estado) => {
    if (estado === "active") void flushQueue();
  });

  return () => {
    desinscreverRede();
    inscricaoApp.remove();
  };
}
