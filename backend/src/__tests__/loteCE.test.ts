import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { loteCESchema, validarLoteCE, moduloDoGrupo, type PerfilProvaDados } from "../lib/loteCE.js";

const perfil = JSON.parse(
  readFileSync(new URL("../../../docs/perfis/cgu-2026-dev.json", import.meta.url), "utf8")
) as PerfilProvaDados;

function lote(extra: Record<string, unknown> = {}) {
  return loteCESchema.parse({
    lote: "teste",
    tipo: "CERTO_ERRADO",
    perfil: "cgu-2026-dev",
    provas: { P: { banca: "Cebraspe", orgao: "X", ano: 2024, gabarito_fonte: "definitivo" } },
    comandos: [
      {
        id: 1,
        grupo: "P3",
        disciplina: "Arquitetura e Integração de Sistemas",
        texto: "Julgue os itens.",
        itens: [
          { id: 10, assunto: "a", dificuldade: "facil", afirmacao: "x", gabarito: "C", explicacao: "y", origem: "oficial", prova: "P" },
          { id: 11, assunto: "a", dificuldade: "facil", afirmacao: "x", gabarito: "E", explicacao: "y", origem: "autoral" },
        ],
      },
    ],
    ...extra,
  });
}

describe("validarLoteCE", () => {
  it("aceita um lote correto", () => {
    const r = validarLoteCE(lote(), perfil, new Set());
    expect(r.erros).toEqual([]);
    expect(r.itens).toBe(2);
    expect(r.certos).toBe(1);
  });

  it("recusa disciplina fora do grupo e id fora da sequência", () => {
    const l = lote();
    l.comandos[0].disciplina = "Língua Portuguesa";
    l.comandos[0].itens[1].id = 13;
    const r = validarLoteCE(l, perfil, new Set());
    expect(r.erros.some((e) => e.includes("Língua Portuguesa"))).toBe(true);
    expect(r.erros.some((e) => e.includes("esperado 11"))).toBe(true);
  });

  it("recusa prova que não existe e oficial sem prova", () => {
    const l = lote();
    l.comandos[0].itens[0].prova = "NAO_EXISTE";
    l.comandos[0].itens[1].origem = "oficial";
    const r = validarLoteCE(l, perfil, new Set());
    expect(r.erros).toHaveLength(2);
  });

  it("aceita prova que já está no banco", () => {
    const l = lote({ provas: {} });
    expect(validarLoteCE(l, perfil, new Set(["P"])).erros).toEqual([]);
  });

  it("recusa gabarito diferente de C/E no schema", () => {
    expect(() =>
      loteCESchema.parse({ ...lote(), comandos: [{ ...lote().comandos[0], itens: [{ ...lote().comandos[0].itens[0], gabarito: "A" }] }] })
    ).toThrow();
  });

  it("confere o tópico com o conteúdo do edital", () => {
    const l = lote();
    l.comandos[0].itens[0].topico = "2.3";
    l.comandos[0].itens[1].topico = "9.9";
    const r = validarLoteCE(l, perfil, new Set());
    expect(r.erros).toEqual([expect.stringContaining("tópico 9.9")]);
  });

  it("avisa item sem tópico e aceita disciplina do item no mesmo grupo", () => {
    const l = lote();
    l.comandos[0].itens[1].disciplina = "Engenharia de Software e Programação";
    l.comandos[0].itens[1].topico = "2.1";
    const r = validarLoteCE(l, perfil, new Set());
    expect(r.erros).toEqual([]);
    expect(r.avisos.some((a) => a.startsWith("1 item(ns) sem"))).toBe(true);
    l.comandos[0].itens[1].disciplina = "Ética Pública e Responsabilidade Profissional";
    expect(validarLoteCE(l, perfil, new Set()).erros).toEqual([expect.stringContaining("não existe no grupo P3")]);
  });

  it("P3 é módulo II e os demais, I", () => {
    expect(moduloDoGrupo(perfil, "P3")).toBe("II");
    expect(moduloDoGrupo(perfil, "P1")).toBe("I");
  });

  // O lote real fica fora do repositório (~/procedencia); só roda na VM.
  const LOTE_REAL = "/home/ubuntu/procedencia/lote-cgu-v2.json";
  it.skipIf(!existsSync(LOTE_REAL))("o lote cgu-v2 passa sem erros e com tópico em todos os itens", () => {
    const real = loteCESchema.parse(
      JSON.parse(readFileSync(LOTE_REAL, "utf8"))
    );
    const r = validarLoteCE(real, perfil, new Set());
    expect(r.erros).toEqual([]);
    expect(r.itens).toBe(58);
    expect(r.avisos.some((a) => a.includes("sem \"topico\""))).toBe(false);
  });
});
