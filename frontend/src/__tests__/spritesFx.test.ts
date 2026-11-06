import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CATALOGO, POR_SLUG, slugDe } from "../components/poke/golpes/catalogo";
import dex from "../data/pokedex.json";
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
    // além do catálogo (gerações 1–5), só os golpes de gerações seguintes com sprite original
    const extras = Object.keys(MAPA).filter((s) => !POR_SLUG.has(s));
    expect(Object.keys(MAPA)).toHaveLength(CATALOGO.length + extras.length);
    const doDex = new Set((dex as unknown as { golpes: [string][] }).golpes.map((g) => slugDe(g[0])));
    for (const s of extras) {
      expect(doDex.has(s), `${s} não está no pokedex.json`).toBe(true);
      expect(MAPA[s].modo, s).toBe("pixel");
      expect(RECEITA_POR_SLUG.has(MAPA[s].receita!), s).toBe(true);
    }
    for (const l of CATALOGO) {
      const e = MAPA[l.slug];
      expect(e, l.slug).toBeDefined();
      if (e.modo !== "fallback") expect(RECEITA_POR_SLUG.has(e.receita!), `${l.slug} → ${e.receita}`).toBe(true);
    }
  });

  it("os 28 golpes sem sprite (lote 1) tocam sprites originais que existem no atlas", () => {
    const lote1 = "spiky-shield mystical-fire water-shuriken leafage phantom-force spirit-shackle darkest-lariat disarming-voice baby-doll-eyes misty-terrain moonblast sparkling-aria branch-poke noble-roar grassy-terrain drum-beating boomburst pyro-ball court-change tearful-look liquidation snipe-shot play-rough flower-trick torch-song aqua-cutter aqua-step wave-crash".split(" ");
    const atlas = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/fx/fx-atlas.json"), "utf8")).arquivos;
    for (const s of lote1) {
      const r = RECEITA_POR_SLUG.get(MAPA[s]?.receita ?? "");
      expect(r, s).toBeDefined();
      for (const l of r!.layers) {
        const a = atlas[l.asset];
        expect(a, `${s}: ${l.asset}`).toBeDefined();
        if (l.asset.startsWith("Og-")) expect(l.keepColor, `${s}: ${l.asset} tem cor final`).toBe(true);
        for (const f of [l.frame ?? 0, ...(l.frameSeq?.frames ?? []), ...(l.spawn?.frames ?? [])]) expect(f < a.quadros.length, `${s}: ${l.asset}[${f}]`).toBe(true);
        if (l.assetVirado) expect(atlas[l.assetVirado], l.assetVirado).toBeDefined();
      }
    }
  });

  it("sem atlas (sem assets, ou no teste) nenhuma receita fica pronta: o motor toca o procedural", () => {
    const fx = new SpritesFx("/nada/");
    expect(fx.receitaPronta("fire-punch")).toBeNull();
    expect(fx.receitaDe("fire-punch")?.anim.slug).toBe("fire-punch");
    expect(fx.receitaDe("thunder-punch")?.tipo).toBe(3);
  });
});

describe("fundos de batalha", () => {
  it("cada tipo tem fundos que existem e a semente varia o fundo sem trocar no meio da luta", async () => {
    const { cenario, biomasDoTipo } = await import("../lib/poke/dex");
    const pasta = path.resolve(__dirname, "../../public/fundos");
    const vistos = new Set<string>();
    for (const tipo of [...Array.from({ length: 18 }, (_, i) => i), "campeao" as const, null]) {
      for (const hora of ["dia", "tarde", "noite"] as const) {
        for (let s = 0; s < 40; s++) {
          const url = cenario(tipo, s, hora);
          const arq = url.split("/").pop()!;
          expect(fs.existsSync(path.join(pasta, arq)), arq).toBe(true);
          vistos.add(arq);
        }
      }
      expect(biomasDoTipo(tipo).length).toBeGreaterThan(0);
    }
    expect(cenario(4, "x", "dia")).toBe(cenario(4, "x", "dia"));
    expect(new Set(Array.from({ length: 30 }, (_, s) => cenario(0, s, "dia"))).size).toBeGreaterThan(4);
    expect(vistos.size).toBeGreaterThan(150);
  });
});
