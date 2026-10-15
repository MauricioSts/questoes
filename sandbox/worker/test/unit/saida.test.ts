import { describe, it, expect } from "vitest";
import { Coletor, limparSaida, saidaConfere } from "../../src/saida.js";

describe("saidaConfere", () => {
  it("exata ignora espaço no fim da linha e linhas vazias no fim", () => {
    expect(saidaConfere("5  \n\n", "5", "exata")).toBe(true);
    expect(saidaConfere(" 5", "5", "exata")).toBe(false);
    expect(saidaConfere("1\r\n2\r\n", "1\n2", "exata")).toBe(true);
  });

  it("linhas ignora espaço no começo também", () => {
    expect(saidaConfere("  a\n b", "a\nb", "linhas")).toBe(true);
  });

  it("conjunto aceita qualquer ordem mas respeita repetição", () => {
    expect(saidaConfere("b\na", "a\nb", "conjunto")).toBe(true);
    expect(saidaConfere("a\na", "a", "conjunto")).toBe(false);
  });

  it("saída vazia só confere com esperado vazio", () => {
    expect(saidaConfere("", "", "exata")).toBe(true);
    expect(saidaConfere("", "0", "exata")).toBe(false);
  });
});

describe("Coletor", () => {
  it("guarda só até o limite e marca como cortado", () => {
    const c = new Coletor(10);
    c.add(Buffer.from("12345"));
    c.add(Buffer.from("67890abc"));
    expect(c.texto()).toBe("1234567890");
    expect(c.cortado).toBe(true);
    expect(c.total).toBe(13);
  });

  it("limpa ANSI ao devolver", () => {
    const c = new Coletor();
    c.add(Buffer.from("\u001b[31mx\u001b[0m"));
    expect(c.texto()).toBe("x");
  });
});

describe("limparSaida", () => {
  it("mantém quebras de linha e tabs", () => {
    expect(limparSaida("a\tb\nc")).toBe("a\tb\nc");
  });
});
