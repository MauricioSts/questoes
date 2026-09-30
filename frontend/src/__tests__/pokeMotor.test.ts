import { describe, expect, it } from "vitest";
import dexJson from "../data/pokedex.json";
import type { Candidata } from "../lib/batalha";
import { resumir } from "../lib/batalha";
import { atributos, efetividade, evolucaoPorNivel, formaNoNivel, golpesNoNivel, nivelDoXpPoke, xpDoNivel, xpMinimoPorVitoria, type Dex } from "../lib/poke/dex";
import {
  GINASIOS,
  MAX_TROCAS,
  REGIOES,
  avancarPoke,
  campeaoDe,
  ligaLiberada,
  podeLutar,
  podeTrocarSelvagem,
  proximaRegiao,
  trocarSelvagem,
  viajar,
  chanceCaptura,
  decidirGolpe,
  definirGolpes,
  golpesDisponiveis,
  insigniasDe,
  criarMon,
  danoDaResposta,
  escolherOferta,
  especieDaQuestao,
  hpMax,
  levelCap,
  lutador,
  montarPartidaPoke,
  XP_SELVAGEM,
  perfilInicial,
  precisaTrocar,
  registrarLicaoPoke,
  responderPoke,
  sincronizarPerfil,
  historiaDe,
  liderLiberado,
  treinadoresParaGinasio,
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

// seis Pokémon de pé (Liga inteira só com acertos ainda leva revides)
const timeCheio = (nivel: number) => [6, 9, 3, 26, 134, 143].map((id, i) => lutador(dex, criarMon(dex, id, nivel, `t${i}`)));

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

// avança até haver um Pokémon inimigo de pé (pegando a 1ª recompensa no caminho)
function seguir(p: PartidaPoke): PartidaPoke {
  for (let g = 0; g < 10 && !p.fim && (!p.atual || p.atual.fim || p.oferta); g++) p = p.oferta ? escolherOferta(p, p.oferta[0], dex) : avancarPoke(p, dex);
  return p;
}

describe("montagem", () => {
  it("a mesma questão é sempre o mesmo Pokémon", () => {
    expect(especieDaQuestao(dex, 42, "Português", 10)).toBe(especieDaQuestao(dex, 42, "Português", 10));
  });
  it("treinadores em grupos, líder no fim, reserva com o resto, questões com erro selvagens", () => {
    const p = partida(8, [{ erros: 2 }]);
    const todos = [p.atual!, ...p.fila];
    expect(todos.length).toBeLessThan(8);
    expect(todos.length + p.reserva.length).toBe(8);
    expect(todos[todos.length - 1].tipo).toBe("lider");
    expect(todos.every((e) => e.hp === atributos(dex.especies[e.especie], e.nivel).hp)).toBe(true);
    const p2 = partida(8, [{ erros: 1 }, {}, {}, { erros: 3 }]);
    expect([p2.atual!, ...p2.fila].some((e) => e.tipo === "selvagem" && e.questaoId === 1)).toBe(true);
  });
});

describe("turno", () => {
  it("acerto tira HP; o Pokémon de pé recebe a próxima questão da reserva", () => {
    const p = partida(12, [], 10);
    const r = certo(p);
    const at = r.eventos.find((e) => e.tipo === "ataque") as { dano: number; hpInimigo: number };
    expect(at.dano).toBeGreaterThan(0);
    if (!r.partida.atual!.fim) {
      expect(r.partida.atual!.hp).toBe(at.hpInimigo);
      expect(r.partida.atual!.questaoId).toBe(p.reserva[0].questaoId);
      expect(r.partida.reserva).toHaveLength(p.reserva.length - 1);
      expect(avancarPoke(r.partida, dex)).toBe(r.partida);
    }
  });

  it("tipo conta: fogo em planta tira mais que em água", () => {
    const p = partida(8, [], 10);
    const eu = p.time[0];
    const ember = dex.golpes.findIndex((g) => g[0] === "Ember");
    const contra = (especie: number) =>
      danoDaResposta({ dex, eu, e: { ...p.atual!, especie, nivel: 10, tipo: "treinador" }, golpe: dex.golpes[ember], critico: false, aleatorio: 1 });
    const planta = contra(1); // Bulbasaur (planta/veneno)
    const agua = contra(7); // Squirtle
    expect(planta.efetividade).toBe(2);
    expect(agua.efetividade).toBe(0.5);
    expect(planta.valor / atributos(dex.especies[1], 10).hp).toBeGreaterThan((agua.valor / atributos(dex.especies[7], 10).hp) * 3);
  });

  it("golpe de status envenena o inimigo e o veneno tira HP no fim do turno", () => {
    const p = partida(12, [], 10);
    const pp = dex.golpes.findIndex((g) => g[0] === "Poison Powder");
    const eu = { ...p.time[0], golpes: [pp] };
    // alvo sem imunidade a veneno
    const q: PartidaPoke = { ...p, time: [eu], atual: { ...p.atual!, especie: 16 } };
    const r = responderPoke(dex, q, { acertou: true, confianca: "duvida", acao: { golpe: pp } });
    expect(r.eventos.some((e) => e.tipo === "statusInimigo" && e.status === "poison")).toBe(true);
    const t = r.eventos.find((e) => e.tipo === "tiqueInimigo") as { dano: number } | undefined;
    expect(t?.dano).toBeGreaterThan(0);
    expect(r.partida.atual!.status).toBe("poison");
    // Poison Powder em Pokémon de veneno não pega
    const r2 = responderPoke(dex, { ...q, atual: { ...q.atual!, especie: 23 } }, { acertou: true, confianca: "duvida", acao: { golpe: pp } });
    expect(r2.eventos.some((e) => e.tipo === "statusFalhou")).toBe(true);
  });

  it("acertos derrubam, dão XP e o treinador vencido rende oferta", () => {
    let p = partida(12, [], 10);
    const t0 = p.atual!.treinador;
    let kos = 0;
    let guard = 0;
    while (p.atual && p.atual.treinador === t0 && !p.oferta && guard++ < 20) {
      const r = certo(p);
      if (r.eventos.some((e) => e.tipo === "desmaiouInimigo")) {
        kos++;
        expect(r.eventos.some((e) => e.tipo === "xp")).toBe(true);
      }
      p = avancarPoke(r.partida, dex);
    }
    expect(kos).toBeGreaterThan(0);
    expect(p.oferta).toHaveLength(3);
    const item = p.oferta![0];
    const antes = p.mochila[item] ?? 0;
    p = escolherOferta(p, item, dex);
    expect(p.mochila[item]).toBe(antes + 1);
    expect(p.atual).not.toBeNull();
  });

  it("erro tira HP, o inimigo fica, a questão volta como selvagem, certeza dói mais", () => {
    const p = partida(12, [], 20);
    const a = errado(p, "duvida");
    const b = errado(p, "certeza");
    const da = (a.eventos.find((e) => e.tipo === "contra") as { dano: number }).dano;
    const db = (b.eventos.find((e) => e.tipo === "contra") as { dano: number }).dano;
    expect(db).toBeGreaterThan(da);
    expect(a.partida.time[0].hp).toBeLessThan(p.time[0].hp);
    expect(a.partida.atual!.fim).toBeUndefined();
    expect(a.partida.atual!.chave).toBe(p.atual!.chave);
    const volta = a.partida.fila.find((e) => e.questaoId === p.atual!.questaoId);
    expect(volta?.tipo).toBe("selvagem");
    expect(volta?.retorno).toBe(true);
    expect(volta?.chave).not.toBe(p.atual!.chave);
  });

  it("inimigo dormindo não contra-ataca", () => {
    const p = partida(12, [], 20);
    const r = errado({ ...p, atual: { ...p.atual!, status: "sleep", sono: 3 } });
    expect(r.eventos.some((e) => e.tipo === "inimigoImpedido")).toBe(true);
    expect(r.eventos.some((e) => e.tipo === "contra")).toBe(false);
  });

  it("time inteiro desmaiado é derrota; desmaio com reserva pede troca", () => {
    let p = partida(10, [], 3);
    p = { ...p, time: [...p.time, { ...p.time[0], uid: "b", hp: 1 }] };
    p.time[0] = { ...p.time[0], hp: 1 };
    let r = errado(p);
    expect(r.partida.fim).toBeNull();
    expect(precisaTrocar(r.partida)).toBe(true);
    const q = trocar(avancarPoke(r.partida, dex), 1);
    expect(q.ativo).toBe(1);
    r = errado(q);
    expect(r.partida.fim).toBe("derrota");
  });

  it("captura só em selvagem, gasta bola e entra no time; falhar não derruba", () => {
    let p = partida(8, [{}, { erros: 1 }, {}, {}, {}, { erros: 5 }]);
    let guard = 0;
    while (p.atual?.tipo !== "selvagem" && guard++ < 30) p = seguir(certo(seguir(p)).partida);
    expect(p.atual?.tipo).toBe("selvagem");
    let capturou = false;
    let falhou = false;
    for (let s = 0; s < 30 && !(capturou && falhou); s++) {
      const r = responderPoke(dex, { ...p, rng: s * 977 }, { acertou: true, confianca: "certeza", acao: { bola: "poke-ball" } });
      expect(r.partida.mochila["poke-ball"]).toBe(p.mochila["poke-ball"] - 1);
      const ev = r.eventos.find((e) => e.tipo === "bola") as { sucesso: boolean } | undefined;
      if (ev?.sucesso) {
        capturou = true;
        expect(r.partida.time).toHaveLength(2);
        expect(r.partida.atual!.fim).toBe("captura");
        expect(r.partida.registros.at(-1)!.capturada).toBe(true);
        const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), r.partida);
        expect(perfil.colecao).toHaveLength(2);
        expect(perfil.capturadasQuestoes).toContain(p.atual!.questaoId);
      } else if (r.partida.reserva.length < p.reserva.length) {
        falhou = true;
        expect(r.eventos.some((e) => e.tipo === "desmaiouInimigo")).toBe(false);
        expect(r.partida.atual!.fim).toBeUndefined();
      }
    }
    expect(capturou).toBe(true);
    // HP baixo facilita
    expect(chanceCaptura(dex.especies[16], "poke-ball", "duvida", 0.1)).toBeGreaterThan(chanceCaptura(dex.especies[16], "poke-ball", "duvida", 1) + 0.3);
    // resposta errada não lança bola
    const r = responderPoke(dex, p, { acertou: false, confianca: "duvida", acao: { bola: "poke-ball" } });
    expect(r.partida.mochila["poke-ball"]).toBe(p.mochila["poke-ball"]);
  });

  it("subir de nível evolui (Charmander 15 -> Charmeleon)", () => {
    let p = partida(8, [], 15);
    p = { ...p, time: [{ ...p.time[0], xp: xpDoNivel(16) - 1 }], atual: { ...p.atual!, hp: 1 } };
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
    for (let jornada = 0; jornada < 8 && mon.id === 1; jornada++) {
      const pendentes = Array.from({ length: 18 }, (_, i) => cand(jornada * 100 + i + 1, i % 2 ? "Banco de Dados" : "Português"));
      let p = montarPartidaPoke({ dex, time: [mon], mochila: {}, pendentes, novas: [], concursoId: null, semente: 7 + jornada })!;
      for (let g = 0; g < 60 && !p.fim && p.time[0].id === 1; g++) {
        p = seguir(p);
        if (!p.atual || p.fim) break;
        const r = certo(p);
        if (r.eventos.some((e) => e.tipo === "desmaiouInimigo")) derrubados++;
        p = r.partida;
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


describe("modos da jornada", () => {
  const pend = (n: number) => Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português"));
  const montar = (modo: "ginasio" | "safari" | "liga", ginasio?: number, nivel = 10, extra: { regiao?: number; habitat?: number } = {}) =>
    montarPartidaPoke({ dex, time: [criarMon(dex, 4, nivel, "a")], mochila: { "poke-ball": 1 }, pendentes: pend(14), novas: pend(40).map((c) => ({ ...c, questaoId: c.questaoId + 100 })), concursoId: null, modo, ginasio, semente: 5, ...extra })!;
  const jogarAteOFim = (p0: PartidaPoke) => {
    let p = p0;
    for (let g = 0; g < 400 && !p.fim; g++) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l) => l.hp > 0));
      else if ((p.aprender ?? []).length) p = decidirGolpe(p, null).partida;
      else p = avancarPoke(certo(p).partida, dex);
    }
    return p;
  };

  it("ginásio: ajudantes do tipo e o líder no fim; vencer dá a insígnia", () => {
    const p = montar("ginasio", 0);
    expect(p.modo).toBe("ginasio");
    const lider = p.treinadores.at(-1)!;
    expect(lider).toMatchObject({ nome: "Brock", lider: true, insignia: 0 });
    const todos = [p.atual!, ...p.fila];
    expect(todos.every((e) => dex.especies[e.especie].t.includes(GINASIOS[0].tipo))).toBe(true);
    expect(todos.at(-1)!.tipo).toBe("lider");
    const fim = jogarAteOFim(p);
    expect(fim.fim).toBe("vitoria");
    const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), fim);
    expect(insigniasDe(perfil)).toBe(1);
    // o mesmo ginásio tem sempre o mesmo líder e os mesmos tipos
    expect(montar("ginasio", 0).fila.at(-1)!.especie).toBe(p.fila.at(-1)!.especie);
  });

  it("Pokémon de treinador não foge sem reserva: volta uma questão já feita", () => {
    let p = montar("ginasio", 0);
    p = certo(p).partida;
    p = { ...p, reserva: [], atual: { ...p.atual!, retorno: true } };
    const r = errado(p);
    expect(r.eventos.some((e) => e.tipo === "fuga")).toBe(false);
    expect(r.partida.atual!.fim).toBeUndefined();
    expect(r.partida.atual!.questaoId).not.toBe(p.atual!.questaoId);
    // e o ginásio só vale insígnia se o líder cair
    const semLider = sincronizarPerfil(perfilInicial(dex, 4, "a"), { ...p, fim: "vitoria", vencidos: [0, 1] });
    expect(insigniasDe(semLider)).toBe(0);
  });

  it("ginásio: erro volta na mesma luta (reserva), não como selvagem", () => {
    const p = montar("ginasio", 3, 30);
    const r = errado(p);
    expect(r.partida.fila.some((e) => e.tipo === "selvagem")).toBe(false);
    expect(r.partida.reserva.some((x) => x.questaoId === p.atual!.questaoId && x.retorno)).toBe(true);
  });

  it("Liga: Elite dos 4 e Campeão; vencer entra no Hall da Fama", () => {
    const p = { ...montar("liga", undefined, 50) };
    p.time = timeCheio(50);
    expect(p.treinadores.map((t) => t.nome)).toEqual(["Lorelei", "Bruno", "Agatha", "Lance", "Campeão Blue"]);
    const fim = jogarAteOFim(p);
    expect(fim.fim).toBe("vitoria");
    const perfil = sincronizarPerfil({ ...perfilInicial(dex, 4, "a"), ginasios: 8 }, fim);
    expect(perfil.campeao).toBe(1);
    expect(perfil.hallDaFama).toHaveLength(1);
  });

  it("modo história: treinadores do caminho liberam o líder; a insígnia zera o caminho", () => {
    const base = perfilInicial(dex, 4, "a");
    expect(treinadoresParaGinasio(0)).toBe(3);
    expect(treinadoresParaGinasio(7)).toBe(6);
    expect(liderLiberado(base)).toBe(false);
    const rota = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 10, "a")], mochila: {}, pendentes: pend(14), novas: [], concursoId: null, modo: "rota", rumo: 0, semente: 5 })!;
    expect(rota.rumo).toBe(0);
    expect(rota.treinadores[0].fala).toContain("Pewter");
    const doisVencidos = sincronizarPerfil(base, { ...rota, fim: "fuga", vencidos: [0, 1] });
    expect(historiaDe(doisVencidos)).toBe(2);
    expect(liderLiberado(doisVencidos)).toBe(false);
    // a mesma partida não conta duas vezes
    expect(historiaDe(sincronizarPerfil(doisVencidos, { ...rota, fim: "fuga", vencidos: [0, 1] }))).toBe(2);
    const outra = { ...rota, iniciadaEm: "2026-01-02T00:00:00.000Z", fim: "derrota" as const, vencidos: [0] };
    const liberado = sincronizarPerfil(doisVencidos, outra);
    expect(liderLiberado(liberado)).toBe(true);
    // ginásio vencido: insígnia e o caminho até o próximo recomeça
    const fim = jogarAteOFim(montar("ginasio", 0));
    const comInsignia = sincronizarPerfil(liberado, fim);
    expect(insigniasDe(comInsignia)).toBe(1);
    expect(historiaDe(comInsignia)).toBe(0);
    expect(liderLiberado(comInsignia)).toBe(false);
  });

  it("Zona Safári: só selvagens, Safari Balls da partida que não vão para o perfil", () => {
    const p = montar("safari");
    expect([p.atual!, ...p.fila].every((e) => e.tipo === "selvagem" && e.treinador === -1)).toBe(true);
    expect(p.treinadores).toHaveLength(0);
    expect(p.mochila["safari-ball"]).toBeGreaterThan(0);
    let capturou = false;
    for (let s = 0; s < 30 && !capturou; s++) {
      const r = responderPoke(dex, { ...p, rng: s * 131 }, { acertou: true, confianca: "duvida", acao: { bola: "safari-ball" } });
      capturou = r.eventos.some((e) => e.tipo === "bola" && e.sucesso);
      if (capturou) {
        const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), r.partida);
        expect(perfil.colecao).toHaveLength(2);
        expect(perfil.mochila["safari-ball"]).toBeUndefined();
      }
    }
    expect(capturou).toBe(true);
  });
});

