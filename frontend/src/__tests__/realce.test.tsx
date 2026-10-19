// Colchetes de código em alternativas/enunciados não podem virar destaque
// sublinhado; o destaque "[termo]" de Língua Portuguesa continua funcionando.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comRealce, segmentarRealce } from "../components/Realce";

const html = (t: string) => renderToStaticMarkup(<p>{comRealce(t)}</p>);
const literal = (t: string) => expect(segmentarRealce(t)).toEqual([{ tipo: "texto", valor: t }]);

describe("comRealce", () => {
  it("lista [1, 2, 3] fica literal", () => {
    literal("[1, 2, 3]");
    expect(html("print([1, 2, 3])")).toBe("<p>print([1, 2, 3])</p>");
  });

  it("indexação arr[0] fica literal", () => {
    literal("arr[0]");
    literal("x = arr[i] + m[1][2]");
  });

  it("lista aninhada [[1,2],[3]] fica literal", () => {
    literal("[[1,2],[3]]");
    expect(html("a = [[1,2],[3]]")).toBe("<p>a = [[1,2],[3]]</p>");
  });

  it("[a](b) sem URL válida fica literal", () => {
    literal("[a](b)");
    expect(html("[a](b)")).not.toContain("<u");
  });

  it("link markdown real não vira link nem sublinhado (sem suporte a link)", () => {
    const t = "veja [docs](https://docs.python.org/3/)";
    literal(t);
    const h = html(t);
    expect(h).not.toContain("<a");
    expect(h).not.toContain("<u");
    expect(h).toContain("[docs](https://docs.python.org/3/)");
  });

  it("outros casos de código ficam literais", () => {
    literal("lista = []");
    literal("s[1:3]");
    literal("['a', 'b']");
    literal("[x, y, z]");
    literal("[True, None]");
  });

  it("mantém o destaque de Língua Portuguesa", () => {
    expect(segmentarRealce("foi [ao encontro do] muro")).toEqual([
      { tipo: "texto", valor: "foi " },
      { tipo: "realce", valor: "ao encontro do" },
      { tipo: "texto", valor: " muro" },
    ]);
    expect(html("o termo [que] retoma")).toContain(">que</u>");
    expect(html('a palavra "[cujo]"')).toContain(">cujo</u>");
    expect(html("isso [, porém,] mudou")).toContain(">, porém,</u>");
  });

  it("colchete sem fechamento e texto puro passam intactos", () => {
    expect(comRealce("sem colchetes")).toBe("sem colchetes");
    literal("abre [ e não fecha");
  });

  it("conteúdo não vira HTML", () => {
    expect(html("[<b>x</b> y]")).toContain("&lt;b&gt;");
  });
});
