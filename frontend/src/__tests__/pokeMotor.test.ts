import { describe, expect, it } from "vitest";
import dexJson from "../data/pokedex.json";
import type { Candidata } from "../lib/batalha";
import { resumir } from "../lib/batalha";
import { atributos, efetividade, evolucaoPorNivel, formaNoNivel, golpesNoNivel, nivelDoXpPoke, xpDoNivel, xpMinimoPorVitoria, type Dex } from "../lib/poke/dex";
import {
  avancarPoke,
  criarMon,
  escolherOferta,
  especieDaQuestao,
  hpMax,
  montarPartidaPoke,
  perfilInicial,
  precisaTrocar,
  registrarLicaoPoke,
  responderPoke,
  sincronizarPerfil,
  trocar,
  usarItem,
  type PartidaPoke,
} from "../lib/poke/motor";

const dex = dexJson as unknown as Dex;

const cand = (id: number, materia = "Português", extra: Partial<Candidata> = {}): Candidata => ({
  questaoId: id,
  materia,
  nivel: 0,
  erros: 0,
  dificuldade: "media",
  ...extra,
});

function partida(n = 8, extras: Partial<Candidata>[] = [], nivel = 10): PartidaPoke {
  const time = [criarMon(dex, 4, nivel, "a")];
  const pendentes = Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português", extras[i]));
  return montarPartidaPoke({ dex, time, mochila: { "poke-ball": 3, potion: 1 }, pendentes, novas: [], concursoId: null, semente: 11 })!;
}

const certo = (p: PartidaPoke) => responderPoke(dex, p, { acertou: true, confianca: "duvida", acao: { golpe: p.time[p.ativo].golpes[0] } });
const errado = (p: PartidaPoke, confianca: "certeza" | "duvida" = "duvida") =>
  responderPoke(dex, p, { acertou: false, confianca, acao: { golpe: p.time[p.ativo].golpes[0] } });

describe("dex", () => {
  it("tabela de tipos", () => {
    expect(efetividade(2, [1])).toBe(2); // água em fogo
    expect(efetividade(3, [8])).toBe(0); // elétrico em terra
    expect(efetividade(1, [2, 14])).toBe(0.25); // fogo em água/dragão
    expect(efetividade(14, [17])).toBe(0); // dragão em fada
  });
  it("atributos e curva de XP", () => {
    expect(atributos(dex.especies[1], 5).hp).toBe(20);
    expect(nivelDoXpPoke(xpDoNivel(17))).toBe(17);
    expect(nivelDoXpPoke(xpDoNivel(17) - 1)).toBe(16);
  });
  it("evolução por nível e forma do inimigo", () => {
    expect(evolucaoPorNivel(dex.especies[4], 15)).toBeNull();
    expect(evolucaoPorNivel(dex.especies[4], 16)).toBe(5);
    expect(formaNoNivel(dex, 4, 40)).toBe(6);
    expect(golpesNoNivel(dex.especies[1], 5).length).toBeLessThanOrEqual(4);
  });
});

describe("montagem", () => {
  it("a mesma questão é sempre o mesmo Pokémon", () => {
    expect(especieDaQuestao(dex, 42, "Português", 10)).toBe(especieDaQuestao(dex, 42, "Português", 10));
  });
  it("treinadores em grupos, líder no fim, questões com erro selvagens", () => {
    const p = partida(8, [{ erros: 2 }]);
    const todos = [p.atual!, ...p.fila];
    expect(todos).toHaveLength(8);
    expect(todos[todos.length - 1].tipo).toBe("lider");
    expect(todos.filter((e) => e.tipo === "selvagem").map((e) => e.questaoId)).toEqual([]); // a de erro virou líder
    const p2 = partida(8, [{ erros: 1 }, {}, {}, { erros: 3 }]);
    expect([p2.atual!, ...p2.fila].some((e) => e.tipo === "selvagem" && e.questaoId === 1)).toBe(true);
  });
});

