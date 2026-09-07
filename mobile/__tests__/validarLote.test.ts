import { describe, it, expect } from "vitest";
import { validarLote } from "../lib/validarLote";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

function questaoBase(extra: Record<string, unknown> = {}) {
  return {
    id: 1,
    modulo: "II",
    materia: "Banco de Dados",
    assunto: "Modelagem",
    dificuldade: "media",
    enunciado: "Observe o modelo a seguir.",
    alternativas: { A: "a", B: "b" },
    gabarito: "A",
    explicacao: "porque sim",
    ...extra,
  };
}

describe("validarLote: imagens", () => {
  it("aceita questão sem o campo (caso da maioria)", () => {
    const r = validarLote({ questoes: [questaoBase()] });
    expect(r.ok).toBe(true);
    expect(r.erros).toEqual([]);
  });

  it("aceita duas imagens na mesma questão", () => {
    const r = validarLote({
      questoes: [
        questaoBase({
          imagens: [
            { arquivo: "q1_tela_a.png", legenda: "Tela A", posicao: "enunciado", dados: PNG },
            { arquivo: "q1_tela_b.png", legenda: "Tela B", posicao: "enunciado", dados: PNG },
          ],
        }),
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.questoes[0].imagens).toHaveLength(2);
  });

  it("recusa dados que não são data URI de imagem", () => {
    const r = validarLote({
      questoes: [
        questaoBase({
          imagens: [{ arquivo: "q1.png", legenda: "x", posicao: "enunciado", dados: "/imgs/q1.png" }],
        }),
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.erros.join()).toMatch(/data URI/);
  });

  it("recusa posição desconhecida", () => {
    const r = validarLote({
      questoes: [
        questaoBase({ imagens: [{ arquivo: "q1.png", legenda: "x", posicao: "rodape", dados: PNG }] }),
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.erros.join()).toMatch(/posição inválida/);
  });

  it("avisa (sem barrar) quando falta legenda", () => {
    const r = validarLote({
      questoes: [
        questaoBase({ imagens: [{ arquivo: "q1.png", legenda: "", posicao: "alternativas", dados: PNG }] }),
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.avisos.join()).toMatch(/sem legenda/);
  });
});
