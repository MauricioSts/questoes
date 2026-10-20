// Rotas de vínculo e de discursiva com o Prisma de mentira (não há banco de teste): o que
// importa é QUAL escrita chega ao banco. Tirar uma questão da trilha TJPB apaga só a linha
// QuestaoTrilha daquela trilha, nunca a Questao (que é da Dataprev) nem outro vínculo.
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  questao: { delete: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  questaoTrilha: { delete: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
  trilha: { findUnique: vi.fn(), findFirst: vi.fn() },
  concurso: { findFirst: vi.fn() },
  discursiva: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  tentativaDiscursiva: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("../prisma.js", () => ({ prisma: db }));

const { trilhasRouter } = await import("../modules/trilhas/trilhas.routes.js");
const { discursivasRouter } = await import("../modules/discursivas/discursivas.routes.js");
const { provasRouter } = await import("../modules/provas/provas.routes.js");
const { errorHandler } = await import("../middleware/error.js");
const { signAccessToken } = await import("../lib/jwt.js");
const { env } = await import("../config/env.js");

const lerDoc = (nome: string) => JSON.parse(readFileSync(new URL(`../../../docs/perfis/${nome}.json`, import.meta.url), "utf8"));
const perfilTjpb = lerDoc("tjpb-2026-dev");
const perfilCgu = lerDoc("cgu-2026-dev");
const admin = `Bearer ${signAccessToken({ sub: "u-admin", email: env.ADMIN_EMAIL })}`;
const aluno = `Bearer ${signAccessToken({ sub: "u-aluno", email: "aluno@example.com" })}`;

let server: Server;
let base = "";
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/trilhas", trilhasRouter);
  app.use("/discursivas", discursivasRouter);
  app.use("/provas", provasRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  for (const modelo of Object.values(db)) {
    if (typeof modelo === "function") modelo.mockReset();
    else for (const fn of Object.values(modelo)) fn.mockReset();
  }
});

const chamar = (metodo: string, caminho: string, token: string, corpo?: unknown) =>
  fetch(base + caminho, {
    method: metodo,
    headers: { authorization: token, "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

const nenhumaQuestaoApagada = () => {
  expect(db.questao.delete).not.toHaveBeenCalled();
  expect(db.questao.deleteMany).not.toHaveBeenCalled();
  expect(db.questaoTrilha.deleteMany).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
};

describe("DELETE /trilhas/:trilhaId/vinculos/:questaoId", () => {
  it("apaga só o vínculo daquela trilha, pela chave composta", async () => {
    db.questaoTrilha.delete.mockResolvedValue({});
    const r = await chamar("DELETE", "/trilhas/tjpb-2026-dev/vinculos/114", admin);
    expect(r.status).toBe(204);
    expect(db.questaoTrilha.delete).toHaveBeenCalledTimes(1);
    expect(db.questaoTrilha.delete).toHaveBeenCalledWith({
      where: { questaoId_trilhaId: { questaoId: 114, trilhaId: "tjpb-2026-dev" } },
    });
    nenhumaQuestaoApagada();
  });

  it("404 quando o vínculo não existe", async () => {
    db.questaoTrilha.delete.mockRejectedValue(Object.assign(new Error("não achou"), { code: "P2025" }));
    const r = await chamar("DELETE", "/trilhas/tjpb-2026-dev/vinculos/999", admin);
    expect(r.status).toBe(404);
    nenhumaQuestaoApagada();
  });

  it("só o admin", async () => {
    const r = await chamar("DELETE", "/trilhas/tjpb-2026-dev/vinculos/114", aluno);
    expect(r.status).toBe(403);
    expect(db.questaoTrilha.delete).not.toHaveBeenCalled();
  });
});

describe("PUT /trilhas/:trilhaId/vinculos/:questaoId", () => {
  beforeEach(() => db.trilha.findUnique.mockResolvedValue({ perfilProva: { dados: perfilTjpb } }));

  it("reclassifica dentro do perfil", async () => {
    db.questaoTrilha.update.mockResolvedValue({ questaoId: 114, trilhaId: "tjpb-2026-dev", materia: "Banco de dados", topico: "6" });
    const r = await chamar("PUT", "/trilhas/tjpb-2026-dev/vinculos/114", admin, { materia: "Banco de dados", topico: "6" });
    expect(r.status).toBe(200);
    expect(db.questaoTrilha.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { questaoId_trilhaId: { questaoId: 114, trilhaId: "tjpb-2026-dev" } },
        data: { materia: "Banco de dados", topico: "6" },
      })
    );
  });

  it("recusa tópico que não existe na disciplina, sem gravar", async () => {
    const r = await chamar("PUT", "/trilhas/tjpb-2026-dev/vinculos/114", admin, { materia: "Banco de dados", topico: "6.9" });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/tópico "6.9" não existe/);
    expect(db.questaoTrilha.update).not.toHaveBeenCalled();
  });

  it("perfil malformado no banco é 500 com mensagem, não 400", async () => {
    db.trilha.findUnique.mockResolvedValue({ perfilProva: { dados: { perfil: "quebrado" } } });
    const r = await chamar("PUT", "/trilhas/tjpb-2026-dev/vinculos/114", admin, { materia: "Banco de dados", topico: "6" });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/Perfil de prova da trilha tjpb-2026-dev está malformado/);
    expect(db.questaoTrilha.update).not.toHaveBeenCalled();
  });

  it("recusa disciplina fora do perfil", async () => {
    const r = await chamar("PUT", "/trilhas/tjpb-2026-dev/vinculos/114", admin, { materia: "APIs REST", topico: "APIs REST" });
    expect(r.status).toBe(400);
    expect(db.questaoTrilha.update).not.toHaveBeenCalled();
  });
});

