// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { carregarProva, salvarProva, descartarProva } from "../lib/provaEmAndamento";
import { setConcursoId } from "../lib/concurso";

const prova = {
  questaoIds: [10, 11, 12],
  marcadas: [[10, "A"]] as [number, "A"][],
  tempos: [[10, 42]] as [number, number][],
  iniciadaEm: 1_700_000_000_000,
  restanteSegundos: 13_200,
};

describe("prova em andamento (sobreviver a sair no meio)", () => {
  beforeEach(() => {
    localStorage.clear();
    setConcursoId("c1");
  });

  it("guarda e devolve a prova com as marcações e o relógio", () => {
    salvarProva(prova);
    const lida = carregarProva();
    expect(lida?.questaoIds).toEqual([10, 11, 12]);
    expect(lida?.marcadas).toEqual([[10, "A"]]);
    expect(lida?.tempos).toEqual([[10, 42]]);
    expect(lida?.restanteSegundos).toBe(13_200);
  });

  it("não devolve prova de outro concurso", () => {
    salvarProva(prova);
    setConcursoId("c2");
    expect(carregarProva()).toBeNull();
  });

  it("descartar apaga de vez", () => {
    salvarProva(prova);
    descartarProva();
    expect(carregarProva()).toBeNull();
  });

  it("lixo no armazenamento não quebra a tela", () => {
    localStorage.setItem("q_prova_andamento", "{isso não é json");
    expect(carregarProva()).toBeNull();
  });
});
