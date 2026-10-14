import { describe, expect, it } from "vitest";
import { dadosQuestao, iniciaisTrilha, limparTexto, questaoComunidadeSchema, slugTrilha } from "../lib/trilhaComunidade.js";

const base = {
  materia: "Português",
  enunciado: "Qual a crase correta?",
  alternativas: { A: "à", B: "a" },
  gabarito: "A",
};

describe("questaoComunidadeSchema", () => {
  it("aceita o mínimo e preenche os padrões", () => {
    const q = questaoComunidadeSchema.parse(base);
    expect(q.dificuldade).toBe("media");
    expect(q.explicacao).toBe("");
    expect(dadosQuestao(q).assunto).toBe("Geral");
  });

  it("recusa gabarito fora das alternativas", () => {
    expect(questaoComunidadeSchema.safeParse({ ...base, gabarito: "C" }).success).toBe(false);
  });

  it("recusa letra fora de A–E e menos de 2 alternativas", () => {
    expect(questaoComunidadeSchema.safeParse({ ...base, alternativas: { A: "x", F: "y" } }).success).toBe(false);
    expect(questaoComunidadeSchema.safeParse({ ...base, alternativas: { A: "x" } }).success).toBe(false);
  });

  it("recusa campo vazio depois de limpar e texto grande demais", () => {
    expect(questaoComunidadeSchema.safeParse({ ...base, enunciado: " \u0000 " }).success).toBe(false);
    expect(questaoComunidadeSchema.safeParse({ ...base, enunciado: "x".repeat(6001) }).success).toBe(false);
  });

  it("guarda texto com cara de SQL/HTML como texto, só sem caracteres de controle", () => {
    const q = questaoComunidadeSchema.parse({ ...base, enunciado: "'); DROP TABLE \"User\";--\u0000 <script>x</script>" });
    expect(q.enunciado).toBe("'); DROP TABLE \"User\";-- <script>x</script>");
  });

  it("ordena as alternativas por letra", () => {
    const q = questaoComunidadeSchema.parse({ ...base, alternativas: { C: "c", A: "a", B: "b" } });
    expect(Object.keys(dadosQuestao(q).alternativas)).toEqual(["A", "B", "C"]);
  });
});

describe("utilitários", () => {
  it("limparTexto normaliza quebras e tira controle", () => {
    expect(limparTexto("  a\r\nb\u0007c\t ")).toBe("a\nbc");
  });
  it("slug e iniciais", () => {
    expect(slugTrilha("Banco do Brasil", "Escriturário")).toMatch(/^banco-do-brasil-escriturario-[a-z0-9]{1,6}$/);
    expect(iniciaisTrilha("Banco do Brasil")).toBe("BDB");
    expect(iniciaisTrilha("Petrobras")).toBe("PETR");
  });
});
