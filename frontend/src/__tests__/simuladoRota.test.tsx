// @vitest-environment jsdom
// Qual simulado a trilha abre: perfil certo/errado (ou sem formato, os antigos) vai para
// o SimuladoCE; perfil de múltipla escolha fica no simulado normal, com o padrão tirado
// do perfil (configDoPerfil); sem perfil, o padrão de sempre.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configDoPerfil, configPadrao } from "../lib/simuladoConfig";
import type { PerfilProva } from "../lib/notaCE";
import type { PerfilDaTrilha } from "../lib/perfilProva";

const ler = (nome: string) =>
  JSON.parse(readFileSync(join(__dirname, `../../../docs/perfis/${nome}.json`), "utf8")) as PerfilProva;

let perfilAtual: PerfilDaTrilha | null | undefined;

vi.mock("../hooks/usePerfilProva", () => ({ usePerfilProva: () => perfilAtual }));
vi.mock("../store/concurso", () => ({
  useConcurso: () => ({ ativo: { id: "c1", trilhaId: "trilha-x", simuladoConfig: null }, refresh: async () => {} }),
}));
vi.mock("../store/questoes", () => ({ useQuestoes: () => ({ total: 0 }) }));
vi.mock("../lib/questoesRepo", () => ({ todas: () => [], getQuestoes: () => [] }));
vi.mock("../lib/api", () => ({ api: vi.fn(async () => ({})), ApiError: class extends Error {} }));
vi.mock("../components/SimuladoCE", () => ({
  SimuladoCE: ({ perfilId }: { perfilId: string }) => <p data-ce>{perfilId}</p>,
}));
// O editor mostra a configuração que recebeu: é ela que o simulado sorteia.
vi.mock("../components/EditorSimulado", () => ({
  EditorSimulado: ({ config }: { config: unknown }) => <pre data-config>{JSON.stringify(config)}</pre>,
}));
vi.mock("../components/PageHeader", () => ({ PageHeader: ({ titulo }: { titulo: string }) => <h1>{titulo}</h1> }));

let raiz: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
});

afterEach(() => {
  act(() => raiz.unmount());
  host.remove();
});

async function abrir(perfil: PerfilDaTrilha | null) {
  perfilAtual = perfil;
  const { Simulado } = await import("../pages/Simulado");
  await act(async () => raiz.render(<Simulado />));
}

const configNaTela = () => JSON.parse(host.querySelector("[data-config]")!.textContent!);

describe("roteamento do Simulado pelo perfil", () => {
  it("perfil certo/errado (CGU, sem formato) abre o SimuladoCE", async () => {
    await abrir({ id: "cgu-2026-dev", dados: ler("cgu-2026-dev") });
    expect(host.querySelector("[data-ce]")?.textContent).toBe("cgu-2026-dev");
    expect(host.querySelector("[data-config]")).toBeNull();
  });

  it("formato CERTO_ERRADO explícito também", async () => {
    await abrir({ id: "x", dados: { ...ler("bacen-2024-ti"), formato: "CERTO_ERRADO" } });
    expect(host.querySelector("[data-ce]")).not.toBeNull();
  });

  it("múltipla escolha (TJPB) abre o simulado normal com configDoPerfil", async () => {
    const tjpb = ler("tjpb-2026-dev");
    await abrir({ id: "tjpb-2026-dev", dados: tjpb });
    expect(host.querySelector("[data-ce]")).toBeNull();
    expect(configNaTela()).toEqual(configDoPerfil(tjpb));
    expect(host.textContent).toContain("60"); // questões
  });

  it("sem perfil, o padrão de sempre", async () => {
    await abrir(null);
    expect(host.querySelector("[data-ce]")).toBeNull();
    expect(configNaTela()).toEqual(configPadrao("trilha-x", []));
  });
});
