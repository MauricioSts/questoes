// O acervo é compartilhado: um lote importado passa a valer para todo mundo que segue
// a trilha. Por isso escrever nele é só do admin, e quem decide é o e-mail do token.
import { describe, it, expect } from "vitest";
import { ehAdmin } from "../middleware/admin.js";
import { env } from "../config/env.js";

describe("ehAdmin", () => {
  it("aceita o e-mail do admin", () => {
    expect(ehAdmin(env.ADMIN_EMAIL)).toBe(true);
  });

  it("ignora diferença de maiúsculas", () => {
    expect(ehAdmin(env.ADMIN_EMAIL.toUpperCase())).toBe(true);
  });

  it("recusa qualquer outra conta", () => {
    expect(ehAdmin("mauriciogear4@gmail.com")).toBe(false);
    expect(ehAdmin("outro@example.com")).toBe(false);
  });

  it("recusa token sem e-mail", () => {
    expect(ehAdmin(undefined)).toBe(false);
    expect(ehAdmin("")).toBe(false);
  });

  it("não cai em e-mail parecido com o do admin", () => {
    const [nome, dominio] = env.ADMIN_EMAIL.split("@");
    expect(ehAdmin(`${nome}@evil-${dominio}`)).toBe(false);
    expect(ehAdmin(`${nome}.x@${dominio}`)).toBe(false);
  });
});
