// @vitest-environment jsdom
// XSS: texto que vem do lote/servidor (enunciado, explicação, código da questão) e o
// HTML do Caderno não podem virar elemento ou atributo executável na tela.
//
// Duas checagens por payload:
// 1) estrutural: no DOM renderizado não há <script>, atributo on*, nem URL javascript:;
// 2) de execução: o HTML renderizado é recarregado num JSDOM que RODA scripts, com
//    alert espionado, e recebe click/load/error/mouseover/focus em todo elemento. O
//    controle positivo (o payload cru) prova que esse JSDOM executaria o ataque.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QuestaoView } from "../components/QuestaoView";
import { ThemeProvider } from "../store/theme";
import { sanitizeHtml } from "../lib/sanitizeHtml";
import type { Questao } from "../types/questao";

const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '<a href="javascript:alert(1)">clique</a>',
  "<svg onload=alert(1)>",
];

const EVENTOS = ["click", "load", "error", "mouseover", "focus"];

// Carrega o HTML num documento com scripts ligados e dispara os eventos que acionariam
// handlers inline. Devolve quantas vezes alert foi chamado.
function alertsAoExecutar(html: string): number {
  let chamadas = 0;
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, {
    runScripts: "dangerously",
    beforeParse(win) {
      win.alert = () => {
        chamadas++;
      };
    },
  });
  const { document, Event } = dom.window;
  for (const el of document.body.querySelectorAll("*")) {
    for (const tipo of EVENTOS) el.dispatchEvent(new Event(tipo));
  }
  dom.window.close();
  return chamadas;
}

// Nada executável no DOM: sem <script>, sem atributo de evento, sem URL javascript:.
function semExecutavel(raiz: Element) {
  expect(raiz.querySelectorAll("script, iframe, object, embed").length).toBe(0);
  for (const el of raiz.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      expect(attr.name.toLowerCase().startsWith("on"), `${el.tagName} ${attr.name}`).toBe(false);
      if (/^(href|src|xlink:href|action|formaction)$/i.test(attr.name)) {
        expect(attr.value.replace(/\s/g, "").toLowerCase().startsWith("javascript:")).toBe(false);
      }
    }
  }
}

function questao(campos: Partial<Questao>): Questao {
  return {
    id: 1,
    modulo: "II",
    materia: "Programação",
    assunto: "Java",
    dificuldade: "media",
    enunciado: "Enunciado",
    alternativas: { A: "a", B: "b" },
    gabarito: "A",
    explicacao: "Explicação",
    ...campos,
  };
}

describe("controle positivo do JSDOM que executa", () => {
  it.each(PAYLOADS.filter((p) => !p.includes("javascript:")))("o payload cru dispara alert: %s", (p) => {
    expect(alertsAoExecutar(p)).toBeGreaterThan(0);
  });
});

describe("QuestaoView renderiza payloads como texto", () => {
  let raiz: Root | null = null;
  let container: HTMLDivElement;
  const alerta = vi.fn();

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.alert = alerta;
  });

  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
    container?.remove();
  });

  function render(q: Questao) {
    container = document.createElement("div");
    document.body.appendChild(container);
    raiz = createRoot(container);
    act(() => {
      raiz!.render(
        <ThemeProvider>
          <QuestaoView questao={q} selecionada="B" revelado onSelecionar={() => {}} />
        </ThemeProvider>
      );
    });
  }

  const campos: { nome: string; montar: (p: string) => Partial<Questao> }[] = [
    { nome: "enunciado", montar: (p) => ({ enunciado: `Considere ${p} e responda.` }) },
    { nome: "explicação", montar: (p) => ({ explicacao: `Porque ${p}.` }) },
    { nome: "código", montar: (p) => ({ codigo: `String s = "${p}";\n// ${p}`, linguagem: "java" }) },
    { nome: "código sem linguagem", montar: (p) => ({ codigo: p }) },
    { nome: "alternativa", montar: (p) => ({ alternativas: { A: p, B: "b" } }) },
  ];

  for (const campo of campos) {
    it.each(PAYLOADS)(`${campo.nome}: %s`, (p) => {
      render(questao(campo.montar(p)));
      semExecutavel(container);
      // O payload aparece na tela como texto, literalmente.
      expect(container.textContent).toContain(p);
      for (const el of container.querySelectorAll("*")) {
        for (const tipo of EVENTOS) el.dispatchEvent(new Event(tipo));
      }
      expect(alerta).not.toHaveBeenCalled();
      expect(alertsAoExecutar(container.innerHTML)).toBe(0);
    });
  }

  it("realça o código Java em tokens (spans), sem innerHTML", () => {
    render(questao({ codigo: 'public class A { int x = 1; String s = "<b>"; }', linguagem: "Java" }));
    const pre = container.querySelector("pre")!;
    expect(pre.dataset.linguagem).toBe("java");
    expect(pre.querySelector(".token.keyword")?.textContent).toBe("public");
    expect(pre.querySelector("b")).toBeNull();
    expect(pre.textContent).toContain('"<b>"');
  });
});

describe("Caderno (sanitizeHtml) com payloads", () => {
  it.each(PAYLOADS)("%s", (p) => {
    const alerta = vi.fn();
    window.alert = alerta;
    const div = document.createElement("div");
    div.innerHTML = sanitizeHtml(`<p>antes</p>${p}<p>depois</p>`);
    document.body.appendChild(div);
    semExecutavel(div);
    expect(div.querySelector("img, svg, a[href]")).toBeNull();
    for (const el of div.querySelectorAll("*")) {
      for (const tipo of EVENTOS) el.dispatchEvent(new Event(tipo));
    }
    expect(alerta).not.toHaveBeenCalled();
    expect(alertsAoExecutar(div.innerHTML)).toBe(0);
    div.remove();
  });

  it("payloads aninhados e ofuscados", () => {
    const sujos = [
      '<p><svg><g onload="alert(1)"></g></svg></p>',
      '<a href="  JaVaScRiPt:alert(1)">x</a>',
      '<a href="java&#x09;script:alert(1)">x</a>',
      '<p style="background:url(javascript:alert(1))">x</p>',
      "<math><mi xlink:href=\"javascript:alert(1)\">x</mi></math>",
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
      "<form><button formaction=javascript:alert(1)>x</button></form>",
      '<details open ontoggle="alert(1)">x</details>',
    ];
    for (const s of sujos) {
      const div = document.createElement("div");
      div.innerHTML = sanitizeHtml(s);
      semExecutavel(div);
      expect(alertsAoExecutar(div.innerHTML)).toBe(0);
    }
  });
});
