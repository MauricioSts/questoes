import { describe, expect, it } from "vitest";
import { motivoDaFalha } from "../../src/executar.js";
import type { ResultadoExec } from "../../src/docker.js";

const exec = (x: Partial<ResultadoExec>): ResultadoExec => ({
  codigo: 1,
  stdout: "",
  stderr: "",
  cortado: false,
  tempoMs: 100,
  estourouTempo: false,
  sandboxMorreu: false,
  ...x,
});

describe("motivoDaFalha", () => {
  it("sandbox encerrado pelo gVisor é limite de recursos", () => {
    expect(motivoDaFalha(exec({ codigo: 128, sandboxMorreu: true }), 5)).toBe("limite_recursos");
  });

  it("SIGKILL perto do limite é tempo esgotado; longe dele, memória", () => {
    expect(motivoDaFalha(exec({ codigo: 137, tempoMs: 4900 }), 5)).toBe("tempo_esgotado");
    expect(motivoDaFalha(exec({ codigo: 137, tempoMs: 800 }), 5)).toBe("limite_recursos");
  });

  it("estouro do heap da linguagem é limite de recursos", () => {
    const java = 'Exception in thread "main" java.lang.OutOfMemoryError: Java heap space\n\tat Main.main(Main.java:2)\n';
    expect(motivoDaFalha(exec({ stderr: java }), 5)).toBe("limite_recursos");
    expect(motivoDaFalha(exec({ codigo: 134, stderr: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory" }), 5)).toBe("limite_recursos");
    expect(motivoDaFalha(exec({ stderr: 'java.io.IOException: Cannot run program "sleep": error=12, Out of memory' }), 5)).toBe("limite_recursos");
    expect(motivoDaFalha(exec({ stderr: "Traceback (most recent call last):\nMemoryError\n" }), 5)).toBe("limite_recursos");
  });

  it("exceção comum continua erro de execução", () => {
    expect(motivoDaFalha(exec({ stderr: "ZeroDivisionError: division by zero" }), 5)).toBe("erro_execucao");
    expect(motivoDaFalha(exec({ stderr: "OSError: [Errno 101] Network unreachable" }), 5)).toBe("erro_execucao");
  });
});
