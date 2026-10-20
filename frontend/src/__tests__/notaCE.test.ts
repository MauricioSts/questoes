import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { notaCE, montarSimuladoCE, duracaoProporcional, itensDaProva, type PerfilProva, type RespostaCE } from "../lib/notaCE";
import type { Questao } from "../types/questao";

const cgu = JSON.parse(readFileSync(new URL("../../../docs/perfis/cgu-2026-dev.json", import.meta.url), "utf8")) as PerfilProva;
const bacen = JSON.parse(readFileSync(new URL("../../../docs/perfis/bacen-2024-ti.json", import.meta.url), "utf8")) as PerfilProva;

function respostas(grupo: string, acertos: number, erros: number, brancos: number): RespostaCE[] {
  return [
    ...Array.from({ length: acertos }, () => ({ grupo, marcada: "C" as const, acertou: true })),
    ...Array.from({ length: erros }, () => ({ grupo, marcada: "E" as const, acertou: false })),
    ...Array.from({ length: brancos }, () => ({ grupo, acertou: false })),
  ];
}

describe("notaCE (CGU)", () => {
  it("prova inteira certa vale 260", () => {
    const n = notaCE(cgu, [...respostas("P1", 40, 0, 0), ...respostas("P2", 40, 0, 0), ...respostas("P3", 90, 0, 0)]);
    expect(n.pontos).toBe(260);
    expect(n.maximo).toBe(260);
    expect(n.aprovado).toBe(true);
    expect(itensDaProva(cgu)).toBe(170);
  });

  it("erro anula acerto, branco vale zero e o P3 pesa 2", () => {
    const n = notaCE(cgu, [...respostas("P1", 20, 10, 10), ...respostas("P2", 30, 5, 5), ...respostas("P3", 60, 20, 10)]);
    expect(n.grupos.map((g) => g.pontos)).toEqual([10, 25, 80]);
    expect(n.pontos).toBe(115);
    expect(n.aprovado).toBe(true);
  });

  it("elimina por mínimo do grupo mesmo com total alto", () => {
    const n = notaCE(cgu, [...respostas("P1", 40, 0, 0), ...respostas("P2", 40, 0, 0), ...respostas("P3", 40, 20, 30)]);
    // P3 = 2 × (40 − 20) = 40 < 54
    expect(n.grupos[2].pontos).toBe(40);
    expect(n.aprovado).toBe(false);
    expect(n.motivos).toEqual([expect.stringContaining("P3")]);
  });

  it("simulado menor usa mínimos proporcionais", () => {
    // 9 itens de P3 (10% do grupo): mínimo 5,4; 4 certos e 1 errado = 2 × 3 = 6
    const n = notaCE(cgu, respostas("P3", 4, 1, 4));
    expect(n.grupos[0].minimo).toBeCloseTo(5.4);
    expect(n.grupos[0].aprovado).toBe(true);
  });
});