describe("regiões", () => {
  const pend = (n: number) => Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português"));
  const montar = (modo: "ginasio" | "safari" | "liga" | "rota", extra: { regiao?: number; habitat?: number; ginasio?: number; terreno?: number } = {}, nivel = 10) =>
    montarPartidaPoke({ dex, time: [criarMon(dex, 4, nivel, "a")], mochila: { "poke-ball": 1 }, pendentes: pend(14), novas: pend(40).map((c) => ({ ...c, questaoId: c.questaoId + 100 })), concursoId: null, modo, semente: 5, ...extra })!;
  const jogarAteOFim = (p0: PartidaPoke) => {
    let p = p0;
    for (let g = 0; g < 400 && !p.fim; g++) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l) => l.hp > 0));
      else if ((p.aprender ?? []).length) p = decidirGolpe(p, null).partida;
      else p = avancarPoke(certo(p).partida, dex);
    }
    return p;
  };

  it("cada região tem 8 ginásios, Elite dos 4, Campeão e 3 iniciais que existem na Pokédex", () => {
    expect(REGIOES.map((r) => r.nome)).toEqual(["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova"]);
    for (const r of REGIOES) {
      expect(r.ginasios).toHaveLength(8);
      expect(r.elite).toHaveLength(4);
      expect(r.iniciais).toHaveLength(3);
      for (const id of [...r.iniciais, ...r.campeao.time]) expect(dex.especies[id]).toBeDefined();
    }
  });

  it("ginásio e Liga de Johto usam os treinadores de Johto e dão a insígnia de Johto", () => {
    const g = montar("ginasio", { regiao: 1, ginasio: 0 });
    expect(g.regiao).toBe(1);
    expect(g.treinadores.at(-1)).toMatchObject({ nome: "Falkner", insignia: 0 });
    expect([g.atual!, ...g.fila].every((e) => dex.especies[e.especie].t.includes(9))).toBe(true);
    const fim = jogarAteOFim(g);
    const base = { ...perfilInicial(dex, 4, "a"), ginasios: 8, campeao: 1, regiao: 1 };
    const perfil = sincronizarPerfil(base, fim);
    expect(insigniasDe(perfil, 1)).toBe(1);
    expect(insigniasDe(perfil, 0)).toBe(8); // Kanto intacto
    const liga = { ...montar("liga", { regiao: 1 }, 50), time: timeCheio(50) };
    expect(liga.treinadores.map((t) => t.nome)).toEqual(["Will", "Koga", "Bruno", "Karen", "Campeão Lance"]);
    const campeao = sincronizarPerfil({ ...perfil, insigniasPorRegiao: [8, 8, 0, 0, 0] }, jogarAteOFim(liga));
    expect(campeaoDe(campeao, 1)).toBe(1);
    expect(campeaoDe(campeao, 0)).toBe(1);
    expect(campeao.campeao).toBe(2);
  });

  it("ser Campeão libera a viagem: escolhe inicial da região nova e o time antigo fica no PC", () => {
    const kanto = perfilInicial(dex, 4, "a");
    expect(proximaRegiao(kanto)).toBeNull();
    expect(viajar(dex, kanto, 152, "b")).toBe(kanto);
    const campeao = { ...kanto, campeao: 1, ginasios: 8 };
    expect(proximaRegiao(campeao)).toBe(1);
    expect(viajar(dex, campeao, 1, "b")).toBe(campeao); // inicial de outra região não vale
    const johto = viajar(dex, campeao, 155, "b");
    expect(johto.regiao).toBe(1);
    expect(johto.time).toEqual(["b"]);
    expect(johto.colecao.map((m) => m.uid)).toEqual(["a", "b"]);
    expect(insigniasDe(johto)).toBe(0);
    expect(ligaLiberada(johto)).toBe(false);
    const [velho, novo] = johto.colecao;
    expect(podeLutar(johto, novo)).toBe(true);
    expect(podeLutar(johto, velho)).toBe(false);
    // Campeão de Johto: os antigos voltam a lutar
    expect(podeLutar({ ...johto, campeaoPorRegiao: [1, 1, 0, 0, 0] }, velho)).toBe(true);
  });

  it("capturas ficam marcadas com a região da jornada", () => {
    const p = montar("safari", { regiao: 2 });
    for (let s = 0; s < 30; s++) {
      const r = responderPoke(dex, { ...p, rng: s * 131 }, { acertou: true, confianca: "duvida", acao: { bola: "safari-ball" } });
      if (r.eventos.some((e) => e.tipo === "bola" && e.sucesso)) {
        expect(r.partida.time.at(-1)!.regiao).toBe(2);
        return;
      }
    }
    throw new Error("não capturou");
  });

  it("Zona Safári da região escolhida só tem Pokémon daquela região", () => {
    const naFaixa = (id: number, [a, b]: [number, number]) => {
      // a linha evolutiva tem alguma forma da região
      const linha = new Set<number>([id]);
      for (let k = 0; k < 3; k++) for (const x of [...linha]) { const pre = dex.especies[x]?.p; if (pre) linha.add(pre); for (const [para] of dex.especies[x]?.e ?? []) linha.add(para); }
      return [...linha].some((x) => x >= a && x <= b);
    };
    for (const [h, r] of REGIOES.entries()) {
      const p = montar("safari", { habitat: h, regiao: 4 });
      expect(p.habitat).toBe(h);
      expect([p.atual!, ...p.fila].every((e) => naFaixa(e.especie, r.faixa))).toBe(true);
    }
  });

  it("em Kanto só aparece a 1ª geração (inimigos e formas), em qualquer modo e nível", () => {
    for (const nivel of [10, 45, 80])
      for (const modo of ["rota", "safari", "liga"] as const)
        for (let g = 0; g < (modo === "liga" ? 1 : 8); g++) {
          const p = modo === "rota" || modo === "safari" ? montarPartidaPoke({ dex, time: [criarMon(dex, 4, nivel, "a")], mochila: {}, pendentes: pend(14), novas: [], concursoId: null, modo, semente: g * 7 + 1 })! : montar(modo, {}, nivel);
          const ids = [p.atual!, ...p.fila].map((e) => e.especie);
          expect(ids.filter((id) => id > 151)).toEqual([]);
        }
    for (let g = 0; g < 8; g++) {
      const p = montar("ginasio", { ginasio: g }, 60);
      expect([p.atual!, ...p.fila].every((e) => e.especie <= 151)).toBe(true);
    }
    // Safári de Johto ainda não abre em Kanto: cai para Kanto
    expect(montar("safari", { habitat: 1 }).habitat).toBe(0);
    // em Johto, 1ª e 2ª gerações
    const j = montar("safari", { regiao: 1, habitat: 1 }, 60);
    expect([j.atual!, ...j.fila].every((e) => e.especie <= 251)).toBe(true);
  });

  it("meu Pokémon não evolui para forma de geração futura (Golbat não vira Crobat em Kanto)", () => {
    const asa = dex.golpes.findIndex((g) => g[0] === "Wing Attack");
    const golbat = { ...criarMon(dex, 42, 40, "z"), xp: xpDoNivel(41) - 1, golpes: [asa] };
    const base = montarPartidaPoke({ dex, time: [golbat], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, modo: "rota", semente: 3 })!;
    const r = certo({ ...base, atual: { ...base.atual!, hp: 1 } });
    expect(r.eventos.some((e) => e.tipo === "evolui")).toBe(false);
    const emJohto = montarPartidaPoke({ dex, time: [golbat], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, modo: "rota", regiao: 1, semente: 3 })!;
    const r2 = certo({ ...emJohto, atual: { ...emJohto.atual!, hp: 1 } });
    expect(r2.eventos.some((e) => e.tipo === "evolui" && e.para === 169)).toBe(true);
  });

  it("terreno da Safári: Mato alto só tem Planta e Inseto, inclusive na troca", () => {
    const mato = 0;
    const deBase = (id: number) => {
      let x = id;
      while (dex.especies[x]?.p && dex.especies[x].p! <= 151) x = dex.especies[x].p!;
      return dex.especies[x].t;
    };
    for (let g = 0; g < 6; g++) {
      let p = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 20, "a")], mochila: {}, pendentes: pend(14), novas: [], concursoId: null, modo: "safari", terreno: mato, semente: g + 1 })!;
      expect(p.terreno).toBe(mato);
      const ids = [p.atual!, ...p.fila].map((e) => e.especie);
      for (let t = 0; t < MAX_TROCAS; t++) {
        p = trocarSelvagem(dex, p);
        ids.push(p.atual!.especie);
      }
      for (const id of ids) {
        expect(id).toBeLessThanOrEqual(151);
        expect(deBase(id).some((t) => t === 4 || t === 11)).toBe(true);
      }
    }
  });

  it("trocar o selvagem: outro Pokémon, mesma questão, até 3 vezes e só antes de responder", () => {
    let p = montar("safari", { habitat: 3, regiao: 3 });
    const q = p.atual!.questaoId;
    for (let i = 0; i < MAX_TROCAS; i++) {
      expect(podeTrocarSelvagem(p)).toBe(true);
      const antes = p.atual!;
      p = trocarSelvagem(dex, p);
      expect(p.atual!.questaoId).toBe(q);
      expect(p.atual!.especie).not.toBe(antes.especie);
      expect(p.atual!.chave).not.toBe(antes.chave);
      expect(p.atual!.hp).toBe(atributos(dex.especies[p.atual!.especie], p.atual!.nivel).hp);
    }
    expect(podeTrocarSelvagem(p)).toBe(false);
    expect(trocarSelvagem(dex, p)).toBe(p);
    // depois de responder, não troca mais
    const outro = montar("safari", { habitat: 3, regiao: 3 });
    const r = errado(outro);
    if (r.partida.atual && !r.partida.atual.fim) expect(podeTrocarSelvagem(r.partida)).toBe(false);
    // Pokémon de treinador não troca
    expect(podeTrocarSelvagem(montar("ginasio", { ginasio: 0 }))).toBe(false);
  });
});

