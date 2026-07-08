import { describe, it, expect } from "vitest";
import { agregarStats, type AnswerLike } from "../lib/stats.js";

function mk(materia: string, assunto: string, acertou: boolean): AnswerLike {
  return { materiaSnapshot: materia, assuntoSnapshot: assunto, acertou, createdAt: new Date("2026-07-01T12:00:00Z") };
}

describe("agregarStats — onde estou errando", () => {
  it("calcula taxa global e por matéria", () => {
    const answers: AnswerLike[] = [
      mk("Portugues", "Crase", true),
      mk("Portugues", "Crase", false),
      mk("RLM", "Logica", true),
      mk("RLM", "Logica", true),
    ];
    const s = agregarStats(answers);
    expect(s.totalRespondidas).toBe(4);
    expect(s.totalAcertos).toBe(3);
    expect(s.taxaGlobal).toBeCloseTo(0.75);
    const port = s.porMateria.find((m) => m.materia === "Portugues")!;
    expect(port.taxa).toBeCloseTo(0.5);
  });

  it("pontos fracos: só assuntos com volume mínimo (>=3), pior primeiro", () => {
    const answers: AnswerLike[] = [
      // Crase: 3 respostas, 1 acerto => taxa 0.33 (entra)
      mk("Portugues", "Crase", true),
      mk("Portugues", "Crase", false),
      mk("Portugues", "Crase", false),
      // Logica: 3 respostas, 2 acertos => taxa 0.66 (entra, mas melhor)
      mk("RLM", "Logica", true),
      mk("RLM", "Logica", true),
      mk("RLM", "Logica", false),
      // Vocabulario: só 2 respostas => NÃO entra (volume < 3)
      mk("Ingles", "Vocabulario", false),
      mk("Ingles", "Vocabulario", false),
    ];
    const s = agregarStats(answers);
    expect(s.pontosFracos.map((p) => p.assunto)).toEqual(["Crase", "Logica"]);
    expect(s.pontosFracos[0].assunto).toBe("Crase"); // pior primeiro
    expect(s.pontosFracos.some((p) => p.assunto === "Vocabulario")).toBe(false);
  });
});
