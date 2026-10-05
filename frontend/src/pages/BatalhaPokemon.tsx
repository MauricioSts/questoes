// BATALHA POKÉMON: a revisão espaçada como jornada Pokémon. Treinadores lançam Pokémon e
// cada turno é uma questão: a resposta certa faz o golpe sair (tira HP, põe status, cura).
// As regras (e o porquê de cada uma, sempre a favor do aprendizado) estão no motor,
// lib/poke/motor.ts; os dados da PokéAPI, em lib/poke/dex.ts. Esta tela monta a partida,
// grava cada resposta como estudo de verdade (contexto BATALHA: conta na meta do dia e na
// ofensiva) e anima os eventos que o motor devolve.
//
// Partida e perfil (coleção, time, mochila, insígnias) ficam no localStorage, por aparelho.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Backpack, Cloud, CloudOff, CloudUpload, Crown, Flag, Flame, HelpCircle, Lock, Map as MapaIcone, NotebookPen, Pause, Plane, RotateCcw, Shuffle, Swords, Trees, Trophy, Settings, Users, X } from "lucide-react";
import type { Alternativa } from "../types/questao";
import { getQuestao } from "../lib/questoesRepo";
import { carregarFilaBatalha, novasPorFraqueza, type HistoricoQ } from "../lib/filaBatalha";
import { ITENS, REVIVER, categoriaDe, lojaDe, nomeItem, seguravel, type CategoriaItem } from "../lib/poke/itens";
import { api } from "../lib/api";
import { enviarResposta } from "../lib/answers";
import { montarResultado } from "../lib/correcao";
import { salvarLicoesNoCaderno, textoCalibragem } from "../lib/licoes";
import { resumir, type Candidata, type Confianca } from "../lib/batalha";
import { tipoDaMateria } from "../components/batalha/tipos";
import {
  COR_TIPO,
  INICIAIS_POR_REGIAO,
  ULTIMO_DA_JORNADA,
  NOME_TIPO,
  NIVEL_TROCA_AMIZADE,
  atributos,
  carregarDex,
  efetividade,
  spriteEstatico,
  spriteFrente,
  spriteItem,
  spriteTreinador,
  TREINADORES_JOGADOR,
  cenario,
  xpDoNivel,
  nivelDoXpPoke,
  MAX_GOLPES,
  type Dex,
} from "../lib/poke/dex";
import {
  BOLAS,
  BOLAS_SAFARI,
  MAX_TIME,
  MAX_TROCAS,
  REGIOES,
  TERRENOS,
  campeaoDe,
  levelCap,
  darItem,
  expAllLigado,
  itensPossuidos,
  liderLiberado,
  historiaDe,
  treinadoresParaGinasio,
  limiteDaRegiao,
  podeLutar,
  podeTrocarSelvagem,
  proximaRegiao,
  regiaoAtual,
  regiaoDe,
  trocarSelvagem,
  viajar,
  decidirGolpe,
  definirGolpes,
  golpesDisponiveis,
  insigniasDe,
  ligaLiberada,
  MIN_LICAO,
  avancarPoke,
  chanceCaptura,
  pularQuestao,
  escolherOferta,
  fugirPoke,
  hpMax,
  montarPartidaPoke,
  nivelDe,
  nivelMedio,
  perfilInicial,
  podeUsar,
  precisaTrocar,
  registrarLicaoPoke,
  responderPoke,
  sincronizarPerfil,
  trocar,
  usarItem,
  turnoSemQuestao,
  encontroDaVez,
  slotDaVez,
  inimigosEmCampo,
  meusEmCampo,
  lutaAtiva,
  slotParaTrocar,
  moverNoTime,
  centroPokemon,
  seguirViagem,
  comprarNaPartida,
  comprarNoPerfil,
  dinheiroDe,
  caminhoConcluido,
  faltamNoCaminho,
  ajudantesVencidos,
  type Slot,
  type AcaoGolpe,
  type Acao,
  type Encontro,
  type Evento,
  type Lutador,
  type ModoJornada,
  type Mon,
  type PartidaPoke,
  type PerfilPoke,
  type Status,
  type StatusGolpe,
} from "../lib/poke/motor";
import { useAuth } from "../store/auth";
import { useConcurso } from "../store/concurso";
import { useMeta } from "../store/meta";
import { usePausarFundo } from "../store/fundo";
import { QuestaoView } from "../components/QuestaoView";
import { PageHeader } from "../components/PageHeader";
import { Carregando } from "../components/Spinner";
import { Arena, Pokebolas, TEXTO_HABITAT, TipoChip, habitatDoTipo, type BolaVis, type EstadoBola, type FxVis, type ItemVis, type LadoVis, type LancaVis, type TextoVis } from "../components/poke/Arena";
import { CHEGADA, efeitoDoGolpe, efeitoDoStatus } from "../components/poke/fx";
import { carregarSave, criarSalvador, type EstadoSave, type SavePoke } from "../lib/poke/save";

// Persistência: o jogo fica no servidor (lib/poke/save.ts). O sprite do jogador fica fora
// do perfil para sobreviver ao recomeço.

// ---------- textos ----------


const TXT_STATUS: Record<Exclude<Status, "">, [string, string, string]> = {
  // [pegou, tique/impede, curou]
  poison: ["foi envenenado", "sofreu com o veneno", "se curou do veneno"],
  burn: ["se queimou", "sofreu com a queimadura", "se curou da queimadura"],
  paralysis: ["ficou paralisado", "está paralisado", "não está mais paralisado"],
  sleep: ["adormeceu", "está dormindo", "acordou"],
  freeze: ["congelou", "está congelado", "descongelou"],
};

const TXT_STATUS_INIMIGO: Record<StatusGolpe, string> = {
  poison: "foi envenenado",
  burn: "se queimou",
  paralysis: "ficou paralisado (pode não conseguir contra-atacar)",
  sleep: "adormeceu (não contra-ataca enquanto dorme)",
  freeze: "congelou (não contra-ataca enquanto estiver congelado)",
  "leech-seed": "foi semeado: vai perder HP a cada turno",
};
const TXT_TIQUE: Partial<Record<StatusGolpe, string>> = { poison: "sofreu com o veneno", burn: "sofreu com a queimadura" };

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fase = "lobby" | "entrada" | "pergunta" | "golpe" | "resultado" | "troca" | "recompensa" | "parada" | "fim";

// A questão respondida. O motor já troca `atual.questaoId` para a próxima questão quando o
// inimigo sobrevive, então o resultado precisa guardar a questão da vez (e a ordem em que as
// alternativas apareceram) para não mostrar a próxima já revelada.
interface Desfecho {
  acertou: boolean;
  confianca: Confianca;
  questaoId: number;
  marcada: Alternativa;
  retorno: boolean;
  historico?: { tentativas: number; erros: number };
}

