// Destaque "[...]": no modo padrão (Português, certo/errado, Anotações, Marcadas) todo
// "[x]" vira sublinhado, como sempre foi. No modo código (questões de programação),
// colchetes de código ficam literais.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { comRealce, questaoEmModoCodigo, segmentarRealce, type Segmento } from "../components/Realce";

const COD = { codigo: true };
const html = (t: string, o = {}) => renderToStaticMarkup(<p>{comRealce(t, o)}</p>);
const literalCodigo = (t: string) => expect(segmentarRealce(t, COD)).toEqual([{ tipo: "texto", valor: t }]);
const realces = (t: string, o = {}) => segmentarRealce(t, o).filter((s) => s.tipo === "realce").map((s) => s.valor);

// Implementação anterior (commit 495e5fc), mantida como referência do modo padrão.
function referenciaAntiga(texto: string): Segmento[] {
  const re = /\[([^\][]+)\]/g;
  const segs: Segmento[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) segs.push({ tipo: "texto", valor: texto.slice(ultimo, m.index) });
    segs.push({ tipo: "realce", valor: m[1]! });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) segs.push({ tipo: "texto", valor: texto.slice(ultimo) });
  return segs;
}

describe("modo padrão: igual ao de sempre", () => {
  it("congela destaques de Português e CE", () => {
    expect(realces("prazo de [5] dias")).toEqual(["5"]);
    expect(realces("em [1990]")).toEqual(["1990"]);
    expect(realces("os termos [este, esse]")).toEqual(["este, esse"]);
    expect(realces("[e, ou]")).toEqual(["e, ou"]);
    expect(realces("valor de [1.000,00]")).toEqual(["1.000,00"]);
    expect(realces("[prazo: 30 dias]")).toEqual(["prazo: 30 dias"]);
    expect(realces("[; porém]")).toEqual(["; porém"]);
    expect(realces("foi [ao encontro do] muro")).toEqual(["ao encontro do"]);
    expect(html("o termo [que] retoma")).toContain(">que</u>");
  });

  it("produz o mesmo resultado da implementação anterior", () => {
    const casos = [
      "[1, 2, 3]",
      "arr[0]",
      "[[1,2],[3]]",
      "[a](b)",
      "abre [ e não fecha [x]",
      "a [b] c [d e] f",
      "sem colchetes",
      "",
      "]x[ [y]",
    ];
    for (const t of casos) expect(segmentarRealce(t)).toEqual(referenciaAntiga(t));
    expect(comRealce("sem colchetes")).toBe("sem colchetes");
  });

  // Guarda-chuva textual: só confere por regex que as páginas chamam comRealce sem
  // segundo argumento; não renderiza as páginas.
  it("Anotações e Marcadas continuam chamando o modo padrão", () => {
    for (const pagina of ["Anotacoes.tsx", "Marcadas.tsx"]) {
      const src = readFileSync(join(__dirname, "..", "pages", pagina), "utf8");
      const chamadas = src.match(/comRealce\([^)]*\)/g) ?? [];
      expect(chamadas.length).toBeGreaterThan(0);
      for (const c of chamadas) expect(c).not.toContain(",");
    }
  });
});

describe("modo código: colchetes de código ficam literais", () => {
  it.each([
    "[1, 2, 3]",
    "arr[0]",
    "x = arr[i] + m[1][2]",
    "[[1,2],[3]]",
    "[a](b)",
    "veja [docs](https://docs.python.org/3/)",
    "lista = []",
    "s[1:3]",
    // comprehension
    "[x for x in range(3)]",
    "[i * 2 for i in lista]",
    "[x if x else y]",
    // numpy
    "np.array([1 2 3])",
    "[1 2 3]",
    // operador
    "[a + b, c]",
    // classe de regex
    "[a-z]+",
    "[0-9]",
    "[A-E]",
    "[abc]+",
    "[abc]*",
    "[abc]?",
    "[abc]{2}",
    // shell
    "[ -f arq ]",
    "[ $x -eq 1 ]",
    "if [ $x ]; then",
    // SQL Server
    "[dbo].[Cliente]",
    "SELECT [Nome] FROM [dbo].[Cliente]",
    "SELECT [Nome]",
  ])("%s", (t) => {
    literalCodigo(t);
    expect(html(t, COD)).not.toContain("<u");
  });

  it("prosa clara ainda vira destaque", () => {
    expect(realces("foi [ao encontro do] muro", COD)).toEqual(["ao encontro do"]);
    expect(realces("a palavra [não]", COD)).toEqual(["não"]);
  });

  it("colchete sem par não trava e o resto passa intacto", () => {
    literalCodigo("abre [ e [x] depois");
    const grande = "[".repeat(50_000) + "x";
    const t0 = performance.now();
    literalCodigo(grande);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it("conteúdo não vira HTML", () => {
    expect(html("[<b>x</b> y]", COD)).toContain("&lt;b&gt;");
  });
});

describe("questaoEmModoCodigo", () => {
  const base = { modulo: "I" as const };
  it("liga com campos da questão", () => {
    expect(questaoEmModoCodigo({ ...base, codigo: "print(1)" }, null)).toBe(true);
    expect(questaoEmModoCodigo({ ...base, linguagem: "python" }, null)).toBe(true);
    expect(questaoEmModoCodigo({ ...base, tipo: "saida" }, null)).toBe(true);
    expect(questaoEmModoCodigo({ ...base, tipo: "erro" }, null)).toBe(true);
    expect(
      questaoEmModoCodigo({ ...base, comando: { id: "c", grupo: "P2", texto: "", codigo: "x" } }, "cgu-2026")
    ).toBe(true);
  });
  it("liga nas trilhas dev-* e no módulo II da Dataprev TI", () => {
    expect(questaoEmModoCodigo({ ...base, tipo: "conceitual" }, "dev-python")).toBe(true);
    expect(questaoEmModoCodigo({ modulo: "II" }, "dataprev-analista-ti")).toBe(true);
    // Concurso sem trilha conta como Dataprev, como em configPadrao/rodizioDoConcurso.
    expect(questaoEmModoCodigo({ modulo: "II" }, null)).toBe(true);
    expect(questaoEmModoCodigo({ modulo: "II" }, undefined)).toBe(true);
  });
  it("fica desligado no resto", () => {
    expect(questaoEmModoCodigo(base, "dataprev-analista-ti")).toBe(false);
    expect(questaoEmModoCodigo({ modulo: "II" }, "cgu-2026")).toBe(false);
    expect(questaoEmModoCodigo({ ...base, tipo: "conceitual" }, null)).toBe(false);
    expect(questaoEmModoCodigo({ ...base, tipo: "conceitual" }, "cgu-2026")).toBe(false);
  });
});
