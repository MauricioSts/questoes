import { describe, it, expect } from "vitest";
import { diasCorridosAte } from "../lib/date.js";

// Data da prova gravada como meia-noite UTC (como o PATCH /goals/prova e o /concursos
// gravam "2027-01-24"). A conta é por dia de calendário no fuso, igual ao frontend.
const prova = new Date("2027-01-24T00:00:00.000Z");
const dias = (iso: string) => diasCorridosAte(prova, new Date(iso), "America/Sao_Paulo");

describe("diasCorridosAte", () => {
  it("conta dias de calendário em Brasília", () => {
    expect(dias("2027-01-22T14:30:00Z")).toBe(2); // sexta
    expect(dias("2027-01-23T23:00:00Z")).toBe(1); // sábado 20h
    expect(dias("2027-01-24T02:59:00Z")).toBe(1); // sábado 23h59 em Brasília, já domingo em UTC (a conta antiga, por ms até a meia-noite UTC, dava 0 desde as 21h de sábado)
  });

  it("o dia da prova inteiro é 0; depois, negativo", () => {
    expect(dias("2027-01-24T03:00:00Z")).toBe(0);
    expect(dias("2027-01-24T10:00:00Z")).toBe(0); // 7h
    expect(dias("2027-01-25T02:59:00Z")).toBe(0); // domingo 23h59
    expect(dias("2027-01-25T03:00:00Z")).toBe(-1);
  });
});
