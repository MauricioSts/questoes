// POST /auth/refresh com o Prisma de mentira (não há banco de teste). Duas abas renovando
// com o mesmo token leem o mesmo registro; quem chega depois encontra o token já apagado
// (deleteMany com count 0) e precisa levar 401, não 500 nem um par novo.
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  refreshToken: { findUnique: vi.fn(), deleteMany: vi.fn(), delete: vi.fn(), create: vi.fn() },
}));
vi.mock("../prisma.js", () => ({ prisma: db }));

const { authRouter } = await import("../modules/auth/auth.routes.js");
const { errorHandler } = await import("../middleware/error.js");

let server: Server;
let base = "";
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  for (const fn of Object.values(db.refreshToken)) fn.mockReset();
});

const renovar = (refreshToken: string) =>
  fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

const usuario = { id: "u1", email: "aluno@example.com", nome: "Aluno", metaDiaria: 70 };
const valido = (expiraEmMs: number) => ({
  id: "rt1",
  userId: usuario.id,
  expiresAt: new Date(Date.now() + expiraEmMs),
  user: usuario,
});

describe("POST /auth/refresh", () => {
  it("rotaciona: apaga o antigo e emite um par novo", async () => {
    db.refreshToken.findUnique.mockResolvedValue(valido(60_000));
    db.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
    db.refreshToken.create.mockResolvedValue({});
    const r = await renovar("abc");
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.accessToken).toBeTruthy();
    expect(corpo.refreshToken).toBeTruthy();
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { id: "rt1" } });
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it("token já apagado por outra requisição (count 0) dá 401 sem emitir par", async () => {
    db.refreshToken.findUnique.mockResolvedValue(valido(60_000));
    db.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    const r = await renovar("abc");
    expect(r.status).toBe(401);
    expect(db.refreshToken.create).not.toHaveBeenCalled();
    expect(db.refreshToken.delete).not.toHaveBeenCalled();
  });

  it("token expirado já apagado por outra requisição também dá 401", async () => {
    db.refreshToken.findUnique.mockResolvedValue(valido(-60_000));
    db.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    const r = await renovar("abc");
    expect(r.status).toBe(401);
    expect(db.refreshToken.create).not.toHaveBeenCalled();
  });

  it("token desconhecido dá 401", async () => {
    db.refreshToken.findUnique.mockResolvedValue(null);
    const r = await renovar("abc");
    expect(r.status).toBe(401);
    expect(db.refreshToken.deleteMany).not.toHaveBeenCalled();
  });
});
