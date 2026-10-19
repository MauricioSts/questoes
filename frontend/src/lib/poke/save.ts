// Onde o jogo da Batalha fica salvo: no servidor (/poke/save), não no aparelho. As
// mudanças são juntadas e enviadas com folga (várias por turno viram um PUT), e o que
// faltar sai ao esconder/fechar a página. O localStorage antigo (q_poke_*) é lido uma
// única vez, para subir o jogo de quem jogava antes desta versão, e depois é apagado.
import { api } from "../api";
import type { PartidaPoke, PerfilPoke } from "./motor";

export interface SavePoke {
  perfil: PerfilPoke | null;
  partida: PartidaPoke | null;
  jogador: string | null;
  // "compartilhada" = a mesma jornada em todas as trilhas que escolheram continuar;
  // "separada" = a jornada desta trilha, que começou do zero.
  jornada?: "compartilhada" | "separada";
  // Já existe jornada de outra trilha e esta ainda não escolheu: continuar ou zerar.
  perguntar?: boolean;
}

// ?trilhaId= das rotas do save: é a trilha que decide qual jornada vale.
const comTrilha = (trilhaId?: string | null) => (trilhaId ? `/poke/save?trilhaId=${encodeURIComponent(trilhaId)}` : "/poke/save");

// Escolha da jornada desta trilha (ver POST /poke/jornada no backend).
export async function escolherJornada(trilhaId: string, separada: boolean): Promise<void> {
  await api("/poke/jornada", { method: "POST", body: { trilhaId, separada } });
}
export type EstadoSave = "salvo" | "salvando" | "erro";

const LEGADO = { perfil: "q_poke_perfil", partida: "q_poke_partida", jogador: "q_poke_jogador" } as const;

function lerLegado<T>(chave: string): T | null {
  try {
    const s = localStorage.getItem(chave);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function apagarLegado() {
  try {
    for (const k of Object.values(LEGADO)) localStorage.removeItem(k);
  } catch {
    /* sem armazenamento */
  }
}

export async function carregarSave(trilhaId?: string | null): Promise<SavePoke> {
  const s = await api<SavePoke>(comTrilha(trilhaId));
  // O jogo antigo do aparelho só sobe para a jornada compartilhada.
  if (s.jornada === "separada") return s;
  const local: SavePoke = {
    perfil: lerLegado<PerfilPoke>(LEGADO.perfil),
    partida: lerLegado<PartidaPoke>(LEGADO.partida),
    jogador: lerLegado<string>(LEGADO.jogador),
  };
  if (!s.perfil && local.perfil) {
    // Primeira vez com o jogo no servidor: sobe o que estava neste aparelho.
    const subir = { perfil: local.perfil, partida: local.partida, jogador: s.jogador ?? local.jogador ?? undefined };
    await api(comTrilha(trilhaId), { method: "PUT", body: subir });
    apagarLegado();
    return { ...s, perfil: local.perfil, partida: local.partida, jogador: subir.jogador ?? null };
  }
  if (!s.jogador && local.jogador) {
    await api(comTrilha(trilhaId), { method: "PUT", body: { jogador: local.jogador } });
    s.jogador = local.jogador;
  }
  apagarLegado();
  return s;
}

export interface Salvador {
  salvar: (parcial: Partial<SavePoke>) => void;
  enviarAgora: (saindo?: boolean) => void;
}

export function criarSalvador(aoMudar: (e: EstadoSave) => void, trilhaId?: string | null, folgaMs = 800): Salvador {
  let pendente: Partial<SavePoke> = {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let enviando = false;

  const enviarAgora = (saindo = false) => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!Object.keys(pendente).length) return;
    if (enviando && !saindo) {
      timer = setTimeout(() => enviarAgora(), folgaMs);
      return;
    }
    const corpo = pendente;
    pendente = {};
    enviando = true;
    aoMudar("salvando");
    // keepalive só aceita corpo pequeno; perfil grande sai como requisição comum.
    const keepalive = saindo && JSON.stringify(corpo).length < 60_000;
    api(comTrilha(trilhaId), { method: "PUT", body: corpo, keepalive })
      .then(() => {
        enviando = false;
        aoMudar(Object.keys(pendente).length ? "salvando" : "salvo");
      })
      .catch(() => {
        enviando = false;
        pendente = { ...corpo, ...pendente };
        aoMudar("erro");
        if (!timer) timer = setTimeout(() => enviarAgora(), 5000);
      });
  };

  return {
    salvar(parcial) {
      pendente = { ...pendente, ...parcial };
      aoMudar("salvando");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => enviarAgora(), folgaMs);
    },
    enviarAgora,
  };
}
