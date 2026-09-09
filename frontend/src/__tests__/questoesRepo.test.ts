// Filtro por procedência: o ponto delicado é a questão autoral que veio no lote de uma
// prova. Ela não tem `prova` (o texto não saiu de lá), só `prova_base` — e ainda assim
// precisa aparecer quando eu peço "as questões da prova da FGV".
import { describe, it, expect, beforeEach } from "vitest";
import { setDados, filtrar, provasComContagem, provaDe, rotuloProva } from "../lib/questoesRepo";
import type { Questao, Prova } from "../types/questao";

const provas: Record<string, Prova> = {
  FGV_AMAZUL_2024: { banca: "FGV", orgao: "AMAZUL", ano: 2024 },
  CESGRANRIO_BB_2023: { banca: "CESGRANRIO", orgao: "BB", ano: 2023 },
};

function q(id: number, extra: Partial<Questao> = {}): Questao {
  return {
    id,
    modulo: "II",
    materia: "Banco de Dados",
    assunto: "Modelagem",
    dificuldade: "media",
    enunciado: `Questão ${id}`,
    alternativas: { A: "a", B: "b" },
    gabarito: "A",
    explicacao: "",
    ...extra,
  };
}

describe("filtro por prova", () => {
  beforeEach(() => {
    setDados(
      [
        q(1, { origem: "oficial", prova: "FGV_AMAZUL_2024" }),
        q(2, { origem: "autoral", prova_base: "FGV_AMAZUL_2024" }),
        q(3, { origem: "adaptada", prova: "CESGRANRIO_BB_2023" }),
        q(4, { origem: "autoral" }),
      ],
      {},
      provas
    );
  });

  it("inclui a autoral do lote da prova", () => {
    const ids = filtrar({ prova: "FGV_AMAZUL_2024" }).map((x) => x.id);
    expect(ids).toEqual([1, 2]);
  });

  it("separa provas diferentes", () => {
    expect(filtrar({ prova: "CESGRANRIO_BB_2023" }).map((x) => x.id)).toEqual([3]);
  });

  it("combina prova e origem", () => {
    expect(filtrar({ prova: "FGV_AMAZUL_2024", origem: "oficial" }).map((x) => x.id)).toEqual([1]);
  });

  it("questão sem prova nenhuma não entra em filtro de prova", () => {
    expect(provaDe(q(9, { origem: "autoral" }))).toBeUndefined();
    expect(filtrar({ prova: "FGV_AMAZUL_2024" }).some((x) => x.id === 4)).toBe(false);
  });

  it("banca do filtro também considera a prova-base", () => {
    expect(filtrar({ banca: "FGV" }).map((x) => x.id)).toEqual([1, 2]);
  });

  it("conta as questões de cada prova, mais recente primeiro", () => {
    expect(provasComContagem()).toEqual([
      { chave: "FGV_AMAZUL_2024", rotulo: "FGV · AMAZUL · 2024", banca: "FGV", orgao: "AMAZUL", ano: 2024, total: 2 },
      {
        chave: "CESGRANRIO_BB_2023",
        rotulo: "CESGRANRIO · BB · 2023",
        banca: "CESGRANRIO",
        orgao: "BB",
        ano: 2023,
        total: 1,
      },
    ]);
  });

  it("rótulo cai na própria chave quando a prova não está carregada", () => {
    expect(rotuloProva("PROVA_DESCONHECIDA")).toBe("PROVA_DESCONHECIDA");
  });
});
