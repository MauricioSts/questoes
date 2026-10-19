// @vitest-environment jsdom
// No QuestaoView, o modo código vale só para enunciado e alternativas. Explicação e
// comando do CE ficam sempre no modo padrão (destaques em prosa, docs/formato-lote-ce.md).
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { QuestaoView } from "../components/QuestaoView";
import { ThemeProvider } from "../store/theme";
import type { Questao } from "../types/questao";

const questao: Questao = {
  id: 1,
  modulo: "II",
  materia: "Desenvolvimento de Software",
  assunto: "Python",
  dificuldade: "media",
  enunciado: "Qual o resultado de [x for x in range(3)]?",
  codigo: "print([1, 2, 3])",
  linguagem: "python",
  alternativas: { A: "[0, 1, 2]", B: "arr[0]" },
  gabarito: "A",
  explicacao: "O método [PUT] é [idempotente] e usa [as duas chaves].",
};

describe("QuestaoView: realce em questão de código", () => {
  let raiz: Root | null = null;
  let container: HTMLDivElement;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    container?.remove();
  });

  it("explicação mantém destaques; enunciado e alternativas mantêm colchetes de código", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    raiz = createRoot(container);
    act(() => {
      raiz!.render(
        <ThemeProvider>
          <QuestaoView questao={questao} selecionada="A" revelado onSelecionar={() => {}} />
        </ThemeProvider>
      );
    });
    const sublinhados = [...container.querySelectorAll("u")].map((u) => u.textContent);
    expect(sublinhados).toEqual(expect.arrayContaining(["idempotente", "as duas chaves", "PUT"]));
    expect(sublinhados).not.toContain("x for x in range(3)");
    expect(sublinhados).not.toContain("0, 1, 2");
    expect(sublinhados).not.toContain("0");
    const texto = container.textContent ?? "";
    expect(texto).toContain("[x for x in range(3)]");
    expect(texto).toContain("[0, 1, 2]");
    expect(texto).toContain("arr[0]");
  });
});
