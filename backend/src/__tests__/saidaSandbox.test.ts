// O resultado do sandbox é a última coisa que a API filtra antes da tela: teste oculto não
// pode levar entrada/saída, e a saída do programa sai sem ANSI nem caracteres de controle.
import { describe, it, expect } from "vitest";
import { limparSaida, resultadoPublico } from "../lib/saidaSandbox.js";

describe("limparSaida", () => {
  it("tira cores ANSI, título OSC, \\r e controles, mantendo \\n e \\t", () => {
    expect(limparSaida("\u001b[31mvermelho\u001b[0m\u001b]0;titulo\u0007 ok\r\nX\u0000\u0008\ty")).toBe("vermelho ok\nX\ty");
  });

  it("tira caracteres de direção de texto (texto invertido para enganar quem lê)", () => {
    expect(limparSaida("abc‮dcba")).toBe("abcdcba");
  });

  it("não interpreta nem altera HTML: a saída é texto e o front escapa", () => {
    const payload = `<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>`;
    expect(limparSaida(payload)).toBe(payload);
  });

  it("corta em 64 KB e ignora o que não é string", () => {
    expect(limparSaida("a".repeat(70_000)).length).toBe(64 * 1024);
    expect(limparSaida(undefined)).toBe("");
    expect(limparSaida({ toString: () => "x" })).toBe("");
  });
});

describe("resultadoPublico", () => {
  const bruto = {
    compilacao: null,
    passou: 1,
    total: 2,
    tempoMs: 300,
    campoNovoDoWorker: "não deve sair",
    testes: [
      { nome: "visível", oculto: false, passou: true, motivo: "passou", tempoMs: 10, entrada: "2 3", esperado: "5", stdout: "5\n", stderr: "" },
      // Mesmo que o worker gravasse por engano, a API não deixa sair.
      { nome: "oculto", oculto: true, passou: false, motivo: "saida_diferente", tempoMs: 12, entrada: "SEGREDO", esperado: "GABARITO", stdout: "SEGREDO" },
    ],
  };

  it("teste oculto sai só com nome, passou, motivo e tempo", () => {
    const r = resultadoPublico(bruto)!;
    expect(r.testes[1]).toEqual({ nome: "oculto", oculto: true, passou: false, motivo: "saida_diferente", tempoMs: 12 });
    expect(JSON.stringify(r)).not.toMatch(/SEGREDO|GABARITO/);
  });

  it("teste sem a flag oculto é tratado como oculto", () => {
    const r = resultadoPublico({ testes: [{ nome: "t", entrada: "SEGREDO", stdout: "SEGREDO" }] })!;
    expect(JSON.stringify(r)).not.toContain("SEGREDO");
  });

  it("teste visível leva a saída limpa", () => {
    const r = resultadoPublico({ testes: [{ nome: "v", oculto: false, stdout: "\u001b[1mok\u001b[0m" }] })!;
    expect(r.testes[0]).toMatchObject({ stdout: "ok" });
  });

  it("campos desconhecidos e motivos inventados não passam", () => {
    const r = resultadoPublico({ ...bruto, testes: [{ nome: "v", oculto: false, motivo: "<b>x</b>" }] })!;
    expect(JSON.stringify(r)).not.toContain("campoNovoDoWorker");
    expect(r.testes[0].motivo).toBe("erro_execucao");
  });

  it("resultado ausente vira null", () => {
    expect(resultadoPublico(null)).toBeNull();
    expect(resultadoPublico("texto")).toBeNull();
  });
});
