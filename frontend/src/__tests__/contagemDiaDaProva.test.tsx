// @vitest-environment jsdom
// Dia da prova na Home: os dias são de calendário no fuso da prova (0 = "Hoje é dia de
// prova", nunca "Faltam 0 dias"), e o relógio vira o dia sozinho, sem F5.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { diaNoFuso, diasCorridos } from "../lib/contagemProva";
import { ContagemProva } from "../components/ContagemProva";
import type { PerfilProva } from "../lib/notaCE";

const tjpb = JSON.parse(readFileSync(join(__dirname, "../../../docs/perfis/tjpb-2026-dev.json"), "utf8")) as PerfilProva;

describe("diasCorridos (TJPB: 24/01/2027, 13h de Brasília)", () => {
  const dias = (iso: string) => diasCorridos(tjpb.data_prova!, Date.parse(iso), tjpb.horario_prova?.fuso);

  it("conta dias de calendário em Brasília", () => {
    expect(dias("2027-01-22T14:30:00Z")).toBe(2); // sexta: faltam 2 dias (e não 3)
    expect(dias("2027-01-23T23:00:00Z")).toBe(1); // sábado 20h
    expect(dias("2027-01-24T02:59:00Z")).toBe(1); // sábado 23h59 em Brasília, já domingo em UTC
  });

  it("o dia inteiro da prova é 0, antes e depois do início; depois, negativo", () => {
    expect(dias("2027-01-24T03:00:00Z")).toBe(0); // domingo 0h
    expect(dias("2027-01-24T10:00:00Z")).toBe(0); // 7h, antes do início
    expect(dias("2027-01-24T18:00:00Z")).toBe(0); // durante a prova
    expect(dias("2027-01-25T03:00:00Z")).toBe(-1);
  });

  it("aceita a data manual (ISO de meia-noite UTC) e rejeita lixo", () => {
    expect(diasCorridos("2027-01-24T00:00:00.000Z", Date.parse("2027-01-24T12:00:00Z"))).toBe(0);
    expect(diasCorridos("", Date.now())).toBeNull();
    expect(diaNoFuso(Date.parse("2027-01-24T02:00:00Z"))).toBe("2027-01-23");
  });
});

describe("ContagemProva", () => {
  let raiz: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    host = document.createElement("div");
    document.body.appendChild(host);
    raiz = createRoot(host);
  });
  afterEach(() => {
    act(() => raiz.unmount());
    host.remove();
    vi.useRealTimers();
  });

  it("vira para 'Hoje é dia de prova' à meia-noite, sem recarregar", () => {
    vi.setSystemTime(Date.parse("2027-01-24T02:58:30Z")); // sábado 23h58 em Brasília
    act(() => raiz.render(<ContagemProva perfil={tjpb} />));
    expect(host.textContent).toContain("13horas");
    expect(host.textContent).not.toContain("Hoje é dia de prova");

    act(() => void vi.advanceTimersByTime(2 * 60_000)); // domingo 0h00
    expect(host.textContent).toContain("Hoje é dia de prova");
    expect(host.textContent).toContain("Começa em 12 h 59 min.");
    expect(host.textContent).not.toMatch(/\b0\s*dias/);
  });

  it("durante a prova segue no dia de prova; depois do fim some", () => {
    vi.setSystemTime(Date.parse("2027-01-24T20:58:00Z")); // 17h58, prova até 18h
    act(() => raiz.render(<ContagemProva perfil={tjpb} />));
    expect(host.textContent).toContain("Hoje é dia de prova");
    expect(host.textContent).toContain("A prova já começou");

    act(() => void vi.advanceTimersByTime(3 * 60_000));
    expect(host.textContent).toBe("");
  });
});
