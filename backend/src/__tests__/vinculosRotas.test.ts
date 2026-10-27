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
  discursiva: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  tentativaDiscursiva: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), groupBy: vi.fn(), count: vi.fn(), delete: vi.fn() },
  fotoDiscursiva: { create: vi.fn(), findFirst: vi.fn() },
  resultadoProva: { create: vi.fn() },
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
    titulo: null,
    liberaEm: null,
    createdAt: new Date(),
  };
  const futuro = (dias: number) => new Date(Date.now() + dias * 864e5);
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
    db.tentativaDiscursiva.create.mockImplementation(async ({ data }) => ({ id: "t1", ...data, createdAt: new Date(), fotos: [] }));
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
    expect(await r.json()).toEqual({ discursivas: [], proxima: null, restantes: 0 });
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
      data: {
        trilhaId: "tjpb-2026-dev",
        titulo: null,
        enunciado: "E",
        padraoResposta: "P",
        liberaEm: null,
        maxLinhas: 30,
        caracteresPorLinha: 70,
        valor: 40,
        ordem: 0,
      },
    });
  });

  it("lista só os temas abertos; da fila, só o próximo aparece (sem enunciado)", async () => {
    db.discursiva.findMany.mockResolvedValue([
      tema,
      { ...tema, id: "d2", titulo: "Semana 2", enunciado: "segredo 2", liberaEm: futuro(7) },
      { ...tema, id: "d3", titulo: "Semana 3", enunciado: "segredo 3", liberaEm: futuro(14) },
    ]);
    db.tentativaDiscursiva.groupBy.mockResolvedValue([]);
    const r = await chamar("GET", "/discursivas?trilhaId=tjpb-2026-dev", aluno);
    const corpo = await r.json();
    expect(corpo.discursivas.map((d: { id: string }) => d.id)).toEqual(["d1"]);
    expect(corpo.proxima).toMatchObject({ id: "d2", titulo: "Semana 2" });
    expect(corpo.proxima.enunciado).toBeUndefined();
    expect(corpo.restantes).toBe(1);
    expect(JSON.stringify(corpo)).not.toMatch(/segredo/);
  });

  it("tema adiantado e entregue conta como aberto", async () => {
    db.discursiva.findMany.mockResolvedValue([{ ...tema, id: "d2", liberaEm: futuro(7) }]);
    db.tentativaDiscursiva.groupBy.mockResolvedValue([{ discursivaId: "d2", _count: { _all: 1 } }]);
    const corpo = await (await chamar("GET", "/discursivas?trilhaId=tjpb-2026-dev", aluno)).json();
    expect(corpo.discursivas.map((d: { id: string }) => d.id)).toEqual(["d2"]);
    expect(corpo.proxima).toBeNull();
  });

  it("adiantar: o próximo da fila abre, o seguinte é 404", async () => {
    const d2 = { ...tema, id: "d2", liberaEm: futuro(7) };
    const d3 = { ...tema, id: "d3", liberaEm: futuro(14) };
    db.tentativaDiscursiva.count.mockResolvedValue(0);
    db.discursiva.findFirst.mockResolvedValue(d2);
    db.discursiva.findUnique.mockResolvedValue(d2);
    const ok = await chamar("GET", "/discursivas/d2", aluno);
    expect(ok.status).toBe(200);
    expect((await ok.json()).discursiva.padraoResposta).toBeNull();
    db.discursiva.findUnique.mockResolvedValue(d3);
    expect((await chamar("GET", "/discursivas/d3", aluno)).status).toBe(404);
    expect((await chamar("POST", "/discursivas/d3/tentativas", aluno, { texto: "x" })).status).toBe(404);
    expect(db.tentativaDiscursiva.create).not.toHaveBeenCalled();
  });

  it("com foto, a tentativa pode ir sem texto", async () => {
    db.tentativaDiscursiva.create.mockResolvedValue({ id: "t1", texto: "", nota: null, origem: "SIMULADO", createdAt: new Date(), fotos: [] });
    const r = await chamar("POST", "/discursivas/d1/tentativas", aluno, { comFoto: true, origem: "SIMULADO" });
    expect(r.status).toBe(201);
    expect(db.tentativaDiscursiva.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ texto: "", origem: "SIMULADO" }) })
    );
    const semFoto = await chamar("POST", "/discursivas/d1/tentativas", aluno, {});
    expect(semFoto.status).toBe(400);
  });

  const enviarFoto = (corpo: Buffer, tipo = "image/jpeg") =>
    fetch(base + "/discursivas/tentativas/t1/fotos", { method: "POST", headers: { authorization: aluno, "content-type": tipo }, body: corpo });

  it("foto: aceita JPEG de verdade na tentativa do próprio usuário", async () => {
    db.tentativaDiscursiva.findFirst.mockResolvedValue({ id: "t1", texto: "", discursiva: { valor: 40, caracteresPorLinha: 70 }, _count: { fotos: 0 } });
    db.fotoDiscursiva.create.mockResolvedValue({ id: "f1" });
    const r = await enviarFoto(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    expect(r.status).toBe(201);
    expect(db.tentativaDiscursiva.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "t1", userId: "u-aluno" } }));
    expect(db.fotoDiscursiva.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mime: "image/jpeg", bytes: 7 }) }));
  });

  it("foto: recusa arquivo que não é imagem, mesmo com Content-Type de imagem", async () => {
    db.tentativaDiscursiva.findFirst.mockResolvedValue({ id: "t1", texto: "", discursiva: { valor: 40, caracteresPorLinha: 70 }, _count: { fotos: 0 } });
    const r = await enviarFoto(Buffer.from("<script>alert(1)</script>"));
    expect(r.status).toBe(400);
    expect(db.fotoDiscursiva.create).not.toHaveBeenCalled();
  });

  it("foto: tentativa de outra pessoa é 404", async () => {
    db.tentativaDiscursiva.findFirst.mockResolvedValue(null);
    const r = await enviarFoto(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    expect(r.status).toBe(404);
    expect(db.fotoDiscursiva.create).not.toHaveBeenCalled();
  });

  it("foto: só o dono baixa", async () => {
    db.fotoDiscursiva.findFirst.mockResolvedValue(null);
    const r = await chamar("GET", "/discursivas/fotos/f1", aluno);
    expect(r.status).toBe(404);
    expect(db.fotoDiscursiva.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "f1", tentativa: { userId: "u-aluno" } } }));
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

