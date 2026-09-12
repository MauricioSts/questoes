import { describe, it, expect } from "vitest";
import { ordemAlternativas, letrasDe } from "../lib/ordemAlternativas";
import type { Questao } from "../types/questao";

function q(id: number, alternativas: Questao["alternativas"], gabarito: Questao["gabarito"] = "A"): Questao {
  return {
    id,
    modulo: "I",
    materia: "Língua Portuguesa",
    assunto: "Crase",
    dificuldade: "media",
    enunciado: "e",
    alternativas,
    gabarito,
    explicacao: "x",
  };
}

const CINCO = { A: "a", B: "b", C: "c", D: "d", E: "e" };

describe("ordemAlternativas", () => {
  it("devolve exatamente as letras que a questão tem, sem repetir nem perder nenhuma", () => {
    const questao = q(1, CINCO);
    for (const tentativa of [0, 1, 2, 7, 31]) {
      const ordem = ordemAlternativas(questao, tentativa);
      expect([...ordem].sort()).toEqual(["A", "B", "C", "D", "E"]);
    }
  });

  it("respeita lote com 4 alternativas (não inventa 'E')", () => {
    const ordem = ordemAlternativas(q(2, { A: "a", B: "b", C: "c", D: "d" }), 3);
    expect([...ordem].sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("é estável: mesma questão e mesma tentativa saem sempre na mesma ordem", () => {
    const questao = q(3, CINCO);
    expect(ordemAlternativas(questao, 4)).toEqual(ordemAlternativas(questao, 4));
  });

  it("nunca repete a ordem da tentativa imediatamente anterior", () => {
    for (let id = 1; id <= 300; id++) {
      const questao = q(id, CINCO);
      for (let t = 1; t <= 8; t++) {
        expect(ordemAlternativas(questao, t).join("")).not.toBe(
          ordemAlternativas(questao, t - 1).join("")
        );
      }
    }
  });

  it("embaralha de verdade ao longo das repetições", () => {
    const questao = q(4, CINCO);
    const ordens = [0, 1, 2, 3, 4].map((t) => ordemAlternativas(questao, t).join(""));
    expect(new Set(ordens).size).toBeGreaterThanOrEqual(3);
  });

  it("questões diferentes não caem todas na mesma ordem", () => {
    const ordens = [10, 11, 12, 13, 14, 15].map((id) => ordemAlternativas(q(id, CINCO), 0).join(""));
    expect(new Set(ordens).size).toBeGreaterThan(1);
  });

  // A garantia que evita induzir ao erro: a letra segue colada ao texto dela. Se a ordem
  // mudasse o rótulo, o gabarito do lote e as explicações que citam letra apontariam para
  // a alternativa errada.
  it("não renomeia alternativa: a letra continua apontando para o mesmo texto", () => {
    const questao = q(5, { A: "primeira", B: "segunda", C: "terceira", D: "quarta", E: "quinta" }, "C");
    for (const tentativa of [0, 1, 2, 9]) {
      for (const letra of ordemAlternativas(questao, tentativa)) {
        expect(questao.alternativas[letra]).toBe(CINCO_TEXTOS[letra]);
      }
      // e o gabarito continua sendo a letra do lote
      expect(questao.gabarito).toBe("C");
      expect(questao.alternativas[questao.gabarito]).toBe("terceira");
    }
  });

  it("letrasDe ignora alternativa ausente", () => {
    expect(letrasDe(q(6, { A: "a", C: "c" }))).toEqual(["A", "C"]);
  });
});

const CINCO_TEXTOS: Record<string, string> = {
  A: "primeira",
  B: "segunda",
  C: "terceira",
  D: "quarta",
  E: "quinta",
};
