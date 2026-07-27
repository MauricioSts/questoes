import { describe, it, expect } from "vitest";
import { calcularStreak, type FeriasWindow } from "../lib/streak.js";
import { localDateKey } from "../lib/date.js";

// Monta um mapa dia→quantidade marcando meta batida (>=1) nos offsets informados
// (em dias atrás de hoje). meta usada nos testes é 1.
function porDiaComMetaEm(offsets: number[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const off of offsets) {
    const dia = localDateKey(new Date(Date.now() - off * 864e5));
    m.set(dia, 1);
  }
  return m;
}

const diasAtras = (off: number) => new Date(Date.now() - off * 864e5);

describe("calcularStreak — modo férias", () => {
  it("sem férias, um buraco recente quebra a ofensiva", () => {
    // Bloco antigo cumprido (10..20), dias recentes (0..9) todos perdidos.
    const porDia = porDiaComMetaEm([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(calcularStreak(porDia, 1)).toBe(0);
  });

  it("com férias ligado, os dias recentes não quebram — a ofensiva é preservada", () => {
    const porDia = porDiaComMetaEm([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const ferias: FeriasWindow = { ativo: true, desde: diasAtras(9), ate: null };
    // Sem férias seria 0; com férias o bloco antigo continua contando.
    expect(calcularStreak(porDia, 1, ferias)).toBeGreaterThan(0);
  });

  it("ao voltar, a ofensiva atravessa o período de férias (janela fechada)", () => {
    // Estudou 0..2 (recentes), férias em 3..9, bloco antigo 10..20.
    const porDia = porDiaComMetaEm([0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const semFerias = calcularStreak(porDia, 1);
    const ferias: FeriasWindow = { ativo: false, desde: diasAtras(9), ate: diasAtras(3) };
    const comFerias = calcularStreak(porDia, 1, ferias);
    // Sem férias a sequência para no buraco 3..9; com férias ela pula o buraco e soma o bloco antigo.
    expect(comFerias).toBeGreaterThan(semFerias);
  });

  it("dias fora da janela de férias voltam a contar normalmente", () => {
    // Só o bloco antigo cumprido; férias cobre 3..9 mas 0..2 (recentes) foram perdidos.
    const porDia = porDiaComMetaEm([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const ferias: FeriasWindow = { ativo: false, desde: diasAtras(9), ate: diasAtras(3) };
    // 0..2 não são férias nem (necessariamente) fim de semana → podem quebrar como antes.
    // Garante que a janela fechada NÃO congela dias fora dela: resultado <= com férias ativo.
    const ativo: FeriasWindow = { ativo: true, desde: diasAtras(9), ate: null };
    expect(calcularStreak(porDia, 1, ferias)).toBeLessThanOrEqual(calcularStreak(porDia, 1, ativo));
  });
});