// O resultado guarda a nota por disciplina quando o perfil tem mínimo nela; resultado sem
// o campo (front antigo, perfil sem mínimo por disciplina) continua valendo.
describe("POST /provas/resultados", () => {
  const placar = { acertos: 3, erros: 1, brancos: 0, pontos: 2, maximo: 4, minimo: 1, aprovado: true };
  const corpo = (grupo: Record<string, unknown>) => ({
    concursoId: "c1",
    perfilProvaId: "cgu-2026-dev",
    dados: { grupos: [grupo], pontos: 2, maximo: 4, minimo: 0, aprovado: false, motivos: ["P1 · X: abaixo"], itens: [], duracaoSegundos: 60 },
  });
  beforeEach(() => {
    db.concurso.findFirst.mockResolvedValue({ id: "c1", trilha: null });
    db.resultadoProva.create.mockResolvedValue({ id: "r1", createdAt: new Date(0) });
  });

  it("guarda as disciplinas do grupo", async () => {
    const disciplinas = [{ nome: "Ética Pública", ...placar, pontos: 0, minimo: 1, aprovado: false }];
    const r = await chamar("POST", "/provas/resultados", aluno, corpo({ grupo: "P1", ...placar, disciplinas }));
    expect(r.status).toBe(201);
    expect(db.resultadoProva.create.mock.calls[0][0].data.dados.grupos[0].disciplinas).toEqual(disciplinas);
  });

  it("aceita mais de 20 motivos (muitas disciplinas abaixo do mínimo)", async () => {
    const c = corpo({ grupo: "P1", ...placar });
    c.dados.motivos = Array.from({ length: 35 }, (_, i) => `P1 · Disciplina ${i}: abaixo do mínimo`);
    const r = await chamar("POST", "/provas/resultados", aluno, c);
    expect(r.status).toBe(201);
    expect(db.resultadoProva.create.mock.calls[0][0].data.dados.motivos).toHaveLength(35);
  });

    it("aceita grupo sem disciplinas", async () => {
    const r = await chamar("POST", "/provas/resultados", aluno, corpo({ grupo: "P1", ...placar }));
    expect(r.status).toBe(201);
    expect(db.resultadoProva.create.mock.calls[0][0].data.dados.grupos[0].disciplinas).toBeUndefined();
  });
});
