// Envio de respostas com fila offline. As respostas são enfileiradas em localStorage e
// sincronizadas (em lote) quando há conexão: permite responder offline (PWA).
import { api } from "./api";
import type { ResultadoResposta } from "./correcao";

const QUEUE_KEY = "q_answer_queue";

// Avisa o app de que as respostas chegaram ao servidor. Quem acompanha a meta do dia
// (store/meta) recarrega a contagem nesse momento — é o que faz a ofensiva do topo e a
// comemoração da meta acontecerem durante o estudo, sem esperar um F5.
export const EVENTO_RESPOSTAS_SINCRONIZADAS = "q:respostas-sincronizadas";

function avisarSincronizacao() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENTO_RESPOSTAS_SINCRONIZADAS));
  }
}

function readQueue(): ResultadoResposta[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: ResultadoResposta[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function pendentes(): number {
  return readQueue().length;
}

// Envia (ou enfileira) uma resposta e tenta sincronizar a fila.
export async function enviarResposta(r: ResultadoResposta): Promise<void> {
  writeQueue([...readQueue(), r]);
  await flushQueue();
}

// Envia um lote (simulado). Se falhar (offline), enfileira para sincronizar depois.
export async function enviarLote(rs: ResultadoResposta[]): Promise<void> {
  try {
    await api("/answers/batch", { method: "POST", body: rs });
    avisarSincronizacao();
  } catch {
    writeQueue([...readQueue(), ...rs]);
  }
}

// Sincroniza a fila pendente em lote. Silencioso se offline.
export async function flushQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  try {
    await api("/answers/batch", { method: "POST", body: queue });
    writeQueue([]);
    avisarSincronizacao();
  } catch {
    // segue offline; tentaremos de novo no próximo online/flush
  }
}

// Dispara sincronização quando a conexão volta.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushQueue());
}
