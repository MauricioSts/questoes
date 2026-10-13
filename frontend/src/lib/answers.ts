// Envio de respostas com fila offline. As respostas são enfileiradas em localStorage e
// sincronizadas (em lote) quando há conexão: permite responder offline (PWA).
import { api, ApiError } from "./api";
import { montarResultado, type ResultadoResposta } from "./correcao";
import { getQuestao } from "./questoesRepo";
import type { Alternativa, Questao } from "../types/questao";

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

// O plano gratuito gastou as questões do dia. Quem mostra a tela (sessão, batalha) ouve
// o evento; quem chamou recebe o erro para desfazer a jogada.
export const EVENTO_LIMITE_DIARIO = "q:limite-diario";
export class LimiteDiarioError extends Error {}

// Responde uma questão e diz se acertou. Com o gabarito no aparelho, corrige aqui e
// enfileira o envio (funciona offline). Sem ele (plano gratuito, questão inédita), pede
// a correção ao servidor e guarda gabarito e explicação na questão, para a tela mostrar.
export async function responderQuestao(
  questao: Questao,
  marcada: Alternativa,
  contexto: ResultadoResposta["contexto"],
  tempoSegundos?: number
): Promise<boolean> {
  const resultado = montarResultado(questao, marcada, contexto, tempoSegundos);
  if (questao.gabarito) {
    void enviarResposta(resultado);
    return resultado.acertou;
  }
  const { acertou: _semGabarito, ...pedido } = resultado;
  try {
    const r = await api<{ acertou: boolean; gabarito: Alternativa; explicacao: string }>("/answers/corrigir", {
      method: "POST",
      body: pedido,
    });
    // A tela pode estar com uma cópia da questão; o repositório fica certo também.
    for (const q of [questao, getQuestao(questao.id)]) {
      if (q) Object.assign(q, { gabarito: r.gabarito, explicacao: r.explicacao });
    }
    avisarSincronizacao();
    return r.acertou;
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      window.dispatchEvent(new CustomEvent(EVENTO_LIMITE_DIARIO));
      throw new LimiteDiarioError("Limite diário do plano gratuito atingido");
    }
    throw e;
  }
}

export const SEM_CONEXAO_PARA_CORRIGIR = "Sem conexão. No plano gratuito a correção é feita online: tente de novo.";

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
