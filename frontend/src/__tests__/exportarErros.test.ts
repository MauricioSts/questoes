import { describe, it, expect } from "vitest";
import { agruparPorMateria, montarMarkdownErros, type ItemErro } from "../lib/exportarErros";
import { setDados } from "../lib/questoesRepo";
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

function item(
  id: number,
  materia: string,
  assunto: string,
  erros: number,
  marcada = "B",
  acertouUltima = false
): ItemErro {
  return {
    meta: {
      questaoId: id,
      modulo: "II",
      materia,
      assunto,
      dificuldade: "media",
      erros,
      tentativas: erros + (acertouUltima ? 1 : 0),
      acertos: acertouUltima ? 1 : 0,
      acertouUltima,
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
    expect(md).toContain("Marquei quando errei: **B** · Gabarito: **C**");
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

  it("mantém a questão recuperada na base e diz que ela foi recuperada", () => {
    const comRecuperada = [...ITENS, item(5, "Banco de Dados", "Índices", 2, "A", true)];
    const texto = montarMarkdownErros(comRecuperada, { periodo: "nos últimos 7 dias" });
    expect(texto).toContain("Recorte: nos últimos 7 dias");
    expect(texto).toContain("5 questão(ões) errada(s) — 4 pendente(s), 1 recuperada(s)");
    expect(texto).toContain("já recuperei depois");
    expect(texto).toContain("ainda não recuperei");
  });

  it("ranqueia os assuntos por número de erros, não por questões pendentes", () => {
    // Índices: 1 questão com 5 erros; Normalização: 2 questões com 4 erros no total.
    const texto = montarMarkdownErros([
      item(1, "Banco de Dados", "Normalização", 2),
      item(2, "Banco de Dados", "Normalização", 2),
      item(3, "Banco de Dados", "Índices", 5),
    ]);
    const ranking = texto.slice(texto.indexOf("## Onde eu mais erro"));
    expect(ranking.indexOf("Índices")).toBeLessThan(ranking.indexOf("Normalização"));
  });

  it("registra a procedência de cada questão", () => {
    setDados(
      [{ ...questao(9, "Banco de Dados", "SQL"), origem: "oficial", prova: "FGV_TCE-TO_2022", numero: 37 }],
      {},
      { "FGV_TCE-TO_2022": { banca: "FGV", orgao: "TCE-TO", ano: 2022 } }
    );
    const texto = montarMarkdownErros([
      { ...item(9, "Banco de Dados", "SQL", 1), questao: { ...questao(9, "Banco de Dados", "SQL"), origem: "oficial", prova: "FGV_TCE-TO_2022", numero: 37 } },
    ]);
    expect(texto).toContain("_Origem: FGV · TCE-TO · 2022 · Q37._");
    setDados([], {}, {});
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
