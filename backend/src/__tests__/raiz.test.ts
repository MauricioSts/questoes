import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { seguranca } from "../middleware/seguranca.js";
import { raizRouter, ESTILO_RAIZ, URL_SITE } from "../modules/raiz/raiz.routes.js";

// Monta a raiz atrás do mesmo helmet do server.ts, para conferir que a CSP da rota
// sobrescreve a política "nada liberado" da API.
let server: Server;
let base = "";

beforeAll(async () => {
  const app = express();
  app.use(seguranca);
  app.use("/", raizRouter);
  server = app.listen(0);
  await new Promise<void>((ok) => server.once("listening", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

describe("GET /", () => {
  it("responde uma página HTML em pt-BR apontando para o site", async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/^text\/html/);
    const html = await r.text();
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<meta name="description"');
    expect(html).toContain(`href="${URL_SITE}"`);
    expect(html).not.toMatch(/<script|src=/);
  });

  it("a CSP libera o estilo inline pelo hash e nada além disso", async () => {
    const r = await fetch(`${base}/`);
    const csp = r.headers.get("content-security-policy") ?? "";
    const hash = crypto.createHash("sha256").update(ESTILO_RAIZ).digest("base64");
    expect(csp).toContain(`style-src 'sha256-${hash}'`);
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("unsafe-inline");
    // o <style> da página é exatamente o que o hash cobre
    expect(await r.text()).toContain(`<style>${ESTILO_RAIZ}</style>`);
  });
});

describe("GET /robots.txt", () => {
  it("só a raiz pode ser indexada", async () => {
    const r = await fetch(`${base}/robots.txt`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await r.text()).toBe("User-agent: *\nAllow: /$\nDisallow: /\n");
  });

  it("as outras rotas seguem com a CSP fechada do helmet", async () => {
    const r = await fetch(`${base}/robots.txt`);
    expect(r.headers.get("content-security-policy")).not.toContain("style-src");
  });
});
