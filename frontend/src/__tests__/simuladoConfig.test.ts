import { describe, it, expect } from "vitest";
import { configAutomatica, configDataprev, configPadrao, notaSimulado, totalQuestoes } from "../lib/simuladoConfig";
import { montarSimulado } from "../lib/sessionBuilder";
import type { Questao } from "../types/questao";

function q(id: number, materia: string, modulo: "I" | "II" = "I"): Questao {
  return {
    id, modulo, materia, assunto: "a", dificuldade: "media", enunciado: "e",
    alternativas: { A: "1", B: "2" }, gabarito: "A", explicacao: "",
  } as Questao;
}

const bio = [
  ...Array.from({ length: 30 }, (_, i) => q(i + 1, "Ecologia")),
  ...Array.from({ length: 10 }, (_, i) => q(i + 100, "Genética")),
];

describe("configuração do simulado", () => {
  it("trilha da comunidade: só as matérias dela, proporcional ao banco", () => {
    const c = configPadrao("biologia-x", bio);
    expect(c.itens.map((i) => i.nome)).toEqual(["Ecologia", "Genética"]);
    expect(c.itens.map((i) => i.qtd)).toEqual([30, 10]);
    expect(c.soSabado).toBe(false);
  });

  it("Dataprev mantém a prova de 70 questões com específicos peso 2,5", () => {
    const todas = [q(1, "Língua Portuguesa"), q(2, "Banco de Dados", "II"), q(3, "Segurança", "II")];
    const c = configPadrao("dataprev-analista-ti", todas);
    expect(totalQuestoes(c)).toBe(70);
    expect(c.itens.at(-1)).toMatchObject({ materias: ["Banco de Dados", "Segurança"], peso: 2.5 });
    expect(configPadrao(null, todas)).toEqual(configDataprev(todas));
  });

  it("monta o simulado com a composição configurada", () => {
    const sim = montarSimulado({
      semana: [],
      todas: bio,
      config: { itens: [{ nome: "Genética", materias: ["Genética"], qtd: 4, peso: 1 }], duracaoMin: 30, notaCortePct: 50, soSabado: false },
    });
    expect(sim).toHaveLength(4);
    expect(new Set(sim.map((x) => x.materia))).toEqual(new Set(["Genética"]));
  });

  it("nota usa o peso de cada matéria e o corte em %", () => {
    const c = { itens: [
      { nome: "A", materias: ["A"], qtd: 1, peso: 1 },
      { nome: "B", materias: ["B"], qtd: 1, peso: 3 },
    ], duracaoMin: 30, notaCortePct: 50, soSabado: false };
    const n = notaSimulado(c, [{ materia: "A", acertou: false }, { materia: "B", acertou: true }]);
    expect(n).toMatchObject({ pontos: 3, totalPontosPossivel: 4, corte: 2, aprovadoEstimado: true });
  });

  it("banco pequeno: total não passa do que existe", () => {
    expect(totalQuestoes(configAutomatica(bio.slice(0, 5)))).toBe(5);
  });
});
