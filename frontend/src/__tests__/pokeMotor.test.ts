import { describe, expect, it } from "vitest";
import dexJson from "../data/pokedex.json";
import type { Candidata } from "../lib/batalha";
import { resumir } from "../lib/batalha";
import { atributos, efetividade, evolucaoPorNivel, formaNoNivel, golpesNoNivel, nivelDoXpPoke, somarXp, xpDaCurva, xpDoNivel, type Dex } from "../lib/poke/dex";
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
  darItem,
  multItemAtaque,
  premiosDoGinasio,
  sortearOferta,
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
  turnoSemQuestao,
  seguirViagem,
  centroPokemon,
  moverNoTime,
  meusEmCampo,
  lutaAtiva,
  slotDaVez,
  encontroDaVez,
  comprarNaPartida,
  comprarNoPerfil,
  ajudantesVencidos,
  caminhoConcluido,
  faltamNoCaminho,
  rotaDoEncontro,
  rotasDoCaminho,
  lendaCapturada,
  lendaLiberada,
  rastroLiberado,
  capturadosDex,
  type PartidaPoke,
} from "../lib/poke/motor";
import { LENDAS } from "../lib/poke/lendas";
import { trechoDe } from "../lib/poke/rotas";

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

describe("XP como nos jogos", () => {
  it("fórmula da 5ª geração com o XP base real (Bulbasaur Nv5 derruba Pidgey Nv3 selvagem: 23)", () => {
    let p = partida(8, [], 5);
    p = { ...p, time: [lutador(dex, criarMon(dex, 1, 5, "a"))], atual: { ...p.atual!, tipo: "selvagem", treinador: -1, especie: 16, nivel: 3, hp: 1 } };
    const r = certo(p);
    expect((r.eventos.find((e) => e.tipo === "xp") as { valor: number }).valor).toBe(23);
  });

  it("curva da espécie: XP real de um nível na curva médio-lenta sobe exatamente um nível", () => {
    const bulba = dex.especies[1];
    expect(bulba.r).toBe(2);
    const faixa = xpDaCurva(2, 6) - xpDaCurva(2, 5);
    expect(somarXp(bulba, xpDoNivel(5), faixa)).toBe(xpDoNivel(6));
    expect(nivelDoXpPoke(somarXp(bulba, xpDoNivel(5), faixa - 1))).toBe(5);
    // curva lenta pede mais XP real por nível que a rápida
    expect(xpDaCurva(3, 20) - xpDaCurva(3, 19)).toBeGreaterThan(xpDaCurva(1, 20) - xpDaCurva(1, 19));
  });

  it("Exp. Share dá metade a quem segura; Exp. All ao time todo; Ovo da Sorte ×1,5", () => {
    const base = partida(8, [], 10);
    const time = [lutador(dex, criarMon(dex, 4, 10, "a")), lutador(dex, criarMon(dex, 7, 10, "b")), lutador(dex, criarMon(dex, 1, 10, "c"))];
    const xpPor = (p: PartidaPoke) => {
      const r = certo({ ...p, atual: { ...p.atual!, hp: 1, especie: 19, nivel: 10 } });
      return Object.fromEntries(r.eventos.filter((e) => e.tipo === "xp").map((e) => [(e as { uid: string }).uid, (e as { valor: number }).valor]));
    };
    const sem = xpPor({ ...base, time });
    expect(Object.keys(sem)).toEqual(["a"]);
    const share = xpPor({ ...base, time: [time[0], { ...time[1], item: "exp-share" }, time[2]] });
    expect(share.b).toBe(Math.floor(sem.a * 0.5) || 1);
    expect(share.c).toBeUndefined();
    const all = xpPor({ ...base, time, expAll: true });
    expect(Object.keys(all).sort()).toEqual(["a", "b", "c"]);
    const ovo = xpPor({ ...base, time: [{ ...time[0], item: "lucky-egg" }, time[1]] });
    expect(ovo.a).toBe(Math.floor(sem.a * 1.5));
    // desmaiado não ganha
    expect(xpPor({ ...base, time: [time[0], { ...time[1], hp: 0 }], expAll: true }).b).toBeUndefined();
  });

  it("quem entrou e saiu da luta divide o XP com quem derrubou", () => {
    const base = partida(8, [], 10);
    const time = [lutador(dex, criarMon(dex, 4, 10, "a")), lutador(dex, criarMon(dex, 7, 10, "b")), lutador(dex, criarMon(dex, 1, 10, "c"))];
    const xps = (r: ReturnType<typeof certo>) =>
      Object.fromEntries(r.eventos.filter((e) => e.tipo === "xp").map((e) => [(e as { uid: string }).uid, e as { valor: number; compartilhado?: boolean }]));
    const sozinho = xps(certo({ ...base, time, atual: { ...base.atual!, hp: 1, especie: 19, nivel: 10 } }));
    // a enfrenta, sai para b, b derruba: os dois levam metade, c (não entrou) nada
    let p: PartidaPoke = { ...base, time, atual: { ...base.atual!, especie: 19, nivel: 10 } };
    p = turnoSemQuestao(dex, p, { troca: 1 }).partida;
    expect(p.atual!.participantes).toEqual(["a", "b"]);
    const dividido = xps(certo({ ...p, atual: { ...p.atual!, hp: 1 } }));
    expect(dividido.a.valor).toBe(Math.floor(sozinho.a.valor * 0.5));
    expect(dividido.b.valor).toBe(Math.floor(sozinho.a.valor * 0.5));
    expect(dividido.a.compartilhado).toBeUndefined();
    expect(dividido.c).toBeUndefined();
    // quem saiu e desmaiou depois não ganha nem conta na divisão
    const caiu = xps(certo({ ...p, time: [{ ...p.time[0], hp: 0 }, ...p.time.slice(1)], atual: { ...p.atual!, hp: 1 } }));
    expect(caiu.a).toBeUndefined();
    expect(caiu.b.valor).toBe(sozinho.a.valor);
  });

  it("treinador vale 1,5× o selvagem", () => {
    const p = partida(8, [], 20);
    const e = { ...p.atual!, hp: 1, especie: 19, nivel: 18 };
    const xpDe = (tipo: "treinador" | "selvagem") =>
      (certo({ ...p, atual: { ...e, tipo, treinador: tipo === "selvagem" ? -1 : 0 } }).eventos.find((x) => x.tipo === "xp") as { valor: number }).valor;
    expect(xpDe("treinador")).toBeGreaterThanOrEqual(Math.floor((xpDe("selvagem") - 1) * 1.5));
    expect(xpDe("treinador")).toBeLessThanOrEqual(Math.ceil(xpDe("selvagem") * 1.5) + 1);
  });
});

