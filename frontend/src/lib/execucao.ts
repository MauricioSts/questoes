// Exercícios práticos: tipos da API (/exercicios e /execucoes), o acompanhamento de uma
// execução no sandbox (envia, consulta com backoff até sair da fila) e o rascunho do código
// no localStorage. Tudo puro/injetável para dar para testar sem rede nem React — o hook
// (hooks/useExecucao.ts) só liga isto ao estado da tela.
import { ApiError } from "./api";

export type Linguagem = "python" | "javascript" | "typescript" | "java" | "cpp" | "sql" | "shell";
export type ModoExercicio = "io" | "sql" | "testes" | "shell";
export type StatusExecucao = "fila" | "rodando" | "concluida" | "falhou";
export type MotivoTeste = "passou" | "saida_diferente" | "tempo_esgotado" | "erro_execucao" | "limite_recursos";

export interface ExercicioResumo {
  id: string;
  titulo: string;
  linguagem: Linguagem;
  modo: ModoExercicio;
  dificuldade: string;
  topico: string;
  resolvido: boolean;
}

export interface TesteVisivel {
  nome: string;
  entrada: string;
  saidaEsperada: string;
}

export interface ExercicioDetalhe {
  id: string;
  trilhaId: string;
  titulo: string;
  enunciado: string;
  linguagem: Linguagem;
  modo: ModoExercicio;
  dificuldade: string;
  topico: string;
  codigoInicial: string;
  seedSql: string | null;
  testesVisiveis: TesteVisivel[];
  testesOcultos: number;
  ultimoCodigo: string | null;
}

// Teste oculto: só nome, passou/falhou, motivo e tempo (a API nunca manda entrada nem saída).
export interface TesteResultado {
  nome: string;
  oculto: boolean;
  passou: boolean;
  motivo: MotivoTeste;
  tempoMs: number;
  entrada?: string;
  esperado?: string;
  stdout?: string;
  stderr?: string;
  cortado?: boolean;
}

export interface ResultadoExecucao {
  compilacao: { ok: boolean; stderr: string; tempoMs: number } | null;
  testes: TesteResultado[];
  passou: number;
  total: number;
  tempoMs: number;
  erroInterno?: string;
}

export interface RespostaExecucao {
  id: string;
  status: StatusExecucao;
  exercicioId: string | null;
  linguagem: string;
  posicaoNaFila: number;
  resultado: ResultadoExecucao | null;
}

export type TipoErro = "limite" | "ocupado" | "invalido" | "nao_encontrado" | "sandbox" | "demorou" | "rede";

export type EstadoExecucao =
  | { fase: "ocioso" }
  | { fase: "enviando" }
  | { fase: "aguardando"; id: string; status: "fila" | "rodando"; posicaoNaFila: number }
  | { fase: "concluida"; id: string; resultado: ResultadoExecucao }
  | { fase: "erro"; tipo: TipoErro; mensagem: string };

export const ROTULO_LINGUAGEM: Record<Linguagem, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  sql: "SQL",
  shell: "Shell",
};

export const ROTULO_MOTIVO: Record<MotivoTeste, string> = {
  passou: "Passou",
  saida_diferente: "Saída diferente da esperada",
  tempo_esgotado: "Tempo esgotado",
  erro_execucao: "Erro na execução",
  limite_recursos: "Passou do limite de memória ou processos",
};

// ------------------------------------------------------------------ polling

// Primeira consulta logo (o worker costuma pegar em < 1 s) e depois espaça: 0,5 → 0,75 →
// 1,1 → 1,7 → 2,5 → 3 s (teto). Execução típica termina nas 3–4 primeiras.
export const INTERVALO_INICIAL_MS = 500;
export const INTERVALO_MAXIMO_MS = 3000;
// O sandbox mata o container em 120 s; passou disso com folga, algo travou.
export const LIMITE_ESPERA_MS = 150_000;
// Falhas de rede seguidas toleradas durante a consulta (celular trocando de antena etc.).
export const MAX_FALHAS_SEGUIDAS = 4;

export function intervaloPolling(tentativa: number): number {
  return Math.min(INTERVALO_MAXIMO_MS, Math.round(INTERVALO_INICIAL_MS * 1.5 ** Math.max(0, tentativa)));
}

// Converte a resposta de GET /execucoes/:id no estado da tela.
export function estadoDaResposta(r: RespostaExecucao): EstadoExecucao {
  if (r.status === "fila" || r.status === "rodando") {
    return { fase: "aguardando", id: r.id, status: r.status, posicaoNaFila: Math.max(0, r.posicaoNaFila ?? 0) };
  }
  if (r.status === "concluida" && r.resultado) {
    return { fase: "concluida", id: r.id, resultado: r.resultado };
  }
  return {
    fase: "erro",
    tipo: "sandbox",
    mensagem:
      r.resultado?.erroInterno && r.resultado.erroInterno.length > 0
        ? `O sandbox não conseguiu rodar seu código: ${r.resultado.erroInterno} Tente de novo.`
        : "O sandbox não conseguiu rodar seu código. Tente de novo em instantes.",
  };
}

export function terminal(e: EstadoExecucao): boolean {
  return e.fase === "concluida" || e.fase === "erro";
}

