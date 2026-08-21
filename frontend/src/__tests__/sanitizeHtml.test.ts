// @vitest-environment jsdom
// O conteúdo do Caderno volta para a tela via innerHTML, então o saneador é a
// fronteira de segurança: o que ele deixa passar é o que o navegador executa.
import { describe, expect, it } from "vitest";
import { htmlParaTexto, sanitizeHtml, textoParaHtml } from "../lib/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("mantém a formatação do editor", () => {
    const html = '<h2>Título</h2><p><b>negrito</b> e <span style="font-size: 24px">grande</span></p><ul><li>um</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("remove script e handlers inline", () => {
    expect(sanitizeHtml('<p>oi</p><script>alert(1)</script>')).toBe("<p>oi</p>");
    expect(sanitizeHtml('<p onclick="alert(1)">oi</p>')).toBe("<p>oi</p>");
    expect(sanitizeHtml('<img src=x onerror="alert(1)">')).toBe("");
    expect(sanitizeHtml('<iframe src="https://x"></iframe>')).toBe("");
  });

  it("desembrulha tag desconhecida sem perder o texto", () => {
    expect(sanitizeHtml("<article><p>texto</p></article>")).toBe("<p>texto</p>");
  });

  it("filtra o style, deixando só propriedades de formatação", () => {
    const saida = sanitizeHtml('<p style="color: red; position: fixed; background: url(x)">a</p>');
    expect(saida).toBe('<p style="color: red">a</p>');
  });

  it("barra href com esquema perigoso e marca links externos", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeHtml('<a href="https://ok.com">x</a>')).toBe(
      '<a href="https://ok.com" target="_blank" rel="noopener noreferrer">x</a>'
    );
  });

  it("preserva os atributos da checklist e das tabelas", () => {
    const html = '<ul data-todo=""><li data-done="">feito</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
    expect(sanitizeHtml('<table><tbody><tr><td colspan="2">a</td></tr></tbody></table>')).toContain('colspan="2"');
  });
});

describe("textoParaHtml", () => {
  it("transforma quebras de linha em parágrafos", () => {
    expect(textoParaHtml("a\nb")).toBe("<p>a</p><p>b</p>");
  });

  it("mantém as linhas em branco", () => {
    expect(textoParaHtml("a\n\nb")).toBe("<p>a</p><p><br></p><p>b</p>");
  });

  it("escapa o texto em vez de interpretá-lo como HTML", () => {
    expect(textoParaHtml("<script>")).toBe("<p>&lt;script&gt;</p>");
  });
});

describe("htmlParaTexto", () => {
  it("extrai o texto para a contagem de palavras", () => {
    expect(htmlParaTexto("<p>uma <b>frase</b></p>")).toBe("uma frase");
  });
});