describe("itens segurados e frutas", () => {
  it("reforço de tipo e itens de dano", () => {
    const ember = dex.golpes.find((g) => g[0] === "Ember")!;
    const tackle = dex.golpes.find((g) => g[0] === "Tackle")!;
    expect(multItemAtaque("charcoal", ember, 1)).toBe(1.2);
    expect(multItemAtaque("charcoal", tackle, 1)).toBe(1);
    expect(multItemAtaque("choice-band", tackle, 1)).toBe(1.5);
    expect(multItemAtaque("choice-specs", tackle, 1)).toBe(1);
    expect(multItemAtaque("expert-belt", tackle, 2)).toBe(1.2);
  });

  it("Fruta Oran é comida com metade do HP ou menos e some", () => {
    const p = partida(8, [], 10);
    const eu = p.time[0];
    const max = hpMax(dex, eu);
    const r = errado({ ...p, time: [{ ...eu, item: "oran-berry", hp: Math.floor(max / 2) }], atual: { ...p.atual!, hp: 9999 } });
    const ev = r.eventos.find((e) => e.tipo === "item") as { item: string; efeito: string } | undefined;
    if (r.partida.time[0].hp > 0) {
      expect(ev).toMatchObject({ item: "oran-berry", efeito: "cura" });
      expect(r.partida.time[0].item).toBeUndefined();
    }
  });

  it("Faixa do Foco segura um golpe que derrubaria com metade do HP ou mais", () => {
    const p = partida(8, [], 5);
    const l0 = lutador(dex, criarMon(dex, 1, 5, "a"));
    const eu = { ...l0, hp: Math.ceil(l0.hp * 0.55), item: "focus-sash" };
    const forte = { ...p, time: [eu], atual: { ...p.atual!, especie: 6, nivel: 60, hp: 9999, status: "" as const } };
    const r = errado(forte, "certeza");
    expect(r.partida.time[0].hp).toBe(1);
    expect(r.eventos.some((e) => e.tipo === "item" && e.efeito === "segurou")).toBe(true);
    expect(r.partida.time[0].item).toBeUndefined();
  });

  it("Pedra Eterna impede a evolução por nível", () => {
    let p = partida(8, [], 15);
    const quase = { ...lutador(dex, criarMon(dex, 1, 15, "a")), xp: xpDoNivel(16) - 1, item: "everstone" };
    p = { ...p, time: [quase], atual: { ...p.atual!, hp: 1 } };
    const r = certo(p);
    expect(r.eventos.some((e) => e.tipo === "nivel")).toBe(true);
    expect(r.eventos.some((e) => e.tipo === "evolui")).toBe(false);
    expect(r.partida.time[0].id).toBe(1);
  });

  it("dar item no lobby: sai da mochila, o antigo volta", () => {
    const perfil = { ...perfilInicial(dex, 4, "a"), mochila: { "oran-berry": 1, leftovers: 1, potion: 2 } };
    const p1 = darItem(perfil, "a", "oran-berry");
    expect(p1.colecao[0].item).toBe("oran-berry");
    expect(p1.mochila["oran-berry"]).toBeUndefined();
    const p2 = darItem(p1, "a", "leftovers");
    expect(p2.colecao[0].item).toBe("leftovers");
    expect(p2.mochila["oran-berry"]).toBe(1);
    expect(darItem(p2, "a", "potion")).toBe(p2); // poção não se segura
    expect(darItem(p2, "a", null).colecao[0].item).toBeUndefined();
    // o item vai para a partida e volta no perfil
    const partidaComItem = montarPartidaPoke({ dex, time: p2.colecao, mochila: p2.mochila, pendentes: [cand(1), cand(2), cand(3)], novas: [], concursoId: null, semente: 1 })!;
    expect(partidaComItem.time[0].item).toBe("leftovers");
    expect(sincronizarPerfil(p2, partidaComItem).colecao[0].item).toBe("leftovers");
  });

  it("prêmios: Exp. Share no 3º ginásio, Exp. All no 6º, sem repetir", () => {
    expect(premiosDoGinasio(0, 2, [])).toContain("exp-share");
    expect(premiosDoGinasio(0, 2, ["exp-share"])).not.toContain("exp-share");
    expect(premiosDoGinasio(0, 5, [])).toContain("exp-all");
    expect(premiosDoGinasio(0, 0, [])).toEqual(["hard-stone"]); // Brock, Pedra
  });

  it("recompensas: itens fortes só com insígnias; Moeda Amuleto mostra 4", () => {
    const p = partida(8, [], 10);
    const vistos = new Set<string>();
    for (let s = 1; s < 300; s++) for (const i of sortearOferta({ ...p, rng: s, insignias: 0 }).oferta!) vistos.add(i);
    expect(vistos.has("master-ball")).toBe(false);
    expect(vistos.has("exp-share")).toBe(false);
    expect(vistos.has("life-orb")).toBe(false);
    expect(vistos.has("oran-berry")).toBe(true);
    expect(sortearOferta({ ...p, time: [{ ...p.time[0], item: "amulet-coin" }] }).oferta).toHaveLength(4);
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
    // o time do Brock dos jogos: Geodude e Onix (o ás), nunca um sorteio do tipo Pedra
    expect(todos.filter((e) => e.tipo === "lider").map((e) => e.especie)).toEqual([74, 95]);
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

  it("caminho: mais treinadores e ninguém acima do level cap do ginásio", () => {
    for (const nivel of [6, 10, 14]) {
      const p = montarPartidaPoke({ dex, time: [criarMon(dex, 4, nivel, "a")], mochila: {}, pendentes: pend(14), novas: pend(40).map((c) => ({ ...c, questaoId: c.questaoId + 100 })), concursoId: null, modo: "rota", rumo: 0, cap: 12, semente: nivel })!;
      const todos = [p.atual!, ...p.fila];
      expect(p.treinadores.length).toBeGreaterThanOrEqual(4);
      expect(Math.max(...todos.map((e) => e.nivel))).toBeLessThanOrEqual(11);
      expect(Math.max(...todos.filter((e) => e.tipo === "treinador").map((e) => e.nivel))).toBeLessThanOrEqual(10);
    }
  });

  it("modo história: treinadores do caminho liberam o líder; a insígnia zera o caminho", () => {
    const base = perfilInicial(dex, 4, "a");
    expect(treinadoresParaGinasio(0)).toBe(5);
    expect(treinadoresParaGinasio(7)).toBe(8);
    expect(liderLiberado(base)).toBe(false);
    const rota = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 10, "a")], mochila: {}, pendentes: pend(14), novas: [], concursoId: null, modo: "rota", rumo: 0, semente: 5 })!;
    expect(rota.rumo).toBe(0);
    expect(rota.treinadores[0].fala).toContain("Pewter");
    const doisVencidos = sincronizarPerfil(base, { ...rota, fim: "fuga", vencidos: [0, 1] });
    expect(historiaDe(doisVencidos)).toBe(2);
    expect(liderLiberado(doisVencidos)).toBe(false);
    // a mesma partida não conta duas vezes
    expect(historiaDe(sincronizarPerfil(doisVencidos, { ...rota, fim: "fuga", vencidos: [0, 1] }))).toBe(2);
    const outra = { ...rota, iniciadaEm: "2026-01-02T00:00:00.000Z", fim: "derrota" as const, vencidos: [0, 1, 2] };
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

  it("inicial de outra região evolui na geração dele (Treecko vira Grovyle em Kanto)", () => {
    const pound = dex.golpes.findIndex((g) => g[0] === "Pound");
    const treecko = { ...criarMon(dex, 252, 16, "t"), xp: xpDoNivel(17) - 1, golpes: [pound] };
    const base = montarPartidaPoke({ dex, time: [treecko], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, modo: "rota", semente: 3 })!;
    const r = certo({ ...base, atual: { ...base.atual!, hp: 1 } });
    expect(r.eventos.some((e) => e.tipo === "evolui" && e.para === 253)).toBe(true);
  });

  it("evolução que ficou para trás acontece mesmo parado no level cap", () => {
    const pound = dex.golpes.findIndex((g) => g[0] === "Pound");
    const treecko = { ...criarMon(dex, 252, 18, "t"), xp: xpDoNivel(18), golpes: [pound] };
    const base = montarPartidaPoke({ dex, time: [treecko], mochila: {}, pendentes: pend(8), novas: [], concursoId: null, modo: "rota", semente: 3 })!;
    const r = certo({ ...base, cap: 18, atual: { ...base.atual!, hp: 1 } });
    expect(r.partida.time[0].id).toBe(253);
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

describe("iniciais pós-Unova", () => {
  const dex = dexJson as unknown as Dex;
  it("existem na dex com a linha evolutiva e evoluem mesmo com o limite de Kanto", () => {
    for (const id of [650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912]) expect(dex.especies[id]).toBeTruthy();
    expect(evolucaoPorNivel(dex.especies[650], 16, 151)).toBe(651);
    expect(evolucaoPorNivel(dex.especies[912], 16, 151)).toBe(913);
    expect(evolucaoPorNivel(dex.especies[1], 16, 151)).toBe(2);
    expect(evolucaoPorNivel(dex.especies[133], 99, 151)).not.toBe(196); // Espeon continua fora de Kanto
  });
  it("nunca aparecem como inimigos", () => {
    for (let q = 1; q < 400; q++) expect(especieDaQuestao(dex, q, "Português", 50)).toBeLessThanOrEqual(649);
  });
});

describe("turnos como nos jogos, batalha dupla e parada", () => {
  const dex = dexJson as unknown as Dex;
  const montar = (n: number, time: number, semente = 11) =>
    montarPartidaPoke({
      dex,
      time: [4, 7, 1, 25].slice(0, time).map((id, i) => criarMon(dex, id, 14, `u${i}`)),
      mochila: { potion: 3 },
      pendentes: Array.from({ length: n }, (_, i) => ({ questaoId: i + 1, materia: "Português", nivel: 0, erros: 0, dificuldade: "media" as const })),
      novas: [],
      concursoId: null,
      semente,
    })!;
  // avança até a próxima batalha dupla (acertando tudo)
  function ateDupla(p: PartidaPoke): PartidaPoke {
    for (let g = 0; g < 200 && !p.fim && !(p.dupla && p.atual && !p.atual.fim); g++) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else if (p.parada) p = seguirViagem(p);
      else if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l, i) => l.hp > 0 && !meusEmCampo(p).includes(i)));
      else if (!lutaAtiva(p)) p = avancarPoke(p, dex);
      else p = avancarPoke(responderPoke(dex, { ...p, time: p.time.map((l) => ({ ...l, hp: hpMax(dex, l) })) }, { acertou: true, confianca: "duvida", acao: { golpe: p.time[p.ativo].golpes[0] } }).partida, dex);
    }
    return p;
  }

  it("poção no meio da luta gasta a vez: o inimigo ataca e a questão continua a mesma", () => {
    let p = montar(10, 1);
    p = { ...p, time: [{ ...p.time[0], hp: 10 }] };
    const q = p.atual!.questaoId;
    const r = turnoSemQuestao(dex, p, { item: "potion", alvo: 0 });
    expect(r.eventos[0]).toMatchObject({ tipo: "usouItem", item: "potion" });
    expect(r.eventos.some((e) => e.tipo === "cura")).toBe(true);
    const contra = r.eventos.find((e) => e.tipo === "contra") as { livre?: boolean } | undefined;
    const impedido = r.eventos.some((e) => e.tipo === "inimigoImpedido" || e.tipo === "item");
    expect(contra?.livre || impedido).toBe(true);
    expect(r.partida.mochila.potion).toBe(2);
    expect(r.partida.atual!.questaoId).toBe(q);
    expect(r.partida.registros).toHaveLength(0);
    // fora da luta (parada), o item é de graça
    expect(usarItem(dex, p, "potion", 0).eventos.some((e) => e.tipo === "contra")).toBe(false);
  });

  it("trocar de Pokémon no meio da luta também gasta a vez", () => {
    const p = montar(10, 2);
    const r = turnoSemQuestao(dex, p, { troca: 1 });
    expect(r.partida.ativo).toBe(1);
    expect(r.eventos[0]).toMatchObject({ tipo: "trocou", para: p.time[1].uid });
    const atingido = r.eventos.find((e) => e.tipo === "contra") as { uid?: string } | undefined;
    if (atingido) expect(atingido.uid).toBe(p.time[1].uid);
    expect(turnoSemQuestao(dex, p, { troca: 0 }).partida).toBe(p); // já está em campo
  });

  it("caminho tem batalha dupla: dois inimigos e dois meus em campo, questão alterna", () => {
    let achou: PartidaPoke | null = null;
    for (let s = 1; s < 40 && !achou; s++) {
      const p = ateDupla(montar(26, 3, s));
      if (p.dupla) achou = p;
    }
    expect(achou).not.toBeNull();
    const p = achou!;
    expect(p.treinadores[p.atual!.treinador].dupla).toBe(true);
    expect(p.par!.treinador).toBe(p.atual!.treinador);
    expect(meusEmCampo(p)).toHaveLength(2);
    expect(slotDaVez(p)).toBe(0);
    const cheio = { ...p, time: p.time.map((l) => ({ ...l, hp: hpMax(dex, l) })) };
    const r = responderPoke(dex, cheio, { acertou: true, confianca: "duvida", acao: { golpe: cheio.time[cheio.ativo].golpes[0], alvo: 0 }, acao2: { golpe: cheio.time[cheio.ativo2!].golpes[0], alvo: 1 } });
    const ataques = r.eventos.filter((e) => e.tipo === "ataque") as { uid?: string; alvo?: number }[];
    expect(ataques.map((a) => a.uid)).toEqual([cheio.time[cheio.ativo].uid, cheio.time[cheio.ativo2!].uid]);
    if (r.partida.atual!.hp > 0 && r.partida.par!.hp > 0) expect(ataques.map((a) => a.alvo)).toEqual([0, 1]);
    if (!r.partida.par!.fim) expect(slotDaVez(r.partida)).toBe(1);
    // erro: os dois inimigos atacam
    const e = responderPoke(dex, cheio, { acertou: false, confianca: "duvida", acao: { golpe: 0 } });
    const contras = e.eventos.filter((x) => x.tipo === "contra" || x.tipo === "inimigoImpedido");
    expect(contras.length).toBe(2);
  });

  // joga a partida inteira acertando tudo (HP cheio a cada turno), passando pelas paradas
  function jogar(p: PartidaPoke, naParada?: (p: PartidaPoke) => PartidaPoke) {
    const paradas: NonNullable<PartidaPoke["parada"]>[] = [];
    for (let g = 0; g < 300 && !p.fim; g++) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else if (p.parada) {
        paradas.push(p.parada);
        expect(lutaAtiva(p)).toBe(true);
        p = seguirViagem(naParada ? naParada(p) : p);
      } else if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l, i) => l.hp > 0 && !meusEmCampo(p).includes(i)));
      else if (!lutaAtiva(p)) p = avancarPoke(p, dex);
      else p = avancarPoke(responderPoke(dex, { ...p, time: p.time.map((l) => ({ ...l, hp: hpMax(dex, l) })) }, { acertou: true, confianca: "duvida", acao: { golpe: p.time[p.ativo].golpes[0] } }).partida, dex);
    }
    return { p, paradas };
  }

  it("parada antes de cada batalha nova (no caminho, sem Centro); ordem do time; dinheiro dos treinadores", () => {
    const ini = montar(26, 2, 5);
    expect(ini.dinheiro).toBe(3000);
    const { p, paradas } = jogar(ini, (q) => {
      const m = moverNoTime(q, 1, 0);
      expect(m.time[0].uid).toBe(q.time[1].uid);
      expect(m.ativo).toBe(0);
      return m;
    });
    expect(p.fim).toBe("vitoria");
    expect(paradas.length).toBeGreaterThan(2);
    expect(paradas.every((x) => !x.centro && !x.loja)).toBe(true);
    expect(p.dinheiro!).toBeGreaterThan(3000);
    expect(sincronizarPerfil(perfilInicial(dex, 4, "u0"), p).dinheiro).toBe(p.dinheiro);
  });

  it("ginásio: começa na cidade (Centro + Poké Mart), cura sozinho antes do líder; ajudantes vencidos ficam de fora", () => {
    const base = { dex, mochila: { potion: 1 }, novas: [], concursoId: null, semente: 3, modo: "ginasio" as const, ginasio: 0, dinheiro: 1000 };
    const pend = Array.from({ length: 20 }, (_, i) => ({ questaoId: i + 1, materia: "Português", nivel: 0, erros: 0, dificuldade: "media" as const }));
    const g = montarPartidaPoke({ ...base, time: [criarMon(dex, 7, 14, "u0")], pendentes: pend })!;
    expect(g.parada).toMatchObject({ centro: true, loja: true });
    const ferido = { ...g, time: g.time.map((l) => ({ ...l, hp: 1, status: "poison" as const })) };
    const curado = centroPokemon(dex, ferido);
    expect(curado.time.every((l) => l.hp === hpMax(dex, l) && !l.status)).toBe(true);
    expect(centroPokemon(dex, curado)).toBe(curado); // uma vez por parada
    // Poké Mart: compra com o dinheiro da carteira; 10 Poké Balls dão 1 Premier Ball
    const c = comprarNaPartida(g, "potion", 2);
    expect(c.dinheiro).toBe(400);
    expect(c.mochila.potion).toBe(3);
    expect(comprarNaPartida(c, "potion", 2)).toBe(c); // sem dinheiro
    expect(comprarNaPartida(c, "ultra-ball", 1)).toBe(c); // a loja ainda não vende
    const perfil = { ...perfilInicial(dex, 7, "u0"), dinheiro: 2000 };
    expect(comprarNoPerfil(perfil, "poke-ball", 10).mochila["premier-ball"]).toBe(1);
    // o líder: time curado antes
    let antesDoLider = false;
    const { p } = jogar(seguirViagem(g), (q) => {
      if (q.parada?.curadoAuto) {
        antesDoLider = true;
        expect(encontroDaVez(q)!.tipo).toBe("lider");
        expect(q.time.every((l) => l.hp === hpMax(dex, l))).toBe(true);
      }
      return q;
    });
    expect(antesDoLider).toBe(true);
    expect(p.fim).toBe("vitoria");
    // perdeu no líder depois de vencer os ajudantes: na próxima, só o líder
    const ajud = g.treinadores.filter((t) => !t.lider).length;
    const meio = { ...g, vencidos: g.treinadores.map((t, i) => (t.lider ? -1 : i)).filter((i) => i >= 0), fim: "derrota" as const };
    const pf = sincronizarPerfil(perfilInicial(dex, 7, "u0"), meio);
    expect(ajudantesVencidos(pf, 0, 0)).toBe(ajud);
    const g2 = montarPartidaPoke({ ...base, time: [criarMon(dex, 7, 14, "u0")], pendentes: pend, ajudantesVencidos: ajudantesVencidos(pf, 0, 0) })!;
    expect(g2.treinadores.every((t) => t.lider)).toBe(true);
    // ganhou a insígnia: os ajudantes voltam a contar do zero para a próxima vez (não importa mais)
    expect(ajudantesVencidos(sincronizarPerfil(pf, { ...p, ajudantesAntes: ajud, iniciadaEm: "2030-01-01T00:00:00.000Z" }), 0, 0)).toBe(0);
  });

  it("caminho acaba nos treinadores que faltam: concluído, fecha", () => {
    const pend = Array.from({ length: 26 }, (_, i) => ({ questaoId: i + 1, materia: "Português", nivel: 0, erros: 0, dificuldade: "media" as const }));
    const p = montarPartidaPoke({ dex, time: [criarMon(dex, 4, 10, "a")], mochila: {}, pendentes: pend, novas: [], concursoId: null, semente: 9, rumo: 0, restantes: 2 })!;
    expect(p.treinadores).toHaveLength(2);
    let perfil = perfilInicial(dex, 4, "a");
    expect(caminhoConcluido(perfil)).toBe(false);
    expect(faltamNoCaminho(perfil)).toBe(treinadoresParaGinasio(0));
    perfil = { ...perfil, historiaPorRegiao: [treinadoresParaGinasio(0)] };
    expect(caminhoConcluido(perfil)).toBe(true);
    expect(faltamNoCaminho(perfil)).toBe(0);
  });

});