describe("/discursivas", () => {
  const tema = {
    id: "d1",
    trilhaId: "tjpb-2026-dev",
    enunciado: "Disserte sobre APIs REST.",
    padraoResposta: "Recursos, verbos HTTP, stateless.",
    maxLinhas: 30,
    caracteresPorLinha: 70,
    valor: 40,
    ordem: 0,
    createdAt: new Date(),
  };
  beforeEach(() => {
    db.discursiva.findUnique.mockResolvedValue(tema);
    db.trilha.findFirst.mockResolvedValue(null);
    db.concurso.findFirst.mockResolvedValue({ id: "c1" }); // o aluno segue a trilha
  });

  it("recusa texto acima do limite de linhas", async () => {
    const texto = Array(31).fill("x".repeat(70)).join("\n");
    const r = await chamar("POST", "/discursivas/d1/tentativas", aluno, { texto });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/limite é 30/);
    expect(db.tentativaDiscursiva.create).not.toHaveBeenCalled();
  });

  it("grava dentro do limite e devolve o padrão de resposta", async () => {
    db.tentativaDiscursiva.create.mockResolvedValue({ id: "t1", texto: "ok", nota: 30, createdAt: new Date() });
    const r = await chamar("POST", "/discursivas/d1/tentativas", aluno, { texto: Array(30).fill("x".repeat(70)).join("\n"), nota: 30 });
    expect(r.status).toBe(201);
    const corpo = await r.json();
    expect(corpo.padraoResposta).toBe(tema.padraoResposta);
    expect(corpo.tentativa.linhas).toBe(30);
  });

  it("recusa nota acima do valor", async () => {
    const r = await chamar("POST", "/discursivas/d1/tentativas", aluno, { texto: "curta", nota: 41 });
    expect(r.status).toBe(400);
  });

  it("lista esconde o padrão de resposta até a primeira tentativa", async () => {
    db.discursiva.findMany.mockResolvedValue([tema, { ...tema, id: "d2" }]);
    db.tentativaDiscursiva.groupBy.mockResolvedValue([{ discursivaId: "d2", _count: { _all: 1 } }]);
    const r = await chamar("GET", "/discursivas?trilhaId=tjpb-2026-dev", aluno);
    const { discursivas } = await r.json();
    expect(discursivas.map((d: { padraoResposta: string | null }) => d.padraoResposta)).toEqual([null, tema.padraoResposta]);
  });

  it("trilha fora do alcance devolve lista vazia, não 404", async () => {
    db.concurso.findFirst.mockResolvedValue(null);
    const r = await chamar("GET", "/discursivas?trilhaId=outra", aluno);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ discursivas: [] });
  });

  it("PATCH de nota só na tentativa do próprio usuário", async () => {
    db.tentativaDiscursiva.findFirst.mockResolvedValue(null);
    const r = await chamar("PATCH", "/discursivas/tentativas/t-alheia", aluno, { nota: 10 });
    expect(r.status).toBe(404);
    expect(db.tentativaDiscursiva.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "t-alheia", userId: "u-aluno" } }));
    expect(db.tentativaDiscursiva.update).not.toHaveBeenCalled();
  });

  it("POST admin com perfil malformado é 500 com mensagem explícita", async () => {
    db.trilha.findUnique.mockResolvedValue({ id: "tjpb-2026-dev", perfilProva: { dados: { grupos: "x" } } });
    const r = await chamar("POST", "/discursivas", admin, { trilhaId: "tjpb-2026-dev", enunciado: "E", padraoResposta: "P" });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/malformado/);
    expect(db.discursiva.create).not.toHaveBeenCalled();
  });

  it("POST admin usa os limites do perfil quando não vêm no corpo", async () => {
    db.trilha.findUnique.mockResolvedValue({ id: "tjpb-2026-dev", perfilProva: { dados: perfilTjpb } });
    db.discursiva.count.mockResolvedValue(0);
    db.discursiva.create.mockResolvedValue(tema);
    const r = await chamar("POST", "/discursivas", admin, { trilhaId: "tjpb-2026-dev", enunciado: "E", padraoResposta: "P" });
    expect(r.status).toBe(201);
    expect(db.discursiva.create).toHaveBeenCalledWith({
      data: { trilhaId: "tjpb-2026-dev", enunciado: "E", padraoResposta: "P", maxLinhas: 30, caracteresPorLinha: 70, valor: 40, ordem: 0 },
    });
  });
});

