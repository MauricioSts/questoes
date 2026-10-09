import { describe, expect, it } from "vitest";
import { CATALOGO } from "../components/poke/golpes/catalogo";
import { MAPA, RECEITA_POR_SLUG, SpritesFx } from "../components/poke/golpes/sprites/fx";
import { avaliar, deslocamento, instancias, quadroNo } from "../components/poke/golpes/sprites/player";
import type { Layer } from "../components/poke/golpes/sprites/tipos";

const K = (...ks: [number, number, ("in" | "out")?][]) => ({ keys: ks.map(([t, v, ease]) => ({ t, v, ease })) });

describe("player de sprites: funções puras", () => {
  it("track interpola, segura as pontas e aplica easing", () => {
    const tr = K([0, 0], [10, 100], [20, 100, "in"]);
    expect(avaliar(tr, -5, 7)).toBe(0);
    expect(avaliar(tr, 5, 7)).toBe(50);
    expect(avaliar(tr, 99, 7)).toBe(100);
    expect(avaliar(undefined, 3, 7)).toBe(7);
    expect(avaliar(K([0, 0], [10, 100, "in"]), 5, 0)).toBe(25);
  });

  it("sequência de quadros por fps, com e sem loop", () => {
    const l = { asset: "x", anchor: "user", start: 0, end: 60, frameSeq: { frames: [4, 5, 6], fps: 6 } } as Layer;
    expect(quadroNo(l, 0)).toBe(4);
    expect(quadroNo(l, 10)).toBe(5);
    expect(quadroNo(l, 200)).toBe(6);
    expect(quadroNo({ ...l, frameSeq: { ...l.frameSeq!, loop: true } }, 40)).toBe(5);
  });

  it("partículas são determinísticas pela seed e caem pela metade no reduced motion", () => {
    const l = { asset: "x", anchor: "target", start: 0, end: 40, spawn: { count: 6, spread: 20, interval: 2, frames: [1, 2, 3], burst: 2 } } as Layer;
    const a = instancias(l, false, 7);
    expect(a).toEqual(instancias(l, false, 7));
    expect(a).not.toEqual(instancias(l, false, 8));
    expect(instancias(l, true, 7)).toHaveLength(3);
    const [x0, y0] = deslocamento(l, a[0], 0);
    const [x1, y1] = deslocamento(l, a[0], 10);
    expect(Math.hypot(x1, y1) - Math.hypot(x0, y0)).toBeCloseTo(20, 5);
  });
});

describe("mapa golpe → visual", () => {
  it("cobre os 559 golpes do catálogo e só aponta para receitas que existem", () => {
    expect(Object.keys(MAPA)).toHaveLength(CATALOGO.length);
    for (const l of CATALOGO) {
      const e = MAPA[l.slug];
      expect(e, l.slug).toBeDefined();
      if (e.modo !== "fallback") expect(RECEITA_POR_SLUG.has(e.receita!), `${l.slug} → ${e.receita}`).toBe(true);
    }
  });

  it("sem atlas (sem assets, ou no teste) nenhuma receita fica pronta: o motor toca o procedural", () => {
    const fx = new SpritesFx("/nada/");
    expect(fx.receitaPronta("fire-punch")).toBeNull();
    expect(fx.receitaDe("fire-punch")?.anim.slug).toBe("fire-punch");
    expect(fx.receitaDe("thunder-punch")?.tipo).toBe(3);
  });
});