describe("rotas do modo história", () => {
  const pend = (n: number) => Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português"));
  const montar = (regiao: number, rumo: number | undefined, passo: number, semente: number, nivel = 5) =>
    montarPartidaPoke({ dex, time: [criarMon(dex, 4, nivel, "a"), criarMon(dex, 7, nivel, "b")], mochila: {}, pendentes: pend(14), novas: [], concursoId: null, modo: "rota", regiao, rumo, passo, semente, cap: 12 })!;

  it("cada região tem 8 trechos até os ginásios e a Estrada Vitória, todos com selvagens", () => {
    for (let r = 0; r < 5; r++)
      for (let t = 0; t <= 8; t++) {
        const trecho = trechoDe(r, t)!;
        expect(trecho.rotas.length).toBeGreaterThan(0);
        for (const rota of trecho.rotas) for (const [id] of rota.s) expect(id).toBeLessThanOrEqual([151, 251, 386, 493, 649][r]);
      }
  });

  it("selvagem do caminho para Pewter é dos que vivem nas rotas de lá, no nível dos jogos", () => {
    const trecho = trechoDe(0, 0)!;
    const vistos = new Set<number>();
    for (let semente = 1; semente < 60; semente++) {
      const p = montar(0, 0, semente % treinadoresParaGinasio(0), semente);
      for (const e of [...p.fila, p.atual!].filter((x) => x?.tipo === "selvagem")) {
        expect(e.rota).toBeDefined();
        const rota = trecho.rotas[e.rota!];
        const linha = rota.s.find(([id]) => id === e.especie)!;
        expect(linha).toBeDefined();
        expect(e.nivel).toBeGreaterThanOrEqual(Math.max(2, linha[2]));
        expect(e.nivel).toBeLessThanOrEqual(Math.min(9, linha[3]));
        vistos.add(e.especie);
      }
    }
    // Pidgey, Rattata, Caterpie, Weedle, Spearow, Mankey, Metapod, Kakuna, Pikachu...
    expect(vistos.size).toBeGreaterThanOrEqual(5);
    expect(vistos.has(16)).toBe(true);
  });

  it("a rota avança com os treinadores vencidos no trecho", () => {
    const comeco = montar(0, 0, 0, 7);
    expect(rotaDoEncontro(comeco, comeco.atual)?.nome).toBe("Rota 1");
    const fim = montar(0, 0, treinadoresParaGinasio(0) - 1, 7);
    expect(rotaDoEncontro(fim, fim.atual)?.nome).toBe("Floresta de Viridian");
    const perfil = { ...perfilInicial(dex, 1), historiaPorRegiao: [3] };
    expect(rotasDoCaminho(perfil)!.rotas[rotasDoCaminho(perfil)!.atual]).toBe("Rota 2");
  });

  it("treinador do caminho usa Pokémon da rota (Johto, Rota 29–31)", () => {
    const nativos = new Set(trechoDe(1, 0)!.rotas.flatMap((r) => r.s.map(([id]) => id)));
    const p = montar(1, 0, 0, 3);
    for (const e of p.fila.filter((x) => x.tipo === "treinador")) {
      // a espécie ou a pré-evolução dela vive na rota
      const pre = dex.especies[e.especie].p;
      expect(nativos.has(e.especie) || (pre !== undefined && nativos.has(pre))).toBe(true);
    }
  });

  it("trocar o selvagem do caminho dá outro da mesma rota", () => {
    const base = montar(0, 0, 2, 1);
    const selv = base.fila.find((e) => e.tipo === "selvagem")!;
    const p: PartidaPoke = { ...base, atual: selv, fila: base.fila.filter((e) => e !== selv) };
    const rota = rotaDoEncontro(p, p.atual)!;
    const q = trocarSelvagem(dex, p);
    expect(q.atual!.especie).not.toBe(p.atual!.especie);
    expect(rota.s.some(([id]) => id === q.atual!.especie)).toBe(true);
  });
});