// O simulado C/E abre quando `perfil` vem preenchido; o TJPB (múltipla escolha) não pode
// cair nele, mas o front ainda precisa do perfil inteiro (discursiva, aviso).
describe("GET /provas/perfil", () => {
  const comPerfil = (id: string, dados: unknown) =>
    db.concurso.findFirst.mockResolvedValue({ id: "c1", trilha: { perfilProva: { id, nome: id, dados } } });

  it("CGU (certo/errado, sem campo formato): perfil preenchido", async () => {
    comPerfil("cgu-2026-dev", perfilCgu);
    const corpo = await (await chamar("GET", "/provas/perfil?concursoId=c1", aluno)).json();
    expect(corpo.perfil?.id).toBe("cgu-2026-dev");
    expect(corpo.perfilTrilha?.id).toBe("cgu-2026-dev");
  });

  it("TJPB (múltipla escolha): perfil null e perfilTrilha preenchido", async () => {
    comPerfil("tjpb-2026-dev", perfilTjpb);
    const corpo = await (await chamar("GET", "/provas/perfil?concursoId=c1", aluno)).json();
    expect(corpo.perfil).toBeNull();
    expect(corpo.perfilTrilha.id).toBe("tjpb-2026-dev");
    expect(corpo.perfilTrilha.dados.discursiva.max_linhas).toBe(30);
  });

  it("trilha sem perfil: os dois null", async () => {
    db.concurso.findFirst.mockResolvedValue({ id: "c1", trilha: { perfilProva: null } });
    expect(await (await chamar("GET", "/provas/perfil?concursoId=c1", aluno)).json()).toEqual({ perfil: null, perfilTrilha: null });
  });
});
