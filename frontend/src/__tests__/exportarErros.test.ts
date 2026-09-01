import { describe, it, expect } from "vitest";
import { agruparPorMateria, montarMarkdownErros, type ItemErro } from "../lib/exportarErros";
import { validarLote } from "../lib/validarLote";
import type { Questao } from "../types/questao";

function questao(id: number, materia: string, assunto: string): Questao {
  return {
    id,
    modulo: "II",
    materia,
    assunto,
    dificuldade: "media",
    enunciado: `Enunciado da questão ${id}`,
    alternativas: { A: "alfa", B: "beta", C: "gama", D: "delta", E: "epsilon" },
    gabarito: "C",
    explicacao: `Explicação ${id}`,
  };
}

function item(id: number, materia: string, assunto: string, erros: number, marcada = "B"): ItemErro {
  return {
    meta: {
      questaoId: id,
      modulo: "II",
      materia,
      assunto,
      dificuldade: "media",
      erros,
      tentativas: erros,
      alternativaMarcada: marcada,
    },
    questao: questao(id, materia, assunto),
  };
}

const ITENS = [
  item(1, "Banco de Dados", "Normalização", 3),
  item(2, "Banco de Dados", "Normalização", 1),
  item(3, "Banco de Dados", "Índices", 2),
  item(4, "Português", "Crase", 1),
];

describe("agruparPorMateria", () => {
  it("agrupa por matéria e assunto, pior primeiro", () => {
    const grupos = agruparPorMateria(ITENS, { "Banco de Dados": 0.4, "Banco de Dados›Normalização": 0.25 });
    expect(grupos.map((g) => g.materia)).toEqual(["Banco de Dados", "Português"]);
    expect(grupos[0].itens).toHaveLength(3);
    expect(grupos[0].erros).toBe(6);
    expect(grupos[0].taxa).toBe(0.4);
    expect(grupos[0].assuntos.map((a) => a.assunto)).toEqual(["Normalização", "Índices"]);
    expect(grupos[0].assuntos[0].taxa).toBe(0.25);
    // sem taxa conhecida = null (a UI mostra "n/d" em vez de 0%)
    expect(grupos[1].taxa).toBeNull();
  });
});

describe("montarMarkdownErros", () => {
  const md = montarMarkdownErros(ITENS, { concurso: "Dataprev: Analista de TI" });

  it("leva o distrator marcado, o gabarito e a contagem de erros", () => {
    expect(md).toContain("Marquei: **B** · Gabarito: **C**");
    expect(md).toContain("errei 3× em 3 tentativa(s)");
    expect(md).toContain("Dataprev: Analista de TI");
    expect(md).toContain("### Banco de Dados › Normalização");
  });

  it("o JSON de exemplo do prompt passa no validador de importação", () => {
    const bloco = md.match(/```json\n([\s\S]*?)```/);
    expect(bloco).not.toBeNull();
    const r = validarLote(JSON.parse(bloco![1]));
    expect(r.erros).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("export de uma matéria só leva apenas ela", () => {
    const so = montarMarkdownErros(
      ITENS.filter((i) => i.meta.materia === "Português"),
      { materia: "Português" }
    );
    expect(so).toContain("# Questões que eu errei — Português");
    expect(so).not.toContain("Normalização");
  });
});