// Insígnias da PokéAPI em sequência: Kanto 1–8, Johto 9–16, Hoenn 17–24, Sinnoh 25–32, Unova 33–40.
export const insigniaImg = (i: number, regiao = 0) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/${8 * regiao + i + 1}.png`;
const NOME_MODO: Record<ModoJornada, string> = { rota: "Caminho", ginasio: "Ginásio", safari: "Zona Safári", liga: "Liga Pokémon" };

// ---------- página ----------

export function BatalhaPokemon({ alternar }: { alternar?: ReactNode }) {
  const [dex, setDex] = useState<Dex | null>(null);
  const [erroDex, setErroDex] = useState(false);
  const [save, setSave] = useState<SavePoke | null>(null);
  const [erroSave, setErroSave] = useState(false);
  const buscarSave = useCallback(() => {
    setErroSave(false);
    carregarSave()
      .then(setSave)
      .catch(() => setErroSave(true));
  }, []);
  useEffect(() => {
    carregarDex()
      .then(setDex)
      .catch(() => setErroDex(true));
    buscarSave();
  }, [buscarSave]);
  if (erroDex) return <p className="p-6 text-sm text-muted">Não consegui carregar a Pokédex. Recarregue a página.</p>;
  if (erroSave)
    return (
      <div className="space-y-3 p-6 text-sm text-muted">
        <p>Não consegui buscar o seu jogo salvo no servidor.</p>
        <button onClick={buscarSave} className="btn-primary text-sm">
          Tentar de novo
        </button>
      </div>
    );
  if (!dex || !save) return <Carregando texto={dex ? "Buscando seu jogo salvo…" : "Abrindo a Pokédex…"} />;
  return <Jogo dex={dex} save={save} alternar={alternar} />;
}

function Jogo({ dex, save, alternar }: { dex: Dex; save: SavePoke; alternar?: ReactNode }) {
  usePausarFundo();
  const { activeId } = useConcurso();
  const { goal } = useMeta();

  const { usuario } = useAuth();

  const [estadoSave, setEstadoSave] = useState<EstadoSave>("salvo");
  const salvador = useMemo(() => criarSalvador(setEstadoSave), []);
  useEffect(() => {
    const sair = () => salvador.enviarAgora(true);
    const esconder = () => document.visibilityState === "hidden" && sair();
    window.addEventListener("pagehide", sair);
    document.addEventListener("visibilitychange", esconder);
    return () => {
      window.removeEventListener("pagehide", sair);
      document.removeEventListener("visibilitychange", esconder);
      salvador.enviarAgora();
    };
  }, [salvador]);

  const [perfil, setPerfilEstado] = useState<PerfilPoke | null>(() => {
    const p = save.perfil;
    if (!p || p.versao !== 1 || !p.colecao.length) return null;
    // Reset feito pelo servidor (User.pokeResetAt): perfil anterior a ele recomeça do zero.
    const reset = usuario?.pokeResetAt;
    if (reset && (!p.criadoEm || p.criadoEm < reset)) {
      salvador.salvar({ perfil: null, partida: null });
      return null;
    }
    return p;
  });
  const setPerfil = useCallback(
    (p: PerfilPoke) => {
      setPerfilEstado(p);
      salvador.salvar({ perfil: p });
    },
    [salvador]
  );
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  const [partida, setPartidaEstado] = useState<PartidaPoke | null>(() => {
    const p = perfil ? save.partida : null;
    return p && p.versao === 3 && p.concursoId === (activeId ?? null) ? p : null;
  });
  // Toda mudança da partida vai para o perfil na hora (níveis, capturas, mochila): fechar a
  // aba no meio não perde o que o time conquistou.
  const setPartida = useCallback(
    (p: PartidaPoke | null) => {
      setPartidaEstado(p);
      salvador.salvar({ partida: p });
      if (p && perfilRef.current) setPerfil(sincronizarPerfil(perfilRef.current, p));
    },
    [setPerfil, salvador]
  );

  const [viagem, setViagem] = useState(false);
  const [fase, setFase] = useState<Fase>(() => (!partida ? "lobby" : partida.fim ? "fim" : partida.oferta ? "recompensa" : "lobby"));

  // lobby
  const [hist, setHist] = useState<Map<number, HistoricoQ> | null>(null);
  const [pendentes, setPendentes] = useState<Candidata[] | null>(null);
  const [erroCarga, setErroCarga] = useState(false);

  // luta
  const [selecionada, setSelecionada] = useState<Alternativa | undefined>();
  const [certeza, setCerteza] = useState(false);
  const [painel, setPainel] = useState<null | "mochila" | "pokemon" | "bolas">(null);
  const [alvoItem, setAlvoItem] = useState<string | null>(null);
  const [trocaEscolhida, setTrocaEscolhida] = useState<number | null>(null); // dupla: quem entra (falta dizer no lugar de quem)
  const [ordens, setOrdens] = useState<(AcaoGolpe | null)[]>([null, null]); // dupla: golpe e alvo de cada um
  const [golpeSemAlvo, setGolpeSemAlvo] = useState<{ slot: Slot; golpe: number } | null>(null);
  const [desfecho, setDesfecho] = useState<Desfecho | null>(null);
  const [licao, setLicao] = useState("");
  const [confirmarFuga, setConfirmarFuga] = useState(false);
  const [mensagem, setMensagem] = useState("");
  // o que está desenhado em cada slot (0 na frente, 1 atrás; o 1 só na batalha dupla)
  const [meus, setMeus] = useState<(LadoVis | null)[]>([null, null]);
  const [inimigos, setInimigos] = useState<(LadoVis | null)[]>([null, null]);
  const meusRef = useRef(meus);
  meusRef.current = meus;
  const inimigosRef = useRef(inimigos);
  inimigosRef.current = inimigos;
  type Vis = LadoVis | null | ((v: LadoVis | null) => LadoVis | null);
  const setSlot = (set: typeof setMeus, k: Slot, f: Vis) =>
    set((xs) => {
      const ys = [...xs];
      ys[k] = typeof f === "function" ? f(xs[k]) : f;
      return ys;
    });
  const setMeu = (k: Slot, f: Vis) => setSlot(setMeus, k, f);
  const setIni = (k: Slot, f: Vis) => setSlot(setInimigos, k, f);
  const [treinadorVis, setTreinadorVis] = useState<{ sprite: string; chave: number; sai: boolean; lider?: boolean } | null>(null);
  const [transicao, setTransicao] = useState<number | null>(null);
  const [insigniaVis, setInsigniaVis] = useState<{ src: string; nome: string; n: number } | null>(null);
  const [fx, setFx] = useState<FxVis | null>(null);
  const [textos, setTextos] = useState<TextoVis[]>([]);
  const [bolaVis, setBolaVis] = useState<BolaVis | null>(null);
  const [centroCura, setCentroCura] = useState<number | null>(null);
  const [jogador, setJogadorEstado] = useState(() => {
    const j = save.jogador;
    return TREINADORES_JOGADOR.some((t) => t.sprite === j) ? j! : TREINADORES_JOGADOR[0].sprite;
  });
  const setJogador = (j: string) => {
    setJogadorEstado(j);
    salvador.salvar({ jogador: j });
  };
  const [jogadorVis, setJogadorVis] = useState<{ sprite: string; chave: number } | null>(null);
  // Resumo público (perfil do ranking): publica quando muda, com folga para não mandar
  // um PUT a cada turno da luta.
  const vitrineEnviada = useRef("");
  useEffect(() => {
    if (!perfil) return;
    const t = setTimeout(() => {
      const vitrine = {
        treinador: jogador,
        regiao: regiaoAtual(perfil),
        insignias: REGIOES.reduce((s, _, r) => s + insigniasDe(perfil, r), 0),
        campeao: perfil.campeao ?? 0,
        capturados: perfil.colecao.length,
        vistos: perfil.vistos.length,
        partidas: perfil.partidas,
        vitorias: perfil.vitorias,
        time: perfil.time
          .map((u) => perfil.colecao.find((m) => m.uid === u))
          .filter((m): m is Mon => !!m)
          .map((m) => ({ id: m.id, nivel: nivelDoXpPoke(m.xp) })),
      };
      const json = JSON.stringify(vitrine);
      if (json === vitrineEnviada.current) return;
      api("/poke/vitrine", { method: "PUT", body: vitrine })
        .then(() => (vitrineEnviada.current = json))
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [perfil, jogador]);

  const [lancamentos, setLancamentos] = useState<LancaVis[]>([]);
  const [evolucao, setEvolucao] = useState<{ de: number; para: number; fim: () => void } | null>(null);
  const contador = useRef(1);
  const ultimoTreinador = useRef<number | null>(null);
  const inicioQuestao = useRef(Date.now());
  const painelRef = useRef<HTMLDivElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => void (vivo.current = false);
  }, []);

  const n = () => contador.current++;
  const nomeDe = (id: number) => dex.especies[id]?.n ?? "???";
  const nomeGolpe = (g: number) => dex.golpes[g]?.[0] ?? "Investida";

  const visDoLutador = useCallback(
    (l: Lutador, anim: LadoVis["anim"] = "", idVis?: number): LadoVis => {
      const nv = nivelDe(l);
      const base = xpDoNivel(nv);
      const prox = xpDoNivel(nv + 1);
      return {
        id: idVis ?? l.id,
        nome: nomeDe(idVis ?? l.id),
        nivel: nv,
        hp: l.hp,
        hpMax: hpMax(dex, l),
        status: l.status,
        anim,
        chave: n(),
        uid: l.uid,
        xp: prox > base ? (l.xp - base) / (prox - base) : 1,
      };
    },
    [dex]
  );
  const visDoEncontro = (e: Encontro, anim: LadoVis["anim"] = "", capturavel = false): LadoVis => {
    const max = atributos(dex.especies[e.especie], e.nivel).hp;
    const selvagem = e.tipo === "selvagem";
    return {
      id: e.especie,
      nome: nomeDe(e.especie),
      nivel: e.nivel,
      hp: e.hp,
      hpMax: max,
      status: e.status,
      semente: e.semente,
      anim,
      chave: n(),
      enc: e.chave,
      selvagem,
      capturavel,
      ...(selvagem ? { habitat: habitatDoTipo(dex.especies[e.especie]?.t[0]) } : {}),
    };
  };
  // Pokébola voando até o lado e abrindo; o Pokémon sai dela (anim "saiBola").
  // O jogador entra, arremessa e sai (a animação dura 1,1s).
  const mostrarJogador = () => {
    const k = n();
    setJogadorVis({ sprite: jogador, chave: k });
    setTimeout(() => setJogadorVis((v) => (v?.chave === k ? null : v)), 1150);
  };
  const lancar = (lado: "meu" | "inimigo", slot: Slot = 0) => {
    const k = n();
    if (lado === "meu") mostrarJogador();
    setLancamentos((xs) => [...xs.slice(-3), { n: k, lado, bola: "poke-ball", mao: lado === "meu", slot }]);
    setTimeout(() => setLancamentos((xs) => xs.filter((x) => x.n !== k)), 1100);
  };
  const golpeFx = (de: "meu" | "inimigo", g: number, forte = false, deSlot: Slot = 0, alvoSlot: Slot = 0) => {
    const m = dex.golpes[g] ?? dex.golpes[0];
    const efeito = efeitoDoGolpe(m, COR_TIPO[m[1]] ?? "#fff");
    const proprio = efeito.estilo === "cura";
    const alvo = proprio ? de : de === "meu" ? "inimigo" : "meu";
    setFx({ n: n(), de, alvo, efeito, forte, deSlot, alvoSlot: proprio ? deSlot : alvoSlot });
    return CHEGADA[efeito.estilo];
  };
  const anim = (lado: "meu" | "inimigo", a: LadoVis["anim"], extra: Partial<LadoVis> = {}, slot: Slot = 0) => {
    (lado === "meu" ? setMeu : setIni)(slot, (v) => (v ? { ...v, ...extra, anim: a, chave: n() } : v));
  };
  const [itemVis, setItemVis] = useState<ItemVis | null>(null);
  const mostrarItem = (item: string, grande = false, slot: Slot = 0) => {
    const k = n();
    setItemVis({ n: k, item, grande, slot });
    setTimeout(() => setItemVis((v) => (v?.n === k ? null : v)), grande ? 2600 : 1300);
  };
  const texto = (lado: "meu" | "inimigo", t: string, cor: string, slot: Slot = 0) => {
    const k = n();
    setTextos((xs) => [...xs.slice(-3), { n: k, lado, texto: t, cor, slot }]);
  };

  // ----- lobby: fila da revisão + histórico -----
  const carregarLobby = useCallback(() => {
    setErroCarga(false);
    setPendentes(null);
    carregarFilaBatalha()
      .then(({ hist: h, pendentes: p }) => {
        setHist(h);
        setPendentes(p);
      })
      .catch(() => setErroCarga(true));
  }, []);
  useEffect(() => {
    if (fase === "lobby") carregarLobby();
  }, [fase, carregarLobby]);
  useEffect(() => {
    if (fase !== "lobby" && !hist) {
      api<{ questoes: HistoricoQ[] }>("/answers/por-questao")
        .then((h) => setHist(new Map(h.questoes.map((x) => [x.questaoId, x]))))
        .catch(() => setHist(new Map()));
    }
  }, [fase, hist]);
  const novas = useMemo(() => (hist ? novasPorFraqueza(hist) : []), [hist]);

  function comecar(modo: ModoJornada, opts: { ginasio?: number; habitat?: number; terreno?: number; rumo?: number } = {}) {
    if (!pendentes || !perfil) return;
    const time = perfil.time.map((uid) => perfil.colecao.find((m) => m.uid === uid)).filter((m): m is Mon => !!m && podeLutar(perfil, m));
    const p = montarPartidaPoke({ dex, time, mochila: perfil.mochila, pendentes, novas, concursoId: activeId ?? null, modo, regiao: regiaoAtual(perfil), cap: levelCap(perfil), insignias: insigniasDe(perfil), expAll: expAllLigado(perfil), possui: itensPossuidos(perfil), tem: [...new Set(perfil.colecao.map((m) => m.id))], dinheiro: dinheiroDe(perfil), ...(modo === "rota" && opts.rumo !== undefined ? { restantes: faltamNoCaminho(perfil) } : {}), ...(modo === "ginasio" ? { ajudantesVencidos: ajudantesVencidos(perfil) } : {}), ...opts });
    if (!p) return;
    setPartida(p);
    entrarNaLuta(p);
  }

  function entrarNaLuta(p: PartidaPoke) {
    setMeus([null, null]);
    setInimigos([null, null]);
    setTreinadorVis(null);
    ultimoTreinador.current = null;
    if (p.fim) setFase("fim");
    else if (p.oferta) {
      setMeu(0, visDoLutador(p.time[p.ativo]));
      setFase("recompensa");
    } else if (p.parada) abrirParada(p);
    else if (precisaTrocar(p)) {
      meusEmCampo(p).forEach((i, k) => p.time[i].hp > 0 && setMeu(k as Slot, visDoLutador(p.time[i])));
      setFase("troca");
    } else setFase("entrada");
  }

  // ----- entrada de cada encontro -----
  const encontro = partida ? encontroDaVez(partida) : null;
  const dupla = !!partida?.dupla;
  const questao = encontro ? getQuestao(encontro.questaoId) : undefined;
  const corBioma = questao ? tipoDaMateria(questao.materia).cor : "#7AC74C";
  // Cenário: tipo do ginásio / do membro da Elite / do terreno da Safári; no Caminho, o do
  // inimigo, mas fixo durante a luta com o mesmo treinador (lançar outro Pokémon não muda o lugar).
  const fundoTreinador = useRef<{ chave: string; fundo: string } | null>(null);
  const fundo = useMemo(() => {
    if (!partida) return cenario(null);
    const reg = regiaoDe(partida.regiao);
    if (partida.modo === "ginasio" && partida.ginasio !== undefined) return cenario(reg.ginasios[partida.ginasio]?.tipo ?? null);
    if (partida.modo === "safari") return cenario(TERRENOS[partida.terreno ?? -1]?.tipos[0] ?? null);
    const t = encontro && encontro.treinador >= 0 ? partida.treinadores[encontro.treinador] : null;
    if (partida.modo === "liga") return cenario(t?.campeao ? "campeao" : (reg.elite.find((m) => m.nome === t?.nome)?.tipo ?? "campeao"));
    if (encontro && encontro.treinador >= 0) {
      const chave = `${partida.iniciadaEm}:${encontro.treinador}`;
      if (fundoTreinador.current?.chave !== chave) fundoTreinador.current = { chave, fundo: cenario(dex.especies[encontro.especie]?.t[0] ?? null) };
      return fundoTreinador.current.fundo;
    }
    return cenario(encontro ? (dex.especies[encontro.especie]?.t[0] ?? null) : null);
  }, [partida, encontro, dex]);

  // Pokébolas sobre as caixas de HP: o meu time sempre, o do treinador inimigo (selvagem não tem).
  const bolasMeu = useMemo<EstadoBola[] | null>(() => {
    if (!partida) return null;
    const xs: EstadoBola[] = partida.time.map((l) => (l.hp <= 0 ? "ko" : l.status ? "status" : "ok"));
    while (xs.length < MAX_TIME) xs.push("vazio");
    return xs;
  }, [partida]);
  const bolasInimigo = useMemo<EstadoBola[] | null>(() => {
    if (!partida || !encontro || encontro.treinador < 0) return null;
    const t = encontro.treinador;
    const emCampo = inimigosEmCampo(partida).filter((e): e is Encontro => !!e && e.treinador === t);
    const vivos: EstadoBola[] = [...emCampo.filter((e) => !e.fim).map((e) => (e.status ? "status" : "ok") as EstadoBola), ...partida.fila.filter((e) => e.treinador === t).map(() => "ok" as EstadoBola)];
    const total = Math.max(partida.treinadores[t]?.total ?? 0, vivos.length);
    const xs: EstadoBola[] = [...vivos, ...Array.from({ length: total - vivos.length }, () => "ko" as EstadoBola)];
    while (xs.length < MAX_TIME) xs.push("vazio");
    return xs;
  }, [partida, encontro]);

  const chavesEmCampo = partida ? inimigosEmCampo(partida).map((e) => e?.chave ?? 0).join(",") : "";
  useEffect(() => {
    if (fase !== "entrada" || !partida) return;
    // questão da vez sumiu do acervo: pula sem gravar nada
    let p = partida;
    for (let g = 0; g < 30 && encontroDaVez(p) && !encontroDaVez(p)!.fim && !getQuestao(encontroDaVez(p)!.questaoId); g++) p = pularQuestao(p);
    if (p !== partida) {
      setPartida(p);
      if (!lutaAtiva(p)) ir(avancarPoke(p, dex));
      return;
    }
    const daVez = encontroDaVez(p);
    if (!daVez) return;
    setLancamentos([]);
    setSelecionada(undefined);
    setOrdens([null, null]);
    setGolpeSemAlvo(null);
    setDesfecho(null);
    setLicao("");
    setConfirmarFuga(false);
    setPainel(null);
    setTextos([]);
    setBolaVis(null);
    setFx(null);
    setInsigniaVis(null);
    let cancelado = false;
    const t = daVez.treinador >= 0 ? p.treinadores[daVez.treinador] : null;
    const emCampo = inimigosEmCampo(p);
    // inimigos que ainda não estão desenhados (começo da luta, ou o treinador repôs um slot)
    const novos = emCampo.map((e, k) => [e, k as Slot] as const).filter(([e, k]) => e && !e.fim && inimigosRef.current[k]?.enc !== e.chave) as [Encontro, Slot][];
    const meusNovos = meusEmCampo(p)
      .map((i, k) => [p.time[i], k as Slot] as const)
      .filter(([l, k]) => l.hp > 0 && meusRef.current[k]?.uid !== l.uid);
    void (async () => {
      const passo = async (ms: number) => {
        await esperar(ms);
        return !cancelado && vivo.current;
      };
      // fim da dupla: o 2º volta para a bola
      if (!p.dupla && meusRef.current[1]) {
        setMensagem(`Volte, ${meusRef.current[1].nome}!`);
        anim("meu", "bola", {}, 1);
        if (!(await passo(700))) return;
        setMeu(1, null);
      }
      if (meusNovos.length) {
        setMensagem(`Vai, ${meusNovos.map(([l]) => nomeDe(l.id)).join(" e ")}!`);
        for (const [l, k] of meusNovos) {
          lancar("meu", k);
          setMeu(k, visDoLutador(l, "saiBola"));
          if (meusNovos.length > 1 && !(await passo(250))) return;
        }
        if (!(await passo(1000))) return;
      }
      if (!p.dupla) setIni(1, null);
      if (t && ultimoTreinador.current !== daVez.treinador) {
        setInimigos([null, null]);
        if (t.lider) {
          // chegada de líder: a tela se fecha em pixels e o líder aparece quando ela reabre
          setTreinadorVis(null);
          setMensagem("");
          setTransicao(n());
          if (!(await passo(1150))) return;
        }
        setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false, lider: t.lider });
        setMensagem(t.fala ? (t.lider ? `${t.fala} O ás dele é a questão que mais te derrubou.` : t.fala) : t.lider ? `${t.nome} te desafia! É a questão que mais te derrubou.` : `${t.nome} quer batalhar!`);
        if (!(await passo(t.fala ? 2600 : 1500))) return;
        setTreinadorVis((v) => (v ? { ...v, sai: true } : v));
        if (!(await passo(350))) return;
        setTreinadorVis(null);
        setTransicao(null);
      } else setTreinadorVis(null);
      if (t) {
        const enviados = novos.length ? novos : [[daVez, slotDaVez(p)] as [Encontro, Slot]];
        setMensagem(`${t.nome} ${t.dupla ? "enviaram" : "enviou"} ${enviados.map(([e]) => nomeDe(e.especie)).join(" e ")}!`);
        for (const [e, k] of enviados) {
          lancar("inimigo", k);
          setIni(k, visDoEncontro(e, "saiBola"));
        }
      } else {
        setMensagem(
          daVez.retorno
            ? `Um ${nomeDe(daVez.especie)} selvagem apareceu: é a revanche da questão #${daVez.questaoId}!`
            : p.modo === "safari" || p.modo === "rota"
              ? `Um ${nomeDe(daVez.especie)} selvagem apareceu! Acerte e lance uma bola para capturar.`
              : `Um ${nomeDe(daVez.especie)} selvagem apareceu!`
        );
        setIni(0, visDoEncontro(daVez, "surge", true));
      }
      ultimoTreinador.current = daVez.treinador;
      if (!(await passo(t ? 1400 : 1300))) return;
      perguntar(p);
    })();
    return () => {
      cancelado = true;
    };
  }, [fase, chavesEmCampo]);

  function perguntar(p: PartidaPoke) {
    const vivos = meusEmCampo(p)
      .map((i) => p.time[i])
      .filter((l) => l.hp > 0);
    setMensagem(`O que ${vivos.map((l) => nomeDe(l.id)).join(" e ")} ${vivos.length > 1 ? "vão" : "vai"} fazer?`);
    setFase("pergunta");
    inicioQuestao.current = Date.now();
  }

  // Ao terminar, o perfil soma a partida (sincronizarPerfil só conta uma vez).
  useEffect(() => {
    if (fase === "fim" && partida?.fim && perfil && perfil.ultimaContada !== partida.iniciadaEm) setPerfil(sincronizarPerfil(perfil, partida));
  }, [fase, partida, perfil, setPerfil]);

  const emJogo = fase !== "lobby" && fase !== "fim";
  useEffect(() => {
    if (!emJogo) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [emJogo]);

  // ----- animação dos eventos do motor -----
  async function mostrarEvolucao(de: number, para: number) {
    await new Promise<void>((fim) => setEvolucao({ de, para, fim }));
    setEvolucao(null);
  }

  async function animar(eventos: Evento[], antes: PartidaPoke, depois: PartidaPoke, golpeUsado: number | null) {
    const ok = () => vivo.current;
    const doMeu = (uid: string) => depois.time.find((l) => l.uid === uid) ?? antes.time.find((l) => l.uid === uid);
    // quem está em cada slot (muda com a troca), o HP mostrado e a forma (muda ao evoluir)
    const campo = meusEmCampo(antes).map((i) => antes.time[i]?.uid);
    const hp = new Map(antes.time.map((l) => [l.uid, l.hp]));
    const idVis = new Map(antes.time.map((l) => [l.uid, l.id]));
    const slotDe = (uid?: string): Slot => Math.max(0, campo.indexOf(uid ?? campo[0])) as Slot;
    const emCampo = (uid: string) => campo.includes(uid);
    const nomeUid = (uid?: string) => nomeDe(idVis.get(uid ?? campo[0] ?? "") ?? doMeu(uid ?? "")?.id ?? 0);
    const inis = inimigosEmCampo(antes);
    const nomeIni = (slot?: Slot) => {
      const e = inis[slot ?? 0] ?? inis[0];
      return e ? nomeDe(e.especie) : "";
    };
    const mudaHp = (uid: string, delta: number) => {
      const v = Math.max(0, (hp.get(uid) ?? 0) + delta);
      hp.set(uid, v);
      return v;
    };
    const evos: { de: number; para: number; uid: string }[] = [];
    let mostrouShare = false;
    for (const ev of eventos) {
      if (!ok()) return;
      switch (ev.tipo) {
        case "usouItem":
          setMensagem(`Você usou ${nomeItem(ev.item)} em ${nomeUid(ev.uid)}.`);
          if (emCampo(ev.uid)) mostrarItem(ev.item, false, slotDe(ev.uid));
          await esperar(900);
          break;
        case "trocou": {
          const k = ev.slot;
          setMensagem(`Volte, ${nomeUid(ev.de)}!`);
          anim("meu", "bola", {}, k);
          await esperar(650);
          campo[k] = ev.para;
          const l = doMeu(ev.para);
          setMensagem(`Vai, ${nomeUid(ev.para)}!`);
          lancar("meu", k);
          if (l) setMeu(k, visDoLutador({ ...l, hp: hp.get(l.uid) ?? l.hp }, "saiBola", idVis.get(l.uid)));
          await esperar(1100);
          break;
        }
        case "impedido": {
          const k = slotDe(ev.uid);
          setMensagem(`${nomeUid(ev.uid)} ${TXT_STATUS[ev.status || "paralysis"][1]}! O golpe sai pela metade.`);
          anim("meu", "status", {}, k);
          await esperar(1000);
          break;
        }
        case "acordou":
          if (ev.status) setMensagem(`${nomeUid(ev.uid)} ${TXT_STATUS[ev.status][2]}!`);
          if (emCampo(ev.uid)) setMeu(slotDe(ev.uid), (v) => (v ? { ...v, status: "" } : v));
          await esperar(800);
          break;
        case "ataque": {
          const g = dex.golpes[ev.golpe];
          const k = slotDe(ev.uid);
          const alvo = (ev.alvo ?? 0) as Slot;
          setMensagem(`${nomeUid(ev.uid)} usou ${g?.[0] ?? "Tackle"}${dupla && ev.dano > 0 ? ` em ${nomeIni(alvo)}` : ""}!`);
          const efeito = g ? efeitoDoGolpe(g, "") : null;
          if (efeito && efeito.estilo !== "cura" && efeito.estilo !== "aura") anim("meu", "ataca", {}, k);
          await esperar(efeito?.estilo === "contato" || efeito?.estilo === "mordida" ? 160 : 60);
          // golpe de status com condição: a aura aparece no evento statusInimigo
          if (efeito?.estilo !== "aura") await esperar(golpeFx("meu", ev.golpe, ev.critico && ev.dano > 0, k, alvo));
          if (ev.dano > 0) {
            anim("inimigo", "dano", { hp: ev.hpInimigo }, alvo);
            texto("inimigo", ev.critico ? `CRÍTICO −${ev.dano}` : `−${ev.dano}`, ev.critico ? "#FFC857" : "#FF5A5F", alvo);
            await esperar(750);
            if (ev.semEfeito) setMensagem(`Não afeta ${nomeIni(alvo)}... mas a resposta certa arranhou.`);
            else if (ev.efetividade >= 2) setMensagem("É super efetivo!");
            else if (ev.efetividade < 1) setMensagem("Não é muito efetivo...");
            else if (ev.critico) setMensagem("Um golpe crítico!");
            if (ev.semEfeito || ev.efetividade !== 1 || ev.critico) await esperar(1000);
          } else await esperar(500);
          break;
        }
        case "statusInimigo": {
          const k = (ev.slot ?? 0) as Slot;
          setFx({ n: n(), de: "meu", alvo: "inimigo", efeito: efeitoDoStatus(ev.status), alvoSlot: k });
          anim("inimigo", "status", ev.status === "leech-seed" ? { semente: true } : { status: ev.status }, k);
          setMensagem(`${nomeIni(k)} ${TXT_STATUS_INIMIGO[ev.status]}!`);
          await esperar(1200);
          break;
        }
        case "statusFalhou": {
          const nm = nomeIni(ev.slot);
          setMensagem(ev.motivo === "imune" ? `Não afeta ${nm}!` : `${nm} já está ${ev.status === "leech-seed" ? "com Leech Seed" : "com um status"}. Não teve efeito.`);
          await esperar(1100);
          break;
        }
        case "tiqueInimigo": {
          const k = (ev.slot ?? 0) as Slot;
          setFx({ n: n(), de: "inimigo", alvo: "inimigo", efeito: efeitoDoStatus(ev.status, "tique"), deSlot: k, alvoSlot: k });
          await esperar(300);
          anim("inimigo", "dano", { hp: ev.hpInimigo }, k);
          texto("inimigo", `−${ev.dano}`, "#C77DFF", k);
          setMensagem(ev.status === "leech-seed" ? `Leech Seed drena ${nomeIni(k)}! −${ev.dano} HP` : `${nomeIni(k)} ${TXT_TIQUE[ev.status] ?? "perdeu HP"}! −${ev.dano} HP`);
          await esperar(1000);
          break;
        }
        case "inimigoAcordou":
          setIni((ev.slot ?? 0) as Slot, (v) => (v ? { ...v, status: "" } : v));
          setMensagem(`${nomeIni(ev.slot)} ${TXT_STATUS[ev.status || "sleep"][2]}!`);
          await esperar(900);
          break;
        case "inimigoImpedido":
          anim("inimigo", "status", {}, (ev.slot ?? 0) as Slot);
          setMensagem(`${nomeIni(ev.slot)} ${TXT_STATUS[ev.status || "paralysis"][1]} e não conseguiu atacar!`);
          await esperar(1200);
          break;
        case "exausto":
          setMensagem(`${nomeIni(ev.slot)} não aguenta mais: a resposta certa decidiu a luta!`);
          await esperar(1100);
          break;
        case "bola": {
          setMensagem(`Você lançou uma ${nomeItem(ev.bola)}!`);
          mostrarJogador();
          setBolaVis({ n: n(), bola: ev.bola, balancos: ev.balancos, sucesso: ev.sucesso, mao: true });
          await esperar(500);
          anim("inimigo", "bola");
          await esperar(850 + ev.balancos * 500);
          if (ev.sucesso) {
            await esperar(600);
            setMensagem(`Pegou! ${nomeIni()} foi capturado!${ev.paraPc ? " O time está cheio: ele foi para o PC." : ""}`);
            texto("inimigo", "CAPTURADO!", "#FFE066");
            await esperar(1500);
          } else {
            await esperar(200);
            anim("inimigo", "entra");
            setMensagem(ev.balancos >= 2 ? "Argh! Quase!" : "Ah, não! Ele escapou da bola!");
            await esperar(700);
            setBolaVis(null);
            await esperar(500);
          }
          break;
        }
        case "desmaiouInimigo":
          anim("inimigo", "desmaia", { hp: 0 }, (ev.slot ?? 0) as Slot);
          setMensagem(`${nomeIni(ev.slot)} desmaiou!`);
          await esperar(1000);
          break;
        case "xp": {
          if (ev.compartilhado) {
            if (mostrouShare) break;
            mostrouShare = true;
            const todos = eventos.filter((x): x is Extract<Evento, { tipo: "xp" }> => x.tipo === "xp" && !!x.compartilhado);
            setMensagem(`${depois.expAll ? "Exp. All" : "Exp. Share"}: ${todos.map((x) => `${nomeUid(x.uid)} +${x.valor}`).join(", ")} de XP.`);
            await esperar(1100);
            break;
          }
          const l = doMeu(ev.uid);
          setMensagem(`${nomeUid(ev.uid)} ganhou ${ev.valor} pontos de XP!`);
          if (emCampo(ev.uid)) {
            const k = slotDe(ev.uid);
            texto("meu", `+${ev.valor} XP`, "#8EC5FF", k);
            if (l) setMeu(k, visDoLutador({ ...l, hp: hp.get(l.uid) ?? l.hp }, "", idVis.get(l.uid)));
          }
          await esperar(1000);
          break;
        }
        case "cap":
          if (!emCampo(ev.uid)) break;
          setMensagem(`${nomeUid(ev.uid)} está no level cap (Nv${ev.nivel}): o XP volta a entrar depois do próximo líder.`);
          texto("meu", `Nv${ev.nivel} máx.`, "#FFE066", slotDe(ev.uid));
          await esperar(1300);
          break;
        case "nivel":
          setMensagem(`${nomeUid(ev.uid)} subiu para o nível ${ev.nivel}!`);
          if (emCampo(ev.uid)) texto("meu", `Nv ${ev.nivel}!`, "#FFE066", slotDe(ev.uid));
          await esperar(1000);
          break;
        case "aprendeu":
          setMensagem(
            ev.esqueceu !== null
              ? `${nomeUid(ev.uid)} esqueceu ${nomeGolpe(ev.esqueceu)} e aprendeu ${nomeGolpe(ev.golpe)}!`
              : `${nomeUid(ev.uid)} aprendeu ${nomeGolpe(ev.golpe)}!`
          );
          await esperar(1300);
          break;
        case "querAprender":
          setMensagem(`${nomeUid(ev.uid)} quer aprender ${nomeGolpe(ev.golpe)}, mas já sabe ${MAX_GOLPES} golpes...`);
          await esperar(1300);
          break;
        case "evolui":
          evos.push({ de: ev.de, para: ev.para, uid: ev.uid });
          break;
        case "item": {
          const nomeIt = nomeItem(ev.item);
          const fruta = categoriaDe(ev.item) === "fruta";
          const k = slotDe(ev.uid);
          if (emCampo(ev.uid)) mostrarItem(ev.item, false, k);
          if (ev.efeito === "cura" || ev.efeito === "recuo") {
            const delta = ev.efeito === "cura" ? (ev.valor ?? 0) : -(ev.valor ?? 0);
            const v = mudaHp(ev.uid, delta);
            if (emCampo(ev.uid)) {
              if (ev.efeito === "cura") setMeu(k, (x) => (x ? { ...x, hp: Math.min(x.hpMax, v) } : x));
              else anim("meu", "dano", { hp: v }, k);
              texto("meu", `${delta > 0 ? "+" : "−"}${Math.abs(delta)} HP`, delta > 0 ? "#3BC46B" : "#FF5A5F", k);
            }
          }
          const nomeAlvo = nomeIni((ev.uid && emCampo(ev.uid) ? 0 : 0) as Slot);
          setMensagem(
            ev.efeito === "cura"
              ? fruta
                ? `${nomeUid(ev.uid)} comeu a ${nomeIt} e recuperou ${ev.valor} HP!`
                : `${nomeUid(ev.uid)} recuperou ${ev.valor} HP com ${nomeIt}.`
              : ev.efeito === "status"
                ? `${nomeUid(ev.uid)} comeu a ${nomeIt}!`
                : ev.efeito === "segurou"
                  ? `${nomeUid(ev.uid)} aguentou firme com a ${nomeIt}!`
                  : ev.efeito === "resistiu"
                    ? `A ${nomeIt} enfraqueceu o golpe!`
                    : ev.efeito === "esquivou"
                      ? `O ${nomeIt} ofuscou ${nomeAlvo}: o golpe errou!`
                      : ev.efeito === "recuou"
                        ? `${nomeAlvo} recuou com a ${nomeIt} e não revidou!`
                        : `${nomeUid(ev.uid)} perdeu ${ev.valor} HP pelo ${nomeIt}.`
          );
          await esperar(ev.efeito === "cura" && !fruta ? 750 : 1100);
          break;
        }
        case "premio":
          mostrarItem(ev.item, true);
          setMensagem(
            ev.item === "exp-share"
              ? "Você recebeu o Exp. Share! No lobby, dê para um Pokémon segurar: ele ganha metade do XP sem lutar."
              : ev.item === "exp-all"
                ? "Você recebeu o Exp. All! Agora o time todo ganha metade do XP de cada luta."
                : `O líder te deu ${nomeItem(ev.item)}!`
          );
          await esperar(ev.item.startsWith("exp-") ? 2600 : 1600);
          break;
        case "cura": {
          const v = mudaHp(ev.uid, ev.valor);
          if (emCampo(ev.uid)) {
            const k = slotDe(ev.uid);
            setMeu(k, (x) => (x ? { ...x, hp: Math.min(x.hpMax, v) } : x));
            texto("meu", `+${ev.valor} HP`, "#3BC46B", k);
          }
          setMensagem(
            ev.motivo === "dreno"
              ? `${nomeUid(ev.uid)} drenou a energia do inimigo! +${ev.valor} HP`
              : ev.motivo === "semente"
                ? `${nomeUid(ev.uid)} recuperou ${ev.valor} HP com a semente.`
                : ev.motivo === "combo"
                  ? `Combo de ${depois.combo} acertos! +${ev.valor} HP`
                  : `${nomeUid(ev.uid)} recuperou ${ev.valor} HP!`
          );
          await esperar(900);
          break;
        }
        case "foco":
          setMensagem(`${nomeUid(ev.uid)} ficou em guarda! O próximo contra-ataque vai doer pela metade.`);
          anim("meu", "status", {}, slotDe(ev.uid));
          await esperar(1100);
          break;
        case "errou":
          setMensagem(
            golpeUsado === null
              ? "Resposta errada: a bola nem saiu da mochila!"
              : campo.length > 1
                ? "Resposta errada: os golpes erraram!"
                : `${nomeUid(campo[0])} usou ${nomeGolpe(golpeUsado)}... mas errou! A resposta estava errada.`
          );
          campo.forEach((_, k) => anim("meu", "ataca", {}, k as Slot));
          await esperar(1100);
          break;
        case "contra": {
          const g = ev.golpe >= 0 ? dex.golpes[ev.golpe] : null;
          const de = (ev.slot ?? 0) as Slot;
          const uid = ev.uid ?? campo[0] ?? "";
          const k = slotDe(uid);
          const contra = dupla ? ` em ${nomeUid(uid)}` : "";
          setMensagem(
            ev.livre
              ? `${nomeIni(de)} aproveitou a vez e atacou${contra} com ${g?.[0] ?? "Tackle"}!`
              : ev.revide
                ? `${nomeIni(de)} aguentou e atacou${contra} com ${g?.[0] ?? "Tackle"}!`
                : `${nomeIni(de)} contra-atacou${contra} com ${g?.[0] ?? "Tackle"}!`
          );
          anim("inimigo", "ataca", {}, de);
          await esperar(120);
          await esperar(golpeFx("inimigo", ev.golpe >= 0 ? ev.golpe : 0, ev.critico, de, k));
          const v = mudaHp(uid, -ev.dano);
          anim("meu", "dano", { hp: v }, k);
          texto("meu", `−${ev.dano}`, "#FF5A5F", k);
          await esperar(700);
          const extra = [
            ev.critico ? "Um golpe crítico!" : "",
            ev.efetividade >= 2 ? "É super efetivo!" : ev.efetividade > 0 && ev.efetividade < 1 ? "Não é muito efetivo..." : "",
            ev.foco ? "A guarda segurou metade!" : "",
          ].filter(Boolean);
          if (extra.length) {
            setMensagem(extra.join(" "));
            await esperar(1000);
          }
          break;
        }
        case "status": {
          const k = slotDe(ev.uid);
          if (ev.status) {
            setFx({ n: n(), de: "inimigo", alvo: "meu", efeito: efeitoDoStatus(ev.status), alvoSlot: k });
            setMensagem(`${nomeUid(ev.uid)} ${TXT_STATUS[ev.status][0]}!`);
          }
          anim("meu", "status", { status: ev.status }, k);
          await esperar(1100);
          break;
        }
        case "tique": {
          const k = slotDe(ev.uid);
          const v = mudaHp(ev.uid, -ev.dano);
          if (ev.status) {
            setFx({ n: n(), de: "meu", alvo: "meu", efeito: efeitoDoStatus(ev.status, "tique"), deSlot: k, alvoSlot: k });
            setMensagem(`${nomeUid(ev.uid)} ${TXT_STATUS[ev.status][1]}! −${ev.dano} HP`);
          }
          anim("meu", "dano", { hp: v }, k);
          await esperar(900);
          break;
        }
        case "desmaiou":
          hp.set(ev.uid, 0);
          anim("meu", "desmaia", { hp: 0, status: "" }, slotDe(ev.uid));
          setMensagem(`${nomeUid(ev.uid)} desmaiou!`);
          await esperar(1100);
          break;
        case "voltaDepois":
          setMensagem(ev.selvagem ? "Essa questão volta daqui a pouco, como Pokémon selvagem, para a revanche." : "Essa questão volta ainda nesta luta.");
          await esperar(1300);
          break;
        case "fuga":
          anim("inimigo", "foge", {}, (ev.slot ?? 0) as Slot);
          setMensagem(`${nomeIni(ev.slot)} fugiu!`);
          await esperar(1300);
          break;
        case "treinadorVencido": {
          const t = depois.treinadores[ev.treinador];
          setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false });
          if (ev.insignia !== undefined) {
            const g = regiaoDe(depois.regiao).ginasios[ev.insignia];
            setInsigniaVis({ src: insigniaImg(ev.insignia, depois.regiao ?? 0), nome: g.insignia, n: n() });
          }
          setMensagem(
            ev.insignia !== undefined
              ? `Você venceu ${t.nome}! Ganhou a ${regiaoDe(depois.regiao).ginasios[ev.insignia].insignia}!`
              : t.campeao
                ? `Você venceu o ${t.nome}! Você é o novo Campeão da Liga!`
                : t.elite
                  ? `Você venceu ${t.nome}, da Elite dos 4!`
                  : `Você venceu ${t.nome}!`
          );
          await esperar(ev.insignia !== undefined ? 3200 : t.campeao ? 2400 : 1600);
          setInsigniaVis(null);
          break;
        }
        case "dinheiro": {
          const t = depois.treinadores[ev.treinador];
          setMensagem(`Você recebeu ${dinheiroTxt(ev.valor)} de ${t?.nome ?? "seu adversário"} pela vitória!`);
          texto("inimigo", `+${dinheiroTxt(ev.valor)}`, "#FFE066");
          await esperar(1400);
          break;
        }
        case "derrota":
          setMensagem("Todos os seus Pokémon desmaiaram...");
          await esperar(1400);
          break;
      }
    }
    for (const e of evos) {
      if (!ok()) return;
      setMensagem(`O quê? ${nomeDe(e.de)} está evoluindo!`);
      await esperar(900);
      await mostrarEvolucao(e.de, e.para);
      idVis.set(e.uid, e.para);
      setMensagem(`Parabéns! ${nomeDe(e.de)} evoluiu para ${nomeDe(e.para)}!`);
    }
    // estado final dos dois lados
    meusEmCampo(depois).forEach((i, k) => {
      const l = depois.time[i];
      if (l) setMeu(k as Slot, (v) => ({ ...visDoLutador(l, v?.anim === "desmaia" || l.hp <= 0 ? "some" : ""), chave: v?.chave ?? n() }));
    });
    inimigosEmCampo(depois).forEach((ini, k) => {
      if (ini && !ini.fim) setIni(k as Slot, (v) => (v ? { ...v, hp: ini.hp, status: ini.status, semente: ini.semente, anim: "" } : v));
    });
  }

  // Semente da ordem das alternativas (e selo "3ª vez"): a volta de um erro desta partida
  // conta como mais uma tentativa.
  function historicoDe(id: number, retorno: boolean) {
    const h = hist?.get(id);
    return h ? { tentativas: h.tentativas + (retorno ? 1 : 0), erros: h.erros + (retorno ? 1 : 0) } : undefined;
  }

  // ----- golpe -----
  async function atacar(acao: Acao, acao2?: AcaoGolpe) {
    if (!partida || !questao || !selecionada || fase !== "pergunta") return;
    setFase("golpe");
    setPainel(null);
    setGolpeSemAlvo(null);
    const acertou = selecionada === questao.gabarito;
    const confianca: Confianca = certeza ? "certeza" : "duvida";
    const tempo = Math.round((Date.now() - inicioQuestao.current) / 1000);
    void enviarResposta(montarResultado(questao, selecionada, "BATALHA", tempo));
    const { partida: nova, eventos } = responderPoke(dex, partida, { acertou, confianca, acao, acao2 });
    setPartida(nova);
    setDesfecho({ acertou, confianca, questaoId: questao.id, marcada: selecionada, retorno: !!encontro?.retorno, historico: historicoDe(questao.id, !!encontro?.retorno) });
    if (!window.matchMedia("(min-width: 1024px)").matches) painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    await animar(eventos, partida, nova, "golpe" in acao ? acao.golpe : null);
    if (!vivo.current) return;
    setFase("resultado");
    setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }

  // Batalha dupla: cada um dos meus de pé escolhe golpe (e alvo, com dois inimigos de pé).
  const golpeSemAlvoProprio = (g: number) => {
    const m = dex.golpes[g];
    return !!m && m[3] === 2 && !m[6]; // cura e guarda: no próprio Pokémon
  };
  function escolherGolpeDupla(slot: Slot, golpe: number, alvo?: Slot) {
    if (!partida) return;
    const vivosIni = inimigosEmCampo(partida)
      .map((e, k) => (e && !e.fim ? k : -1))
      .filter((k) => k >= 0) as Slot[];
    if (alvo === undefined && vivosIni.length > 1 && !golpeSemAlvoProprio(golpe)) {
      setGolpeSemAlvo({ slot, golpe });
      return;
    }
    setGolpeSemAlvo(null);
    const novas = [...ordens];
    novas[slot] = { golpe, alvo: alvo ?? vivosIni[0] ?? 0 };
    const precisa = meusEmCampo(partida)
      .map((i, k) => (partida.time[i].hp > 0 ? k : -1))
      .filter((k) => k >= 0);
    if (precisa.every((k) => novas[k])) {
      setOrdens([null, null]);
      const a0 = novas[0] ?? { golpe: partida.time[partida.ativo].golpes[0] ?? 0 };
      void atacar(a0, novas[1] ?? undefined);
    } else setOrdens(novas);
  }

  // O mesmo Pokémon inimigo segue de pé: próxima questão, sem nova entrada.
  function proximaQuestao(p: PartidaPoke) {
    let q = p;
    for (let g = 0; g < 30 && encontroDaVez(q) && !encontroDaVez(q)!.fim && !getQuestao(encontroDaVez(q)!.questaoId); g++) q = pularQuestao(q);
    if (q !== p) setPartida(q);
    if (!lutaAtiva(q)) {
      const r = avancarPoke(q, dex);
      setPartida(r);
      ir(r);
      return;
    }
    setSelecionada(undefined);
    setOrdens([null, null]);
    setGolpeSemAlvo(null);
    setDesfecho(null);
    setLicao("");
    setConfirmarFuga(false);
    setPainel(null);
    setTextos([]);
    setBolaVis(null);
    setFx(null);
    const daVez = encontroDaVez(q)!;
    const vivos = meusEmCampo(q)
      .map((i) => q.time[i])
      .filter((l) => l.hp > 0);
    setMensagem(
      q.dupla ? `Agora a questão é de ${nomeDe(daVez.especie)}. O que ${vivos.map((l) => nomeDe(l.id)).join(" e ")} vão fazer?` : `${nomeDe(daVez.especie)} continua de pé! O que ${nomeDe(vivos[0]?.id ?? 0)} vai fazer?`
    );
    setFase("pergunta");
    inicioQuestao.current = Date.now();
    painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Para onde a partida vai depois de um desfecho: fim, recompensa, parada, troca, entrada de
  // inimigo novo ou a próxima questão contra quem está em campo.
  function ir(p: PartidaPoke) {
    painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (p.fim) {
      setFase("fim");
      return;
    }
    if (p.oferta) {
      setInimigos([null, null]);
      setTreinadorVis(null);
      setMensagem("Escolha uma recompensa pela vitória!");
      setFase("recompensa");
      return;
    }
    if (p.parada) {
      abrirParada(p);
      return;
    }
    if (precisaTrocar(p)) {
      setMensagem("Escolha o próximo Pokémon.");
      setFase("troca");
      return;
    }
    const faltaDesenhar = inimigosEmCampo(p).some((e, k) => e && !e.fim && inimigosRef.current[k]?.enc !== e.chave);
    if (faltaDesenhar || !lutaAtiva(p)) {
      setTreinadorVis(null);
      setFase("entrada");
      return;
    }
    proximaQuestao(p);
  }

  function continuar() {
    if (!partida) return;
    if (partida.fim) {
      setFase("fim");
      return;
    }
    const p = avancarPoke(partida, dex);
    if (p !== partida) setPartida(p);
    ir(p);
  }

  // ----- parada entre batalhas -----
  function abrirParada(p: PartidaPoke) {
    setInimigos([null, null]);
    setTreinadorVis(null);
    setFx(null);
    setTextos([]);
    setBolaVis(null);
    setPainel(null);
    setAlvoItem(null);
    const vivos = p.time.filter((l) => l.hp > 0);
    setMeus([vivos[0] ? visDoLutador(vivos[0]) : null, null]);
    setMensagem(
      p.parada?.curadoAuto
        ? "Antes do líder, seus Pokémon foram curados. Boa sorte!"
        : p.parada?.loja
          ? "Você está na cidade: Centro Pokémon e Poké Mart abertos."
          : "Uma pausa antes da próxima batalha."
    );
    setFase("parada");
  }

  function moverParada(de: number, para: number) {
    if (!partida) return;
    const p = moverNoTime(partida, de, para);
    setPartida(p);
    const vivos = p.time.filter((l) => l.hp > 0);
    setMeus([vivos[0] ? visDoLutador(vivos[0], vivos[0].uid !== meusRef.current[0]?.uid ? "entra" : "") : null, null]);
  }

  async function irAoCentro() {
    if (!partida) return;
    const p = centroPokemon(dex, partida);
    if (p === partida) return;
    setMensagem("Enfermeira Joy: Vou cuidar dos seus Pokémon, só um instante...");
    setCentroCura(n());
    await esperar(1600);
    if (!vivo.current) return;
    setPartida(p);
    setCentroCura(null);
    const vivos = p.time.filter((l) => l.hp > 0);
    setMeus([vivos[0] ? visDoLutador(vivos[0], "entra") : null, null]);
    setMensagem("Seus Pokémon estão em plena forma! Esperamos ver você de novo.");
  }

  function seguir() {
    if (!partida) return;
    const p = seguirViagem(partida);
    setPartida(p);
    setMeus([null, null]);
    setAlvoItem(null);
    ir(p);
  }

  async function trocarPara(idx: number, slotEscolhido?: Slot) {
    if (!partida) return;
    const forcada = fase === "troca";
    setPainel(null);
    setTrocaEscolhida(null);
    if (!forcada) {
      // trocar no meio da luta gasta a vez: o inimigo ataca quem entrou
      setFase("golpe");
      const { partida: p, eventos } = turnoSemQuestao(dex, partida, { troca: idx, slot: slotEscolhido ?? 0 });
      if (p === partida) {
        setFase("pergunta");
        return;
      }
      setPartida(p);
      await animar(eventos, partida, p, null);
      if (!vivo.current) return;
      depoisDoTurnoLivre(p);
      return;
    }
    const slot = slotParaTrocar(partida) ?? 0;
    const p = trocar(partida, idx, slot);
    if (p === partida) return;
    setPartida(p);
    const novo = p.time[idx];
    setMensagem(`Vai, ${nomeDe(novo.id)}!`);
    lancar("meu", slot);
    setMeu(slot, visDoLutador(novo, "saiBola"));
    await esperar(1050);
    if (!vivo.current) return;
    ir(avancarPoke(p, dex));
  }

  // Depois de item ou troca no meio da luta (o inimigo já atacou).
  function depoisDoTurnoLivre(p: PartidaPoke) {
    if (p.fim) {
      setFase("fim");
      return;
    }
    if (precisaTrocar(p)) {
      setMensagem("Escolha o próximo Pokémon.");
      setFase("troca");
      return;
    }
    if (!lutaAtiva(p)) {
      continuarDe(p);
      return;
    }
    perguntar(p);
  }
  function continuarDe(p: PartidaPoke) {
    const q = avancarPoke(p, dex);
    if (q !== p) setPartida(q);
    ir(q);
  }

  async function aplicarItem(item: string, alvo: number) {
    if (!partida) return;
    const naLuta = fase === "pergunta";
    const { partida: p, eventos } = naLuta ? turnoSemQuestao(dex, partida, { item, alvo }) : usarItem(dex, partida, item, alvo);
    if (p === partida) return;
    setAlvoItem(null);
    setPainel(null);
    if (naLuta) {
      setFase("golpe");
      setPartida(p);
      await animar(eventos, partida, p, null);
      if (!vivo.current) return;
      depoisDoTurnoLivre(p);
      return;
    }
    // fora da luta (parada): não gasta vez
    setPartida(p);
    const l = p.time[alvo];
    setMensagem(`Você usou ${nomeItem(item)} em ${nomeDe(partida.time[alvo].id)}.`);
    for (const e of eventos) if (e.tipo === "evolui") await mostrarEvolucao(e.de, e.para);
    if (!vivo.current) return;
    const vivos = p.time.filter((x) => x.hp > 0);
    setMeus([vivos[0] ? visDoLutador(vivos[0]) : null, null]);
    const ev = eventos.find((e) => e.tipo === "evolui") as Extract<Evento, { tipo: "evolui" }> | undefined;
    setMensagem(
      ev
        ? `Parabéns! ${nomeDe(ev.de)} evoluiu para ${nomeDe(ev.para)}!`
        : item in REVIVER
          ? `${nomeDe(l.id)} voltou com ${l.hp} HP!`
          : `${nomeDe(l.id)}: ${l.hp}/${hpMax(dex, l)} HP · Nv${nivelDe(l)}`
    );
  }

  function escolherRecompensa(item: string) {
    if (!partida) return;
    const p = escolherOferta(partida, item, dex);
    setPartida(p);
    setMensagem(`Você guardou ${nomeItem(item)} na mochila.`);
    ir(p);
  }

  async function escolherGolpe(esquecer: number | null) {
    if (!partida) return;
    const pend = partida.aprender?.[0];
    const { partida: p, eventos } = decidirGolpe(partida, esquecer);
    setPartida(p);
    const l = p.time.find((x) => x.uid === pend?.uid);
    const ev = eventos[0] as Extract<Evento, { tipo: "aprendeu" }> | undefined;
    if (l && pend)
      setMensagem(
        ev ? `1, 2 e... Puf! ${nomeDe(l.id)} esqueceu ${nomeGolpe(ev.esqueceu ?? -1)} e aprendeu ${nomeGolpe(ev.golpe)}!` : `${nomeDe(l.id)} não aprendeu ${nomeGolpe(pend.golpe)}.`
      );
  }

  function anotarLicao() {
    if (!partida || !desfecho) return;
    const { partida: p, curou } = registrarLicaoPoke(dex, partida, desfecho.questaoId, licao);
    if (p === partida) return;
    setPartida(p);
    if (curou) {
      const idx = p.time[p.ativo].hp > 0 ? p.ativo : p.time.findIndex((l) => l.hp > 0);
      const k = meusEmCampo(p).indexOf(idx);
      if (k >= 0) {
        setMeu(k as Slot, visDoLutador(p.time[idx]));
        texto("meu", `+${curou} HP`, "#3BC46B", k as Slot);
      }
    }
    setMensagem(curou ? `Lição anotada! +${curou} HP.` : "Lição anotada!");
  }

  function desistir() {
    if (!partida) return;
    setPartida(fugirPoke(partida));
    setFase("fim");
  }

  // Troca o selvagem por outro Pokémon da região; a questão continua a mesma.
  function trocarBicho() {
    if (!partida || !podeTrocarSelvagem(partida)) return;
    setPainel(null);
    setPartida(trocarSelvagem(dex, partida));
    setFase("entrada");
  }

  // Recomeçar a jornada do zero: apaga coleção, insígnias e a partida salva no servidor.
  function recomecar() {
    salvador.salvar({ perfil: null, partida: null });
    salvador.enviarAgora();
    setPartidaEstado(null);
    setPerfilEstado(null);
    setDesfecho(null);
    setViagem(false);
    setFase("lobby");
  }

  function novaPartida() {
    setPartida(null);
    setDesfecho(null);
    setFase("lobby");
  }

  // ---------- telas ----------

  const telaEvolucao = evolucao && createPortal(<EvolucaoPoke de={evolucao.de} para={evolucao.para} nome={nomeDe} onFim={evolucao.fim} />, document.body);
  const pendente = partida && !evolucao && fase !== "golpe" && fase !== "entrada" ? partida.aprender?.[0] : undefined;
  const lutadorPendente = pendente && partida?.time.find((l) => l.uid === pendente.uid);
  const telaGolpe = pendente && lutadorPendente && (
    <EscolherGolpe dex={dex} lutador={lutadorPendente} novo={pendente.golpe} onEscolher={(g) => void escolherGolpe(g)} />
  );

  if (!perfil) {
    return (
      <EscolhaInicial
        dex={dex}
        alternar={alternar}
        extra={<EscolherJogador atual={jogador} onEscolher={setJogador} />}
        onEscolher={(id) => {
          setPerfil(perfilInicial(dex, id));
        }}
      />
    );
  }

  const destino = proximaRegiao(perfil);
  if (viagem && destino !== null && (!partida || partida.fim)) {
    return (
      <EscolhaInicial
        dex={dex}
        iniciais={REGIOES[destino].iniciais}
        titulo={`Bem-vindo a ${REGIOES[destino].nome}!`}
        subtitulo="Escolha o inicial desta região. Ele começa no nível 5; o time que você tinha fica no PC e volta a lutar quando você for Campeão aqui."
        onVoltar={() => setViagem(false)}
        onEscolher={(id) => {
          setPerfil(viajar(dex, perfil, id));
          setViagem(false);
          if (partida?.fim) setPartida(null);
          setFase("lobby");
        }}
      />
    );
  }

  if (fase === "lobby" || !partida) {
    return (
      <Lobby
        dex={dex}
        perfil={perfil}
        setPerfil={setPerfil}
        pendentes={pendentes}
        novas={novas.length}
        erro={erroCarga}
        onTentar={carregarLobby}
        onComecar={comecar}
        emAndamento={partida && !partida.fim ? partida : null}
        onRetomar={() => partida && entrarNaLuta(partida)}
        onViajar={() => setViagem(true)}
        onRecomecar={recomecar}
        jogador={jogador}
        onJogador={setJogador}
        estadoSave={estadoSave}
        alternar={alternar}
      />
    );
  }

  if (fase === "fim") {
    return <Fim dex={dex} partida={partida} perfil={perfil} activeId={activeId ?? null} onNova={novaPartida} onViajar={() => setViagem(true)} />;
  }

  const campo = meusEmCampo(partida);
  const eu = partida.time[campo.find((i) => partida.time[i].hp > 0) ?? partida.ativo];
  const selvagem = encontro?.tipo === "selvagem" && !dupla;
  const inimigoEsp = encontro ? dex.especies[encontro.especie] : null;
  const bolasTenho = BOLAS.filter((b) => (partida.mochila[b] ?? 0) > 0);
  const itensUsaveis = Object.entries(partida.mochila).filter(([i, q]) => q > 0 && categoriaDe(i) === "cura");
  const licaoAnterior = desfecho ? partida.licoes[desfecho.questaoId] : undefined;
  const respondida = (fase === "golpe" || fase === "resultado") && desfecho ? getQuestao(desfecho.questaoId) : undefined;
  const questaoVista = respondida ?? questao;
  const retornoVisto = respondida ? desfecho!.retorno : !!encontro?.retorno;
  const historicoVisto = respondida ? desfecho!.historico : questao ? historicoDe(questao.id, !!encontro?.retorno) : undefined;
  const vencidos = partida.vencidos.length;
  // dupla: de quem é a vez de escolher o golpe
  const slotsVivos = campo.map((i, k) => (partida.time[i].hp > 0 ? (k as Slot) : -1)).filter((k): k is Slot => k >= 0);
  const slotEscolhendo: Slot = slotsVivos.find((k) => !ordens[k]) ?? slotsVivos[0] ?? 0;
  const quemEscolhe = partida.time[campo[slotEscolhendo]] ?? eu;
  const inimigosVivos = inimigosEmCampo(partida)
    .map((e, k) => [e, k as Slot] as const)
    .filter(([e]) => e && !e.fim) as [Encontro, Slot][];
  const proximo = partida.parada ? encontroDaVez(partida) : null;
  const proximoTreinador = proximo && proximo.treinador >= 0 ? partida.treinadores[proximo.treinador] : null;

  const listaTime = (onEscolher: (i: number) => void, desabilitar: (l: Lutador, i: number) => boolean, extra?: (l: Lutador, i: number) => ReactNode) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {partida.time.map((l, i) => {
        const max = hpMax(dex, l);
        const f = l.hp / max;
        const k = campo.indexOf(i);
        return (
          <div key={l.uid} className="flex items-stretch gap-1">
            <button
              disabled={desabilitar(l, i)}
              onClick={() => onEscolher(i)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-hair bg-surface p-2 text-left transition hover:border-brand-500 disabled:opacity-40"
            >
              <img src={spriteEstatico(l.id)} alt="" className="pk-mini h-12 w-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-1 text-sm font-bold text-brand-ink">
                  <span className="truncate">{nomeDe(l.id)}</span>
                  <span className="text-xs">Nv{nivelDe(l)}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/20">
                  <span className="block h-full rounded-full" style={{ width: `${f * 100}%`, background: f > 0.5 ? "#3BC46B" : f > 0.2 ? "#F2C33A" : "#E8474C" }} />
                </span>
                <span className="text-[11px] text-faint">
                  {l.hp <= 0 ? "desmaiado" : `${l.hp}/${max} HP`}
                  {l.status ? ` · ${TXT_STATUS[l.status][1]}` : ""}
                  {fase !== "parada" && k >= 0 ? " · em campo" : ""}
                </span>
              </span>
            </button>
            {extra?.(l, i)}
          </div>
        );
      })}
    </div>
  );

  const mochilaCura = (
    <>
      {alvoItem ? (
        listaTime((i) => void aplicarItem(alvoItem, i), (l) => !podeUsar(dex, l, alvoItem, limiteDaRegiao(partida.regiao), partida.cap))
      ) : itensUsaveis.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {itensUsaveis.map(([i, q]) => (
            <button
              key={i}
              onClick={() => setAlvoItem(i)}
              disabled={!partida.time.some((l) => podeUsar(dex, l, i, limiteDaRegiao(partida.regiao), partida.cap))}
              className="flex items-center gap-2 rounded-xl border border-hair bg-surface p-2 text-left text-sm transition hover:border-brand-500 disabled:opacity-40"
            >
              <img src={spriteItem(i)} alt="" className="pk-mini h-8 w-8" />
              <span className="min-w-0">
                <b className="text-brand-ink">
                  {nomeItem(i)} ×{q}
                </b>
                <span className="block truncate text-[11px] text-faint">{ITENS[i]?.texto}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Mochila vazia. Vencer treinadores rende itens.</p>
      )}
    </>
  );

  const nomesEnviados = (k: Slot) => inimigosEmCampo(partida)[k];

  return createPortal(
    <div className="jg">
      {telaEvolucao}
      {telaGolpe}
      <div className="jg__palco">
        <Arena
          inimigos={fase === "recompensa" || fase === "troca" || fase === "parada" ? [null, null] : inimigos}
          meus={meus}
          dupla={dupla && fase !== "parada"}
          treinador={treinadorVis}
          jogador={jogadorVis}
          mensagem={mensagem}
          fx={fx}
          textos={textos}
          bola={bolaVis}
          lancamentos={lancamentos}
          cor={corBioma}
          fundo={fundo}
          aguardando={fase === "pergunta" || fase === "resultado"}
          item={itemVis}
          bolasMeu={bolasMeu}
          bolasInimigo={fase === "parada" ? null : bolasInimigo}
          centroCura={centroCura}
          transicao={transicao}
          insignia={insigniaVis}
          previa={
            fase === "parada" && proximo
              ? proximoTreinador
                ? { tipo: "treinador", sprite: proximoTreinador.sprite, n: proximo.chave }
                : { tipo: "mato", habitat: habitatDoTipo(dex.especies[proximo.especie]?.t[0]), n: proximo.chave }
              : null
          }
          topo={
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip title="Onde você está">
                  {partida.modo === "safari" ? <Trees size={12} /> : partida.modo === "liga" ? <Crown size={12} /> : <MapaIcone size={12} />}
                  {partida.modo === "ginasio" && partida.ginasio !== undefined
                    ? `Ginásio de ${regiaoDe(partida.regiao).ginasios[partida.ginasio].cidade}`
                    : partida.modo === "safari" || partida.modo === "liga"
                      ? `${NOME_MODO[partida.modo]} · ${regiaoDe(partida.habitat ?? partida.regiao).nome}${partida.modo === "safari" && partida.terreno !== undefined ? ` · ${TERRENOS[partida.terreno]?.nome}` : ""}`
                      : NOME_MODO[partida.modo ?? "rota"]}
                </Chip>
                {dupla && fase !== "parada" && (
                  <Chip title="Dois Pokémon de cada lado">
                    <Users size={12} /> Dupla
                  </Chip>
                )}
                {partida.modo === "safari" ? (
                  <Chip title="Safari Balls desta visita">
                    <img src={spriteItem("safari-ball")} alt="" className="pk-mini h-4 w-4" /> ×{partida.mochila["safari-ball"] ?? 0}
                  </Chip>
                ) : (
                  <Chip title="Treinadores vencidos">
                    <Swords size={12} /> {vencidos}/{partida.treinadores.length}
                  </Chip>
                )}
                {partida.combo >= 2 && (
                  <Chip title="Acertos seguidos: a cada 3, cura 10% do HP">
                    <Flame size={12} className="text-orange-500" /> Combo {partida.combo}
                  </Chip>
                )}
                {goal && (
                  <Chip title="Cada resposta da batalha conta na meta do dia e na ofensiva">
                    <Trophy size={12} /> Meta {Math.min(goal.respondidasHoje, goal.meta)}/{goal.meta}
                  </Chip>
                )}
              </div>
              <button onClick={() => setFase("lobby")} className="jg-botao" title="Pausar (a partida fica salva)">
                <Pause size={16} /> <span className="hidden sm:inline">Pausar</span>
              </button>
            </div>
          }
        />
      </div>

      <div ref={painelRef} className="jg__painel">
        {fase === "recompensa" && partida.oferta && <Recompensa key={partida.oferta.join()} oferta={partida.oferta} mochila={partida.mochila} onEscolher={escolherRecompensa} />}

        {fase === "parada" && partida.parada && (
          <div className="space-y-4 p-4 sm:p-6">
            <div>
              <p className="font-display text-xl font-bold text-brand-ink">
                {partida.parada.curadoAuto ? "Diante do líder" : partida.parada.loja ? (partida.modo === "liga" ? "Platô Indigo" : `Cidade de ${regiaoDe(partida.regiao).ginasios[partida.ginasio ?? 0]?.cidade ?? ""}`) : "Pausa no caminho"}
              </p>
              <p className="text-sm text-muted">
                {partida.parada.curadoAuto ? "Seu time foi curado por completo. " : ""}Organize o time e use itens antes de seguir: aqui nada gasta a vez.{" "}
                <span className="font-semibold text-brand-ink">Carteira: {dinheiroTxt(partida.dinheiro ?? 0)}</span>
              </p>
            </div>

            {proximo && (
              <div className="pk-carta flex items-center gap-3 rounded-2xl border border-hair bg-surface2 p-3">
                {proximoTreinador ? (
                  <img src={spriteTreinador(proximoTreinador.sprite)} alt="" className="pk-mini h-16 w-16 shrink-0" style={{ filter: "brightness(.35) saturate(.4)" }} />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface text-3xl" aria-hidden>
                    ?
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-faint">A seguir</p>
                  {proximoTreinador ? (
                    <>
                      <p className="font-bold text-brand-ink">
                        {proximoTreinador.nome}
                        {proximoTreinador.dupla && <span className="pk-selvagem ml-2" style={{ background: "#3D8BE8" }}>Batalha dupla</span>}
                      </p>
                      <Pokebolas bolas={Array.from({ length: Math.max(1, proximoTreinador.total ?? partida.fila.filter((e) => e.treinador === proximo.treinador).length + 1) }, () => "ok" as EstadoBola)} className="mt-1 text-[15px]" />
                    </>
                  ) : (
                    <p className="text-sm text-brand-ink">{TEXTO_HABITAT[habitatDoTipo(dex.especies[proximo.especie]?.t[0])]} Um Pokémon selvagem vai aparecer.</p>
                  )}
                </div>
              </div>
            )}

            {partida.parada.centro && (
              <div className="flex items-center gap-3 rounded-2xl border border-pink-300/60 bg-surface2 p-3">
                <img src={spriteTreinador("nurse")} alt="" className="pk-mini h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm text-brand-ink">
                    <b>Enfermeira Joy:</b> {partida.parada.curou ? "Seus Pokémon estão em plena forma!" : "Bem-vindo ao Centro Pokémon! Quer que eu cuide do seu time?"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void irAoCentro()} disabled={!!partida.parada.curou || centroCura !== null} className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50">
                      {partida.parada.curou ? "Time curado ✓" : "Curar o time"}
                    </button>
                    <span className={`pk-maquina ${centroCura !== null || partida.parada.curou ? "pk-maquina--on" : ""}`} aria-hidden>
                      {Array.from({ length: 6 }, (_, i) => (
                        <i key={i} style={{ "--i": i, visibility: i < partida.time.length ? "visible" : "hidden" } as CSSProperties} />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {partida.parada.loja && (
              <PokeMart dinheiro={partida.dinheiro ?? 0} insignias={partida.insignias ?? 0} mochila={partida.mochila} onComprar={(item, qtd) => {
                const q = comprarNaPartida(partida, item, qtd);
                if (q === partida) return;
                setPartida(q);
                setMensagem(`Você comprou ${qtd}× ${nomeItem(item)}.${item === "poke-ball" && qtd >= 10 ? " De brinde, uma Premier Ball!" : ""}`);
              }} />
            )}

            <div>
              <p className="mb-1.5 text-sm font-bold text-brand-ink">Ordem do time</p>
              <p className="mb-2 text-[11px] text-faint">
                {proximoTreinador?.dupla ? "Os dois primeiros de pé abrem a batalha dupla." : "O primeiro de pé abre a próxima luta."} Use ▲ para subir na fila; toque para usar um item da mochila.
              </p>
              {listaTime(
                () => setPainel("mochila"),
                () => false,
                (_, i) => (
                  <button onClick={() => moverParada(i, i - 1)} disabled={i === 0} className="rounded-xl border border-hair bg-surface px-2.5 text-sm font-bold text-muted transition hover:border-brand-500 disabled:opacity-30" aria-label="Subir na ordem">
                    ▲
                  </button>
                )
              )}
            </div>

            <div className="rounded-2xl border border-hair bg-surface2 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-brand-ink">{alvoItem ? `${nomeItem(alvoItem)}: em quem?` : "Mochila"}</p>
                {alvoItem && (
                  <button onClick={() => setAlvoItem(null)} className="rounded-lg p-1 text-muted hover:text-brand-500" aria-label="Voltar">
                    <X size={16} />
                  </button>
                )}
              </div>
              {mochilaCura}
            </div>

            <button onClick={seguir} disabled={!partida.time.some((l) => l.hp > 0) || centroCura !== null} className="btn-primary w-full">
              Seguir viagem ▶
            </button>
          </div>
        )}

        {fase === "troca" && (
          <div className="space-y-3 p-4 sm:p-6">
            <p className="font-display text-xl font-bold text-brand-ink">Escolha o próximo Pokémon</p>
            {listaTime((i) => void trocarPara(i), (l, i) => l.hp <= 0 || campo.includes(i))}
            {(partida.mochila.revive ?? 0) > 0 && <p className="text-xs text-faint">Dica: dá para usar Reviver depois, na mochila (gasta a vez) ou na próxima parada.</p>}
          </div>
        )}

        {(fase === "entrada" || fase === "pergunta" || fase === "golpe" || fase === "resultado") && questaoVista && eu && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-6">
              <div key={`${questaoVista.id}-${retornoVisto ? "r" : "a"}`} className="bt-carta-questao" style={fase === "entrada" ? { opacity: 0.35 } : undefined}>
                {dupla && encontro && fase !== "resultado" && (
                  <p className="mb-2 text-xs font-semibold text-faint">
                    Questão de <b className="text-brand-ink">{nomeDe(encontro.especie)}</b> · acerte e os dois atacam; erre e os dois inimigos atacam.
                  </p>
                )}
                <QuestaoView
                  key={`${questaoVista.id}-${retornoVisto ? "r" : "a"}`}
                  questao={questaoVista}
                  selecionada={respondida ? desfecho?.marcada : selecionada}
                  revelado={fase === "resultado"}
                  historico={historicoVisto}
                  onSelecionar={(a) => fase === "pergunta" && setSelecionada(a)}
                />
              </div>

              {fase === "resultado" && desfecho && (
                <div ref={resultadoRef} className={`card bt-painel-resultado scroll-mb-40 space-y-3 p-5 ${desfecho.acertou ? "bt-painel-resultado--acerto" : "bt-painel-resultado--erro"}`}>
                  {desfecho.acertou ? (
                    <>
                      <p className="font-display text-lg font-bold text-brand-ink">{desfecho.confianca === "certeza" ? "Certeza confirmada." : "Acertou na dúvida."}</p>
                      {lutaAtiva(partida) && encontro && (
                        <p className="text-sm text-muted">
                          {dupla
                            ? `A batalha dupla continua: a próxima questão é de ${nomeDe(encontro.especie)}.`
                            : `${nomeDe(encontro.especie)} ainda tem ${Math.round((encontro.hp / atributos(dex.especies[encontro.especie], encontro.nivel).hp) * 100)}% do HP: a próxima questão continua a luta.`}
                        </p>
                      )}
                      {desfecho.confianca === "duvida" && <p className="text-sm text-muted">Leia a explicação acima com calma: é ela que transforma o palpite em certeza.</p>}
                      {licaoAnterior && (
                        <p className="rounded-xl border border-hair bg-surface2 p-3 text-sm text-brand-ink">
                          <b>Sua lição:</b> {licaoAnterior}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display text-lg font-bold text-brand-ink">
                        {desfecho.confianca === "certeza" ? "Errou com certeza: essa é a que mais ensina." : "Errou. Bora entender por quê."}
                      </p>
                      {partida.fim !== "derrota" &&
                        (licaoAnterior ? (
                          <p className="rounded-xl border border-hair bg-surface2 p-3 text-sm text-brand-ink">
                            <b>Lição anotada:</b> {licaoAnterior}
                          </p>
                        ) : (
                          <>
                            <label className="block text-sm text-muted" htmlFor="licao">
                              Em uma frase, com suas palavras: por que a <b className="text-brand-ink">{questaoVista.gabarito}</b> é a certa
                              {desfecho.marcada ? <> e a {desfecho.marcada} não</> : null}? Escrever cura 25% do HP.
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <textarea
                                id="licao"
                                value={licao}
                                onChange={(e) => setLicao(e.target.value)}
                                rows={2}
                                maxLength={400}
                                placeholder="Ex.: a lei fala em 30 dias, não 60…"
                                className="min-h-[64px] flex-1 rounded-xl border border-hair bg-surface p-3 text-sm text-brand-ink outline-none focus:border-brand-500"
                              />
                              <button
                                onClick={anotarLicao}
                                disabled={licao.trim().length < MIN_LICAO}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-hair px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-500 disabled:opacity-40"
                              >
                                <NotebookPen size={15} /> Anotar lição
                              </button>
                            </div>
                          </>
                        ))}
                    </>
                  )}
                  <button onClick={continuar} className="btn-primary w-full">
                    {partida.fim ? "Ver resultado" : precisaTrocar(partida) ? "Escolher o próximo Pokémon ▶" : lutaAtiva(partida) ? "Próxima questão ▶" : "Continuar ▶"}
                  </button>
                </div>
              )}
            </div>

            {fase === "pergunta" && (
              <div className={`bt-barra-golpes jg__golpes ${selecionada ? "bt-barra-golpes--pronta" : ""}`}>
                {painel === "mochila" && (
                  <Gaveta titulo={alvoItem ? `${nomeItem(alvoItem)}: em quem?` : "Mochila"} onFechar={() => (alvoItem ? setAlvoItem(null) : setPainel(null))}>
                    {mochilaCura}
                    <p className="mt-2 text-[11px] text-faint">Usar item gasta a vez, como nos jogos: o inimigo ataca em seguida (a questão continua a mesma).</p>
                  </Gaveta>
                )}
                {painel === "pokemon" && (
                  <Gaveta titulo={trocaEscolhida !== null ? `${nomeDe(partida.time[trocaEscolhida].id)} entra no lugar de quem?` : "Trocar de Pokémon"} onFechar={() => (trocaEscolhida !== null ? setTrocaEscolhida(null) : setPainel(null))}>
                    {trocaEscolhida !== null ? (
                      <div className="grid grid-cols-2 gap-2">
                        {campo.map((i, k) => (
                          <button key={i} onClick={() => void trocarPara(trocaEscolhida, k as Slot)} className="flex items-center gap-2 rounded-xl border border-hair bg-surface p-2 text-left text-sm font-bold text-brand-ink transition hover:border-brand-500">
                            <img src={spriteEstatico(partida.time[i].id)} alt="" className="pk-mini h-10 w-10" /> {nomeDe(partida.time[i].id)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      listaTime((i) => (campo.length > 1 ? setTrocaEscolhida(i) : void trocarPara(i, 0)), (l, i) => l.hp <= 0 || campo.includes(i))
                    )}
                    <p className="mt-2 text-[11px] text-faint">Trocar gasta a vez: o inimigo ataca quem entrou.</p>
                  </Gaveta>
                )}
                {painel === "bolas" && (
                  <Gaveta titulo="Qual bola? (só é lançada se a resposta estiver certa)" onFechar={() => setPainel(null)}>
                    <div className="grid grid-cols-3 gap-2">
                      {bolasTenho.map((b) => (
                        <button
                          key={b}
                          title={ITENS[b]?.texto}
                          disabled={!selecionada || (partida.mochila[b] ?? 0) <= 0}
                          onClick={() => void atacar({ bola: b })}
                          className="flex flex-col items-center gap-1 rounded-xl border border-hair bg-surface p-2 text-xs font-bold text-brand-ink transition hover:border-brand-500 disabled:opacity-40"
                        >
                          <img src={spriteItem(b)} alt="" className="pk-mini h-8 w-8" />
                          {nomeItem(b)} ×{partida.mochila[b] ?? 0}
                          {inimigoEsp && encontro && (
                            <span className="font-normal text-faint">
                              ~
                              {Math.round(
                                chanceCaptura(inimigoEsp, b, certeza ? "certeza" : "duvida", encontro.hp / atributos(inimigoEsp, encontro.nivel).hp, encontro.status !== "" || encontro.semente, {
                                  nivel: encontro.nivel,
                                  turnos: encontro.turnos ?? 0,
                                  jaTem: (partida.tem ?? []).includes(encontro.especie),
                                }) * 100
                              )}
                              %
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-faint">{selecionada ? "HP baixo e status (sono, veneno...) aumentam a chance." : "Escolha a alternativa antes."}</p>
                  </Gaveta>
                )}

                <div className="mb-2 flex items-center justify-between gap-2">
                  <button onClick={() => setCerteza((c) => !c)} className={`pk-certeza ${certeza ? "pk-certeza--on" : "text-muted"}`} aria-pressed={certeza}>
                    <span aria-hidden>{certeza ? "★" : "☆"}</span> Tenho certeza
                    <span className="hidden font-normal opacity-75 sm:inline">· crítico, mas errar dói 1,5×</span>
                  </button>
                  {!selecionada && <span className="text-xs text-faint">Escolha uma alternativa</span>}
                </div>
                {dupla && slotsVivos.length > 0 && (
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-brand-ink">
                      {golpeSemAlvo ? `${dex.golpes[golpeSemAlvo.golpe]?.[0]}: em quem?` : `Golpe de ${nomeDe(quemEscolhe.id)}`}
                      {slotsVivos.length > 1 && <span className="ml-1 font-normal text-faint">({slotsVivos.indexOf(slotEscolhendo) + 1}/{slotsVivos.length})</span>}
                    </span>
                    {(golpeSemAlvo || ordens.some(Boolean)) && (
                      <button
                        onClick={() => {
                          setGolpeSemAlvo(null);
                          setOrdens([null, null]);
                        }}
                        className="font-semibold text-muted hover:text-brand-500"
                      >
                        ↺ Recomeçar escolha
                      </button>
                    )}
                  </div>
                )}
                {golpeSemAlvo ? (
                  <div className="grid grid-cols-2 gap-2">
                    {inimigosVivos.map(([e, k]) => (
                      <button key={k} onClick={() => escolherGolpeDupla(golpeSemAlvo.slot, golpeSemAlvo.golpe, k)} className="pk-golpe" style={{ "--cor": "#E8474C" } as CSSProperties}>
                        <span className="flex items-center gap-2">
                          <img src={spriteEstatico(e.especie)} alt="" className="pk-mini h-9 w-9" />
                          <span>
                            <span className="block text-sm font-extrabold leading-tight">{nomeDe(nomesEnviados(k)?.especie ?? e.especie)}</span>
                            {(() => {
                              const m = dex.golpes[golpeSemAlvo.golpe];
                              const ef = m && m[3] !== 2 ? efetividade(m[1], dex.especies[e.especie].t) : 1;
                              return ef !== 1 ? <span className="text-[11px] font-bold" style={{ color: ef >= 2 ? "#1C7C4A" : "#B3261E" }}>{ef >= 2 ? "super efetivo" : ef === 0 ? "sem efeito" : "pouco efetivo"}</span> : <span className="text-[11px] opacity-70">Nv{e.nivel}</span>;
                            })()}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {quemEscolhe.golpes.map((g) => {
                      const m = dex.golpes[g];
                      if (!m) return null;
                      const efs = (dupla ? inimigosVivos.map(([e]) => dex.especies[e.especie]) : inimigoEsp ? [inimigoEsp] : []).map((esp) => (m[3] !== 2 ? efetividade(m[1], esp.t) : 1));
                      const ef = efs.length ? Math.max(...efs) : 1;
                      const efeito = m[3] === 2 ? (m[6] ? "status" : m[5] > 0 ? "cura" : "guarda") : m[4] > 0 ? "dreno" : m[2] > 0 ? `${m[2]} poder` : "dano fixo";
                      return (
                        <button
                          key={g}
                          className="pk-golpe"
                          style={{ "--cor": COR_TIPO[m[1]] } as CSSProperties}
                          disabled={!selecionada}
                          onClick={() => (dupla ? escolherGolpeDupla(slotEscolhendo, g) : void atacar({ golpe: g }))}
                        >
                          <span className="text-sm font-extrabold leading-tight">{m[0]}</span>
                          <span className="flex items-center gap-1.5 text-[11px] opacity-80">
                            <TipoChip tipo={m[1]} nome={NOME_TIPO[m[1]]} /> {efeito}
                          </span>
                          {ef !== 1 && (
                            <span className="pk-golpe__ef" style={{ color: ef >= 2 ? "#1C7C4A" : "#B3261E" }}>
                              {ef >= 2 ? "super efetivo" : ef === 0 ? "sem efeito" : "pouco efetivo"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex gap-1.5">
                    <BotaoMini rotulo="Mochila (gasta a vez)" onClick={() => setPainel(painel === "mochila" ? null : "mochila")}>
                      <Backpack size={14} /> <span className="max-[430px]:hidden">Mochila</span>
                    </BotaoMini>
                    <BotaoMini
                      rotulo="Trocar de Pokémon (gasta a vez)"
                      onClick={() => {
                        setTrocaEscolhida(null);
                        setPainel(painel === "pokemon" ? null : "pokemon");
                      }}
                      disabled={!partida.time.some((l, i) => l.hp > 0 && !campo.includes(i))}
                    >
                      <Users size={14} /> <span className="max-[430px]:hidden">Pokémon</span>
                    </BotaoMini>
                    {selvagem && (
                      <BotaoMini onClick={() => setPainel(painel === "bolas" ? null : "bolas")} disabled={!bolasTenho.length} destaque>
                        <img src={spriteItem("poke-ball")} alt="" className="pk-mini h-4 w-4" /> Capturar
                      </BotaoMini>
                    )}
                    {selvagem && !encontro?.turnos && (
                      <BotaoMini onClick={trocarBicho} disabled={!podeTrocarSelvagem(partida)} rotulo="Trocar por outro Pokémon (a questão continua a mesma)">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Shuffle size={14} /> <span className="hidden sm:inline">Outro</span> {MAX_TROCAS - (encontro?.trocas ?? 0)}×
                        </span>
                      </BotaoMini>
                    )}
                  </div>
                  {confirmarFuga ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-faint">Encerrar a partida?</span>
                      <button onClick={desistir} className="font-bold text-danger-from">
                        Sim
                      </button>
                      <button onClick={() => setConfirmarFuga(false)} className="font-semibold text-muted">
                        Não
                      </button>
                    </span>
                  ) : (
                    <BotaoMini rotulo="Fugir" onClick={() => setConfirmarFuga(true)}>
                      <Flag size={14} /> <span className="max-[430px]:hidden">Fugir</span>
                    </BotaoMini>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------- pedaços ----------

const dinheiroTxt = (v: number) => `₽${Math.max(0, Math.round(v)).toLocaleString("pt-BR")}`;

// Poké Mart: a loja da cidade (preços dos jogos; melhora com as insígnias).
// Lobby: insígnia ganha desde a última visita (por região, guardada neste aparelho) surge no
// meio da tela e voa até o lugar dela. Na primeira visita só grava o que já existe.
const chaveInsigniaVoar = (regiao: number) => `q_poke_insignia_voar_${regiao}`;

function useInsigniaNova(regiao: number, insignias: number) {
  const [voando, setVoando] = useState<number | null>(null);
  const [encaixou, setEncaixou] = useState<number | null>(null);
  useEffect(() => {
    const chave = `q_poke_insignias_vistas_${regiao}`;
    let vistas: number | null = null;
    let marcada: number | null = null;
    try {
      const v = localStorage.getItem(chave);
      vistas = v === null ? null : Number(v);
      localStorage.setItem(chave, String(insignias));
      // a tela de vitória marca a insígnia ganha: ela voa na volta ao lobby
      const m = localStorage.getItem(chaveInsigniaVoar(regiao));
      marcada = m === null ? null : Number(m);
      localStorage.removeItem(chaveInsigniaVoar(regiao));
    } catch {
      /* sem armazenamento: sem animação */
    }
    if (marcada !== null && marcada >= 0 && marcada < insignias) setVoando(marcada);
    else if (vistas !== null && insignias > vistas && insignias > 0) setVoando(insignias - 1);
  }, [regiao, insignias]);
  const pousou = () => {
    setEncaixou(voando);
    setVoando(null);
  };
  return { voando, encaixou, pousou };
}

function InsigniaVoando({ src, alvo, onFim }: { src: string; alvo: () => HTMLElement | null; onFim: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  const fim = useRef(onFim);
  fim.current = onFim;
  useEffect(() => {
    const el = img.current;
    const destino = alvo();
    if (!el || !destino || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !el.animate) {
      fim.current();
      return;
    }
    const tam = 128;
    const meio = `translate(${window.innerWidth / 2 - tam / 2}px, ${window.innerHeight / 2 - tam / 2}px)`;
    const r = destino.getBoundingClientRect();
    const escala = r.width / tam;
    const la = `translate(${r.left + r.width / 2 - tam / 2}px, ${r.top + r.height / 2 - tam / 2}px)`;
    const a = el.animate(
      [
        { transform: `${meio} scale(0) rotateY(900deg)`, opacity: 0, offset: 0 },
        { transform: `${meio} scale(1.25) rotateY(0deg)`, opacity: 1, offset: 0.3 },
        { transform: `${meio} scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `${meio} scale(1)`, opacity: 1, offset: 0.62, easing: "cubic-bezier(.5,0,.2,1)" },
        { transform: `${la} scale(${escala})`, opacity: 1, offset: 1 },
      ],
      { duration: 2300, fill: "forwards" },
    );
    a.onfinish = () => fim.current();
    return () => a.cancel();
  }, [src]);
  return createPortal(
    <>
      <div className="pk-ins-voa-fundo" />
      <img ref={img} src={src} alt="" className="pk-ins-voa" style={{ opacity: 0 }} />
    </>,
    document.body,
  );
}

function PokeMart({ dinheiro, insignias, mochila, onComprar }: { dinheiro: number; insignias: number; mochila: Record<string, number>; onComprar: (item: string, qtd: number) => void }) {
  const [qtd, setQtd] = useState<Record<string, number>>({});
  return (
    <div className="rounded-2xl border border-sky-400/50 bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-600 text-[11px] font-black text-white" aria-hidden>
          PM
        </span>
        <p className="text-sm font-bold text-brand-ink">Poké Mart</p>
        <span className="ml-auto text-xs font-semibold text-muted">{dinheiroTxt(dinheiro)}</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {lojaDe(insignias).map(([item, preco]) => {
          const n = qtd[item] ?? 1;
          const pode = preco * n <= dinheiro;
          return (
            <div key={item} className="flex items-center gap-2 rounded-xl border border-hair bg-surface2 p-1.5 text-sm" title={ITENS[item]?.texto}>
              <img src={spriteItem(item)} alt="" className="pk-mini h-8 w-8 shrink-0" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-brand-ink">{nomeItem(item)}</b>
                <span className="text-[11px] text-faint">
                  {dinheiroTxt(preco)} · tem {mochila[item] ?? 0}
                </span>
              </span>
              <span className="inline-flex items-center rounded-lg border border-hair">
                <button onClick={() => setQtd({ ...qtd, [item]: Math.max(1, n - 1) })} className="px-1.5 text-muted" aria-label="Menos">
                  −
                </button>
                <span className="w-5 text-center text-xs font-bold tabular-nums">{n}</span>
                <button onClick={() => setQtd({ ...qtd, [item]: Math.min(99, n + 1) })} className="px-1.5 text-muted" aria-label="Mais">
                  +
                </button>
              </span>
              <button onClick={() => onComprar(item, n)} disabled={!pode} className="rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40">
                {dinheiroTxt(preco * n)}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">10 Poké Balls de uma vez rendem uma Premier Ball de brinde.</p>
    </div>
  );
}

function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="bt-chip inline-flex items-center gap-1 rounded-full border border-hair bg-surface px-2.5 py-1 text-xs font-semibold text-brand-ink">
      {children}
    </span>
  );
}

function BotaoMini({ children, onClick, disabled, destaque, rotulo }: { children: ReactNode; onClick: () => void; disabled?: boolean; destaque?: boolean; rotulo?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition disabled:opacity-40 ${
        destaque ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" : "border-hair bg-surface text-muted hover:text-brand-500"
      }`}
    >
      {children}
    </button>
  );
}

function Gaveta({ titulo, children, onFechar }: { titulo: string; children: ReactNode; onFechar: () => void }) {
  return (
    <div className="pk-carta mb-3 max-h-[42vh] overflow-y-auto rounded-2xl border border-hair bg-surface2 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-ink">{titulo}</p>
        <button onClick={onFechar} className="rounded-lg p-1 text-muted hover:text-brand-500" aria-label="Fechar">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

function GolpeInfo({ dex, g, destaque }: { dex: Dex; g: number; destaque?: boolean }) {
  const m = dex.golpes[g];
  if (!m) return null;
  const efeito = m[3] === 2 ? (m[6] ? "status" : m[5] > 0 ? "cura" : "guarda") : m[2] > 0 ? `${m[2]} poder${m[4] > 0 ? " · dreno" : ""}` : "dano fixo";
  return (
    <span className="min-w-0 text-left">
      <span className={`block truncate text-sm font-extrabold leading-tight ${destaque ? "text-brand-500" : "text-brand-ink"}`}>{m[0]}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
        <TipoChip tipo={m[1]} nome={NOME_TIPO[m[1]]} /> {efeito}
      </span>
    </span>
  );
}

// Golpe novo com 4 golpes já aprendidos: o jogador escolhe qual esquecer (como nos jogos).
function EscolherGolpe({ dex, lutador, novo, onEscolher }: { dex: Dex; lutador: Lutador; novo: number; onEscolher: (esquecer: number | null) => void }) {
  const nome = dex.especies[lutador.id]?.n ?? "";
  return (
    <div className="pk-evo" style={{ background: "rgba(8,10,24,.78)" }}>
      <div className="w-[min(460px,calc(100vw-32px))] space-y-3 rounded-2xl border border-hair p-5 text-left shadow-2xl" style={{ background: "rgb(var(--surface))" }}>
        <div className="flex items-center gap-3">
          <img src={spriteFrente(lutador.id)} alt="" className="pk-mini h-14 w-14" />
          <p className="text-sm text-muted">
            <b className="text-brand-ink">{nome}</b> quer aprender <b className="text-brand-500">{dex.golpes[novo]?.[0]}</b>, mas já sabe {MAX_GOLPES} golpes. Qual esquecer?
          </p>
        </div>
        <div className="rounded-xl border border-brand-500 bg-surface p-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-faint">Golpe novo</p>
          <GolpeInfo dex={dex} g={novo} destaque />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {lutador.golpes.map((g) => (
            <button key={g} onClick={() => onEscolher(g)} className="flex items-center justify-between gap-2 rounded-xl border border-hair bg-surface2 p-2.5 transition hover:border-danger-from">
              <GolpeInfo dex={dex} g={g} />
              <span className="shrink-0 text-[11px] font-bold text-danger-from">esquecer</span>
            </button>
          ))}
        </div>
        <button onClick={() => onEscolher(null)} className="w-full rounded-xl border border-hair px-4 py-2 text-sm font-semibold text-muted transition hover:text-brand-500">
          Não aprender {dex.golpes[novo]?.[0]}
        </button>
      </div>
    </div>
  );
}

// Relembrador de golpes (lobby): escolhe até 4 entre tudo que a linha evolutiva já aprendeu.
function EditorGolpes({ dex, m, onSalvar, onFechar }: { dex: Dex; m: Mon; onSalvar: (golpes: number[]) => void; onFechar: () => void }) {
  const [escolhidos, setEscolhidos] = useState<number[]>(m.golpes);
  const disponiveis = useMemo(
    () =>
      golpesDisponiveis(dex, m).sort((a, b) => {
        const ga = dex.golpes[a];
        const gb = dex.golpes[b];
        return ga[1] - gb[1] || gb[2] - ga[2] || ga[0].localeCompare(gb[0]);
      }),
    [dex, m]
  );
  const alternar = (g: number) =>
    setEscolhidos((xs) => (xs.includes(g) ? (xs.length > 1 ? xs.filter((x) => x !== g) : xs) : xs.length < MAX_GOLPES ? [...xs, g] : xs));
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="flex max-h-[88vh] w-[min(560px,100%)] flex-col rounded-2xl border border-hair p-5 shadow-2xl" style={{ background: "rgb(var(--surface))" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <img src={spriteFrente(m.id)} alt="" className="pk-mini h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-brand-ink">Golpes de {dex.especies[m.id]?.n}</p>
            <p className="text-xs text-faint">
              Escolha até {MAX_GOLPES} ({escolhidos.length}/{MAX_GOLPES}). Vale tudo que ele e as pré-evoluções aprendem até o Nv{nivelDe(m)}.
            </p>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1 text-muted hover:text-brand-500" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="grid flex-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {disponiveis.map((g) => {
            const on = escolhidos.includes(g);
            const cheio = !on && escolhidos.length >= MAX_GOLPES;
            return (
              <button
                key={g}
                onClick={() => alternar(g)}
                disabled={cheio}
                aria-pressed={on}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition disabled:opacity-40 ${on ? "border-brand-500 bg-surface" : "border-hair bg-surface2 hover:border-brand-500"}`}
              >
                <GolpeInfo dex={dex} g={g} />
                <span className={`shrink-0 text-base ${on ? "text-brand-500" : "text-faint"}`}>{on ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onFechar} className="flex-1 rounded-2xl border border-hair px-4 py-2.5 text-sm font-semibold text-muted">
            Cancelar
          </button>
          <button onClick={() => onSalvar(escolhidos)} className="btn-primary flex-1">
            Salvar golpes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------- itens: recompensa e item segurado ----------

const NOME_CAT: Record<CategoriaItem, string> = { bola: "Bola", cura: "Mochila", segurar: "Segurar", fruta: "Fruta", chave: "Item-chave" };
// Raridade pela chance de sair no sorteio (itens.ts).
function raridade(i: string): "comum" | "incomum" | "raro" {
  const p = ITENS[i]?.peso ?? 1;
  return p >= 2 ? "comum" : p >= 0.6 ? "incomum" : "raro";
}
const NOME_RARIDADE = { comum: "Comum", incomum: "Incomum", raro: "Raro" };

// Recompensa depois de vencer um treinador: as Poké Bolas caem, tremem e abrem uma a uma
// mostrando o item; o escolhido cresce e voa para a mochila, os outros somem.
function Recompensa({ oferta, mochila, onEscolher }: { oferta: string[]; mochila: Record<string, number>; onEscolher: (item: string) => void }) {
  const [abertas, setAbertas] = useState(0);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  useEffect(() => {
    if (abertas >= oferta.length) return;
    const t = setTimeout(() => setAbertas((a) => a + 1), abertas === 0 ? 650 : 380);
    return () => clearTimeout(t);
  }, [abertas, oferta.length]);
  const escolher = (id: string) => {
    if (escolhido) return;
    setEscolhido(id);
    setTimeout(() => onEscolher(id), 900);
  };
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <p className="font-display text-xl font-bold text-brand-ink">Escolha uma recompensa</p>
      <p className="text-sm text-muted">{abertas < oferta.length ? "Abrindo..." : "Vai para a mochila e fica com você nas próximas partidas."}</p>
      <div className={`grid gap-3 ${oferta.length > 3 ? "sm:grid-cols-2" : ""}`}>
        {oferta.map((id, i) => {
          const aberta = i < abertas;
          const rar = raridade(id);
          const estado = escolhido ? (escolhido === id ? "pk-rc--escolhido" : "pk-rc--some") : "";
          return (
            <button
              key={id}
              disabled={!aberta || !!escolhido}
              onClick={() => escolher(id)}
              className={`pk-rc pk-rc--${rar} ${aberta ? "pk-rc--aberta" : ""} ${estado}`}
              style={{ "--i": i } as CSSProperties}
            >
              <span className="pk-rc__bola" aria-hidden>
                <img src={spriteItem("poke-ball")} alt="" />
              </span>
              <span className="pk-rc__conteudo">
                <span className="pk-rc__icone">
                  <span className="pk-rc__brilho" aria-hidden />
                  <img src={spriteItem(id)} alt="" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <b className="text-brand-ink">{nomeItem(id)}</b>
                    <span className={`pk-rc__selo pk-rc__selo--${rar}`}>{NOME_RARIDADE[rar]}</span>
                    <span className="text-[11px] text-faint">{NOME_CAT[categoriaDe(id) ?? "cura"]} · tem {mochila[id] ?? 0}</span>
                  </span>
                  <span className="block text-sm leading-snug text-muted">{ITENS[id]?.texto}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Dar item para segurar (lobby): os itens entram em cascata; o escolhido voa até o Pokémon,
// que pula de alegria. O item que ele segurava volta para a mochila.
function EditorItem({
  dex,
  m,
  mochila,
  onDar,
  onFechar,
}: {
  dex: Dex;
  m: Mon;
  mochila: Record<string, number>;
  onDar: (item: string | null) => void;
  onFechar: () => void;
}) {
  const [aba, setAba] = useState<"segurar" | "fruta">(() => (m.item && categoriaDe(m.item) === "fruta" ? "fruta" : "segurar"));
  const [voando, setVoando] = useState<{ item: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const [feliz, setFeliz] = useState(0);
  const alvo = useRef<HTMLDivElement>(null);
  const lista = Object.entries(mochila)
    .filter(([i, q]) => q > 0 && categoriaDe(i) === aba)
    .sort(([a], [b]) => nomeItem(a).localeCompare(nomeItem(b)));
  const nFrutas = Object.entries(mochila).filter(([i, q]) => q > 0 && categoriaDe(i) === "fruta").length;
  const nSegurar = Object.entries(mochila).filter(([i, q]) => q > 0 && categoriaDe(i) === "segurar").length;
  const dar = (item: string, de: HTMLElement) => {
    if (voando) return;
    const r = de.getBoundingClientRect();
    const t = alvo.current?.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    setVoando({ item, x, y, dx: t ? t.left + t.width / 2 - x : 0, dy: t ? t.top + t.height / 2 - y : -200 });
    setTimeout(() => {
      onDar(item);
      setVoando(null);
      setFeliz((f) => f + 1);
    }, 620);
  };
  return createPortal(
    <div className="pk-modal fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="pk-modal__caixa flex max-h-[88vh] w-[min(560px,100%)] flex-col rounded-2xl border border-hair p-5 shadow-2xl" style={{ background: "rgb(var(--surface))" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <div ref={alvo} className="relative shrink-0">
            <img key={feliz} src={spriteFrente(m.id)} alt="" className={`pk-mini h-16 w-16 ${feliz ? "pk-feliz" : ""}`} />
            <span className={`pk-slot ${m.item ? "pk-slot--cheio" : ""}`}>
              {m.item ? <img key={m.item + feliz} src={spriteItem(m.item)} alt="" className="pk-mini pk-slot__item" /> : <span className="text-[10px] text-faint">vazio</span>}
            </span>
            {feliz > 0 && (
              <span key={`f${feliz}`} className="pk-slot__faiscas" aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} style={{ "--ang": `${i * 60}deg` } as CSSProperties} />
                ))}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-brand-ink">Item de {dex.especies[m.id]?.n}</p>
            <p className="text-xs text-faint">{m.item ? <><b className="text-brand-ink">{nomeItem(m.item)}</b> · {(ITENS[m.item]?.texto ?? "").replace(/^Segurando[,:]\s*/, "")}</> : "Não está segurando nada."}</p>
          </div>
          <button onClick={onFechar} className="rounded-lg p-1 text-muted hover:text-brand-500" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 flex gap-1.5" role="tablist">
          <Pilula ativa={aba === "segurar"} onClick={() => setAba("segurar")}>
            Segurar ({nSegurar})
          </Pilula>
          <Pilula ativa={aba === "fruta"} onClick={() => setAba("fruta")}>
            Frutas ({nFrutas})
          </Pilula>
        </div>
        <div key={aba} className="grid flex-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {lista.length ? (
            lista.map(([i, q], k) => (
              <button
                key={i}
                onClick={(ev) => dar(i, ev.currentTarget.querySelector("img") ?? ev.currentTarget)}
                disabled={!!voando}
                className={`pk-escolha flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${voando?.item === i ? "pk-escolha--indo" : ""} border-hair bg-surface2 hover:border-brand-500`}
                style={{ "--i": k } as CSSProperties}
              >
                <img src={spriteItem(i)} alt="" className="pk-mini h-9 w-9 shrink-0" />
                <span className="min-w-0">
                  <b className="text-sm text-brand-ink">
                    {nomeItem(i)} ×{q}
                  </b>
                  <span className="block text-[11px] leading-snug text-faint">{ITENS[i]?.texto}</span>
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted sm:col-span-2">
              {aba === "fruta" ? "Nenhuma fruta na mochila. Elas aparecem como recompensa de treinador." : "Nenhum item de segurar na mochila. Vencer treinadores e líderes rende."}
            </p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {m.item && (
            <button onClick={() => onDar(null)} className="flex-1 rounded-2xl border border-hair px-4 py-2.5 text-sm font-semibold text-muted hover:border-danger-from hover:text-danger-from">
              Tirar {nomeItem(m.item)}
            </button>
          )}
          <button onClick={onFechar} className="btn-primary flex-1">
            Pronto
          </button>
        </div>
      </div>
      {voando && (
        <img
          src={spriteItem(voando.item)}
          alt=""
          className="pk-mini pk-voa"
          style={{ left: voando.x, top: voando.y, "--dx": `${voando.dx}px`, "--dy": `${voando.dy}px` } as CSSProperties}
        />
      )}
    </div>,
    document.body
  );
}

// Evolução como nos jogos: o Pokémon chama, vira silhueta branca, luzes se juntam nele, as
// duas formas se alternam cada vez mais rápido, a tela estoura em branco e a forma nova
// aparece com o grito dela e a musiquinha de parabéns.
type FaseEvo = "inicio" | "brilho" | "troca" | "flash" | "fim";
const TROCAS_EVO = [520, 470, 420, 370, 320, 280, 240, 200, 170, 145, 125, 105, 90, 75, 65, 55, 50, 45, 45, 45, 45, 45];

const nomeDoGrito = (nome: string) =>
  nome.toLowerCase().replace("♀", "f").replace("♂", "m").normalize("NFD").replace(/[^a-z0-9]/g, "");

function tocarGrito(nome: string) {
  try {
    const a = new Audio(`https://play.pokemonshowdown.com/audio/cries/${nomeDoGrito(nome)}.mp3`);
    a.volume = 0.5;
    void a.play().catch(() => {});
  } catch {
    /* sem áudio */
  }
}

// Jingle curto de parabéns (onda quadrada, como o som 8-bit dos jogos).
function tocarParabens() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notas: [number, number, number][] = [
      [392, 0, 0.14], [523, 0.15, 0.14], [659, 0.3, 0.14], [784, 0.45, 0.3],
      [659, 0.8, 0.14], [784, 0.95, 0.14], [1047, 1.1, 0.6],
    ];
    for (const [f, t, d] of notas) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + d + 0.05);
    }
    setTimeout(() => void ctx.close().catch(() => {}), 2500);
  } catch {
    /* sem áudio */
  }
}

function EvolucaoPoke({ de, para, nome, onFim }: { de: number; para: number; nome: (id: number) => string; onFim: () => void }) {
  const [fase, setFase] = useState<FaseEvo>("inicio");
  const [novo, setNovo] = useState(false);
  const [ritmo, setRitmo] = useState(TROCAS_EVO[0]);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const em = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
    tocarGrito(nome(de));
    const final = () => {
      setNovo(true);
      setFase("fim");
      tocarGrito(nome(para));
      tocarParabens();
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      em(600, final);
    } else {
      em(1500, () => setFase("brilho"));
      let t = 2700;
      em(t, () => setFase("troca"));
      TROCAS_EVO.forEach((d, k) => {
        em(t, () => {
          setRitmo(d);
          setNovo(k % 2 === 0);
        });
        t += d;
      });
      em(t, () => {
        setNovo(true);
        setFase("flash");
      });
      em(t + 650, final);
    }
    return () => timers.forEach(clearTimeout);
  }, [de, para]);
  const pronto = fase === "fim";
  const branco = fase !== "inicio" && fase !== "fim";
  return (
    <div className={`pk-evo pk-evo--${fase}`} onClick={() => pronto && onFim()} style={{ "--ritmo": `${ritmo}ms` } as CSSProperties}>
      <div className="pk-evo__raios" />
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="pk-evo__palco">
          <div className="pk-evo__brilho" />
          <div className="pk-evo__orbes">
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} style={{ "--a": `${(k * 360) / 14}deg`, "--d": `${(k % 5) * 0.17}s` } as CSSProperties} />
            ))}
          </div>
          <img className={`pk-evo__mon ${!novo ? "pk-evo__mon--vis" : ""} ${branco ? "pk-evo__mon--branco" : ""}`} src={spriteFrente(de)} alt="" />
          <img className={`pk-evo__mon ${novo ? "pk-evo__mon--vis" : ""} ${branco ? "pk-evo__mon--branco" : ""}`} src={spriteFrente(para)} alt="" />
          {pronto && (
            <div className="pk-evo__estrelas">
              {Array.from({ length: 16 }, (_, k) => (
                <i key={k} style={{ "--a": `${(k * 360) / 16}deg`, "--r": `${90 + (k % 3) * 30}px` } as CSSProperties} />
              ))}
            </div>
          )}
        </div>
        <p className="pk-evo__texto font-display text-xl font-bold">
          {pronto ? (
            <>
              Parabéns! <b>{nome(de)}</b> evoluiu para <b>{nome(para)}</b>!
            </>
          ) : (
            <>
              O quê? <b>{nome(de)}</b> está evoluindo!
            </>
          )}
        </p>
        <button onClick={onFim} disabled={!pronto} className="btn-primary disabled:opacity-0">
          Continuar
        </button>
      </div>
      <div className="pk-evo__flash" />
    </div>
  );
}

function MonCard({ dex, m, onClick, marcado, rodape }: { dex: Dex; m: Mon; onClick?: () => void; marcado?: boolean; rodape?: ReactNode }) {
  const e = dex.especies[m.id];
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-2xl border p-2 text-center transition ${marcado ? "border-brand-500 bg-surface" : "border-hair bg-surface2 hover:border-brand-500"}`}
    >
      {m.item && <img key={m.item} src={spriteItem(m.item)} alt={nomeItem(m.item)} title={`Segurando ${nomeItem(m.item)}`} className="pk-mini pk-segura absolute right-1 top-1 h-6 w-6" />}
      <img src={spriteFrente(m.id)} onError={(ev) => (ev.currentTarget.src = spriteEstatico(m.id))} alt="" className="pk-mini h-16 w-16" />
      <span className="mt-1 w-full truncate text-sm font-bold text-brand-ink">{e.n}</span>
      <span className="text-[11px] text-faint">Nv{nivelDe(m)}</span>
      <span className="mt-1 flex flex-wrap justify-center gap-1">
        {e.t.map((t) => (
          <TipoChip key={t} tipo={t} nome={NOME_TIPO[t]} />
        ))}
      </span>
      {rodape}
    </button>
  );
}

// ---------- escolha do inicial ----------

const ROTULO_ATRIBUTO = ["HP", "Ataque", "Defesa", "At. Esp.", "Def. Esp.", "Veloc."];

// Linha evolutiva a partir do inicial (primeiro ramo), com o que faz evoluir.
function linhaEvolutiva(dex: Dex, id: number): { id: number; como?: string }[] {
  const linha: { id: number; como?: string }[] = [{ id }];
  let atual = dex.especies[id];
  for (let passo = 0; passo < 2 && atual?.e?.length; passo++) {
    const [para, tipo, valor] = atual.e[0];
    if (!dex.especies[para]) break;
    linha.push({
      id: para,
      como: tipo === "l" ? `Nv${valor}` : tipo === "i" ? nomeItem(String(valor)) : `Nv${NIVEL_TROCA_AMIZADE}`,
    });
    atual = dex.especies[para];
  }
  return linha;
}

function CartaoInicial({ dex, id, marcado, onClick }: { dex: Dex; id: number; marcado: boolean; onClick: () => void }) {
  const e = dex.especies[id];
  return (
    <button
      onClick={onClick}
      aria-pressed={marcado}
      className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border-2 px-2 pb-3 pt-2 text-center transition ${marcado ? "border-brand-500 bg-surface shadow-lg" : "border-hair bg-surface2 hover:-translate-y-0.5 hover:border-brand-500"}`}
      style={{
        backgroundImage: `radial-gradient(circle at 50% 38%, ${COR_TIPO[e.t[0]]}33, transparent 62%)`,
      }}
    >
      <span className="absolute left-2 top-1.5 z-10 text-[10px] font-bold text-faint">#{String(id).padStart(3, "0")}</span>
      <img src={spriteFrente(id)} onError={(ev) => (ev.currentTarget.src = spriteEstatico(id))} alt="" className="pk-mini h-20 w-20 object-contain transition group-hover:scale-110 sm:h-24 sm:w-24" />
      <span className="mt-1 w-full truncate font-display text-base font-bold text-brand-ink">{e.n}</span>
      <span className="mt-1 flex flex-wrap justify-center gap-1">
        {e.t.map((t) => (
          <TipoChip key={t} tipo={t} nome={NOME_TIPO[t]} />
        ))}
      </span>
    </button>
  );
}

function DetalheInicial({ dex, id }: { dex: Dex; id: number }) {
  const e = dex.especies[id];
  const total = e.s.reduce((a, b) => a + b, 0);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <img src={spriteFrente(id)} onError={(ev) => (ev.currentTarget.src = spriteEstatico(id))} alt="" className="pk-mini h-20 w-20 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold text-brand-ink">{e.n}</p>
          <span className="mt-1 flex flex-wrap gap-1">
            {e.t.map((t) => (
              <TipoChip key={t} tipo={t} nome={NOME_TIPO[t]} />
            ))}
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {e.s.map((v, i) => (
          <div key={i} className="grid grid-cols-[64px_28px_1fr] items-center gap-2 text-[11px]">
            <span className="text-faint">{ROTULO_ATRIBUTO[i]}</span>
            <span className="text-right font-bold text-brand-ink">{v}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-surface2">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, (v / 150) * 100)}%`,
                  background: COR_TIPO[e.t[0]],
                }}
              />
            </span>
          </div>
        ))}
        <p className="pt-0.5 text-right text-[11px] text-faint">total {total}</p>
      </div>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[.16em] text-faint">Evolui para</p>
      <div className="mt-1 flex items-center justify-center gap-1">
        {linhaEvolutiva(dex, id).map((x, i) => (
          <div key={x.id} className="flex items-center gap-1">
            {x.como && <span className="px-0.5 text-[10px] text-faint">→ {x.como}</span>}
            <div className="flex flex-col items-center">
              <img src={spriteEstatico(x.id)} alt="" className={`pk-mini object-contain ${i === 0 ? "h-10 w-10" : "h-12 w-12"}`} />
              <span className="text-[10px] text-muted">{dex.especies[x.id].n}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscolhaInicial({
  dex,
  onEscolher,
  alternar,
  iniciais,
  titulo = "Escolha seu primeiro Pokémon",
  subtitulo = "Ele começa no nível 5 e cresce com cada questão que você acertar.",
  onVoltar,
  extra,
}: {
  dex: Dex;
  extra?: ReactNode;
  onEscolher: (id: number) => void;
  alternar?: ReactNode;
  iniciais?: number[];
  titulo?: string;
  subtitulo?: string;
  onVoltar?: () => void;
}) {
  const grupos = iniciais ? [{ regiao: "", ids: iniciais }] : INICIAIS_POR_REGIAO;
  const [aba, setAba] = useState(0);
  const [id, setId] = useState<number | null>(null);
  const ids = grupos[aba].ids.filter((i) => dex.especies[i]);
  return (
    <div className="fadeup mx-auto max-w-[1000px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo={titulo} subtitulo={subtitulo} />
      {alternar}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card min-w-0 p-4 sm:p-5">
          {grupos.length > 1 && (
            <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap" role="radiogroup" aria-label="Região">
              {grupos.map((g, i) => (
                <button
                  key={g.regiao}
                  role="radio"
                  aria-checked={i === aba}
                  onClick={() => setAba(i)}
                  className={`relative shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${i === aba ? "border-brand-500 bg-brand-500 text-white" : "border-hair text-muted hover:border-brand-500 hover:text-brand-500"}`}
                >
                  {g.regiao}
                  {id !== null && g.ids.includes(id) && i !== aba && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-500" />}
                </button>
              ))}
            </div>
          )}
          <div className={`grid gap-3 ${ids.length > 3 ? "grid-cols-3 sm:grid-cols-5" : "mx-auto max-w-[560px] grid-cols-3"}`}>
            {ids.map((i) => (
              <CartaoInicial key={i} dex={dex} id={i} marcado={id === i} onClick={() => setId(i)} />
            ))}
          </div>
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          {id ? (
            <DetalheInicial dex={dex} id={id} />
          ) : (
            <div className="card flex min-h-[140px] items-center justify-center p-4 text-center text-sm text-muted">Toque em um Pokémon para ver atributos e evoluções.</div>
          )}
          {extra && <div className="card p-4">{extra}</div>}
          <div className="flex gap-2">
            {onVoltar && (
              <button onClick={onVoltar} className="rounded-2xl border border-hair bg-surface px-4 py-3 font-display font-bold text-muted transition hover:text-brand-500">
                Agora não
              </button>
            )}
            <button disabled={!id} onClick={() => id && onEscolher(id)} className="btn-primary flex-1 disabled:opacity-40">
              {id ? `Escolher ${dex.especies[id].n}` : "Escolha um Pokémon"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Qual treinador aparece na arena lançando a Pokébola. Fechado, mostra só o atual e um
// botão que abre a grade numa janela por cima (não empurra o resto da tela); `aberto` deixa a
// grade sempre à mostra (aba Ajustes do lobby).
function EscolherJogador({ atual, onEscolher, aberto = false }: { atual: string; onEscolher: (sprite: string) => void; aberto?: boolean }) {
  const [abrir, setAbrir] = useState(false);
  const eu = TREINADORES_JOGADOR.find((t) => t.sprite === atual) ?? TREINADORES_JOGADOR[0];
  const regioes = [...new Set(TREINADORES_JOGADOR.map((t) => t.regiao))];
  useEffect(() => {
    if (!abrir) return;
    const esc = (ev: KeyboardEvent) => ev.key === "Escape" && setAbrir(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abrir]);
  const grade = (
    <div className="flex flex-wrap gap-x-4 gap-y-2.5">
      {regioes.map((r) => (
        <div key={r}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-faint">{r}</p>
          <div className="flex gap-1">
            {TREINADORES_JOGADOR.filter((t) => t.regiao === r).map((t) => (
              <button
                key={t.sprite}
                onClick={() => {
                  onEscolher(t.sprite);
                  setAbrir(false);
                }}
                title={t.nome}
                aria-label={t.nome}
                aria-pressed={t.sprite === atual}
                className={`flex w-[58px] flex-col items-center rounded-xl border px-0.5 pb-1 pt-0.5 transition ${t.sprite === atual ? "border-brand-500 bg-brand-500/10" : "border-hair hover:border-brand-500"}`}
              >
                <img src={spriteTreinador(t.sprite)} alt="" draggable={false} loading="lazy" className="h-12 w-12 object-contain [image-rendering:pixelated]" />
                <span className="w-full truncate text-[10px] font-semibold text-muted">{t.nome}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <div>
      <div className="flex items-center gap-3">
        <img src={spriteTreinador(eu.sprite)} alt="" draggable={false} className="h-16 w-16 shrink-0 rounded-xl bg-surface2 object-contain [image-rendering:pixelated]" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Seu treinador</p>
          <p className="font-display text-lg font-bold text-brand-ink">{eu.nome}</p>
          <p className="text-xs text-muted">{eu.regiao}</p>
        </div>
        {!aberto && (
          <button onClick={() => setAbrir(true)} className="rounded-xl border border-hair px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-brand-500 hover:text-brand-500">
            Trocar
          </button>
        )}
      </div>
      {aberto && <div className="mt-3">{grade}</div>}
      {abrir &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={() => setAbrir(false)}>
            <div role="dialog" aria-modal="true" aria-label="Escolher treinador" className="max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-3xl border border-hair bg-surface p-4 shadow-2xl sm:p-5" onClick={(ev) => ev.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-display text-lg font-bold text-brand-ink">Escolha seu treinador</p>
                <button onClick={() => setAbrir(false)} className="rounded-lg p-1 text-muted hover:text-brand-500" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              {grade}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ---------- lobby ----------

function Lobby({
  dex,
  perfil,
  setPerfil,
  pendentes,
  novas,
  erro,
  onTentar,
  onComecar,
  emAndamento,
  onRetomar,
  onViajar,
  onRecomecar,
  jogador,
  onJogador,
  estadoSave,
  alternar,
}: {
  dex: Dex;
  estadoSave: EstadoSave;
  perfil: PerfilPoke;
  setPerfil: (p: PerfilPoke) => void;
  pendentes: Candidata[] | null;
  novas: number;
  erro: boolean;
  onTentar: () => void;
  onComecar: (
    modo: ModoJornada,
    opts?: {
      ginasio?: number;
      habitat?: number;
      terreno?: number;
      rumo?: number;
    },
  ) => void;
  emAndamento: PartidaPoke | null;
  onRetomar: () => void;
  onViajar: () => void;
  onRecomecar: () => void;
  jogador: string;
  onJogador: (sprite: string) => void;
  alternar?: ReactNode;
}) {
  const time = perfil.time.map((u) => perfil.colecao.find((m) => m.uid === u)).filter((m): m is Mon => !!m);
  const pc = perfil.colecao.filter((m) => !perfil.time.includes(m.uid)).sort((a, b) => Number(podeLutar(perfil, b)) - Number(podeLutar(perfil, a)));
  const r = regiaoAtual(perfil);
  const regiao = REGIOES[r];
  const destino = proximaRegiao(perfil);
  const [habitat, setHabitat] = useState(r);
  const [terreno, setTerreno] = useState(-1);
  const terrenoSel = TERRENOS[terreno];
  const revisoes = pendentes ? Math.min(pendentes.length, 12) : 0;
  const completa = pendentes ? Math.min(novas, Math.max(0, 11 - revisoes)) : 0;
  const ORDEM_CAT: CategoriaItem[] = ["chave", "segurar", "fruta", "cura", "bola"];
  const mochila = Object.entries(perfil.mochila)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => ORDEM_CAT.indexOf(categoriaDe(a) ?? "cura") - ORDEM_CAT.indexOf(categoriaDe(b) ?? "cura") || nomeItem(a).localeCompare(nomeItem(b)));
  const podeMexer = !emAndamento;
  const [editando, setEditando] = useState<string | null>(null);
  const monEditando = editando ? perfil.colecao.find((m) => m.uid === editando) : undefined;
  const insignias = insigniasDe(perfil);
  const proximo = regiao.ginasios[insignias];
  const liga = ligaLiberada(perfil);
  const cap = levelCap(perfil);
  const liberado = liderLiberado(perfil);
  const historia = historiaDe(perfil);
  const exigidos = proximo ? treinadoresParaGinasio(insignias) : 0;
  const slotsInsignia = useRef<(HTMLImageElement | null)[]>([]);
  const voando = useInsigniaNova(r, insignias);
  const concluido = !!proximo && caminhoConcluido(perfil);
  const ajud = proximo ? ajudantesVencidos(perfil) : 0;
  const naCidade = concluido || (!proximo && liga);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [aba, setAba] = useState<AbaLobby>("jornada");
  const [dandoItem, setDandoItem] = useState<string | null>(null);
  const monDandoItem = dandoItem ? perfil.colecao.find((m) => m.uid === dandoItem) : undefined;
  const temSeguravel = Object.entries(perfil.mochila).some(([i, q]) => q > 0 && seguravel(i));
  const botaoGolpes = (m: Mon) => (
    <div className="grid grid-cols-2 gap-1">
      <button
        onClick={() => setEditando(m.uid)}
        disabled={!podeMexer}
        className="w-full rounded-lg border border-hair px-1 py-1 text-[11px] font-semibold text-muted transition hover:border-brand-500 hover:text-brand-500 disabled:opacity-40"
      >
        Golpes
      </button>
      <button
        onClick={() => setDandoItem(m.uid)}
        disabled={!podeMexer || (!m.item && !temSeguravel)}
        title={m.item ? `Segurando ${nomeItem(m.item)}` : "Dar um item para segurar"}
        className="w-full rounded-lg border border-hair px-1 py-1 text-[11px] font-semibold text-muted transition hover:border-brand-500 hover:text-brand-500 disabled:opacity-40"
      >
        Item
      </button>
    </div>
  );
  const alternarTime = (uid: string) => {
    if (!podeMexer) return;
    if (perfil.time.includes(uid)) {
      if (perfil.time.length <= 1) return;
      setPerfil({ ...perfil, time: perfil.time.filter((u) => u !== uid) });
    } else {
      const m = perfil.colecao.find((x) => x.uid === uid);
      if (m && podeLutar(perfil, m) && perfil.time.length < MAX_TIME) setPerfil({ ...perfil, time: [...perfil.time, uid] });
    }
  };

  const abas: { id: AbaLobby; nome: string; icone: ReactNode }[] = [
    { id: "jornada", nome: "Jornada", icone: <MapaIcone size={15} /> },
    { id: "time", nome: `Time e PC`, icone: <Users size={15} /> },
    { id: "mochila", nome: "Mochila", icone: <Backpack size={15} /> },
    { id: "ajustes", nome: "Treinador e ajustes", icone: <Settings size={15} /> },
    { id: "ajuda", nome: "Como jogar", icone: <HelpCircle size={15} /> },
  ];
  const editores = (
    <>
      {monDandoItem && <EditorItem dex={dex} m={monDandoItem} mochila={perfil.mochila} onFechar={() => setDandoItem(null)} onDar={(item) => setPerfil(darItem(perfil, monDandoItem.uid, item))} />}
      {monEditando && (
        <EditorGolpes
          dex={dex}
          m={monEditando}
          onFechar={() => setEditando(null)}
          onSalvar={(golpes) => {
            setPerfil(definirGolpes(dex, perfil, monEditando.uid, golpes));
            setEditando(null);
          }}
        />
      )}
    </>
  );

  return (
    <div className="fadeup mx-auto max-w-[1040px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo={`Jornada Pokémon · ${regiao.nome}`} subtitulo="Cada turno é uma questão. Acertar faz o golpe sair; errar leva contra-ataque." />
      {alternar}

      {/* resumo: treinador, insígnias, números e o time de relance */}
      <div className="card mb-3 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
        <div className="flex min-w-[240px] flex-1 items-center gap-3">
          <button onClick={() => setAba("ajustes")} title="Trocar treinador e ajustes" className="shrink-0 rounded-xl bg-surface2 transition hover:ring-2 hover:ring-brand-500">
            <img src={spriteTreinador(jogador)} alt="" draggable={false} className="h-16 w-16 object-contain [image-rendering:pixelated]" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 font-display text-lg font-bold text-brand-ink">
              {regiao.nome}
              <span className="whitespace-nowrap text-sm font-semibold text-muted">{insignias}/8 insígnias</span>
              {REGIOES.map((x, i) =>
                campeaoDe(perfil, i) > 0 ? (
                  <span key={x.nome} title={`Campeão de ${x.nome}`} className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500">
                    <Crown size={13} /> {x.nome}
                    {campeaoDe(perfil, i) > 1 ? ` ×${campeaoDe(perfil, i)}` : ""}
                  </span>
                ) : null,
              )}
            </p>
            <div className="mt-1 flex gap-0.5">
              {regiao.ginasios.map((g, i) => (
                <img
                  key={g.sprite}
                  ref={(el) => {
                    slotsInsignia.current[i] = el;
                  }}
                  src={insigniaImg(i, r)}
                  alt={g.insignia}
                  title={`${g.insignia} (${g.lider})${i < insignias ? "" : " · ainda não"}`}
                  className={`pk-mini h-6 w-6 object-contain ${voando.encaixou === i ? "pk-ins-encaixa" : ""}`}
                  // a insígnia que está voando só "acende" no lugar quando encaixa
                  style={i < insignias && voando.voando !== i ? undefined : { filter: "grayscale(1) brightness(.6)", opacity: 0.35 }}
                />
              ))}
            </div>
            {voando.voando !== null && <InsigniaVoando src={insigniaImg(voando.voando, r)} alvo={() => slotsInsignia.current[voando.voando!] ?? null} onFim={voando.pousou} />}
          </div>
        </div>
        <div className="flex gap-5 text-center">
          <Numero valor={perfil.vitorias} rotulo="vitórias" />
          <Numero valor={perfil.colecao.length} rotulo="capturados" />
          <Numero valor={perfil.vistos.length} rotulo="vistos" />
        </div>
        <div className="flex w-full items-center gap-1 border-t border-hair pt-3 sm:w-auto sm:border-0 sm:pt-0">
          {time.map((m) => (
            <img key={m.uid} src={spriteEstatico(m.id)} alt={dex.especies[m.id].n} title={`${dex.especies[m.id].n} Nv${nivelDe(m)}`} className="pk-mini h-10 w-10 object-contain" />
          ))}
          <IndicadorSave estado={estadoSave} />
        </div>
      </div>

      {(emAndamento || destino !== null) && (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {emAndamento && (
            <div className="card bt-painel-resultado--acerto flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Partida pausada</p>
                <p className="font-display text-base font-bold text-brand-ink">
                  {NOME_MODO[emAndamento.modo ?? "rota"]} · {emAndamento.vencidos.length}/{emAndamento.treinadores.length} treinadores
                </p>
              </div>
              <button onClick={onRetomar} className="btn-primary shrink-0">
                ▶ Continuar
              </button>
            </div>
          )}
          {destino !== null && (
            <div className="card flex items-center gap-3 border-brand-500 p-4">
              <div className="flex shrink-0 -space-x-3">
                {REGIOES[destino].iniciais.map((i) => (
                  <img key={i} src={spriteFrente(i)} onError={(ev) => (ev.currentTarget.src = spriteEstatico(i))} alt="" className="pk-mini h-11 w-11" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Campeão de {regiao.nome}!</p>
                <p className="text-xs text-muted">{REGIOES[destino].nome} te espera: novo inicial no Nv5, time atual no PC.</p>
              </div>
              <button onClick={onViajar} disabled={!!emAndamento} className="btn-primary shrink-0 disabled:opacity-40">
                <Plane size={16} className="mr-1.5 inline" /> Viajar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Seções do lobby">
        {abas.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={aba === x.id}
            onClick={() => setAba(x.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${aba === x.id ? "border-brand-500 bg-brand-500 text-white" : "border-hair bg-surface text-muted hover:border-brand-500 hover:text-brand-500"}`}
          >
            {x.icone}
            {x.nome}
          </button>
        ))}
      </div>

      {aba === "jornada" && (
        <div className="card p-4 sm:p-5">
          {erro ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">Não consegui carregar a sua fila de revisão.</p>
              <button onClick={onTentar} className="btn-primary text-sm">
                Tentar de novo
              </button>
            </div>
          ) : !pendentes ? (
            <Carregando texto="Montando a rota…" />
          ) : revisoes + completa === 0 ? (
            <p className="text-sm text-muted">Nenhuma questão disponível neste concurso ainda.</p>
          ) : (
            <>
              <div className="grid items-start gap-2 md:grid-cols-2">
                {proximo ? (
                  <Destino
                    titulo={`Ginásio de ${proximo.cidade}`}
                    texto={
                      liberado
                        ? `${proximo.lider} · ${NOME_TIPO[proximo.tipo]} · vale a ${proximo.insignia}${ajud ? ` · ${ajud >= proximo.ajudantes.length ? "só o líder te espera" : `${ajud}/${proximo.ajudantes.length} ajudantes já vencidos`}` : ""}`
                        : `${proximo.lider} aceita o desafio depois de ${exigidos} treinadores no caminho (${historia}/${exigidos})`
                    }
                    imagem={spriteTreinador(proximo.sprite)}
                    selo={insigniaImg(insignias, r)}
                    icone={liberado ? undefined : <Lock size={16} />}
                    destaque={liberado}
                    disabled={!!emAndamento || !liberado}
                    onClick={() => onComecar("ginasio", { ginasio: insignias })}
                  />
                ) : null}
                <Destino
                  titulo={proximo ? `Caminho para ${proximo.cidade}` : "Estrada Vitória"}
                  texto={
                    proximo
                      ? concluido
                        ? `Caminho concluído: você chegou a ${proximo.cidade}. O próximo caminho abre com a ${proximo.insignia}.`
                        : `Vença ${exigidos} treinadores para enfrentar ${proximo.lider} (${historia}/${exigidos}). Selvagens no mato e um Treinador Ás no fim.`
                      : "Treinadores e selvagens rumo à Liga Pokémon, com um Treinador Ás no fim"
                  }
                  imagem={spriteItem("poke-ball")}
                  icone={concluido ? <Lock size={16} /> : <MapaIcone size={16} />}
                  destaque={!!proximo && !liberado}
                  disabled={!!emAndamento || concluido}
                  onClick={() => onComecar("rota", proximo ? { rumo: insignias } : {})}
                />
                <Destino
                  titulo={`Liga Pokémon de ${regiao.nome}`}
                  texto={liga ? `Elite dos 4 (${regiao.elite.map((e) => e.nome).join(", ")}) e o Campeão ${regiao.campeao.nome}` : `Precisa das 8 insígnias (${insignias}/8)`}
                  imagem={spriteTreinador(liga ? regiao.elite[0].sprite : regiao.campeao.sprite)}
                  icone={liga ? <Crown size={16} /> : <Lock size={16} />}
                  destaque={liga}
                  disabled={!!emAndamento || !liga}
                  onClick={() => onComecar("liga")}
                />
                <div className="rounded-2xl border border-hair bg-surface2">
                  <Destino
                    titulo={`Zona Safári · ${REGIOES[habitat].nome}${terrenoSel ? ` · ${terrenoSel.nome}` : ""}`}
                    texto={`${terrenoSel ? `Só ${terrenoSel.tipos.map((t) => NOME_TIPO[t]).join(" e ")}` : "Todos os tipos"} · ${BOLAS_SAFARI} Safari Balls · troca o selvagem até ${MAX_TROCAS}×`}
                    imagem={spriteItem("safari-ball")}
                    icone={<Trees size={16} />}
                    disabled={!!emAndamento}
                    onClick={() => onComecar("safari", { habitat, terreno })}
                  />
                  <div className="flex flex-wrap gap-1 px-2.5 pb-1.5" role="radiogroup" aria-label="Região da Zona Safári">
                    {REGIOES.map((x, i) => (
                      <Pilula key={x.nome} ativa={habitat === i} disabled={i > r} titulo={i > r ? "Chega lá viajando: vire Campeão da região atual" : undefined} onClick={() => setHabitat(i)}>
                        {i > r && <Lock size={10} className="mr-0.5 inline" />}
                        {x.nome}
                      </Pilula>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 px-2.5 pb-2.5" role="radiogroup" aria-label="Terreno da Zona Safári">
                    <Pilula ativa={terreno === -1} onClick={() => setTerreno(-1)}>
                      Todos
                    </Pilula>
                    {TERRENOS.map((x, i) => (
                      <Pilula key={x.nome} ativa={terreno === i} titulo={x.tipos.map((t) => NOME_TIPO[t]).join(", ")} onClick={() => setTerreno(i)}>
                        {x.nome}
                        {x.tipos.map((t) => (
                          <span key={t} className="ml-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: COR_TIPO[t] }} />
                        ))}
                      </Pilula>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-hair bg-surface2 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base font-bold text-brand-ink">{naCidade ? (proximo ? `Cidade de ${proximo.cidade}` : "Platô Indigo") : "Na estrada"}</p>
                  <span className="text-sm font-bold text-brand-ink">Carteira: {dinheiroTxt(dinheiroDe(perfil))}</span>
                </div>
                {naCidade ? (
                  emAndamento ? (
                    <p className="text-xs text-faint">Termine a partida pausada para fazer compras.</p>
                  ) : (
                    <PokeMart dinheiro={dinheiroDe(perfil)} insignias={insignias} mochila={perfil.mochila} onComprar={(item, qtd) => setPerfil(comprarNoPerfil(perfil, item, qtd))} />
                  )
                ) : (
                  <p className="text-xs text-muted">O Poké Mart e o Centro Pokémon ficam na cidade: conclua o caminho até {proximo?.cidade ?? "a próxima cidade"}. Treinadores vencidos pagam em dinheiro, como nos jogos.</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <Chip title="As questões de todo destino">{revisoes > 0 ? `${revisoes} de revisão${completa > 0 ? " + novas" : ""}` : "novas das matérias em que você mais erra"}</Chip>
                <Chip title="Nível médio do time">time Nv{nivelMedio(time)}</Chip>
                <Chip title={cap < 100 ? (proximo ? `o nível do ás de ${proximo.lider}; acima dele o XP não entra` : `o nível do Campeão ${regiao.campeao.nome}`) : "você já é o Campeão daqui"}>
                  {cap < 100 ? `level cap Nv${cap}` : "sem level cap"}
                </Chip>
                <Chip title="Treinadores dão o dobro do XP de selvagens">treinador = 2× XP</Chip>
              </div>
            </>
          )}
        </div>
      )}

      {aba === "time" && (
        <div className="space-y-3">
          {editores}
          <div className="card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-brand-ink">
                Seu time ({time.length}/{MAX_TIME})
              </p>
              <p className="text-xs text-faint">{podeMexer ? "toque para mandar ao PC" : "termine a partida para mexer no time"}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {time.map((m) => (
                <div key={m.uid} className="flex flex-col gap-1">
                  <MonCard dex={dex} m={m} marcado onClick={() => alternarTime(m.uid)} rodape={<Evolui dex={dex} m={m} ate={limiteDaRegiao(r)} />} />
                  {botaoGolpes(m)}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-brand-ink">PC ({pc.length})</p>
              <p className="text-xs text-faint">
                {campeaoDe(perfil) > 0 || r === 0 ? "toque para levar ao time" : `só luta aqui quem veio de ${regiao.nome}; os outros voltam quando você for Campeão`}
              </p>
            </div>
            {pc.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {pc.map((m) => (
                  <div key={m.uid} className={`flex flex-col gap-1 ${podeLutar(perfil, m) ? "" : "opacity-45"}`}>
                    <MonCard
                      dex={dex}
                      m={m}
                      onClick={() => alternarTime(m.uid)}
                      rodape={
                        <span className="text-[10px] text-faint">
                          {podeLutar(perfil, m) ? (
                            m.questaoId ? (
                              `questão #${m.questaoId}`
                            ) : (
                              ""
                            )
                          ) : (
                            <>
                              <Lock size={9} className="inline" /> de {regiaoDe(m.regiao).nome}
                            </>
                          )}
                        </span>
                      }
                    />
                    {botaoGolpes(m)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Vazio. Vá à Zona Safári (ou ache selvagens no caminho): acerte a questão e lance uma bola.</p>
            )}
          </div>
        </div>
      )}

      {aba === "mochila" && (
        <div className="card p-4 sm:p-5">
          {mochila.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
              {mochila.map(([i, q]) => (
                <div key={i} title={ITENS[i]?.texto} className="flex items-center gap-2 rounded-xl border border-hair bg-surface2 px-2 py-1.5 text-sm">
                  <img src={spriteItem(i)} alt="" className="pk-mini h-7 w-7 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-brand-ink">{nomeItem(i)}</span>
                  <span className="text-xs font-bold text-muted">×{q}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Vazia. Vencer treinadores rende itens.</p>
          )}
          {(perfil.mochila["exp-all"] ?? 0) > 0 && (
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-hair bg-surface2 px-3 py-2 text-sm">
              <span>
                <b className="text-brand-ink">Exp. All</b> <span className="text-xs text-muted">· o time todo ganha metade do XP</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--brand-500))]"
                checked={expAllLigado(perfil)}
                disabled={!podeMexer}
                onChange={(ev) => setPerfil({ ...perfil, expAllDesligado: !ev.target.checked })}
              />
            </label>
          )}
          {temSeguravel && <p className="mt-2 text-[11px] text-faint">Itens de segurar e frutas: na aba "Time e PC", toque em "Item" embaixo de um Pokémon.</p>}
        </div>
      )}

      {aba === "ajustes" && (
        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className="card p-4 sm:p-5">
            <EscolherJogador atual={jogador} onEscolher={onJogador} aberto />
          </div>
          <div className="card space-y-2 self-start p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Recomeçar do zero</p>
            <p className="text-xs text-muted">
              Apaga todos os seus Pokémon, insígnias, títulos e a mochila (em todos os aparelhos). Você escolhe um inicial de novo. As respostas já dadas continuam valendo no estudo.
            </p>
            {confirmarReset ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Apagar tudo mesmo?</span>
                <button onClick={onRecomecar} disabled={!!emAndamento} className="font-bold text-danger-from disabled:opacity-40">
                  Sim, recomeçar
                </button>
                <button onClick={() => setConfirmarReset(false)} className="font-semibold text-muted">
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmarReset(true)}
                disabled={!!emAndamento}
                className="rounded-xl border border-hair px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-danger-from hover:text-danger-from disabled:opacity-40"
              >
                <RotateCcw size={14} className="mr-1.5 inline" /> Recomeçar jornada
              </button>
            )}
            {emAndamento && <p className="text-[11px] text-faint">Termine ou abandone a partida pausada antes.</p>}
          </div>
        </div>
      )}

      {aba === "ajuda" && (
        <div className="card space-y-2.5 p-4 text-sm text-muted sm:p-5">
          <p>
            <b className="text-brand-ink">Escolha a alternativa e o golpe.</b> Acertou, o golpe sai e tira HP: tipo conta (fogo em planta é super efetivo), um Pokémon aguenta uns 2 acertos. Golpes de
            status envenenam, queimam, paralisam ou fazem dormir, e Pokémon dormindo não contra-ataca. Marcar "tenho certeza" vira crítico, mas o erro dói 1,5×: treina saber o que você sabe.
          </p>
          <p>
            <b className="text-brand-ink">Errou? Contra-ataque</b> (com veneno, sono, paralisia...). Acertou e o inimigo aguentou? Ele revida, mais fraco. A questão volta logo depois, com as
            alternativas em outra ordem (no caminho e na Safári, como selvagem: acerte e lance uma bola para capturar; HP baixo ajuda). Escrever por que o gabarito está certo cura 25% do HP.
          </p>
          <p>
            <b className="text-brand-ink">Turnos como nos jogos:</b> usar item ou trocar de Pokémon no meio da luta gasta a vez, e o inimigo ataca. Entre uma batalha e outra há uma parada para organizar
            o time e usar itens de graça. No caminho aparecem <b className="text-brand-ink">batalhas duplas</b>: dois Pokémon de cada lado, uma questão por turno; acertou, os seus dois atacam
            (cada um escolhe golpe e alvo); errou, os dois inimigos atacam.
          </p>
          <p>
            <b className="text-brand-ink">Dinheiro e cidade:</b> treinador vencido paga (valor da classe × nível do último Pokémon dele). Concluído o caminho, ele fecha e você chega à cidade do
            ginásio: Poké Mart e Centro Pokémon. Antes do líder, o time é curado; ajudantes do ginásio já vencidos não lutam de novo.
          </p>
          <p>
            <b className="text-brand-ink">XP como nos jogos:</b> a fórmula da 5ª geração, com o XP base e a curva de crescimento de cada espécie (tem Pokémon que sobe devagar). Quem lutou leva o XP; o{" "}
            <b className="text-brand-ink">Exp. Share</b> (prêmio do 3º ginásio) dá metade a quem o segura, e o <b className="text-brand-ink">Exp. All</b> (6º ginásio) dá metade ao time todo. O level
            cap vale para todos.
          </p>
          <p>
            <b className="text-brand-ink">Itens e frutas:</b> vencer treinadores rende itens (os melhores aparecem com mais insígnias). No lobby, o botão "Item" dá um para o Pokémon segurar: reforço
            de tipo, Restos, Faixa do Foco, Ovo da Sorte... Frutas são comidas sozinhas na hora certa (HP baixo, veneno, sono).
          </p>
          <p>
            <b className="text-brand-ink">Evolução</b> por nível como nos jogos, por pedra na mochila, e as de troca ou amizade no nível {NIVEL_TROCA_AMIZADE}. Com 4 golpes, você escolhe qual esquecer
            para aprender o novo; no botão "Golpes" dá para trocar por qualquer golpe que ele já aprendeu.
          </p>
          <p>
            <b className="text-brand-ink">Jornada:</b> 5 regiões (Kanto, Johto, Hoenn, Sinnoh, Unova). Em cada uma, 8 ginásios em ordem (cada líder vale uma insígnia), depois a Liga: Elite dos 4 e o
            Campeão. Sendo Campeão, você viaja para a próxima região e escolhe um inicial de lá; o time antigo fica no PC. Na Zona Safári você escolhe a região e só aparecem selvagens; antes de
            responder, dá para trocar o selvagem por outro até {MAX_TROCAS} vezes (a questão é a mesma). Cada treinador vencido dá um item.
          </p>
          <p className="text-faint">Cada resposta conta na meta do dia, na ofensiva e reagenda a revisão espaçada.</p>
        </div>
      )}
    </div>
  );
}

type AbaLobby = "jornada" | "time" | "mochila" | "ajustes" | "ajuda";

// Onde está o jogo: no servidor. Mostra quando ainda falta gravar.
function IndicadorSave({ estado }: { estado: EstadoSave }) {
  const txt = estado === "salvo" ? "salvo" : estado === "salvando" ? "salvando…" : "sem conexão, tentando de novo";
  return (
    <span className={`ml-auto inline-flex items-center gap-1 pl-2 text-[11px] ${estado === "erro" ? "text-danger-from" : "text-faint"}`} title="O jogo fica salvo na sua conta">
      {estado === "salvando" ? <CloudUpload size={13} /> : estado === "erro" ? <CloudOff size={13} /> : <Cloud size={13} />} {txt}
    </span>
  );
}

function Pilula({ children, ativa, disabled, titulo, onClick }: { children: ReactNode; ativa: boolean; disabled?: boolean; titulo?: string; onClick: () => void }) {
  return (
    <button
      role="radio"
      aria-checked={ativa}
      disabled={disabled}
      title={titulo}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${ativa ? "border-brand-500 bg-brand-500 text-white" : "border-hair text-muted hover:border-brand-500"}`}
    >
      {children}
    </button>
  );
}

function Destino({
  titulo,
  texto,
  imagem,
  selo,
  icone,
  destaque,
  disabled,
  onClick,
}: {
  titulo: string;
  texto: string;
  imagem: string;
  selo?: string;
  icone?: ReactNode;
  destaque?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-45 ${destaque ? "border-brand-500 bg-surface" : "border-hair bg-surface2"}`}
    >
      <img src={imagem} alt="" className="pk-mini h-12 w-12 shrink-0 object-contain" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-display text-base font-bold text-brand-ink">
          {icone}
          {titulo}
        </span>
        <span className="block text-xs leading-snug text-muted">{texto}</span>
      </span>
      {selo && <img src={selo} alt="" className="pk-mini h-8 w-8 shrink-0 object-contain" />}
    </button>
  );
}

function Evolui({ dex, m, ate }: { dex: Dex; m: Mon; ate: number }) {
  const evo = dex.especies[m.id].e?.find(([para]) => para <= ate || para > ULTIMO_DA_JORNADA);
  if (!evo) return null;
  const [, tipo, valor] = evo;
  const txt = tipo === "l" ? `evolui no Nv${valor}` : tipo === "i" ? `evolui com ${nomeItem(String(valor))}` : `evolui no Nv${NIVEL_TROCA_AMIZADE}`;
  return <span className="mt-1 text-[10px] leading-tight text-faint">{txt}</span>;
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <p className="font-display text-xl font-bold text-brand-ink">{valor}</p>
      <p className="text-[10px] uppercase tracking-wider text-faint">{rotulo}</p>
    </div>
  );
}

// ---------- fim ----------

function Fim({
  dex,
  partida,
  perfil,
  activeId,
  onNova,
  onViajar,
}: {
  dex: Dex;
  partida: PartidaPoke;
  perfil: PerfilPoke;
  activeId: string | null;
  onNova: () => void;
  onViajar: () => void;
}) {
  const regiao = regiaoDe(partida.regiao);
  const destino = proximaRegiao(perfil);
  const r = resumir(partida);
  const [salvando, setSalvando] = useState<"nao" | "salvando" | "salvo" | "erro">("nao");
  const licoes = Object.entries(partida.licoes);
  const titulo = partida.fim === "vitoria" ? "Vitória!" : partida.fim === "derrota" ? "Seu time desmaiou" : partida.modo === "rota" || !partida.modo ? "Você saiu do caminho" : "Você fugiu";
  const capturados = [...partida.time, ...partida.novos].filter((m) => m.capturadoEm === partida.iniciadaEm);
  const ganhouInsignia = partida.fim === "vitoria" && partida.modo === "ginasio" && partida.ginasio !== undefined ? partida.ginasio : null;
  const campeao = partida.fim === "vitoria" && partida.modo === "liga";
  useEffect(() => {
    if (ganhouInsignia === null) return;
    try {
      localStorage.setItem(chaveInsigniaVoar(partida.regiao ?? 0), String(ganhouInsignia));
    } catch {
      /* sem armazenamento: sem animação */
    }
  }, [ganhouInsignia, partida.regiao]);

  async function salvar() {
    if (!activeId || !licoes.length) return;
    setSalvando("salvando");
    try {
      await salvarLicoesNoCaderno(activeId, licoes);
      setSalvando("salvo");
    } catch {
      setSalvando("erro");
    }
  }

  return (
    <div className="fadeup mx-auto max-w-[760px] space-y-4 pt-4 pb-24">
      <div className="card p-6 text-center">
        <div className="flex flex-wrap items-end justify-center gap-1">
          {partida.time.map((l) => (
            <img key={l.uid} src={spriteFrente(l.id)} alt="" className="pk-mini h-16 w-16" style={l.hp <= 0 ? { filter: "grayscale(1)", opacity: 0.5 } : undefined} />
          ))}
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-brand-ink">{campeao ? `Campeão de ${regiao.nome}!` : titulo}</p>
        {ganhouInsignia !== null && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <img src={insigniaImg(ganhouInsignia, partida.regiao ?? 0)} alt="" className="pk-mini h-16 w-16 object-contain" />
            <p className="font-bold text-brand-ink">{regiao.ginasios[ganhouInsignia].insignia}</p>
            {!!partida.premios?.length && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {partida.premios.map((i) => (
                  <span key={i} className="pk-premio inline-flex items-center gap-1 rounded-full border border-brand-500 bg-surface px-2 py-0.5 text-xs font-bold text-brand-ink">
                    <img src={spriteItem(i)} alt="" className="pk-mini h-5 w-5" /> {nomeItem(i)}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">
              {ganhouInsignia + 1 < regiao.ginasios.length
                ? `Próximo: Ginásio de ${regiao.ginasios[ganhouInsignia + 1].cidade} (${regiao.ginasios[ganhouInsignia + 1].lider}).`
                : `8 insígnias! A Liga Pokémon de ${regiao.nome} está aberta.`}
            </p>
          </div>
        )}
        {campeao && <p className="mt-2 text-sm text-muted">Seu time entrou para o Hall da Fama.</p>}
        {campeao && destino !== null && (
          <button onClick={onViajar} className="btn-primary mt-3">
            <Plane size={16} className="mr-2 inline" /> Viajar para {REGIOES[destino].nome}
          </button>
        )}
        <p className="mt-1 text-muted">
          {partida.vencidos.length}/{partida.treinadores.length} treinadores · {r.acertos}/{r.respondidas} acertos · +{partida.xp} XP
        </p>
        <p className="mt-1 text-xs text-faint">
          {r.respondidas} respostas contaram na meta do dia e na ofensiva. Insígnias de {regiaoDe(perfil.regiao).nome}: {insigniasDe(perfil)}/8.
        </p>
        {(partida.modo ?? "rota") === "rota" && regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)] && (
          <p className="mt-1 text-sm font-semibold text-brand-ink">
            {liderLiberado(perfil)
              ? `Você chegou a ${regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)].cidade}! ${regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)].lider} aceita o seu desafio, e o Poké Mart da cidade está aberto.`
              : `Caminho para ${regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)].cidade}: ${historiaDe(perfil)}/${treinadoresParaGinasio(insigniasDe(perfil))} treinadores vencidos.`}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Capturas</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-ink">{capturados.length}</p>
          <p className="text-xs text-muted">{capturados.length ? capturados.map((m) => dex.especies[m.id].n).join(", ") : "questões que já tinham te derrubado"}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Revanches</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-ink">{r.recuperadas}</p>
          <p className="text-xs text-muted">erradas aqui e acertadas na volta</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Voltam amanhã</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand-ink">{r.erradas.length}</p>
          <p className="text-xs text-muted">a revisão espaçada já agendou</p>
        </div>
      </div>

      <div className="card space-y-2 p-5">
        <p className="font-display text-base font-bold text-brand-ink">Calibragem da certeza</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p className="text-muted">
            Com certeza: <b className="text-brand-ink">{r.certeza.acertos}/{r.certeza.total}</b>
          </p>
          <p className="text-muted">
            Na dúvida: <b className="text-brand-ink">{r.duvida.acertos}/{r.duvida.total}</b>
          </p>
        </div>
        <p className="text-sm text-muted">{textoCalibragem(r, "o \"Tenho certeza\"")}</p>
      </div>

      {licoes.length > 0 && (
        <div className="card space-y-3 p-5">
          <p className="font-display text-base font-bold text-brand-ink">Suas lições ({licoes.length})</p>
          <ul className="space-y-2 text-sm">
            {licoes.map(([id, t]) => (
              <li key={id} className="rounded-xl border border-hair bg-surface2 p-3 text-brand-ink">
                <b>#{id}</b> · {t}
              </li>
            ))}
          </ul>
          <button
            onClick={() => void salvar()}
            disabled={salvando === "salvando" || salvando === "salvo" || !activeId}
            className="inline-flex items-center gap-2 rounded-xl border border-hair px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-500 disabled:opacity-50"
          >
            <NotebookPen size={15} />
            {salvando === "salvo" ? "Salvas no Caderno" : salvando === "salvando" ? "Salvando…" : salvando === "erro" ? "Falhou, tentar de novo" : "Salvar lições no Caderno"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={onNova} className="btn-primary flex-1">
          <MapaIcone size={16} className="mr-2 inline" /> Continuar jornada
        </button>
        <Link to="/revisar" className="flex-1 rounded-2xl border border-hair px-5 py-3 text-center font-display font-bold text-muted transition hover:text-brand-500">
          Ver a revisão espaçada
        </Link>
      </div>
    </div>
  );
}