describe("level cap, XP e revide", () => {
  const pend = (n: number) => Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português"));
  it("level cap = nível do próximo líder; Campeão da região não tem cap", () => {
    const p0 = perfilInicial(dex, 4, "a");
    expect(levelCap(p0)).toBe(GINASIOS[0].piso);
    expect(levelCap({ ...p0, ginasios: 3 })).toBe(GINASIOS[3].piso);
    expect(levelCap({ ...p0, ginasios: 8 })).toBe(REGIOES[0].campeao.piso);
    expect(levelCap({ ...p0, ginasios: 8, campeao: 1 })).toBe(100);
    expect(levelCap({ ...p0, regiao: 1, campeaoPorRegiao: [1, 0, 0, 0, 0] })).toBe(REGIOES[1].ginasios[0].piso);
  });

  it("no cap o XP não entra e o Doce Raro não sobe", () => {
    const eu = criarMon(dex, 4, 12, "a");
    const p = montarPartidaPoke({ dex, time: [eu], mochila: { "rare-candy": 1 }, pendentes: pend(8), novas: [], concursoId: null, cap: 12, semente: 3 })!;
    const r = certo({ ...p, atual: { ...p.atual!, hp: 1 } });
    expect(r.eventos.some((e) => e.tipo === "cap")).toBe(true);
    expect(r.partida.time[0].xp).toBe(eu.xp);
    expect(usarItem(dex, p, "rare-candy", 0).eventos).toHaveLength(0);
    // perto do cap, entra só até o cap
    const quase = { ...criarMon(dex, 4, 11, "b"), xp: xpDoNivel(12) - 5 };
    const p2 = montarPartidaPoke({ dex, time: [quase], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, cap: 12, semente: 3 })!;
    const r2 = certo({ ...p2, atual: { ...p2.atual!, hp: 1 } });
    expect(r2.partida.time[0].xp).toBe(xpDoNivel(12));
  });

  it("selvagem vale metade do XP de treinador", () => {
    const p = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 20, "a")], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, semente: 3 })!;
    const e = { ...p.atual!, hp: 1, especie: 19, nivel: 18 };
    const xpDe = (tipo: "treinador" | "selvagem") => {
      const r = certo({ ...p, atual: { ...e, tipo, treinador: tipo === "selvagem" ? -1 : 0 } });
      return (r.eventos.find((x) => x.tipo === "xp") as { valor: number }).valor;
    };
    expect(xpDe("selvagem")).toBeLessThanOrEqual(Math.ceil(xpDe("treinador") * XP_SELVAGEM) + 1);
  });

  it("acertou e o inimigo ficou de pé: ele revida mais fraco que no erro", () => {
    const p = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 10, "a")], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, semente: 3 })!;
    const forte = { ...p, atual: { ...p.atual!, hp: 9999, status: "" as const } };
    let revide = 0, contra = 0;
    for (let s = 1; s < 20; s++) {
      const a = certo({ ...forte, rng: s }).eventos.find((e) => e.tipo === "contra") as { dano: number; revide?: boolean } | undefined;
      const b = errado({ ...forte, rng: s }).eventos.find((e) => e.tipo === "contra") as { dano: number } | undefined;
      expect(a?.revide).toBe(true);
      revide += a!.dano;
      contra += b!.dano;
    }
    expect(revide).toBeLessThan(contra);
    // KO no acerto: sem revide
    expect(certo({ ...p, atual: { ...p.atual!, hp: 1 } }).eventos.some((e) => e.tipo === "contra")).toBe(false);
  });
});

