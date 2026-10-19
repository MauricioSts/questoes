// Acompanhamento de execução no sandbox: backoff, fila → rodando → resultado, erros
// (429/503/rede), tempo-limite e cancelamento. Sem rede: enviar/buscar/esperar são falsos.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import {
  codigoDeAbertura,
  erroParaEstado,
  estadoDaResposta,
  executarEAcompanhar,
  intervaloPolling,
  INTERVALO_MAXIMO_MS,
  lerRascunho,
  LIMITE_ESPERA_MS,
  salvarRascunho,
  textoEspera,
  type EstadoExecucao,
  type RespostaExecucao,
  type ResultadoExecucao,
} from "../lib/execucao";

const resultado: ResultadoExecucao = {
  compilacao: null,
  testes: [
    { nome: "exemplo", oculto: false, passou: true, motivo: "passou", tempoMs: 12, entrada: "1", esperado: "2", stdout: "2", stderr: "" },
    { nome: "oculto 1", oculto: true, passou: false, motivo: "saida_diferente", tempoMs: 9 },
  ],
  passou: 1,
  total: 2,
  tempoMs: 840,
};

function resp(parcial: Partial<RespostaExecucao>): RespostaExecucao {
  return { id: "e1", status: "fila", exercicioId: "ex", linguagem: "python", posicaoNaFila: 0, resultado: null, ...parcial };
}

function cenario(respostas: (RespostaExecucao | Error)[], opts: { enviar?: () => Promise<{ id: string; status: "fila" }> } = {}) {
  const estados: EstadoExecucao[] = [];
  const esperas: number[] = [];
  let i = 0;
  const buscar = vi.fn(async () => {
    const r = respostas[Math.min(i++, respostas.length - 1)];
    if (r instanceof Error) throw r;
    return r;
  });
  const deps = {
    enviar: opts.enviar ?? (async () => ({ id: "e1", status: "fila" as const })),
    buscar,
    esperar: async (ms: number) => {
      esperas.push(ms);
    },
    onEstado: (e: EstadoExecucao) => estados.push(e),
  };
  return { deps, estados, esperas, buscar };
}

describe("intervaloPolling", () => {
  it("cresce e para no teto", () => {
    const v = Array.from({ length: 10 }, (_, i) => intervaloPolling(i));
    expect(v[0]).toBe(500);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThanOrEqual(v[i - 1]);
    expect(v[1]).toBeGreaterThan(v[0]);
    expect(Math.max(...v)).toBe(INTERVALO_MAXIMO_MS);
  });
});

describe("estadoDaResposta", () => {
  it("fila e rodando viram espera com a posição", () => {
    expect(estadoDaResposta(resp({ status: "fila", posicaoNaFila: 3 }))).toEqual({ fase: "aguardando", id: "e1", status: "fila", posicaoNaFila: 3 });
    expect(estadoDaResposta(resp({ status: "rodando" }))).toMatchObject({ fase: "aguardando", status: "rodando" });
  });

  it("concluída traz o resultado; falhou vira erro do sandbox", () => {
    expect(estadoDaResposta(resp({ status: "concluida", resultado }))).toEqual({ fase: "concluida", id: "e1", resultado });
    const e = estadoDaResposta(resp({ status: "falhou", resultado: { ...resultado, erroInterno: "Sandbox reiniciado." } }));
    expect(e).toMatchObject({ fase: "erro", tipo: "sandbox" });
  });

  it("texto da espera mostra quantos estão na frente", () => {
    expect(textoEspera({ fase: "aguardando", id: "x", status: "fila", posicaoNaFila: 2 })).toMatch(/2 execuções na sua frente/);
    expect(textoEspera({ fase: "aguardando", id: "x", status: "fila", posicaoNaFila: 0 })).toMatch(/próximo/);
    expect(textoEspera({ fase: "aguardando", id: "x", status: "rodando", posicaoNaFila: 0 })).toMatch(/Rodando/);
  });
});

describe("erroParaEstado", () => {
  it("429, 503, 400 e rede têm mensagens próprias em pt-BR", () => {
    expect(erroParaEstado(new ApiError(429, "x"))).toMatchObject({ tipo: "limite", mensagem: expect.stringMatching(/minuto/) });
    expect(erroParaEstado(new ApiError(503, "x"))).toMatchObject({ tipo: "ocupado", mensagem: expect.stringMatching(/sandbox/i) });
    expect(
      erroParaEstado(new ApiError(400, "Dados inválidos", { detalhes: { codigo: ["Código passa de 64 KB."] } }))
    ).toMatchObject({ tipo: "invalido", mensagem: "Código passa de 64 KB." });
    expect(erroParaEstado(new TypeError("Failed to fetch"))).toMatchObject({ tipo: "rede" });
  });
});