// O edital no repositório não traz mínimo por disciplina para a CGU: o perfil aqui é o
// da CGU com um mínimo de mentira em uma disciplina, só para exercitar a regra.
describe("notaCE: mínimo por disciplina", () => {
  const etica = cgu.grupos[0].disciplinas[2].nome;
  const comMinimo: PerfilProva = {
    ...cgu,
    grupos: cgu.grupos.map((g, i) =>
      i === 0 ? { ...g, disciplinas: g.disciplinas.map((d) => (d.nome === etica ? { ...d, itens: 10, nota_minima: 4 } : d)) } : g
    ),
  };
  const daDisciplina = (disciplina: string, a: number, e: number, b: number) =>
    respostas("P1", a, e, b).map((r) => ({ ...r, disciplina }));
  const outra = cgu.grupos[0].disciplinas[0].nome;

  it("perfil sem mínimo por disciplina não muda nada", () => {
    const rs = [...daDisciplina(etica, 2, 8, 0), ...daDisciplina(outra, 30, 0, 0)];
    const n = notaCE(cgu, rs);
    expect(n.grupos[0].disciplinas).toEqual([]);
    expect(n.aprovado).toBe(true);
  });

  it("elimina pela disciplina com o grupo e o total acima do mínimo, com motivo", () => {
    // P1: 2 − 8 + 30 = 24 ≥ 8 (mínimo do grupo); Ética: 2 − 8 = −6 < 4
    const n = notaCE(comMinimo, [...daDisciplina(etica, 2, 8, 0), ...daDisciplina(outra, 30, 0, 0)]);
    const g = n.grupos[0];
    expect(g.aprovado).toBe(true);
    expect(g.disciplinas).toEqual([
      expect.objectContaining({ nome: etica, acertos: 2, erros: 8, pontos: -6, minimo: 4, aprovado: false }),
    ]);
    expect(n.aprovado).toBe(false);
    expect(n.motivos).toEqual([`P1 · ${etica}: -6 pontos, abaixo do mínimo de 4`]);
  });

  it("mínimo da disciplina proporcional aos itens dela no simulado e com o peso do grupo", () => {
    // 5 de 10 itens: mínimo 2; 4 certos e 1 errado = 3
    const n = notaCE(comMinimo, daDisciplina(etica, 4, 1, 0));
    expect(n.grupos[0].disciplinas[0]).toMatchObject({ minimo: 2, pontos: 3, aprovado: true });
    const p3 = cgu.grupos[2];
    const pesado: PerfilProva = {
      ...cgu,
      grupos: [{ ...p3, disciplinas: p3.disciplinas.map((d, i) => (i === 0 ? { ...d, itens: 20, nota_minima: 12 } : d)) }],
    };
    const n3 = notaCE(pesado, respostas("P3", 3, 1, 0).map((r) => ({ ...r, disciplina: p3.disciplinas[0].nome })));
    // peso 2: 2 × (3 − 1) = 4; mínimo 12 × 4/20 = 2,4
    expect(n3.grupos[0].disciplinas[0]).toMatchObject({ pontos: 4, aprovado: true });
    expect(n3.grupos[0].disciplinas[0].minimo).toBeCloseTo(2.4);
  });

  it("empate com mínimo fracionário não elimina por arredondamento", () => {
    // acerto 0,1 e mínimo = a disciplina inteira (3 × 0,1 = 0,30000000000000004): 1 de 3
    // itens certo vale 0,1, e o mínimo proporcional sai 0,10000000000000002
    const fracionario: PerfilProva = {
      ...cgu,
      pontuacao: { acerto: 0.1, erro: 0, branco: 0 },
      nota_minima_geral: null,
      grupos: [{ ...cgu.grupos[0], nota_minima: null, disciplinas: cgu.grupos[0].disciplinas.map((d) => ({ ...d, itens: 3, nota_minima: 3 * 0.1 })) }],
    };
    const d = notaCE(fracionario, daDisciplina(etica, 1, 0, 0)).grupos[0].disciplinas[0];
    expect(d.pontos).toBeLessThan(d.minimo);
    expect(d.aprovado).toBe(true);
  });

  it("disciplina sem item no simulado ou sem itens no perfil fica de fora", () => {
    expect(notaCE(comMinimo, daDisciplina(outra, 5, 0, 0)).grupos[0].disciplinas).toEqual([]);
    const semItens: PerfilProva = {
      ...cgu,
      grupos: [{ ...cgu.grupos[0], disciplinas: cgu.grupos[0].disciplinas.map((d) => ({ ...d, nota_minima: 4 })) }],
    };
    expect(notaCE(semItens, daDisciplina(etica, 0, 5, 0)).grupos[0].disciplinas).toEqual([]);
  });
});

describe("notaCE (Bacen)", () => {
  it("erro desconta meio ponto e os itens saem da soma das disciplinas", () => {
    const n = notaCE(bacen, [...respostas("P1", 30, 10, 10), ...respostas("P2", 50, 10, 10)]);
    expect(n.grupos.map((g) => g.pontos)).toEqual([25, 45]);
    expect(itensDaProva(bacen)).toBe(120);
  });
});

function q(id: number, grupo: string, comando: string, materia = "x"): Questao {
  return {
    id, modulo: "II", materia, assunto: "a", dificuldade: "facil", enunciado: "e", explicacao: "",
    alternativas: { C: "Certo", E: "Errado" }, gabarito: "C", formato: "CERTO_ERRADO",
    comando: { id: comando, grupo, texto: "t" },
  };
}

describe("montarSimuladoCE", () => {
  it("mantém os itens de um comando juntos e respeita o tamanho do grupo", () => {
    const perfil: PerfilProva = { ...cgu, grupos: [{ ...cgu.grupos[2], itens: 4 }] };
    const todas = [q(1, "P3", "a"), q(2, "P3", "a"), q(3, "P3", "b"), q(4, "P3", "b"), q(5, "P3", "b"), q(6, "P3", "c"), q(7, "P1", "d")];
    const { questoes, composicao } = montarSimuladoCE(todas, perfil, () => 0.5);
    expect(composicao[0].obtido).toBeLessThanOrEqual(4);
    const porComando = new Map<string, number[]>();
    questoes.forEach((x, i) => porComando.set(x.comando!.id, [...(porComando.get(x.comando!.id) ?? []), i]));
    for (const idx of porComando.values()) expect(idx[idx.length - 1] - idx[0]).toBe(idx.length - 1);
    expect(questoes.some((x) => x.id === 7)).toBe(false);
  });

  it("tempo proporcional aos itens", () => {
    expect(duracaoProporcional(cgu, 170)).toBe(300);
    expect(duracaoProporcional(cgu, 58)).toBe(105);
  });
});