describe("Rastro Lendário", () => {
  const pend = (n: number) => Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "Banco de Dados" : "Português", i === 3 ? { erros: 4 } : {}));
  const montarLenda = (lenda: number, nivel = 45, regiao = 0) => {
    const p = montarPartidaPoke({ dex, time: [criarMon(dex, 6, nivel, "a")], mochila: { "ultra-ball": 5 }, pendentes: pend(14), novas: pend(40).map((c) => ({ ...c, questaoId: c.questaoId + 100 })), concursoId: null, modo: "lendario", lenda, regiao, semente: 9 })!;
    return { ...p, time: timeCheio(nivel) };
  };
  // anda até a lenda (vencendo tudo com acertos)
  const ateALenda = (p0: PartidaPoke) => {
    let p = seguirViagem(p0);
    for (let g = 0; g < 400 && !p.fim && !p.atual?.lendario; g++) {
      if (p.oferta) p = escolherOferta(p, p.oferta[0], dex);
      else if (p.parada) p = seguirViagem(p);
      else if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l) => l.hp > 0));
      else if ((p.aprender ?? []).length) p = decidirGolpe(p, null).partida;
      else p = avancarPoke(certo(p).partida, dex);
    }
    return seguirViagem(p);
  };

  it("monta recrutas, selvagens do lugar, o executivo e a lenda no fim, com a questão mais errada", () => {
    const p = montarLenda(144);
    expect(p.modo).toBe("lendario");
    expect(p.lenda).toBe(144);
    expect(p.parada?.loja).toBe(true);
    expect(p.treinadores.map((t) => t.nome)).toEqual(["Recruta da Equipe Rocket", "Recruta da Equipe Rocket", "Proton"]);
    const todos = [p.atual!, ...p.fila];
    const lenda = todos.at(-1)!;
    expect(lenda).toMatchObject({ especie: 144, tipo: "selvagem", lendario: true, questaoId: 4 });
    expect(todos.filter((e) => e.tipo === "selvagem" && !e.lendario).length).toBe(3);
    // Kanto: nada acima do #151 (Houndoom não entra no time do executivo)
    expect(todos.every((e) => e.especie <= 151)).toBe(true);
  });

  it("a lenda não desmaia, não é trocada, e a bola é difícil com HP cheio", () => {
    let p = ateALenda(montarLenda(150, 50));
    expect(p.atual?.lendario).toBe(true);
    expect(podeTrocarSelvagem(p)).toBe(false);
    for (let i = 0; i < 6 && !p.fim; i++) {
      const r = certo(p);
      p = r.partida;
      expect(p.atual!.fim).toBeUndefined();
      if (precisaTrocar(p)) p = trocar(p, p.time.findIndex((l) => l.hp > 0));
    }
    expect(p.atual!.hp).toBe(1);
    const e = dex.especies[150];
    expect(chanceCaptura(e, "poke-ball", "duvida", 1, false, { lendario: true })).toBeLessThan(0.1);
    expect(chanceCaptura(e, "ultra-ball", "duvida", 0.01, true, { lendario: true })).toBeGreaterThan(0.75);
    expect(chanceCaptura(e, "master-ball", "duvida", 1, false, { lendario: true })).toBe(1);
  });

  it("errar contra a lenda não a faz fugir; esgotados os turnos, ela volta ao santuário", () => {
    let p = ateALenda(montarLenda(145, 50));
    const r = errado(p);
    expect(r.partida.atual!.fim).toBeUndefined();
    expect(r.partida.fila.length).toBe(0);
    p = { ...r.partida, atual: { ...r.partida.atual!, turnos: 9 } };
    const fim = certo(p);
    expect(fim.eventos.some((e) => e.tipo === "fuga" && e.lenda)).toBe(true);
    expect(avancarPoke(fim.partida, dex).fim).toBe("vitoria");
  });

  it("capturada com Master Ball entra na coleção e fecha o rastro dela", () => {
    let p = ateALenda(montarLenda(146, 50));
    p = { ...p, mochila: { ...p.mochila, "master-ball": 1 } };
    const r = responderPoke(dex, p, { acertou: true, confianca: "duvida", acao: { bola: "master-ball" } });
    expect(r.partida.atual!.fim).toBe("captura");
    const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), avancarPoke(r.partida, dex));
    expect(lendaCapturada(perfil, 146)).toBe(true);
    expect(capturadosDex(perfil).has(146)).toBe(true);
  });

  it("abre com 7 insígnias; míticas só para o Campeão; região futura nunca", () => {
    const base = perfilInicial(dex, 4, "a");
    const art = LENDAS.find((l) => l.id === 144)!;
    const mew = LENDAS.find((l) => l.id === 151)!;
    const lugia = LENDAS.find((l) => l.id === 249)!;
    expect(lendaLiberada(base, art)).toBe(false);
    const sete = { ...base, insigniasPorRegiao: [7, 0, 0, 0, 0] };
    expect(rastroLiberado(sete)).toBe(true);
    expect(lendaLiberada(sete, art)).toBe(true);
    expect(lendaLiberada(sete, mew)).toBe(false);
    expect(lendaLiberada({ ...sete, campeaoPorRegiao: [1, 0, 0, 0, 0] }, mew)).toBe(true);
    expect(lendaLiberada(sete, lugia)).toBe(false);
    // em Johto, as de Kanto continuam abertas
    expect(lendaLiberada({ ...sete, regiao: 1, campeaoPorRegiao: [1, 0, 0, 0, 0] }, art)).toBe(true);
  });

  it("Pokédex: a forma anterior continua registrada depois de evoluir", () => {
    const perfil = sincronizarPerfil(perfilInicial(dex, 4, "a"), montarLenda(144));
    const evoluido = { ...perfil, colecao: perfil.colecao.map((m) => (m.uid === "a" ? { ...m, id: 5 } : m)) };
    expect(capturadosDex(evoluido).has(4)).toBe(true);
    expect(capturadosDex(evoluido).has(5)).toBe(true);
  });

  it("todas as lendas montam partida na própria região", () => {
    for (const l of LENDAS) {
      const p = montarLenda(l.id, 50, l.regiao);
      expect(p, `lenda ${l.id}`).toBeTruthy();
      expect([p.atual!, ...p.fila].at(-1)!.especie).toBe(l.id);
    }
  });
});