describe("golpes", () => {
  it("com 4 golpes, o novo fica pendente e o jogador escolhe qual esquecer", () => {
    // Charmander Nv15 com 4 golpes; no 16 evolui e aprende golpe novo
    let p = partida(8, [], 15);
    const lv = dex.especies[4].g.find(([g, l]) => l > 15 && !p.time[0].golpes.includes(g))![1];
    const eu = { ...p.time[0], xp: xpDoNivel(lv) - 1, golpes: golpesNoNivel(dex.especies[4], lv - 1) };
    expect(eu.golpes).toHaveLength(4);
    let r = certo({ ...p, time: [eu], atual: { ...p.atual!, hp: 1 } });
    const quer = r.eventos.filter((e) => e.tipo === "querAprender");
    expect(quer.length).toBeGreaterThan(0);
    expect(r.partida.time[0].golpes).toEqual(r.partida.time[0].golpes.slice(0, 4));
    p = r.partida;
    const pend = p.aprender![0];
    const sai = p.time[0].golpes[0];
    r = decidirGolpe(p, sai);
    expect(r.partida.time[0].golpes).toContain(pend.golpe);
    expect(r.partida.time[0].golpes).not.toContain(sai);
    expect(r.partida.aprender).toHaveLength(p.aprender!.length - 1);
    // não aprender mantém os 4
    const r2 = decidirGolpe(p, null);
    expect(r2.partida.time[0].golpes).toEqual(p.time[0].golpes);
  });

  it("relembrar: troca por golpes que a linha evolutiva já aprendeu até o nível", () => {
    const m = criarMon(dex, 6, 40, "z"); // Charizard
    const disp = golpesDisponiveis(dex, m);
    const scratch = dex.golpes.findIndex((g) => g[0] === "Scratch");
    expect(disp).toContain(scratch); // golpe do Charmander
    const perfil = { ...perfilInicial(dex, 4, "a"), colecao: [m], time: ["z"] };
    const novo = definirGolpes(dex, perfil, "z", [scratch, 99999]);
    expect(novo.colecao[0].golpes).toEqual([scratch]);
  });
});