describe("executarEAcompanhar", () => {
  it("fila → rodando → concluída, com backoff entre as consultas", async () => {
    const c = cenario([
      resp({ status: "fila", posicaoNaFila: 2 }),
      resp({ status: "fila", posicaoNaFila: 0 }),
      resp({ status: "rodando" }),
      resp({ status: "concluida", resultado }),
    ]);
    const fim = await executarEAcompanhar(c.deps);
    expect(fim).toMatchObject({ fase: "concluida" });
    expect(c.estados.map((e) => (e.fase === "aguardando" ? `${e.status}:${e.posicaoNaFila}` : e.fase))).toEqual([
      "enviando",
      "fila:0",
      "fila:2",
      "fila:0",
      "rodando:0",
      "concluida",
    ]);
    expect(c.esperas).toEqual([0, 1, 2, 3].map(intervaloPolling));
    expect(c.buscar).toHaveBeenCalledTimes(4);
  });

  it("429 no envio não consulta nada", async () => {
    const c = cenario([], { enviar: async () => Promise.reject(new ApiError(429, "Limite")) });
    const fim = await executarEAcompanhar(c.deps);
    expect(fim).toMatchObject({ fase: "erro", tipo: "limite" });
    expect(c.buscar).not.toHaveBeenCalled();
  });

  it("503 no envio vira 'sandbox ocupado'", async () => {
    const c = cenario([], { enviar: async () => Promise.reject(new ApiError(503, "Ocupado")) });
    expect(await executarEAcompanhar(c.deps)).toMatchObject({ fase: "erro", tipo: "ocupado" });
  });

  it("aguenta falha de rede passageira na consulta", async () => {
    const c = cenario([new TypeError("rede"), new ApiError(502, "bad gateway"), resp({ status: "concluida", resultado })]);
    expect(await executarEAcompanhar(c.deps)).toMatchObject({ fase: "concluida" });
  });

  it("desiste depois de várias falhas seguidas", async () => {
    const c = cenario([new TypeError("rede")]);
    expect(await executarEAcompanhar(c.deps)).toMatchObject({ fase: "erro", tipo: "rede" });
    expect(c.buscar).toHaveBeenCalledTimes(4);
  });

  it("404 na consulta para na hora", async () => {
    const c = cenario([new ApiError(404, "Execução não encontrada.")]);
    expect(await executarEAcompanhar(c.deps)).toMatchObject({ fase: "erro", tipo: "nao_encontrado" });
    expect(c.buscar).toHaveBeenCalledTimes(1);
  });

  it("execução presa na fila estoura o tempo-limite", async () => {
    let t = 0;
    const c = cenario([resp({ status: "fila", posicaoNaFila: 5 })]);
    const fim = await executarEAcompanhar({
      ...c.deps,
      agora: () => t,
      esperar: async (ms) => {
        t += ms;
      },
    });
    expect(fim).toMatchObject({ fase: "erro", tipo: "demorou" });
    expect(t).toBeGreaterThan(LIMITE_ESPERA_MS);
  });

  it("cancelada pelo sinal para em silêncio", async () => {
    const ctl = new AbortController();
    const c = cenario([resp({ status: "fila", posicaoNaFila: 1 }), resp({ status: "concluida", resultado })]);
    const fim = await executarEAcompanhar({
      ...c.deps,
      sinal: ctl.signal,
      onEstado: (e) => {
        c.estados.push(e);
        if (e.fase === "aguardando" && e.posicaoNaFila === 1) ctl.abort();
      },
    });
    expect(fim).toBeNull();
    expect(c.estados.at(-1)).toMatchObject({ fase: "aguardando", posicaoNaFila: 1 });
    expect(c.buscar).toHaveBeenCalledTimes(1);
  });
});

describe("rascunho do código", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem localStorage (ou com ele quebrado) não explode", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    });
    expect(() => salvarRascunho("ex", "print(1)")).not.toThrow();
    expect(lerRascunho("ex")).toBeNull();
    expect(codigoDeAbertura({ id: "ex", codigoInicial: "# início", ultimoCodigo: null })).toBe("# início");
  });

  it("abre com rascunho > última execução > código inicial", () => {
    const m = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    });
    const ex = { id: "ex", codigoInicial: "inicial", ultimoCodigo: "servidor" };
    expect(codigoDeAbertura(ex)).toBe("servidor");
    expect(codigoDeAbertura({ ...ex, ultimoCodigo: null })).toBe("inicial");
    salvarRascunho("ex", "rascunho");
    expect(codigoDeAbertura(ex)).toBe("rascunho");
    expect(lerRascunho("outro")).toBeNull();
  });
});
