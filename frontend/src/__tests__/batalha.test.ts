import { describe, expect, it } from "vitest";
import {
  avancar,
  escolherItem,
  intercalar,
  montarPartida,
  registrarLicao,
  responder,
  resumir,
  usarPocao,
  type Candidata,
  type Partida,
} from "../lib/batalha";

const cand = (id: number, materia = "M", extra: Partial<Candidata> = {}): Candidata => ({
  questaoId: id,
  materia,
  nivel: 0,
  erros: 0,
  dificuldade: "media",
  ...extra,
});

function partida(n = 6, extra: Partial<Candidata>[] = []): Partida {
  const pendentes = Array.from({ length: n }, (_, i) => cand(i + 1, i % 2 ? "A" : "B", extra[i]));
  return montarPartida({ pendentes, novas: [], concursoId: null, semente: 7 })!;
}

describe("montarPartida", () => {
  it("usa a fila da revisão primeiro e só completa com novas", () => {
    const p = montarPartida({
      pendentes: [cand(1), cand(2)],
      novas: Array.from({ length: 20 }, (_, i) => cand(100 + i)),
      concursoId: null,
    })!;
    const ids = [p.atual!, ...p.fila].map((e) => e.questaoId);
    expect(ids).toHaveLength(11);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it("não inventa partida sem questões", () => {
    expect(montarPartida({ pendentes: [], novas: [], concursoId: null })).toBeNull();
  });

  it("o chefe é a questão mais errada e fica por último", () => {
    const p = partida(5, [{}, {}, { erros: 3 }, {}, {}]);
    const ultimo = p.fila[p.fila.length - 1];
    expect(ultimo.tipo).toBe("chefe");
    expect(ultimo.questaoId).toBe(3);
  });

  it("intercala matérias", () => {
    const r = intercalar([cand(1, "A"), cand(2, "A"), cand(3, "B"), cand(4, "B")]);
    expect(r.map((c) => c.materia)).toEqual(["A", "B", "A", "B"]);
  });
});

describe("responder", () => {
  it("errar custa HP (mais com certeza) e a questão volta 3 lutas depois", () => {
    const p = partida(8);
    const id = p.atual!.questaoId;
    const { partida: q, eventos } = responder(p, false, "certeza", "media");
    expect(q.hp).toBe(70);
    expect(eventos[0]).toMatchObject({ tipo: "erro", dano: 30, volta: true });
    expect(q.fila[3]).toMatchObject({ questaoId: id, retorno: true });
    const d = responder(p, false, "duvida", "media").partida;
    expect(d.hp).toBe(80);
  });

  it("errar de novo na volta não traz a questão uma terceira vez", () => {
    let p = partida(8);
    p = { ...p, atual: { ...p.atual!, retorno: true } };
    const q = responder(p, false, "duvida", "media").partida;
    expect(q.fila.filter((e) => e.retorno)).toHaveLength(0);
  });

  it("o retorno nunca passa do chefe", () => {
    let p = partida(3);
    p = responder(p, false, "duvida", "media").partida;
    expect(p.fila[p.fila.length - 1].tipo).toBe("chefe");
  });

  it("combo de 3 acertos cura", () => {
    let p = partida(8);
    p = { ...p, hp: 50 };
    for (let i = 0; i < 3; i++) {
      p = responder(p, true, "duvida", "media").partida;
      p = avancar(p);
    }
    expect(p.hp).toBe(60);
  });

  it("HP zerado encerra em derrota", () => {
    let p = partida(8);
    p = { ...p, hp: 10 };
    const r = responder(p, false, "duvida", "media");
    expect(r.partida.fim).toBe("derrota");
  });

  it("baga bloqueia o dano de um erro", () => {
    let p = partida(8);
    p = { ...p, escudos: 1 };
    const r = responder(p, false, "certeza", "media");
    expect(r.partida.hp).toBe(100);
    expect(r.partida.escudos).toBe(0);
  });

  it("acertar questão já errada antes é captura", () => {
    const p = partida(4, [{ erros: 1 }, {}, {}, {}]);
    const alvo = { ...p, atual: { ...p.atual!, questaoId: 1 } };
    const r = responder(alvo, true, "duvida", "media");
    expect(r.eventos[0]).toMatchObject({ tipo: "acerto", captura: true });
  });
});

describe("andares e itens", () => {
  it("a cada 4 vitórias oferece 3 recompensas e escolher segue a partida", () => {
    let p = partida(10);
    for (let i = 0; i < 4; i++) p = avancar(responder(p, true, "duvida", "media").partida);
    expect(p.oferta).toHaveLength(3);
    expect(p.andar).toBe(2);
    const q = escolherItem(p, p.oferta![0]);
    expect(q.oferta).toBeNull();
    expect(q.atual).not.toBeNull();
  });

  it("poção cura até o máximo", () => {
    const p = { ...partida(4), hp: 90 };
    const r = usarPocao(p);
    expect(r.partida.hp).toBe(100);
    expect(r.partida.pocoes).toBe(0);
  });

  it("lição curta não cura; lição de verdade cura uma vez", () => {
    const p = { ...partida(4), hp: 50 };
    expect(registrarLicao(p, 1, "curto").curou).toBe(0);
    const a = registrarLicao(p, 1, "porque o artigo 5 garante isso");
    expect(a.curou).toBe(10);
    expect(registrarLicao(a.partida, 1, "outra explicação qualquer aqui").curou).toBe(0);
  });

  it("vitória quando a fila acaba", () => {
    let p = partida(2);
    while (!p.fim && p.atual) p = avancar(responder(p, true, "certeza", "media").partida);
    expect(p.fim).toBe("vitoria");
    const r = resumir(p);
    expect(r.acertos).toBe(2);
    expect(r.certeza.total).toBe(2);
  });
});

import { estagioDoNivel, nivelDoXp } from "../lib/batalha";
describe("evolução", () => {
  it("evolui no nível 4 e no 8", () => {
    expect(estagioDoNivel(1)).toBe(1);
    expect(estagioDoNivel(4)).toBe(2);
    expect(estagioDoNivel(8)).toBe(3);
    expect(nivelDoXp(360).nivel).toBe(4);
  });
});
