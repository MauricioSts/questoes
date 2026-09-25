import { describe, expect, it } from "vitest";
import { amostrar, fk, misturar, type Clip } from "../lib/rig";
import { CLIPES, OSSOS } from "../components/batalha/jogo/esqueleto";

describe("rig", () => {
  it("todo clipe dá matrizes finitas em qualquer instante", () => {
    for (const [nome, c] of Object.entries(CLIPES) as [string, Clip][]) {
      for (let ms = -50; ms <= c.dur * 1.6; ms += c.dur / 13) {
        const pose = amostrar(c, ms);
        const m = fk(OSSOS, pose, { x: 300, y: 440, esc: 1.3, vira: nome.length % 2 === 0 });
        for (const [osso, mat] of Object.entries(m)) {
          expect(mat.every(Number.isFinite), `${nome} @${ms} ${osso}`).toBe(true);
        }
      }
    }
  });
  it("mistura entre poses com chaves diferentes", () => {
    const r = misturar({ tronco: 10 }, { sy: 0.5, bracoF: 20 }, 0.5);
    expect(r).toEqual({ tronco: 5, sy: 0.75, bracoF: 10 });
  });
});
