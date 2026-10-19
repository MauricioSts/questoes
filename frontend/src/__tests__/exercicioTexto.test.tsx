// @vitest-environment jsdom
// Tela de exercício: enunciado, stdout, stderr e saída de compilação são dados não
// confiáveis e precisam chegar ao DOM como TEXTO. Nenhum payload pode virar elemento.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExercicioDetalhe, ResultadoExecucao } from "../lib/execucao";

const PAYLOADS = [
  "<script>alert(1)</script>",
  '<img src=x onerror="alert(2)">',
  '<a href="javascript:alert(3)">clique</a>',
  '<svg onload="alert(4)"></svg>',
  '<iframe src="javascript:alert(5)"></iframe>',
];
const TUDO = PAYLOADS.join("\n");

const detalhe: ExercicioDetalhe = {
  id: "py-xss",
  trilhaId: "dev-py",
  titulo: "Soma <b>XSS</b>",
  enunciado: `Leia dois números.\n${TUDO}`,
  linguagem: "python",
  modo: "sql",
  dificuldade: "facil",
  topico: "entrada <i>e</i> saída",
  codigoInicial: "print(1)",
  seedSql: `CREATE TABLE t(x); -- ${TUDO}`,
  testesVisiveis: [{ nome: `exemplo ${PAYLOADS[0]}`, entrada: TUDO, saidaEsperada: TUDO }],
  testesOcultos: 2,
  ultimoCodigo: null,
};

const resultado: ResultadoExecucao = {
  compilacao: { ok: false, stderr: TUDO, tempoMs: 30 },
  testes: [
    { nome: `visível ${PAYLOADS[1]}`, oculto: false, passou: false, motivo: "saida_diferente", tempoMs: 5, entrada: TUDO, esperado: TUDO, stdout: TUDO, stderr: TUDO },
    { nome: `oculto ${PAYLOADS[3]}`, oculto: true, passou: false, motivo: "erro_execucao", tempoMs: 4 },
  ],
  passou: 0,
  total: 2,
  tempoMs: 120,
};

// API falsa: o detalhe do exercício e, na execução, o resultado acima.
vi.mock("../lib/api", () => {
  class ApiError extends Error {
    constructor(public status: number, message: string, public body?: unknown) {
      super(message);
    }
  }
  return {
    ApiError,
    api: vi.fn(async (path: string) => {
      if (path.startsWith("/exercicios/")) return detalhe;
      if (path === "/execucoes") return { id: "e1", status: "fila" };
      return { id: "e1", status: "concluida", exercicioId: detalhe.id, linguagem: "python", posicaoNaFila: 0, resultado };
    }),
  };
});
// O editor (CodeMirror) e o título animado dependem do tema e de canvas; aqui só importa o texto.
vi.mock("../components/exercicio/EditorCodigo", () => ({ default: () => null }));
vi.mock("../components/PageHeader", () => ({
  PageHeader: ({ rotulo, titulo }: { rotulo: string; titulo: string }) => (
    <div>
      <p>{rotulo}</p>
      <h1>{titulo}</h1>
    </div>
  ),
}));

// svg: só os ícones do lucide (classe "lucide") são esperados na tela.
const PERIGOSOS = "script, img, iframe, svg:not(.lucide), object, embed, a[href^='javascript'], b, i, [onerror], [onload]";

let alerta: ReturnType<typeof vi.fn>;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  alerta = vi.fn();
  window.alert = alerta as unknown as typeof window.alert;
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  host.remove();
});

async function esperarAte(cond: () => boolean) {
  for (let i = 0; i < 100 && !cond(); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

describe("ResultadoExecucaoView", () => {
  it("mostra stdout/stderr/compilação como texto, sem criar elementos", async () => {
    const { ResultadoExecucaoView } = await import("../components/exercicio/ResultadoExecucao");
    const root = createRoot(host);
    // Compilou: o primeiro visível que falhou já vem aberto, com entrada/esperado/stdout/stderr.
    const compilou = { ...resultado, compilacao: { ok: true, stderr: "", tempoMs: 30 } };
    await act(async () => root.render(<ResultadoExecucaoView resultado={compilou} />));
    expect(host.querySelectorAll(PERIGOSOS)).toHaveLength(0);
    expect(host.textContent).toContain(PAYLOADS[0]);
    expect(host.textContent).toContain(PAYLOADS[3]);
    expect(host.querySelectorAll("pre")).toHaveLength(4);
    for (const pre of host.querySelectorAll("pre")) expect(pre.textContent).toBe(TUDO);
    // Não compilou: a saída do compilador também é texto.
    await act(async () => root.render(<ResultadoExecucaoView resultado={resultado} />));
    expect(host.querySelectorAll(PERIGOSOS)).toHaveLength(0);
    expect(host.querySelector("pre")!.textContent).toBe(TUDO);
    // Oculto: só passou/falhou — nenhum bloco de saída dentro dele.
    const oculto = host.querySelector('[data-teste="oculto"]')!;
    expect(oculto.querySelector("pre")).toBeNull();
    expect(alerta).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});

describe("tela do exercício", () => {
  it("enunciado, exemplos e resultado ficam como texto", async () => {
    const { Exercicio } = await import("../pages/Exercicio");
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={["/exercicios/py-xss"]}>
          <Routes>
            <Route path="/exercicios/:id" element={<Exercicio />} />
          </Routes>
        </MemoryRouter>
      )
    );
    await esperarAte(() => !!host.querySelector("[data-enunciado]"));
    expect(host.querySelector("[data-enunciado]")!.textContent).toContain(PAYLOADS[1]);
    expect(host.textContent).toContain("Soma <b>XSS</b>");

    // Executa e espera o resultado (polling real com o primeiro intervalo de 0,5 s).
    const botao = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Executar"))!;
    await act(async () => botao.click());
    await esperarAte(() => !!host.textContent?.includes("Não compilou"));

    expect(host.querySelectorAll(PERIGOSOS)).toHaveLength(0);
    expect(alerta).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});

describe("código da funcionalidade", () => {
  it("não usa innerHTML nem dangerouslySetInnerHTML", () => {
    const src = join(__dirname, "..");
    const arquivos = [
      join(src, "pages/Exercicio.tsx"),
      join(src, "pages/Exercicios.tsx"),
      join(src, "lib/execucao.ts"),
      join(src, "hooks/useExecucao.ts"),
      ...readdirSync(join(src, "components/exercicio")).map((f) => join(src, "components/exercicio", f)),
    ];
    for (const f of arquivos) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML/);
    }
  });
});