// Mensagens amigáveis para os erros do envio/consulta (a da API vem em pt-BR, mas é
// curta e técnica; aqui explica o que fazer).
export function erroParaEstado(err: unknown): Extract<EstadoExecucao, { fase: "erro" }> {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return {
        fase: "erro",
        tipo: "limite",
        mensagem: "Você executou muitas vezes no último minuto. Respire, revise o código e tente de novo daqui a pouco.",
      };
    }
    if (err.status === 503) {
      return {
        fase: "erro",
        tipo: "ocupado",
        mensagem: "O sandbox está cheio agora. Tente de novo em alguns segundos — seu código continua salvo aqui.",
      };
    }
    if (err.status === 400) {
      const det = (err.body as { detalhes?: { codigo?: string[] } } | undefined)?.detalhes?.codigo?.[0];
      return { fase: "erro", tipo: "invalido", mensagem: det ?? "Não deu para enviar esse código. Confira se ele não está vazio." };
    }
    if (err.status === 404) {
      return { fase: "erro", tipo: "nao_encontrado", mensagem: "Este exercício ou execução não existe mais." };
    }
    if (err.status === 413) {
      return { fase: "erro", tipo: "invalido", mensagem: "O código passou do tamanho máximo (64 KB)." };
    }
    return { fase: "erro", tipo: "sandbox", mensagem: "O servidor não respondeu como esperado. Tente de novo em instantes." };
  }
  return { fase: "erro", tipo: "rede", mensagem: "Sem conexão com o servidor. Confira sua internet e tente de novo." };
}

// Erro que vale a pena tentar de novo na consulta (rede, 5xx). 4xx não muda repetindo.
function transitorio(err: unknown): boolean {
  return !(err instanceof ApiError) || err.status >= 500;
}

export interface DependenciasExecucao {
  enviar: () => Promise<{ id: string; status: StatusExecucao }>;
  buscar: (id: string) => Promise<RespostaExecucao>;
  esperar: (ms: number) => Promise<void>;
  onEstado: (e: EstadoExecucao) => void;
  agora?: () => number;
  sinal?: AbortSignal;
}

// Envia e acompanha até um estado final. Devolve o último estado (também passado ao
// onEstado). Cancelado pelo sinal: para em silêncio, sem chamar onEstado de novo.
export async function executarEAcompanhar(d: DependenciasExecucao): Promise<EstadoExecucao | null> {
  const agora = d.agora ?? Date.now;
  const cancelado = () => d.sinal?.aborted === true;
  const emitir = (e: EstadoExecucao) => {
    if (!cancelado()) d.onEstado(e);
    return e;
  };

  emitir({ fase: "enviando" });
  let id: string;
  try {
    const criada = await d.enviar();
    id = criada.id;
    if (cancelado()) return null;
    emitir({ fase: "aguardando", id, status: criada.status === "rodando" ? "rodando" : "fila", posicaoNaFila: 0 });
  } catch (err) {
    if (cancelado()) return null;
    return emitir(erroParaEstado(err));
  }

  const inicio = agora();
  let falhas = 0;
  for (let tentativa = 0; ; tentativa++) {
    await d.esperar(intervaloPolling(tentativa));
    if (cancelado()) return null;
    if (agora() - inicio > LIMITE_ESPERA_MS) {
      return emitir({
        fase: "erro",
        tipo: "demorou",
        mensagem: "A execução está demorando além do normal. Tente executar de novo.",
      });
    }
    let r: RespostaExecucao;
    try {
      r = await d.buscar(id);
      falhas = 0;
    } catch (err) {
      if (cancelado()) return null;
      if (transitorio(err) && ++falhas < MAX_FALHAS_SEGUIDAS) continue;
      return emitir(erroParaEstado(err));
    }
    if (cancelado()) return null;
    const e = estadoDaResposta(r);
    emitir(e);
    if (terminal(e)) return e;
  }
}

// Texto da espera ("3º na fila", "Rodando os testes…").
export function textoEspera(e: EstadoExecucao): string {
  if (e.fase === "enviando") return "Enviando…";
  if (e.fase !== "aguardando") return "";
  if (e.status === "rodando") return "Rodando os testes…";
  if (e.posicaoNaFila <= 0) return "Na fila — você é o próximo";
  return `Na fila — ${e.posicaoNaFila} ${e.posicaoNaFila === 1 ? "execução" : "execuções"} na sua frente`;
}

export function formatarTempo(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} s`;
}

// ------------------------------------------------------------------ rascunho

const PREFIXO_RASCUNHO = "q_exercicio_codigo:";

export function lerRascunho(exercicioId: string): string | null {
  try {
    return localStorage.getItem(PREFIXO_RASCUNHO + exercicioId);
  } catch {
    return null;
  }
}

export function salvarRascunho(exercicioId: string, codigo: string): void {
  try {
    localStorage.setItem(PREFIXO_RASCUNHO + exercicioId, codigo);
  } catch {
    // Modo privado / cota cheia: segue sem rascunho.
  }
}

export function apagarRascunho(exercicioId: string): void {
  try {
    localStorage.removeItem(PREFIXO_RASCUNHO + exercicioId);
  } catch {
    /* idem */
  }
}

// Código com que o editor abre: rascunho local > última execução no servidor > inicial.
export function codigoDeAbertura(ex: Pick<ExercicioDetalhe, "id" | "codigoInicial" | "ultimoCodigo">): string {
  return lerRascunho(ex.id) ?? ex.ultimoCodigo ?? ex.codigoInicial;
}
