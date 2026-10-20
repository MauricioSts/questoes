import { beforeEach, describe, expect, it, vi } from "vitest";
import { buscarPerfilProva, limparPerfisProva } from "../lib/perfilProva";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({ api: vi.fn() }));
const apiMock = vi.mocked(api);

const ce = { id: "cgu-2026-dev", dados: { perfil: "cgu-2026-dev" } };
const me = { id: "tjpb-2026-dev", dados: { perfil: "tjpb-2026-dev", formato: "MULTIPLA_ESCOLHA" } };

beforeEach(() => {
  limparPerfisProva();
  apiMock.mockReset();
});

describe("perfil da prova (GET /provas/perfil)", () => {
  it("usa o perfilTrilha (completo) mesmo quando perfil vem null (múltipla escolha)", async () => {
    apiMock.mockResolvedValue({ perfil: null, perfilTrilha: me });
    expect(await buscarPerfilProva("c1")).toEqual(me);
  });

  it("servidor antigo, só com perfil: usa ele", async () => {
    apiMock.mockResolvedValue({ perfil: ce });
    expect(await buscarPerfilProva("c1")).toEqual(ce);
  });

  it("sem perfil nenhum: null", async () => {
    apiMock.mockResolvedValue({ perfil: null, perfilTrilha: null });
    expect(await buscarPerfilProva("c1")).toBeNull();
  });

  it("guarda por concurso e limpa sob demanda (logout, troca de concurso)", async () => {
    apiMock.mockResolvedValue({ perfil: ce, perfilTrilha: ce });
    await buscarPerfilProva("c1");
    await buscarPerfilProva("c1");
    expect(apiMock).toHaveBeenCalledTimes(1);
    limparPerfisProva();
    await buscarPerfilProva("c1");
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it("erro (offline) não fica no cache", async () => {
    apiMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ perfilTrilha: me });
    expect(await buscarPerfilProva("c1")).toBeNull();
    expect(await buscarPerfilProva("c1")).toEqual(me);
  });
});
