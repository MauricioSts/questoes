// Camada visual dos golpes: todo golpe do catálogo tem spec, toca sem exceção com seed
// fixa (sem navegador: o teste move o relógio do motor) e respeita o teto de partículas.
import { describe, expect, it } from "vitest";
import { CATALOGO } from "../components/poke/golpes/catalogo";
import { MotorGolpes } from "../components/poke/golpes/motor";
import { specDoGolpe, specPorSlug, todasAsSpecs } from "../components/poke/golpes/spec";
import type { Ancora, Resultado } from "../components/poke/golpes/tipos";
import dex from "../data/pokedex.json";

const meu: Ancora = { x: 240, y: 380, w: 110, h: 110, lado: "meu", chave: "meu-0" };
const ini: Ancora = { x: 710, y: 170, w: 80, h: 80, lado: "inimigo", chave: "inimigo-0" };

async function tocarAteOFim(m: MotorGolpes, slug: string, outcome: Resultado = "hit", power = 80) {
  const spec = specPorSlug(slug)!;
  const t = m.tocar(spec, { attacker: meu, targets: [ini], power, outcome, seed: 42 });
  let acabou = false;
  let impactou = false;
  t.fim.then(() => (acabou = true));
  t.impacto.then(() => (impactou = true));
  for (let i = 0; i < 2000 && !acabou; i++) {
    m.tick(16);
    await Promise.resolve();
    await Promise.resolve();
  }
  return { acabou, impactou };
}

describe("camada visual dos golpes", () => {
  it("catálogo tem os 559 golpes das gerações 1–5, sem slug repetido", () => {
    expect(CATALOGO).toHaveLength(559);
    expect(new Set(CATALOGO.map((l) => l.slug)).size).toBe(559);
    for (const l of CATALOGO) {
      expect(l.tipo, l.nome).toBeGreaterThanOrEqual(0);
      expect(l.notas.length, l.nome).toBeGreaterThan(10);
    }
  });

  it("todo slug do catálogo tem spec", () => {
    const sem = CATALOGO.filter((l) => !specPorSlug(l.slug)).map((l) => l.slug);
    expect(sem).toEqual([]);
  });

  it("todo golpe da pokédex do jogo ganha spec", () => {
    for (const g of (dex as unknown as { golpes: Parameters<typeof specDoGolpe>[0][] }).golpes) expect(specDoGolpe(g).archetype).toBeTruthy();
  });

  it("dois golpes nunca têm a mesma assinatura visual", () => {
    const vistos = new Map<string, string>();
    for (const s of todasAsSpecs()) {
      const assinatura = JSON.stringify([s.archetype, s.palette, s.shape, s.motion, s.sabor, s.variacao.toFixed(3)]);
      expect(vistos.get(assinatura), `${s.slug} = ${vistos.get(assinatura)}`).toBeUndefined();
      vistos.set(assinatura, s.slug);
    }
  });

  it("cada golpe toca até o fim sem exceção, marca o impacto e respeita o teto", async () => {
    const m = new MotorGolpes();
    m.autoLoop = false;
    const falhas: string[] = [];
    for (const l of CATALOGO) {
      m.picoVivas = 0;
      const r = await tocarAteOFim(m, l.slug);
      if (!r.acabou || !r.impactou) falhas.push(`${l.slug} acabou=${r.acabou} impactou=${r.impactou}`);
      m.limparTudo();
    }
    expect(falhas).toEqual([]);
    expect(m.erros).toEqual([]);
  }, 120_000);

  it("resultados (erro, sem efeito, crítico, super, pouco efetivo) e tier épico tocam", async () => {
    const m = new MotorGolpes();
    m.autoLoop = false;
    for (const slug of ["thunderbolt", "tackle", "fire-blast", "earthquake", "fury-swipes", "dig", "toxic", "sheer-cold"])
      for (const o of ["miss", "noEffect", "crit", "superEffective", "notVeryEffective"] as Resultado[]) {
        const r = await tocarAteOFim(m, slug, o, 150);
        expect(r.acabou, `${slug} ${o}`).toBe(true);
        expect(m.picoVivas).toBeLessThanOrEqual(400);
        m.limparTudo();
      }
    expect(m.erros).toEqual([]);
  }, 60_000);

  it("pular resolve na hora", async () => {
    const m = new MotorGolpes();
    m.autoLoop = false;
    const t = m.tocar(specPorSlug("hyper-beam")!, { attacker: meu, targets: [ini], power: 150, outcome: "hit", seed: 1 });
    m.tick(50);
    m.pular();
    let acabou = false;
    t.fim.then(() => (acabou = true));
    for (let i = 0; i < 40 && !acabou; i++) {
      m.tick(0);
      await Promise.resolve();
    }
    expect(acabou).toBe(true);
    expect(m.vivas).toBe(0);
  });

  it("lê a descrição: hits, setas, status e dois turnos", () => {
    expect(specPorSlug("double-kick")!.hits).toEqual({ min: 2, max: 2 });
    expect(specPorSlug("fury-attack")!.hits).toEqual({ min: 2, max: 5 });
    expect(specPorSlug("swords-dance")!.stats).toEqual([{ stat: "atk", n: 2 }]);
    expect(specPorSlug("shell-smash")!.stats?.length).toBe(5);
    expect(specPorSlug("hypnosis")!.statusInflige).toBe("sleep");
    expect(specPorSlug("thunder-wave")!.statusInflige).toBe("paralysis");
    expect(specPorSlug("toxic")!.statusInflige).toBe("toxic");
    expect(specPorSlug("dig")!.twoTurn?.persistentState).toBe("underground");
    expect(specPorSlug("fly")!.twoTurn?.persistentState).toBe("airborne");
    expect(specPorSlug("dive")!.twoTurn?.persistentState).toBe("underwater");
    expect(specPorSlug("shadow-force")!.twoTurn?.persistentState).toBe("vanished");
    expect(specPorSlug("solar-beam")!.twoTurn?.persistentState).toBe("charging");
    expect(specPorSlug("hyper-beam")!.recarga).toBe(true);
    expect(specPorSlug("double-edge")!.recoil).toBe(true);
  });
});
