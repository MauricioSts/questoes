import { describe, it, expect } from "vitest";
import { montarRanking, nomeExibicao, iniciaisDe, VOLUME_MINIMO_TAXA, type LinhaBruta } from "../lib/ranking.js";

function mk(nome: string, acertos: number, respondidas: number): LinhaBruta {
  return { userId: nome, nome, acertos, respondidas, ultimaResposta: new Date("2026-09-20T12:00:00Z") };
}

describe("montarRanking", () => {
  it("ordena por acertos, do maior para o menor", () => {
    const r = montarRanking([mk("Ana", 10, 20), mk("Bruno", 40, 80), mk("Caio", 25, 30)]);
    expect(r.map((l) => l.nome)).toEqual(["Bruno", "Caio", "Ana"]);
    expect(r.map((l) => l.posicao)).toEqual([1, 2, 3]);
  });

  it("empatado em acertos, ganha quem respondeu menos questões", () => {
    const r = montarRanking([mk("Ana Souza", 30, 60), mk("Bruno Lima", 30, 35)]);
    expect(r[0].nome).toBe("Bruno L.");
    expect(r[0].taxa).toBeCloseTo(30 / 35);
  });

  it("empate completo compartilha a posição e a seguinte pula", () => {
    const r = montarRanking([mk("Ana", 30, 40), mk("Bruno", 30, 40), mk("Caio", 5, 10)]);
    expect(r.map((l) => l.posicao)).toEqual([1, 1, 3]);
  });

  it("quem não respondeu nada fica de fora", () => {
    const r = montarRanking([mk("Ana", 0, 0), mk("Bruno", 1, 4)]);
    expect(r.map((l) => l.nome)).toEqual(["Bruno"]);
  });

  it("marca elegibilidade para o ranking por taxa pelo volume mínimo", () => {
    const r = montarRanking([mk("Ana", VOLUME_MINIMO_TAXA, VOLUME_MINIMO_TAXA), mk("Bruno", 3, 3)]);
    expect(r.find((l) => l.nome === "Ana")!.elegivelTaxa).toBe(true);
    expect(r.find((l) => l.nome === "Bruno")!.elegivelTaxa).toBe(false);
  });

  it("taxa é acertos sobre respondidas", () => {
    const [l] = montarRanking([mk("Ana", 9, 12)]);
    expect(l.taxa).toBeCloseTo(0.75);
  });
});

describe("nome público", () => {
  it("encurta o sobrenome e nunca expõe o nome completo", () => {
    expect(nomeExibicao("Maurício Santos Silva")).toBe("Maurício S.");
    expect(nomeExibicao("Ana")).toBe("Ana");
    expect(nomeExibicao("  ")).toBe("Anônimo");
  });

  it("iniciais para o avatar", () => {
    expect(iniciaisDe("Maurício Santos Silva")).toBe("MS");
    expect(iniciaisDe("Ana")).toBe("AN");
  });
});