describe("turno", () => {
  it("acerto derruba, dá XP e o treinador vencido rende oferta", () => {
    let p = partida();
    const t0 = p.atual!.treinador;
    let guard = 0;
    while (p.atual && p.atual.treinador === t0 && guard++ < 5) {
      const r = certo(p);
      expect(r.eventos.some((e) => e.tipo === "desmaiouInimigo")).toBe(true);
      expect(r.eventos.some((e) => e.tipo === "xp")).toBe(true);
      p = avancarPoke(r.partida, dex);
    }
    expect(p.oferta).toHaveLength(3);
    const item = p.oferta![0];
    const antes = p.mochila[item] ?? 0;
    p = escolherOferta(p, item, dex);
    expect(p.mochila[item]).toBe(antes + 1);
    expect(p.atual).not.toBeNull();
  });

  it("erro tira HP, a questão volta como selvagem, certeza dói mais", () => {
    const p = partida(8, [], 20);
    const a = errado(p, "duvida");
    const b = errado(p, "certeza");
    const da = (a.eventos.find((e) => e.tipo === "contra") as { dano: number }).dano;
    const db = (b.eventos.find((e) => e.tipo === "contra") as { dano: number }).dano;
    expect(db).toBeGreaterThan(da);
    expect(a.partida.time[0].hp).toBeLessThan(p.time[0].hp);
    const volta = a.partida.fila.find((e) => e.questaoId === p.atual!.questaoId);
    expect(volta?.tipo).toBe("selvagem");
    expect(volta?.retorno).toBe(true);
  });

  it("time inteiro desmaiado é derrota; desmaio com reserva pede troca", () => {
    let p = partida(10, [], 3);
    p = { ...p, time: [...p.time, { ...p.time[0], uid: "b", hp: 1 }] };
    p.time[0] = { ...p.time[0], hp: 1 };
    let r = errado(p);
    expect(r.partida.fim).toBeNull();
    expect(precisaTrocar(r.partida)).toBe(true);
    let q = trocar(avancarPoke(r.partida, dex), 1);
    expect(q.ativo).toBe(1);
    r = errado(q);
    expect(r.partida.fim).toBe("derrota");
  });

  it("captura só em selvagem, gasta bola e entra no time", () => {
    let p = partida(8, [{}, { erros: 1 }, {}, {}, {}, { erros: 5 }]);
    let guard = 0;
    while (p.atual?.tipo !== "selvagem" && guard++ < 20) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else p = avancarPoke(certo(p).partida, dex);
    }
    expect(p.atual?.tipo).toBe("selvagem");
    // em treinador não dá (já testado pela guarda do motor); aqui tenta até capturar
    let capturou = false;
    for (let s = 0; s < 20 && !capturou; s++) {
      const r = responderPoke(dex, { ...p, rng: s * 977 }, { acertou: true, confianca: "certeza", acao: { bola: "poke-ball" } });
      expect(r.partida.mochila["poke-ball"]).toBe(p.mochila["poke-ball"] - 1);
      const ev = r.eventos.find((e) => e.tipo === "bola") as { sucesso: boolean } | undefined;
      if (ev?.sucesso) {
        capturou = true;
        expect(r.partida.time).toHaveLength(2);
        expect(r.partida.registros.at(-1)!.capturada).toBe(true);
        const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), r.partida);
        expect(perfil.colecao).toHaveLength(2);
        expect(perfil.capturadasQuestoes).toContain(p.atual!.questaoId);
      }
    }
    expect(capturou).toBe(true);
    // resposta errada não lança bola
    const r = responderPoke(dex, p, { acertou: false, confianca: "duvida", acao: { bola: "poke-ball" } });
    expect(r.partida.mochila["poke-ball"]).toBe(p.mochila["poke-ball"]);
  });

  it("subir de nível evolui (Charmander 15 -> Charmeleon)", () => {
    let p = partida(8, [], 15);
    p = { ...p, time: [{ ...p.time[0], xp: xpDoNivel(16) - 1 }] };
    const r = certo(p);
    expect(r.eventos.some((e) => e.tipo === "evolui" && e.para === 5)).toBe(true);
    expect(r.partida.time[0].id).toBe(5);
  });

  it("itens: poção cura, pedra evolui, doce raro sobe nível", () => {
    const p = partida();
    const ferido = { ...p, time: [{ ...p.time[0], hp: 5 }], mochila: { potion: 1, "rare-candy": 1 } };
    const r = usarItem(dex, ferido, "potion", 0);
    expect(r.partida.time[0].hp).toBe(Math.min(25, hpMax(dex, p.time[0])));
    expect(r.partida.mochila.potion).toBe(0);
    const d = usarItem(dex, ferido, "rare-candy", 0);
    expect(d.eventos.some((e) => e.tipo === "nivel")).toBe(true);
    const pika = { ...p, time: [{ ...p.time[0], ...criarMon(dex, 25, 10, "a") }], mochila: { "thunder-stone": 1, "fire-stone": 1 } };
    expect(usarItem(dex, pika, "fire-stone", 0).partida).toBe(pika);
    expect(usarItem(dex, pika, "thunder-stone", 0).partida.time[0].id).toBe(26);
  });

  it("lição cura uma vez e o resumo da batalha clássica funciona", () => {
    const p = partida(8, [], 20);
    const r = errado(p);
    const l1 = registrarLicaoPoke(dex, r.partida, p.atual!.questaoId, "porque a lei diz trinta dias");
    expect(l1.curou).toBeGreaterThan(0);
    expect(registrarLicaoPoke(dex, l1.partida, p.atual!.questaoId, "porque a lei diz trinta dias!").curou).toBe(0);
    expect(resumir(r.partida).erradas).toEqual([p.atual!.questaoId]);
  });
});

describe("ritmo de evolução", () => {
  it("inicial evolui em ~5 lutas de treinador (2–3 Pokémon cada) só acertando", () => {
    let mon = criarMon(dex, 1, 5, "b"); // Bulbasaur, evolui no 16
    let derrubados = 0;
    for (let jornada = 0; jornada < 5 && mon.id === 1; jornada++) {
      const pendentes = Array.from({ length: 12 }, (_, i) => cand(jornada * 100 + i + 1, i % 2 ? "Banco de Dados" : "Português"));
      let p = montarPartidaPoke({ dex, time: [mon], mochila: {}, pendentes, novas: [], concursoId: null, semente: 7 + jornada })!;
      while (!p.fim && p.time[0].id === 1) {
        if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
        if (!p.atual) p = avancarPoke(p, dex);
        if (!p.atual) break;
        p = certo(p).partida;
        derrubados++;
      }
      mon = { ...mon, id: p.time[0].id, xp: p.time[0].xp };
    }
    expect(mon.id).toBe(2);
    expect(derrubados).toBeGreaterThanOrEqual(10);
    expect(derrubados).toBeLessThanOrEqual(15);
  });

  it("sem evolução por nível pela frente, vale só a fórmula", () => {
    expect(xpMinimoPorVitoria(dex, 3, 40)).toBe(0); // Venusaur
    expect(xpMinimoPorVitoria(dex, 1, 5)).toBe(Math.ceil((xpDoNivel(16) - xpDoNivel(5)) / 12.5));
    expect(xpMinimoPorVitoria(dex, 2, 16)).toBe(Math.ceil((xpDoNivel(32) - xpDoNivel(16)) / 12.5));
  });
});

