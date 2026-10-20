import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { configDoPerfil, cortesDoPerfil, totalPontos, totalQuestoes } from "../lib/simuladoConfig";
import { montarSimulado } from "../lib/sessionBuilder";
import { ehPerfilCertoErrado, type PerfilProva } from "../lib/notaCE";
import { inicioDaProva, tempoRestante } from "../lib/contagemProva";
import { contarLinhas } from "../lib/discursiva";
import type { Questao } from "../types/questao";

const ler = (nome: string) =>
  JSON.parse(readFileSync(new URL(`../../../docs/perfis/${nome}.json`, import.meta.url), "utf8")) as PerfilProva;
const tjpb = ler("tjpb-2026-dev");

const LP = "Língua Portuguesa";
const RLM = "Raciocínio Lógico-Matemático";
const especificas = tjpb.grupos.find((g) => g.grupo === "CE")!.disciplinas.map((d) => d.nome);

let proximoId = 1;
function q(materia: string): Questao {
  return {
    id: proximoId++, modulo: "I", materia, assunto: "a", dificuldade: "media", enunciado: "e",
    alternativas: { A: "1", B: "2", C: "3", D: "4", E: "5" }, gabarito: "A", explicacao: "",
  } as Questao;
}
const varias = (materia: string, n: number) => Array.from({ length: n }, () => q(materia));

// Acervo fake: sobra de tudo, e uma matéria de fora do perfil que não pode entrar.
const acervo = [
  ...varias(LP, 25),
  ...varias(RLM, 25),
  ...especificas.flatMap((m) => varias(m, 12)),
  ...varias("Direito Constitucional", 20),
];

describe("perfil de múltipla escolha (TJPB)", () => {
  it("não é certo/errado; os perfis antigos, sem formato, são", () => {
    expect(ehPerfilCertoErrado(tjpb)).toBe(false);
    expect(ehPerfilCertoErrado(ler("cgu-2026-dev"))).toBe(true);
    expect(ehPerfilCertoErrado(ler("bacen-2024-ti"))).toBe(true);
  });

  it("config padrão sai do perfil: 10 LP + 10 RLM + 40 específicas, 300 min, corte 60%", () => {
    const c = configDoPerfil(tjpb);
    expect(c.itens.map((i) => [i.nome, i.qtd])).toEqual([
      [LP, 10],
      [RLM, 10],
      ["Conhecimentos Específicos", 40],
    ]);
    expect(c.itens[2].materias).toEqual(especificas);
    expect(c.itens[2].materias).toHaveLength(8);
    expect(c.itens.every((i) => i.peso === 1)).toBe(true);
    expect(totalQuestoes(c)).toBe(60);
    expect(totalPontos(c)).toBe(60);
    expect(c.duracaoMin).toBe(300);
    expect(c.notaCortePct).toBe(60);
    expect(c.soSabado).toBe(false);
  });

  it("o sorteio do simulado devolve exatamente 10 LP, 10 RLM e 40 específicas", () => {
    let semente = 7;
    const rng = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
    const sim = montarSimulado({ semana: [], todas: acervo, config: configDoPerfil(tjpb), rng });
    const conta = (f: (m: string) => boolean) => sim.filter((x) => f(x.materia)).length;
    expect(sim).toHaveLength(60);
    expect(new Set(sim.map((x) => x.id)).size).toBe(60);
    expect(conta((m) => m === LP)).toBe(10);
    expect(conta((m) => m === RLM)).toBe(10);
    expect(conta((m) => especificas.includes(m))).toBe(40);
  });

  it("cortes: ampla 60% (36 de 60) e cotas 20% abaixo (28,8)", () => {
    expect(cortesDoPerfil(tjpb, 60)).toEqual({ ampla: 36, cotas: 28.8 });
  });

  it("contagem até 24/01/2027 13:00 de Brasília", () => {
    const alvo = inicioDaProva(tjpb)!;
    expect(new Date(alvo).toISOString()).toBe("2027-01-24T16:00:00.000Z");
    expect(tempoRestante(alvo, Date.parse("2027-01-22T14:30:00Z"))).toEqual({ dias: 2, horas: 1, minutos: 30, passou: false });
    expect(tempoRestante(alvo, alvo + 1).passou).toBe(true);
    expect(inicioDaProva({})).toBeNull();
  });

  it("linhas da discursiva: quebra a cada N caracteres e em cada Enter", () => {
    expect(contarLinhas("", 70)).toBe(0);
    expect(contarLinhas("a".repeat(70), 70)).toBe(1);
    expect(contarLinhas("a".repeat(71), 70)).toBe(2);
    expect(contarLinhas("abc\n\nde", 70)).toBe(3);
  });
});
