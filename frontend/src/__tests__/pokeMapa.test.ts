import { describe, expect, it } from "vitest";
import dexJson from "../data/pokedex.json";
import type { Dex } from "../lib/poke/dex";
import { REGIOES, perfilInicial, type PerfilPoke } from "../lib/poke/motor";
import { caminhoNoMapa, mapaDaRegiao, numeroDaRota, pontosDaLigacao, posicaoNoMapa } from "../lib/poke/mapas";
import { trechoDe, TRECHO_VITORIA } from "../lib/poke/rotas";

const dex = dexJson as unknown as Dex;
const kanto = mapaDaRegiao(0)!;
const ids = new Set(kanto.lugares.map((x) => x.id));

describe("mapa de Kanto", () => {
  it("tem todas as rotas do modo história e as cidades dos ginásios", () => {
    for (let t = 0; t <= TRECHO_VITORIA; t++) for (const r of trechoDe(0, t)!.rotas) expect(ids, r.nome).toContain(r.nome);
    for (const g of REGIOES[0].ginasios) expect(ids).toContain(g.cidade);
  });

  it("ligações só entre lugares que existem, e o continente é todo ligado", () => {
    for (const [a, b] of kanto.ligacoes) {
      expect(ids).toContain(a);
      expect(ids).toContain(b);
    }
    expect(caminhoNoMapa(kanto, "Pallet", "Platô Indigo")).not.toBeNull();
    expect(caminhoNoMapa(kanto, "Pallet", "Rota 25")).not.toBeNull();
    expect(caminhoNoMapa(kanto, "Pallet", "Floresta das Frutas")).toBeNull(); // Sevii: de barco
    expect(caminhoNoMapa(kanto, "Pallet", "Viridian")).toEqual(["Pallet", "Rota 1", "Viridian"]);
  });

  it("estradas com cotovelos seguem a direção pedida", () => {
    expect(pontosDaLigacao(kanto, "Rota 22", "Rota 23")).toEqual([[102, 318], [45, 318], [45, 262]]);
    expect(pontosDaLigacao(kanto, "Rota 23", "Rota 22")).toEqual([[45, 262], [45, 318], [102, 318]]);
    expect(pontosDaLigacao(kanto, "Pallet", "Pewter")).toBeNull();
    expect(numeroDaRota("Rota Marítima 19")).toBe("19");
    expect(numeroDaRota("Rota 24 (Ponte Pepita)")).toBe("24");
  });

  it("posição acompanha o progresso", () => {
    const base = perfilInicial(dex, 1, "a");
    expect(posicaoNoMapa(base, null)!.aqui).toBe("Pallet");
    const andando: PerfilPoke = { ...base, historiaPorRegiao: [2] };
    const p1 = posicaoNoMapa(andando, null)!;
    expect(trechoDe(0, 0)!.rotas.map((r) => r.nome)).toContain(p1.aqui);
    expect(p1.destino).toBe("Pewter");
    const comInsignia: PerfilPoke = { ...base, insigniasPorRegiao: [1], ginasios: 1 };
    const p2 = posicaoNoMapa(comInsignia, null)!;
    expect(p2.aqui).toBe("Pewter");
    expect(p2.insignias).toEqual(["Pewter"]);
    expect(p2.visitados).toContain("Floresta de Viridian");
    // a trilha segue o mapa: entre a Rota 5 e a Rota 6 passa por Saffron
    const rumoVermilion: PerfilPoke = { ...base, insigniasPorRegiao: [2], ginasios: 2, historiaPorRegiao: [4] };
    const p3 = posicaoNoMapa(rumoVermilion, null)!;
    expect(p3.aqui).toBe("Rota 6");
    expect(p3.visitados).toContain("Saffron");
    expect(p3.trilha).toContainEqual(["Saffron", "Rota 6"]);
    expect(p3.visitados).not.toContain("Vermilion");
  });
});
