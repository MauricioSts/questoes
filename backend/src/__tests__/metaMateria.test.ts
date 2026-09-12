import { describe, it, expect } from "vitest";
import {
  META_MATERIA_QTD,
  casarMaterias,
  materiaDoDia,
  pesoMeta,
  sortearMeta,
  normalizar,
} from "../lib/metaMateria.js";

// rng determinístico para o sorteio (mesma sequência sempre).
function rngFixo(valores: number[]): () => number {
  let i = 0;
  return () => valores[i++ % valores.length];
}

describe("materiaDoDia", () => {
  it("segue o rodízio de segunda a sexta", () => {
    expect(materiaDoDia(0)?.rotulo).toBe("Língua Portuguesa");
    expect(materiaDoDia(1)?.rotulo).toBe("Legislação");
    expect(materiaDoDia(2)?.rotulo).toBe("Raciocínio Lógico-Matemático");
    expect(materiaDoDia(3)?.rotulo).toBe("Língua Inglesa");
    expect(materiaDoDia(4)?.rotulo).toBe("Banco de Dados");
  });

  it("não tem matéria fixa no fim de semana", () => {
    expect(materiaDoDia(5)).toBeNull();
    expect(materiaDoDia(6)).toBeNull();
  });
});

describe("casarMaterias", () => {
  // Os nomes reais do banco hoje.
  const doBanco = [
    "Língua Portuguesa",
    "Língua Inglesa",
    "Legislação (SI e Proteção de Dados)",
    "Raciocínio Lógico-Matemático",
    "Banco de Dados / BI / Big Data",
    "Desenvolvimento de Software",
    "Segurança da Informação",
    "Governança de TI",
    "Atualidades e IA",
  ];

  it("acha a matéria de cada dia útil, com acento ou sem", () => {
    expect(casarMaterias(doBanco, materiaDoDia(0)!.termos)).toEqual(["Língua Portuguesa"]);
    expect(casarMaterias(doBanco, materiaDoDia(1)!.termos)).toEqual(["Legislação (SI e Proteção de Dados)"]);
    expect(casarMaterias(doBanco, materiaDoDia(2)!.termos)).toEqual(["Raciocínio Lógico-Matemático"]);
    expect(casarMaterias(doBanco, materiaDoDia(3)!.termos)).toEqual(["Língua Inglesa"]);
    expect(casarMaterias(doBanco, materiaDoDia(4)!.termos)).toEqual(["Banco de Dados / BI / Big Data"]);
  });

  it("não confunde Língua Portuguesa com Língua Inglesa", () => {
    expect(casarMaterias(doBanco, materiaDoDia(0)!.termos)).not.toContain("Língua Inglesa");
  });

  it("devolve lista vazia quando o concurso não tem a matéria", () => {
    expect(casarMaterias(["Direito Penal"], materiaDoDia(3)!.termos)).toEqual([]);
  });

  it("normaliza acentos e caixa", () => {
    expect(normalizar("Raciocínio Lógico-Matemático")).toBe("raciocinio logico-matematico");
  });
});

describe("pesoMeta", () => {
  it("dá mais peso a questão de prova oficial que a autoral", () => {
    expect(pesoMeta({ id: 1, origem: "oficial", erros: 0 })).toBeGreaterThan(
      pesoMeta({ id: 2, origem: "autoral", erros: 0 })
    );
  });

  it("dá mais peso a questão que eu já errei", () => {
    expect(pesoMeta({ id: 1, origem: "autoral", erros: 2 })).toBeGreaterThan(
      pesoMeta({ id: 2, origem: "autoral", erros: 0 })
    );
  });

  it("limita o bônus de erro (uma questão muito errada não monopoliza o sorteio)", () => {
    expect(pesoMeta({ id: 1, origem: "autoral", erros: 50 })).toBe(
      pesoMeta({ id: 2, origem: "autoral", erros: 10 })
    );
  });

  it("nunca zera o peso: toda questão da matéria continua elegível", () => {
    expect(pesoMeta({ id: 1, origem: "gerada", erros: 0 })).toBeGreaterThan(0);
  });
});

describe("sortearMeta", () => {
  const candidatas = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    origem: i < 10 ? "oficial" : "autoral",
    erros: 0,
  }));

  it("devolve 10 questões distintas", () => {
    const ids = sortearMeta(candidatas);
    expect(ids).toHaveLength(META_MATERIA_QTD);
    expect(new Set(ids).size).toBe(META_MATERIA_QTD);
  });

  it("não quebra quando há menos questões que a meta", () => {
    const ids = sortearMeta(candidatas.slice(0, 3));
    expect(ids).toHaveLength(3);
  });

  it("devolve lista vazia sem candidatas", () => {
    expect(sortearMeta([])).toEqual([]);
  });

  it("prefere oficial/adaptada na média", () => {
    let oficiais = 0;
    for (let i = 0; i < 200; i++) {
      oficiais += sortearMeta(candidatas).filter((id) => id <= 10).length;
    }
    const media = oficiais / 200;
    // 10 oficiais (peso 6) contra 30 autorais (peso 1): sem peso a média seria 2,5.
    expect(media).toBeGreaterThan(4);
  });

  it("é determinístico com rng injetado", () => {
    const rng = () => 0.5;
    expect(sortearMeta(candidatas, 5, rng)).toEqual(sortearMeta(candidatas, 5, rng));
  });

  it("respeita o rng: com rng fixo em 0 pega sempre o primeiro do pool restante", () => {
    expect(sortearMeta(candidatas.slice(0, 5), 3, rngFixo([0]))).toEqual([1, 2, 3]);
  });
});
