import { describe, it, expect } from "vitest";
import { corrigir } from "../lib/correcao";
import {
  montarFlash,
  montarSimulado,
  calcularNotaSimulado,
  sampleWeighted,
} from "../lib/sessionBuilder";
import type { Questao } from "../types/questao";

// Gerador de questão fake.
function q(id: number, modulo: "I" | "II", materia: string): Questao {
  return {
    id,
    modulo,
    materia,
    assunto: `${materia}-a`,
    dificuldade: "media",
    enunciado: "?",
    alternativas: { A: "a", B: "b" },
    gabarito: "A",
    explicacao: "",
  };
}

describe("corrigir (cálculo de acerto)", () => {
  it("acerta quando a marcada é o gabarito", () => {
    expect(corrigir(q(1, "I", "Portugues"), "A")).toBe(true);
    expect(corrigir(q(1, "I", "Portugues"), "B")).toBe(false);
  });
});

describe("montarFlash (10 erradas do Módulo II)", () => {
  const todasII = Array.from({ length: 20 }, (_, i) => q(100 + i, "II", "BD"));

  it("usa as erradas priorizadas na ordem do backend", () => {
    const r = montarFlash({
      idsErradosPriorizados: [105, 103, 101],
      todasModuloII: todasII,
      respondidasIds: new Set([105, 103, 101]),
      quantidade: 10,
    });
    expect(r.questoes.length).toBe(10);
    // as 3 primeiras respeitam a prioridade do backend
    expect(r.questoes.slice(0, 3).map((x) => x.id)).toEqual([105, 103, 101]);
    expect(r.completadoComNaoRespondidas).toBe(true);
    expect(r.faltaram).toBe(false);
  });

  it("nunca quebra: completa e sinaliza quando faltam erradas", () => {
    const r = montarFlash({
      idsErradosPriorizados: [100],
      todasModuloII: todasII,
      respondidasIds: new Set([100]),
      quantidade: 10,
    });
    expect(r.questoes.length).toBe(10);
    expect(r.completadoComNaoRespondidas).toBe(true);
    // não repete a mesma questão
    expect(new Set(r.questoes.map((x) => x.id)).size).toBe(10);
  });

  it("ignora ids errados que não existem no JSON", () => {
    const r = montarFlash({
      idsErradosPriorizados: [999, 100],
      todasModuloII: todasII,
      respondidasIds: new Set([100]),
      quantidade: 3,
    });
    expect(r.questoes.map((x) => x.id)).toContain(100);
    expect(r.questoes.map((x) => x.id)).not.toContain(999);
  });
});

describe("montarSimulado (proporção da prova)", () => {
  // Monta um banco grande o suficiente para fechar a proporção.
  const todas: Questao[] = [
    ...Array.from({ length: 30 }, (_, i) => q(1 + i, "I", "Língua Portuguesa")),
    ...Array.from({ length: 30 }, (_, i) => q(100 + i, "I", "Língua Inglesa")),
    ...Array.from({ length: 30 }, (_, i) => q(200 + i, "I", "Raciocínio Lógico-Matemático")),
    ...Array.from({ length: 30 }, (_, i) => q(300 + i, "I", "Atualidades e IA")),
    ...Array.from({ length: 30 }, (_, i) => q(400 + i, "I", "Legislação (SI e Proteção de Dados)")),
    ...Array.from({ length: 60 }, (_, i) => q(500 + i, "II", "Especificos")),
  ];

  it("mantém a proporção: 12/12/5/6/5 no Módulo I e 30 no Módulo II (total 70)", () => {
    const sim = montarSimulado({ semana: [], todas });
    expect(sim.length).toBe(70);
    const cont = (m: string) => sim.filter((x) => x.materia === m).length;
    expect(cont("Língua Portuguesa")).toBe(12);
    expect(cont("Língua Inglesa")).toBe(12);
    expect(cont("Raciocínio Lógico-Matemático")).toBe(5);
    expect(cont("Atualidades e IA")).toBe(6);
    expect(cont("Legislação (SI e Proteção de Dados)")).toBe(5);
    expect(sim.filter((x) => x.modulo === "II").length).toBe(30);
    // sem duplicatas
    expect(new Set(sim.map((x) => x.id)).size).toBe(70);
  });

  it("prioriza erradas da semana (peso maior) mas mantém a proporção", () => {
    // marca algumas da semana como erradas
    const semana = [
      { questaoId: 1, erros: 2, total: 2 },
      { questaoId: 2, erros: 1, total: 1 },
    ];
    const sim = montarSimulado({ semana, todas, rng: () => 0.01 });
    expect(sim.length).toBe(70);
    expect(sim.filter((x) => x.materia === "Língua Portuguesa").length).toBe(12);
  });
});

describe("calcularNotaSimulado (nota ponderada real)", () => {
  it("Módulo I peso 1, Módulo II peso 2,5", () => {
    const r = calcularNotaSimulado([
      { modulo: "I", acertou: true }, // +1
      { modulo: "I", acertou: false },
      { modulo: "II", acertou: true }, // +2.5
      { modulo: "II", acertou: false },
    ]);
    expect(r.pontos).toBeCloseTo(3.5);
    expect(r.totalPontosPossivel).toBeCloseTo(7);
    expect(r.acertos).toBe(2);
  });
});

describe("sampleWeighted", () => {
  it("nunca devolve mais que o disponível e não repete", () => {
    const itens = [1, 2, 3].map((n) => ({ item: n, peso: 1 }));
    const out = sampleWeighted(itens, 10);
    expect(out.length).toBe(3);
    expect(new Set(out).size).toBe(3);
  });
});
