import { describe, it, expect } from "vitest";
import { calcularRevisoes, revisoesPendentes, type AnswerRev } from "../lib/srs.js";

function mk(questaoId: number, acertou: boolean, diasAtras: number): AnswerRev {
  return {
    questaoId,
    acertou,
    createdAt: new Date(Date.now() - diasAtras * 864e5),
    moduloSnapshot: "II",
    materiaSnapshot: "RLM",
    assuntoSnapshot: "Logica",
    dificuldadeSnapshot: "media",
  };
}

describe("srs — repetição espaçada", () => {
  it("erro recente reseta o intervalo (streak 0 → 1 dia)", () => {
    // Errou há 2 dias → dueDate = ontem → está pendente.
    const [item] = calcularRevisoes([mk(1, false, 2)]);
    expect(item.streak).toBe(0);
    expect(item.dueDate.getTime()).toBeLessThan(Date.now());
  });

  it("acertos consecutivos aumentam o intervalo", () => {
    // 2 acertos consecutivos → intervalo de 7 dias; última resposta há 1 dia → não vence ainda.
    const hist = [mk(1, true, 3), mk(1, true, 1)];
    const [item] = calcularRevisoes(hist);
    expect(item.streak).toBe(2);
    expect(item.dueDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("só retorna as vencidas, mais atrasadas primeiro", () => {
    const answers = [
      ...[mk(1, false, 5)], // vencida (atrasada 4 dias)
      ...[mk(2, false, 2)], // vencida (atrasada 1 dia)
      ...[mk(3, true, 0)], // acertou hoje → não vence
    ];
    const pend = revisoesPendentes(answers);
    expect(pend.map((p) => p.questaoId)).toEqual([1, 2]);
  });
});
