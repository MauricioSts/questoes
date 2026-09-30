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
import { Backpack, Crown, Flag, Flame, Lock, Map as MapaIcone, NotebookPen, Pause, Plane, RotateCcw, Shuffle, Swords, Trees, Trophy, Users, X } from "lucide-react";
import type { Alternativa } from "../types/questao";
import { getQuestao } from "../lib/questoesRepo";
import { carregarFilaBatalha, novasPorFraqueza, type HistoricoQ } from "../lib/filaBatalha";
import { ITENS, REVIVER, categoriaDe, nomeItem, seguravel, type CategoriaItem } from "../lib/poke/itens";
import { api } from "../lib/api";
import { enviarResposta } from "../lib/answers";
import { montarResultado } from "../lib/correcao";
import { salvarLicoesNoCaderno, textoCalibragem } from "../lib/licoes";
import { resumir, type Candidata, type Confianca } from "../lib/batalha";
import { tipoDaMateria } from "../components/batalha/tipos";
import {
  COR_TIPO,
  INICIAIS_POR_REGIAO,
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
import { Arena, TipoChip, type BolaVis, type FxVis, type ItemVis, type LadoVis, type LancaVis, type TextoVis } from "../components/poke/Arena";
import { CHEGADA, efeitoDoGolpe, efeitoDoStatus } from "../components/poke/fx";

// ---------- persistência ----------

const CHAVE_PARTIDA = "q_poke_partida";
const CHAVE_PERFIL = "q_poke_perfil";
const CHAVE_JOGADOR = "q_poke_jogador"; // sprite do jogador; fora do perfil para sobreviver ao recomeço

function ler<T>(chave: string): T | null {
  try {
    const s = localStorage.getItem(chave);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: vale só enquanto a aba estiver aberta */
  }
}

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

type Fase = "lobby" | "entrada" | "pergunta" | "golpe" | "resultado" | "troca" | "recompensa" | "fim";

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
  useEffect(() => {
    carregarDex()
      .then(setDex)
      .catch(() => setErroDex(true));
  }, []);
  if (erroDex) return <p className="p-6 text-sm text-muted">Não consegui carregar a Pokédex. Recarregue a página.</p>;
  if (!dex) return <Carregando texto="Abrindo a Pokédex…" />;
  return <Jogo dex={dex} alternar={alternar} />;
}

function Jogo({ dex, alternar }: { dex: Dex; alternar?: ReactNode }) {
  usePausarFundo();
  const { activeId } = useConcurso();
  const { goal } = useMeta();

  const { usuario } = useAuth();

  const [perfil, setPerfilEstado] = useState<PerfilPoke | null>(() => {
    const p = ler<PerfilPoke>(CHAVE_PERFIL);
    if (!p || p.versao !== 1 || !p.colecao.length) return null;
    // Reset feito pelo servidor: perfil deste aparelho anterior a ele recomeça do zero.
    const reset = usuario?.pokeResetAt;
    if (reset && (!p.criadoEm || p.criadoEm < reset)) {
      gravar(CHAVE_PERFIL, null);
      gravar(CHAVE_PARTIDA, null);
      return null;
    }
    return p;
  });
  const setPerfil = useCallback((p: PerfilPoke) => {
    setPerfilEstado(p);
    gravar(CHAVE_PERFIL, p);
  }, []);
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  const [partida, setPartidaEstado] = useState<PartidaPoke | null>(() => {
    const p = ler<PartidaPoke>(CHAVE_PARTIDA);
    return p && p.versao === 3 && p.concursoId === (activeId ?? null) ? p : null;
  });
  // Toda mudança da partida vai para o perfil na hora (níveis, capturas, mochila): fechar a
  // aba no meio não perde o que o time conquistou.
  const setPartida = useCallback(
    (p: PartidaPoke | null) => {
      setPartidaEstado(p);
      gravar(CHAVE_PARTIDA, p);
      if (p && perfilRef.current) setPerfil(sincronizarPerfil(perfilRef.current, p));
    },
    [setPerfil]
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
  const [desfecho, setDesfecho] = useState<Desfecho | null>(null);
  const [licao, setLicao] = useState("");
  const [confirmarFuga, setConfirmarFuga] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [meuVis, setMeuVis] = useState<LadoVis | null>(null);
  const [inimigoVis, setInimigoVis] = useState<LadoVis | null>(null);
  const [treinadorVis, setTreinadorVis] = useState<{ sprite: string; chave: number; sai: boolean } | null>(null);
  const [fx, setFx] = useState<FxVis | null>(null);
  const [textos, setTextos] = useState<TextoVis[]>([]);
  const [bolaVis, setBolaVis] = useState<BolaVis | null>(null);
  const [jogador, setJogadorEstado] = useState(() => {
    const j = ler<string>(CHAVE_JOGADOR);
    return TREINADORES_JOGADOR.some((t) => t.sprite === j) ? j! : TREINADORES_JOGADOR[0].sprite;
  });
  const setJogador = (j: string) => {
    setJogadorEstado(j);
    gravar(CHAVE_JOGADOR, j);
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
        xp: prox > base ? (l.xp - base) / (prox - base) : 1,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dex]
  );
  const visDoEncontro = (e: Encontro, anim: LadoVis["anim"] = "", capturavel = false): LadoVis => {
    const max = atributos(dex.especies[e.especie], e.nivel).hp;
    return { id: e.especie, nome: nomeDe(e.especie), nivel: e.nivel, hp: e.hp, hpMax: max, status: e.status, semente: e.semente, anim, chave: n(), selvagem: e.tipo === "selvagem", capturavel };
  };
  // Pokébola voando até o lado e abrindo; o Pokémon sai dela (anim "saiBola").
  // O jogador entra, arremessa e sai (a animação dura 1,1s).
  const mostrarJogador = () => {
    const k = n();
    setJogadorVis({ sprite: jogador, chave: k });
    setTimeout(() => setJogadorVis((v) => (v?.chave === k ? null : v)), 1150);
  };
  const lancar = (lado: "meu" | "inimigo") => {
    const k = n();
    if (lado === "meu") mostrarJogador();
    setLancamentos((xs) => [...xs.slice(-1), { n: k, lado, bola: "poke-ball", mao: lado === "meu" }]);
    setTimeout(() => setLancamentos((xs) => xs.filter((x) => x.n !== k)), 1100);
  };
  const golpeFx = (de: "meu" | "inimigo", g: number, forte = false) => {
    const m = dex.golpes[g] ?? dex.golpes[0];
    const efeito = efeitoDoGolpe(m, COR_TIPO[m[1]] ?? "#fff");
    const alvo = efeito.estilo === "cura" ? de : de === "meu" ? "inimigo" : "meu";
    setFx({ n: n(), de, alvo, efeito, forte });
    return CHEGADA[efeito.estilo];
  };
  const anim = (lado: "meu" | "inimigo", a: LadoVis["anim"], extra: Partial<LadoVis> = {}) => {
    const set = lado === "meu" ? setMeuVis : setInimigoVis;
    set((v) => (v ? { ...v, ...extra, anim: a, chave: n() } : v));
  };
  const [itemVis, setItemVis] = useState<ItemVis | null>(null);
  const mostrarItem = (item: string, grande = false) => {
    const k = n();
    setItemVis({ n: k, item, grande });
    setTimeout(() => setItemVis((v) => (v?.n === k ? null : v)), grande ? 2600 : 1300);
  };
  const texto = (lado: "meu" | "inimigo", t: string, cor: string) => {
    const k = n();
    setTextos((xs) => [...xs.slice(-3), { n: k, lado, texto: t, cor }]);
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
    const p = montarPartidaPoke({ dex, time, mochila: perfil.mochila, pendentes, novas, concursoId: activeId ?? null, modo, regiao: regiaoAtual(perfil), cap: levelCap(perfil), insignias: insigniasDe(perfil), expAll: expAllLigado(perfil), possui: itensPossuidos(perfil), tem: [...new Set(perfil.colecao.map((m) => m.id))], ...opts });
    if (!p) return;
    setPartida(p);
    entrarNaLuta(p);
  }

  function entrarNaLuta(p: PartidaPoke) {
    setMeuVis(null);
    setInimigoVis(null);
    setTreinadorVis(null);
    ultimoTreinador.current = null;
    setFase(p.fim ? "fim" : p.oferta ? "recompensa" : precisaTrocar(p) ? "troca" : "entrada");
    if (p.oferta || precisaTrocar(p)) setMeuVis(visDoLutador(p.time[p.ativo]));
  }

  // ----- entrada de cada encontro -----
  const encontro = partida?.atual ?? null;
  const questao = encontro ? getQuestao(encontro.questaoId) : undefined;
  const corBioma = questao ? tipoDaMateria(questao.materia).cor : "#7AC74C";
  // Cenário: tipo do ginásio / do membro da Elite / do terreno da Safári; na Rota, o do inimigo.
  const fundo = useMemo(() => {
    if (!partida) return cenario(null);
    const reg = regiaoDe(partida.regiao);
    if (partida.modo === "ginasio" && partida.ginasio !== undefined) return cenario(reg.ginasios[partida.ginasio]?.tipo ?? null);
    if (partida.modo === "safari") return cenario(TERRENOS[partida.terreno ?? -1]?.tipos[0] ?? null);
    const t = encontro && encontro.treinador >= 0 ? partida.treinadores[encontro.treinador] : null;
    if (partida.modo === "liga") return cenario(t?.campeao ? "campeao" : (reg.elite.find((m) => m.nome === t?.nome)?.tipo ?? "campeao"));
    return cenario(encontro ? (dex.especies[encontro.especie]?.t[0] ?? null) : null);
  }, [partida, encontro, dex]);

  useEffect(() => {
    if (fase !== "entrada" || !partida || !encontro) return;
    if (!questao) {
      // questão sumiu do acervo: pula sem gravar nada
      setPartida(avancarPoke({ ...partida, atual: null }, dex));
      return;
    }
    setLancamentos([]);
    setSelecionada(undefined);
    setDesfecho(null);
    setLicao("");
    setConfirmarFuga(false);
    setPainel(null);
    setTextos([]);
    setBolaVis(null);
    setFx(null);
    let cancelado = false;
    const eu = partida.time[partida.ativo];
    const t = encontro.treinador >= 0 ? partida.treinadores[encontro.treinador] : null;
    const capturavel = encontro.tipo === "selvagem";
    void (async () => {
      const passo = async (ms: number) => {
        await esperar(ms);
        return !cancelado && vivo.current;
      };
      if (!meuVis) {
        setMensagem(`Vai, ${nomeDe(eu.id)}!`);
        lancar("meu");
        setMeuVis(visDoLutador(eu, "saiBola"));
        if (!(await passo(1000))) return;
      }
      setInimigoVis(null);
      if (t && ultimoTreinador.current !== encontro.treinador) {
        setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false });
        setMensagem(t.fala ? (t.lider ? `${t.fala} O ás dele é a questão que mais te derrubou.` : t.fala) : t.lider ? `${t.nome} te desafia! É a questão que mais te derrubou.` : `${t.nome} quer batalhar!`);
        if (!(await passo(t.fala ? 2600 : 1500))) return;
        setTreinadorVis((v) => (v ? { ...v, sai: true } : v));
        if (!(await passo(350))) return;
        setTreinadorVis(null);
        setMensagem(`${t.nome} enviou ${nomeDe(encontro.especie)}!`);
        lancar("inimigo");
      } else if (t) {
        setTreinadorVis(null);
        setMensagem(`${t.nome} enviou ${nomeDe(encontro.especie)}!`);
        lancar("inimigo");
      } else {
        setTreinadorVis(null);
        setMensagem(
          encontro.retorno
            ? `Um ${nomeDe(encontro.especie)} selvagem apareceu: é a revanche da questão #${encontro.questaoId}!`
            : partida.modo === "safari" || partida.modo === "rota"
              ? `Um ${nomeDe(encontro.especie)} selvagem apareceu! Acerte e lance uma bola para capturar.`
              : `Um ${nomeDe(encontro.especie)} selvagem apareceu!`
        );
      }
      setInimigoVis(visDoEncontro(encontro, t ? "saiBola" : "surge", capturavel));
      ultimoTreinador.current = encontro.treinador;
      if (!(await passo(t ? 1400 : 1100))) return;
      setMensagem(`O que ${nomeDe(eu.id)} vai fazer?`);
      setFase("pergunta");
      inicioQuestao.current = Date.now();
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, encontro?.chave]);

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
    let idVis = antes.time[antes.ativo]?.id;
    const nomeMeu = () => nomeDe(idVis ?? 0);
    const nomeIni = antes.atual ? nomeDe(antes.atual.especie) : "";
    let hpMeu = antes.time[antes.ativo]?.hp ?? 0;
    const uidAtivo = antes.time[antes.ativo]?.uid;
    const ehAtivo = (uid: string) => uid === uidAtivo;
    const nomeUid = (uid: string) => (ehAtivo(uid) ? nomeMeu() : nomeDe(doMeu(uid)?.id ?? 0));
    const evos: { de: number; para: number; uid: string }[] = [];
    let mostrouShare = false;
    for (const ev of eventos) {
      if (!ok()) return;
      switch (ev.tipo) {
        case "impedido":
          setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status || "paralysis"][1]}! O golpe sai pela metade.`);
          anim("meu", "status");
          await esperar(1000);
          break;
        case "acordou":
          if (ev.status) setMensagem(`${nomeDe(doMeu(ev.uid)?.id ?? 0)} ${TXT_STATUS[ev.status][2]}!`);
          setMeuVis((v) => (v ? { ...v, status: "" } : v));
          await esperar(800);
          break;
        case "ataque": {
          const g = dex.golpes[ev.golpe];
          setMensagem(`${nomeMeu()} usou ${g?.[0] ?? "Tackle"}!`);
          const efeito = g ? efeitoDoGolpe(g, "") : null;
          if (efeito && efeito.estilo !== "cura" && efeito.estilo !== "aura") anim("meu", "ataca");
          await esperar(efeito?.estilo === "contato" || efeito?.estilo === "mordida" ? 160 : 60);
          // golpe de status com condição: a aura aparece no evento statusInimigo
          if (efeito?.estilo !== "aura") await esperar(golpeFx("meu", ev.golpe, ev.critico && ev.dano > 0));
          if (ev.dano > 0) {
            anim("inimigo", "dano", { hp: ev.hpInimigo });
            texto("inimigo", ev.critico ? `CRÍTICO −${ev.dano}` : `−${ev.dano}`, ev.critico ? "#FFC857" : "#FF5A5F");
            await esperar(750);
            if (ev.semEfeito) setMensagem(`Não afeta ${nomeIni}... mas a resposta certa arranhou.`);
            else if (ev.efetividade >= 2) setMensagem("É super efetivo!");
            else if (ev.efetividade < 1) setMensagem("Não é muito efetivo...");
            else if (ev.critico) setMensagem("Um golpe crítico!");
            if (ev.semEfeito || ev.efetividade !== 1 || ev.critico) await esperar(1000);
          } else await esperar(500);
          break;
        }
        case "statusInimigo":
          setFx({ n: n(), de: "meu", alvo: "inimigo", efeito: efeitoDoStatus(ev.status) });
          anim("inimigo", "status", ev.status === "leech-seed" ? { semente: true } : { status: ev.status });
          setMensagem(`${nomeIni} ${TXT_STATUS_INIMIGO[ev.status]}!`);
          await esperar(1200);
          break;
        case "statusFalhou":
          setMensagem(ev.motivo === "imune" ? `Não afeta ${nomeIni}!` : `${nomeIni} já está ${ev.status === "leech-seed" ? "com Leech Seed" : "com um status"}. Não teve efeito.`);
          await esperar(1100);
          break;
        case "tiqueInimigo":
          setFx({ n: n(), de: "inimigo", alvo: "inimigo", efeito: efeitoDoStatus(ev.status, "tique") });
          await esperar(300);
          anim("inimigo", "dano", { hp: ev.hpInimigo });
          texto("inimigo", `−${ev.dano}`, "#C77DFF");
          setMensagem(ev.status === "leech-seed" ? `Leech Seed drena ${nomeIni}! −${ev.dano} HP` : `${nomeIni} ${TXT_TIQUE[ev.status] ?? "perdeu HP"}! −${ev.dano} HP`);
          await esperar(1000);
          break;
        case "inimigoAcordou":
          setInimigoVis((v) => (v ? { ...v, status: "" } : v));
          setMensagem(`${nomeIni} ${TXT_STATUS[ev.status || "sleep"][2]}!`);
          await esperar(900);
          break;
        case "inimigoImpedido":
          anim("inimigo", "status");
          setMensagem(`${nomeIni} ${TXT_STATUS[ev.status || "paralysis"][1]} e não conseguiu contra-atacar!`);
          await esperar(1200);
          break;
        case "exausto":
          setMensagem(`${nomeIni} não aguenta mais: a resposta certa decidiu a luta!`);
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
            setMensagem(`Pegou! ${nomeIni} foi capturado!${ev.paraPc ? " O time está cheio: ele foi para o PC." : ""}`);
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
          anim("inimigo", "desmaia", { hp: 0 });
          setMensagem(`${nomeIni} desmaiou!`);
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
          setMensagem(`${nomeMeu()} ganhou ${ev.valor} pontos de XP!`);
          texto("meu", `+${ev.valor} XP`, "#8EC5FF");
          if (l) setMeuVis(visDoLutador({ ...l, hp: hpMeu }, "", idVis));
          await esperar(1000);
          break;
        }
        case "cap":
          if (!ehAtivo(ev.uid)) break;
          setMensagem(`${nomeMeu()} está no level cap (Nv${ev.nivel}): o XP volta a entrar depois do próximo líder.`);
          texto("meu", `Nv${ev.nivel} máx.`, "#FFE066");
          await esperar(1300);
          break;
        case "nivel":
          setMensagem(`${nomeUid(ev.uid)} subiu para o nível ${ev.nivel}!`);
          if (ehAtivo(ev.uid)) texto("meu", `Nv ${ev.nivel}!`, "#FFE066");
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
          mostrarItem(ev.item);
          if (ev.efeito === "cura" || ev.efeito === "recuo") {
            const delta = ev.efeito === "cura" ? (ev.valor ?? 0) : -(ev.valor ?? 0);
            hpMeu = Math.max(0, hpMeu + delta);
            if (ev.efeito === "cura") setMeuVis((v) => (v ? { ...v, hp: Math.min(v.hpMax, v.hp + delta) } : v));
            else anim("meu", "dano", { hp: hpMeu });
            texto("meu", `${delta > 0 ? "+" : "−"}${Math.abs(delta)} HP`, delta > 0 ? "#3BC46B" : "#FF5A5F");
          }
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
                      ? `O ${nomeIt} ofuscou ${nomeIni}: o golpe errou!`
                      : ev.efeito === "recuou"
                        ? `${nomeIni} recuou com a ${nomeIt} e não revidou!`
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
          hpMeu = Math.min(hpMeu + ev.valor, 9999);
          setMeuVis((v) => (v ? { ...v, hp: Math.min(v.hpMax, v.hp + ev.valor) } : v));
          texto("meu", `+${ev.valor} HP`, "#3BC46B");
          setMensagem(
            ev.motivo === "dreno"
              ? `${nomeMeu()} drenou a energia de ${nomeIni}! +${ev.valor} HP`
              : ev.motivo === "semente"
                ? `${nomeMeu()} recuperou ${ev.valor} HP com a semente.`
                : ev.motivo === "combo"
                  ? `Combo de ${depois.combo} acertos! +${ev.valor} HP`
                  : `${nomeMeu()} recuperou ${ev.valor} HP!`
          );
          await esperar(900);
          break;
        }
        case "foco":
          setMensagem(`${nomeMeu()} ficou em guarda! O próximo contra-ataque vai doer pela metade.`);
          anim("meu", "status");
          await esperar(1100);
          break;
        case "errou":
          setMensagem(
            golpeUsado === null
              ? "Resposta errada: a bola nem saiu da mochila!"
              : `${nomeMeu()} usou ${nomeGolpe(golpeUsado)}... mas errou! A resposta estava errada.`
          );
          anim("meu", "ataca");
          await esperar(1100);
          break;
        case "contra": {
          const g = ev.golpe >= 0 ? dex.golpes[ev.golpe] : null;
          setMensagem(ev.revide ? `${nomeIni} aguentou e atacou com ${g?.[0] ?? "Tackle"}!` : `${nomeIni} contra-atacou com ${g?.[0] ?? "Tackle"}!`);
          anim("inimigo", "ataca");
          await esperar(120);
          await esperar(golpeFx("inimigo", ev.golpe >= 0 ? ev.golpe : 0, ev.critico));
          hpMeu = Math.max(0, hpMeu - ev.dano);
          anim("meu", "dano", { hp: hpMeu });
          texto("meu", `−${ev.dano}`, "#FF5A5F");
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
        case "status":
          if (ev.status) {
            setFx({ n: n(), de: "inimigo", alvo: "meu", efeito: efeitoDoStatus(ev.status) });
            setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status][0]}!`);
          }
          anim("meu", "status", { status: ev.status });
          await esperar(1100);
          break;
        case "tique":
          hpMeu = Math.max(0, hpMeu - ev.dano);
          if (ev.status) {
            setFx({ n: n(), de: "meu", alvo: "meu", efeito: efeitoDoStatus(ev.status, "tique") });
            setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status][1]}! −${ev.dano} HP`);
          }
          anim("meu", "dano", { hp: hpMeu });
          await esperar(900);
          break;
        case "desmaiou":
          anim("meu", "desmaia", { hp: 0, status: "" });
          setMensagem(`${nomeMeu()} desmaiou!`);
          await esperar(1100);
          break;
        case "voltaDepois":
          setMensagem(ev.selvagem ? "Essa questão volta daqui a pouco, como Pokémon selvagem, para a revanche." : "Essa questão volta ainda nesta luta.");
          await esperar(1300);
          break;
        case "fuga":
          anim("inimigo", "foge");
          setMensagem(`${nomeIni} fugiu!`);
          await esperar(1300);
          break;
        case "treinadorVencido": {
          const t = depois.treinadores[ev.treinador];
          setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false });
          setMensagem(
            ev.insignia !== undefined
              ? `Você venceu ${t.nome}! Ganhou a ${regiaoDe(depois.regiao).ginasios[ev.insignia].insignia}!`
              : t.campeao
                ? `Você venceu o ${t.nome}! Você é o novo Campeão da Liga!`
                : t.elite
                  ? `Você venceu ${t.nome}, da Elite dos 4!`
                  : `Você venceu ${t.nome}!`
          );
          await esperar(ev.insignia !== undefined || t.campeao ? 2400 : 1600);
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
      if (ehAtivo(e.uid)) idVis = e.para;
      setMensagem(`Parabéns! ${nomeDe(e.de)} evoluiu para ${nomeDe(e.para)}!`);
    }
    // estado final dos dois lados
    const eu = depois.time[depois.ativo];
    if (eu) setMeuVis((v) => ({ ...visDoLutador(eu, v?.anim === "desmaia" ? "some" : ""), chave: v?.chave ?? n() }));
    const ini = depois.atual;
    if (ini && !ini.fim) setInimigoVis((v) => (v ? { ...v, hp: ini.hp, status: ini.status, semente: ini.semente, anim: "" } : v));
  }

  // Semente da ordem das alternativas (e selo "3ª vez"): a volta de um erro desta partida
  // conta como mais uma tentativa.
  function historicoDe(id: number, retorno: boolean) {
    const h = hist?.get(id);
    return h ? { tentativas: h.tentativas + (retorno ? 1 : 0), erros: h.erros + (retorno ? 1 : 0) } : undefined;
  }

  // ----- golpe -----
  async function atacar(acao: Acao) {
    if (!partida || !questao || !selecionada || fase !== "pergunta") return;
    setFase("golpe");
    setPainel(null);
    const acertou = selecionada === questao.gabarito;
    const confianca: Confianca = certeza ? "certeza" : "duvida";
    const tempo = Math.round((Date.now() - inicioQuestao.current) / 1000);
    void enviarResposta(montarResultado(questao, selecionada, "BATALHA", tempo));
    const { partida: nova, eventos } = responderPoke(dex, partida, { acertou, confianca, acao });
    setPartida(nova);
    setDesfecho({ acertou, confianca, questaoId: questao.id, marcada: selecionada, retorno: !!encontro?.retorno, historico: historicoDe(questao.id, !!encontro?.retorno) });
    if (!window.matchMedia("(min-width: 1024px)").matches) painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    await animar(eventos, partida, nova, "golpe" in acao ? acao.golpe : null);
    if (!vivo.current) return;
    setFase("resultado");
    setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }

  // O mesmo Pokémon inimigo segue de pé: próxima questão, sem nova entrada.
  function proximaQuestao(p: PartidaPoke) {
    let q = p;
    for (let g = 0; g < 30 && q.atual && !q.atual.fim && !getQuestao(q.atual.questaoId); g++) q = pularQuestao(q);
    if (q !== p) setPartida(q);
    if (!q.atual || q.atual.fim) {
      const r = avancarPoke(q, dex);
      setPartida(r);
      setFase(r.oferta ? "recompensa" : r.fim ? "fim" : "entrada");
      return;
    }
    setSelecionada(undefined);
    setDesfecho(null);
    setLicao("");
    setConfirmarFuga(false);
    setPainel(null);
    setTextos([]);
    setBolaVis(null);
    setFx(null);
    const eu = q.time[q.ativo];
    setMensagem(`${nomeDe(q.atual.especie)} continua de pé! O que ${nomeDe(eu.id)} vai fazer?`);
    setFase("pergunta");
    inicioQuestao.current = Date.now();
    painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continuar() {
    if (!partida) return;
    if (partida.fim) {
      setFase("fim");
      return;
    }
    if (precisaTrocar(partida)) {
      setMensagem("Escolha o próximo Pokémon.");
      setFase("troca");
      return;
    }
    if (partida.atual && !partida.atual.fim) {
      proximaQuestao(partida);
      return;
    }
    const p = avancarPoke(partida, dex);
    setPartida(p);
    setTreinadorVis(null);
    if (p.oferta) {
      setInimigoVis(null);
      setMensagem("Escolha uma recompensa pela vitória!");
      setFase("recompensa");
    } else if (p.fim) setFase("fim");
    else setFase("entrada");
    painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function trocarPara(idx: number) {
    if (!partida) return;
    const forcada = fase === "troca";
    const antes = partida.time[partida.ativo];
    const p = trocar(partida, idx);
    if (p === partida) return;
    setPartida(p);
    setPainel(null);
    const novo = p.time[p.ativo];
    if (!forcada) {
      setMensagem(`Volte, ${nomeDe(antes.id)}!`);
      anim("meu", "bola");
      await esperar(600);
    }
    setMensagem(`Vai, ${nomeDe(novo.id)}!`);
    lancar("meu");
    setMeuVis(visDoLutador(novo, "saiBola"));
    await esperar(1050);
    if (!vivo.current) return;
    if (forcada && p.atual && !p.atual.fim) {
      proximaQuestao(p);
      return;
    }
    if (forcada) {
      const q = avancarPoke(p, dex);
      setPartida(q);
      setFase(q.oferta ? "recompensa" : q.fim ? "fim" : "entrada");
      if (q.oferta) setMensagem("Escolha uma recompensa pela vitória!");
    } else setMensagem(`O que ${nomeDe(novo.id)} vai fazer?`);
  }

  async function aplicarItem(item: string, alvo: number) {
    if (!partida) return;
    const { partida: p, eventos } = usarItem(dex, partida, item, alvo);
    if (p === partida) return;
    setPartida(p);
    setAlvoItem(null);
    setPainel(null);
    const l = p.time[alvo];
    setMensagem(`Você usou ${nomeItem(item)} em ${nomeDe(partida.time[alvo].id)}.`);
    if (alvo === p.ativo) {
      const soCura = eventos.filter((e) => e.tipo !== "evolui");
      if (soCura.length) await animar(soCura, partida, p, null);
    }
    for (const e of eventos) if (e.tipo === "evolui") await mostrarEvolucao(e.de, e.para);
    if (!vivo.current) return;
    if (alvo === p.ativo || p.time[p.ativo].hp > 0) setMeuVis(visDoLutador(p.time[p.ativo]));
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
    setFase(p.fim ? "fim" : "entrada");
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
    const eu = p.time[p.ativo];
    if (curou && eu.hp > 0) {
      setMeuVis(visDoLutador(eu));
      texto("meu", `+${curou} HP`, "#3BC46B");
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

  // Recomeçar a jornada do zero: apaga coleção, insígnias e a partida deste aparelho.
  function recomecar() {
    gravar(CHAVE_PARTIDA, null);
    gravar(CHAVE_PERFIL, null);
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
        alternar={alternar}
      />
    );
  }

  if (fase === "fim") {
    return <Fim dex={dex} partida={partida} perfil={perfil} activeId={activeId ?? null} onNova={novaPartida} onViajar={() => setViagem(true)} />;
  }

  const eu = partida.time[partida.ativo];
  const selvagem = encontro?.tipo === "selvagem";
  const inimigoEsp = encontro ? dex.especies[encontro.especie] : null;
  const bolasTenho = BOLAS.filter((b) => (partida.mochila[b] ?? 0) > 0);
  const itensUsaveis = Object.entries(partida.mochila).filter(([i, q]) => q > 0 && categoriaDe(i) === "cura");
  const licaoAnterior = desfecho ? partida.licoes[desfecho.questaoId] : undefined;
  const respondida = (fase === "golpe" || fase === "resultado") && desfecho ? getQuestao(desfecho.questaoId) : undefined;
  const questaoVista = respondida ?? questao;
  const retornoVisto = respondida ? desfecho!.retorno : !!encontro?.retorno;
  const historicoVisto = respondida ? desfecho!.historico : questao ? historicoDe(questao.id, !!encontro?.retorno) : undefined;
  const vencidos = partida.vencidos.length;

  const listaTime = (onEscolher: (i: number) => void, desabilitar: (l: Lutador, i: number) => boolean) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {partida.time.map((l, i) => {
        const max = hpMax(dex, l);
        const f = l.hp / max;
        return (
          <button
            key={l.uid}
            disabled={desabilitar(l, i)}
            onClick={() => onEscolher(i)}
            className="flex items-center gap-2 rounded-xl border border-hair bg-surface p-2 text-left transition hover:border-brand-500 disabled:opacity-40"
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
                {i === partida.ativo ? " · em campo" : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(
    <div className="jg">
      {telaEvolucao}
      {telaGolpe}
      <div className="jg__palco">
        <Arena
          inimigo={fase === "recompensa" || fase === "troca" ? null : inimigoVis}
          meu={meuVis}
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

        {fase === "troca" && (
          <div className="space-y-3 p-4 sm:p-6">
            <p className="font-display text-xl font-bold text-brand-ink">Escolha o próximo Pokémon</p>
            {listaTime((i) => void trocarPara(i), (l) => l.hp <= 0)}
            {(partida.mochila.revive ?? 0) > 0 && (
              <p className="text-xs text-faint">Dica: dá para usar Reviver depois, na mochila, durante a luta.</p>
            )}
          </div>
        )}

        {(fase === "entrada" || fase === "pergunta" || fase === "golpe" || fase === "resultado") && questaoVista && eu && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-6">
              <div key={`${questaoVista.id}-${retornoVisto ? "r" : "a"}`} className="bt-carta-questao" style={fase === "entrada" ? { opacity: 0.35 } : undefined}>
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
                      {partida.atual && !partida.atual.fim && (
                        <p className="text-sm text-muted">
                          {nomeDe(partida.atual.especie)} ainda tem {Math.round((partida.atual.hp / atributos(dex.especies[partida.atual.especie], partida.atual.nivel).hp) * 100)}% do HP: a próxima questão continua a luta.
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
                    {partida.fim ? "Ver resultado" : precisaTrocar(partida) ? "Escolher o próximo Pokémon ▶" : partida.atual && !partida.atual.fim ? "Próxima questão ▶" : "Continuar ▶"}
                  </button>
                </div>
              )}
            </div>

            {fase === "pergunta" && (
              <div className={`bt-barra-golpes jg__golpes ${selecionada ? "bt-barra-golpes--pronta" : ""}`}>
                {painel === "mochila" && (
                  <Gaveta titulo={alvoItem ? `${nomeItem(alvoItem)}: em quem?` : "Mochila"} onFechar={() => (alvoItem ? setAlvoItem(null) : setPainel(null))}>
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
                    <p className="mt-2 text-[11px] text-faint">Usar item não gasta a vez: o inimigo só ataca quando você erra.</p>
                  </Gaveta>
                )}
                {painel === "pokemon" && (
                  <Gaveta titulo="Trocar de Pokémon" onFechar={() => setPainel(null)}>
                    {listaTime((i) => void trocarPara(i), (l, i) => l.hp <= 0 || i === partida.ativo)}
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
                <div className="grid grid-cols-2 gap-2">
                  {eu.golpes.map((g) => {
                    const m = dex.golpes[g];
                    if (!m) return null;
                    const ef = m[3] !== 2 && inimigoEsp ? efetividade(m[1], inimigoEsp.t) : 1;
                    const efeito = m[3] === 2 ? (m[6] ? "status" : m[5] > 0 ? "cura" : "guarda") : m[4] > 0 ? "dreno" : m[2] > 0 ? `${m[2]} poder` : "dano fixo";
                    return (
                      <button key={g} className="pk-golpe" style={{ "--cor": COR_TIPO[m[1]] } as CSSProperties} disabled={!selecionada} onClick={() => void atacar({ golpe: g })}>
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
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex gap-1.5">
                    <BotaoMini rotulo="Mochila" onClick={() => setPainel(painel === "mochila" ? null : "mochila")}>
                      <Backpack size={14} /> <span className="max-[430px]:hidden">Mochila</span>
                    </BotaoMini>
                    <BotaoMini rotulo="Trocar de Pokémon" onClick={() => setPainel(painel === "pokemon" ? null : "pokemon")} disabled={partida.time.filter((l) => l.hp > 0).length < 2}>
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

function EvolucaoPoke({ de, para, nome, onFim }: { de: number; para: number; nome: (id: number) => string; onFim: () => void }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPronto(true), 3300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="pk-evo" onClick={() => pronto && onFim()}>
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="pk-evo__palco">
          <div className="pk-evo__brilho" />
          <img className="pk-evo__de" src={spriteFrente(de)} alt="" />
          <img className="pk-evo__para" src={spriteFrente(para)} alt="" />
        </div>
        <p className="font-display text-xl font-bold">{pronto ? `Parabéns! ${nome(de)} evoluiu para ${nome(para)}!` : `O quê? ${nome(de)} está evoluindo!`}</p>
        <button onClick={onFim} disabled={!pronto} className="btn-primary disabled:opacity-0">
          Continuar
        </button>
      </div>
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
  const [id, setId] = useState<number | null>(null);
  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo={titulo} subtitulo={subtitulo} />
      {alternar}
      {iniciais ? (
        <div className="mx-auto grid max-w-[480px] grid-cols-3 gap-2">
          {iniciais.map((i) => (
            <MonCard key={i} dex={dex} m={{ uid: String(i), id: i, xp: xpDoNivel(5), golpes: [] }} marcado={id === i} onClick={() => setId(i)} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {INICIAIS_POR_REGIAO.map((g) => (
            <section key={g.regiao}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[.16em] text-faint">{g.regiao}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {g.ids.filter((i) => dex.especies[i]).map((i) => (
                  <MonCard key={i} dex={dex} m={{ uid: String(i), id: i, xp: xpDoNivel(5), golpes: [] }} marcado={id === i} onClick={() => setId(i)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {extra && <div className="mx-auto mt-5 max-w-[640px]">{extra}</div>}
      <div className="sticky bottom-20 mt-4 flex justify-center">
        {onVoltar && (
          <button onClick={onVoltar} className="mr-2 rounded-2xl border border-hair bg-surface px-5 py-3 font-display font-bold text-muted transition hover:text-brand-500">
            Agora não
          </button>
        )}
        <button disabled={!id} onClick={() => id && onEscolher(id)} className="btn-primary disabled:opacity-40">
          {id ? `Escolher ${dex.especies[id].n}` : "Toque em um Pokémon"}
        </button>
      </div>
    </div>
  );
}

// Qual treinador aparece na arena lançando a Pokébola.
function EscolherJogador({ atual, onEscolher }: { atual: string; onEscolher: (sprite: string) => void }) {
  const nome = TREINADORES_JOGADOR.find((t) => t.sprite === atual)?.nome;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Seu treinador</p>
        <p className="text-xs text-muted">{nome}</p>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
        {TREINADORES_JOGADOR.map((t) => (
          <button
            key={t.sprite}
            onClick={() => onEscolher(t.sprite)}
            title={t.nome}
            aria-label={t.nome}
            aria-pressed={t.sprite === atual}
            className={`aspect-square overflow-hidden rounded-lg border transition ${t.sprite === atual ? "border-brand-500 bg-brand-500/10" : "border-hair hover:border-brand-500"}`}
          >
            <img src={spriteTreinador(t.sprite)} alt="" draggable={false} loading="lazy" className="h-full w-full object-contain [image-rendering:pixelated]" />
          </button>
        ))}
      </div>
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
  alternar,
}: {
  dex: Dex;
  perfil: PerfilPoke;
  setPerfil: (p: PerfilPoke) => void;
  pendentes: Candidata[] | null;
  novas: number;
  erro: boolean;
  onTentar: () => void;
  onComecar: (modo: ModoJornada, opts?: { ginasio?: number; habitat?: number; terreno?: number; rumo?: number }) => void;
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
  const [confirmarReset, setConfirmarReset] = useState(false);
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

  return (
    <div className="fadeup mx-auto max-w-[980px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo={`Jornada Pokémon · ${regiao.nome}`} subtitulo="Cada turno é uma questão. Acertar faz o golpe sair; errar leva contra-ataque." />
      {alternar}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-brand-ink">Seu time ({time.length}/{MAX_TIME})</p>
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
            {monDandoItem && (
              <EditorItem
                dex={dex}
                m={monDandoItem}
                mochila={perfil.mochila}
                onFechar={() => setDandoItem(null)}
                onDar={(item) => setPerfil(darItem(perfil, monDandoItem.uid, item))}
              />
            )}
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
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-brand-ink">PC ({pc.length})</p>
              <p className="text-xs text-faint">
                {campeaoDe(perfil) > 0 || r === 0 ? "capture Pokémon selvagens para escolher quem vai na jornada" : `só luta aqui quem veio de ${regiao.nome}; os outros voltam quando você for Campeão`}
              </p>
            </div>
            {pc.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {pc.map((m) => (
                  <div key={m.uid} className={`flex flex-col gap-1 ${podeLutar(perfil, m) ? "" : "opacity-45"}`}>
                    <MonCard
                      dex={dex}
                      m={m}
                      onClick={() => alternarTime(m.uid)}
                      rodape={
                        <span className="text-[10px] text-faint">
                          {podeLutar(perfil, m) ? (m.questaoId ? `questão #${m.questaoId}` : "") : <><Lock size={9} className="inline" /> de {regiaoDe(m.regiao).nome}</>}
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

        <div className="space-y-4">
          {destino !== null && (
            <div className="card space-y-3 border-brand-500 p-5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Nova região</p>
              <p className="font-display text-lg font-bold text-brand-ink">Campeão de {regiao.nome}! {REGIOES[destino].nome} te espera.</p>
              <div className="flex justify-center gap-2">
                {REGIOES[destino].iniciais.map((i) => (
                  <img key={i} src={spriteFrente(i)} onError={(ev) => (ev.currentTarget.src = spriteEstatico(i))} alt="" className="pk-mini h-14 w-14" />
                ))}
              </div>
              <p className="text-xs text-muted">Escolha um destes para começar do nível 5. Seu time atual vai para o PC.</p>
              <button onClick={onViajar} disabled={!!emAndamento} className="btn-primary w-full disabled:opacity-40">
                <Plane size={16} className="mr-2 inline" /> Viajar para {REGIOES[destino].nome}
              </button>
            </div>
          )}
          {emAndamento && (
            <div className="card bt-painel-resultado--acerto space-y-3 p-5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Partida pausada</p>
              <p className="font-display text-lg font-bold text-brand-ink">
                {emAndamento.vencidos.length}/{emAndamento.treinadores.length} treinadores
              </p>
              <button onClick={onRetomar} className="btn-primary w-full">
                ▶ Continuar partida
              </button>
            </div>
          )}
          <div className="card p-5">
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
                <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Para onde?</p>
                <p className="mt-1 text-sm text-muted">
                  Todo destino usa as mesmas questões: {revisoes > 0 ? <><b className="text-brand-ink">{revisoes}</b> da revisão espaçada{completa > 0 ? " e novas das matérias em que você mais erra" : ""}</> : "sem revisão pendente, novas das matérias em que você mais erra"}. O chefe de cada luta é a questão que mais te derrubou.
                </p>
                <div className="mt-3 space-y-2">
                  {proximo ? (
                    <Destino
                      titulo={`Ginásio de ${proximo.cidade}`}
                      texto={
                        liberado
                          ? `${proximo.lider} · ${NOME_TIPO[proximo.tipo]} · vale a ${proximo.insignia}`
                          : `${proximo.lider} só aceita o desafio depois de ${exigidos} treinadores vencidos no caminho (${historia}/${exigidos})`
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
                        ? liberado
                          ? `Caminho feito (${historia}/${exigidos}): o ginásio te espera. Dá para seguir treinando por aqui.`
                          : `Modo história: vença ${exigidos} treinadores para enfrentar ${proximo.lider} (${historia}/${exigidos}). Selvagens no mato e um Treinador Ás no fim.`
                        : "Treinadores e selvagens rumo à Liga Pokémon, com um Treinador Ás no fim"
                    }
                    imagem={spriteItem("poke-ball")}
                    icone={<MapaIcone size={16} />}
                    destaque={!!proximo && !liberado}
                    disabled={!!emAndamento}
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
                      texto={`${terrenoSel ? `Só ${terrenoSel.tipos.map((t) => NOME_TIPO[t]).join(" e ")}` : "Todos os tipos"} de ${REGIOES[habitat].nome} · ${BOLAS_SAFARI} Safari Balls grátis · troque o selvagem até ${MAX_TROCAS}× por questão`}
                      imagem={spriteItem("safari-ball")}
                      icone={<Trees size={16} />}
                      disabled={!!emAndamento}
                      onClick={() => onComecar("safari", { habitat, terreno })}
                    />
                    <p className="px-2.5 text-[11px] font-bold uppercase tracking-wider text-faint">Região</p>
                    <div className="flex flex-wrap gap-1 px-2.5 pb-2 pt-1" role="radiogroup" aria-label="Região da Zona Safári">
                      {REGIOES.map((x, i) => (
                        <Pilula key={x.nome} ativa={habitat === i} disabled={i > r} titulo={i > r ? "Chega lá viajando: vire Campeão da região atual" : undefined} onClick={() => setHabitat(i)}>
                          {i > r && <Lock size={10} className="mr-0.5 inline" />}
                          {x.nome}
                        </Pilula>
                      ))}
                    </div>
                    <p className="px-2.5 text-[11px] font-bold uppercase tracking-wider text-faint">Terreno</p>
                    <div className="flex flex-wrap gap-1 px-2.5 pb-2.5 pt-1" role="radiogroup" aria-label="Terreno da Zona Safári">
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
                <p className="mt-2 text-xs text-faint">
                  Seu time está no nível {nivelMedio(time)} em média.{" "}
                  {cap < 100 ? (
                    <>
                      <b className="text-brand-ink">Level cap: Nv{cap}</b> ({proximo ? `o nível do ás de ${proximo.lider}` : `o nível do Campeão ${regiao.campeao.nome}`}); acima dele o XP não entra.
                    </>
                  ) : (
                    "Sem level cap: você já é o Campeão daqui."
                  )}{" "}
                  Treinadores dão o dobro do XP de selvagens.
                </p>
              </>
            )}
          </div>

          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">
              Insígnias de {regiao.nome} ({insignias}/8)
            </p>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {regiao.ginasios.map((g, i) => (
                <img
                  key={g.sprite}
                  src={insigniaImg(i, r)}
                  alt={g.insignia}
                  title={`${g.insignia} (${g.lider})${i < insignias ? "" : " · ainda não"}`}
                  className="pk-mini mx-auto h-8 w-8 object-contain"
                  style={i < insignias ? undefined : { filter: "grayscale(1) brightness(.6)", opacity: 0.35 }}
                />
              ))}
            </div>
            {REGIOES.some((_, i) => campeaoDe(perfil, i) > 0) && (
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {REGIOES.map((x, i) =>
                  campeaoDe(perfil, i) > 0 ? (
                    <p key={x.nome} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-ink">
                      <Crown size={15} className="text-amber-500" /> {x.nome} ×{campeaoDe(perfil, i)}
                    </p>
                  ) : null
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Numero valor={perfil.vitorias} rotulo="vitórias" />
              <Numero valor={perfil.colecao.length} rotulo="capturados" />
              <Numero valor={perfil.vistos.length} rotulo="vistos" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-faint">Mochila</p>
            {mochila.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mochila.map(([i, q]) => (
                  <span key={i} title={ITENS[i]?.texto} className="inline-flex items-center gap-1 rounded-full border border-hair bg-surface px-2 py-0.5 text-xs font-semibold text-brand-ink">
                    <img src={spriteItem(i)} alt="" className="pk-mini h-5 w-5" /> {nomeItem(i)} ×{q}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Vazia.</p>
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
            {temSeguravel && <p className="mt-2 text-[11px] text-faint">Itens de segurar e frutas: toque em "Item" embaixo de um Pokémon.</p>}
          </div>

          <div className="card p-5">
            <EscolherJogador atual={jogador} onEscolher={onJogador} />
          </div>

          <div className="card space-y-2 p-5">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Recomeçar do zero</p>
            <p className="text-xs text-muted">Apaga todos os seus Pokémon, insígnias, títulos e a mochila deste aparelho. Você escolhe um inicial de novo. As respostas já dadas continuam valendo no estudo.</p>
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
              <button onClick={() => setConfirmarReset(true)} disabled={!!emAndamento} className="rounded-xl border border-hair px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-danger-from hover:text-danger-from disabled:opacity-40">
                <RotateCcw size={14} className="mr-1.5 inline" /> Recomeçar jornada
              </button>
            )}
            {emAndamento && <p className="text-[11px] text-faint">Termine ou abandone a partida pausada antes.</p>}
          </div>

          <div className="card space-y-2.5 p-5 text-sm text-muted">
            <p className="font-display text-base font-bold text-brand-ink">Como se joga (e por que ajuda)</p>
            <p>
              <b className="text-brand-ink">Escolha a alternativa e o golpe.</b> Acertou, o golpe sai e tira HP: tipo conta (fogo em planta é super efetivo), um Pokémon
              aguenta uns 2 acertos. Golpes de status envenenam, queimam, paralisam ou fazem dormir, e Pokémon dormindo não contra-ataca. Marcar "tenho certeza" vira
              crítico, mas o erro dói 1,5×: treina saber o que você sabe.
            </p>
            <p>
              <b className="text-brand-ink">Errou? Contra-ataque</b> (com veneno, sono, paralisia...). Acertou e o inimigo aguentou? Ele revida, mais fraco. A questão volta logo depois, com as alternativas em outra ordem (no caminho e
              na Safári, como selvagem: acerte e lance uma bola para capturar; HP baixo ajuda). Escrever por que o gabarito está certo cura 25% do HP.
            </p>
            <p>
              <b className="text-brand-ink">XP como nos jogos:</b> a fórmula da 5ª geração, com o XP base e a curva de crescimento de cada espécie (tem Pokémon que sobe
              devagar). Quem lutou leva o XP; o <b className="text-brand-ink">Exp. Share</b> (prêmio do 3º ginásio) dá metade a quem o segura, e o{" "}
              <b className="text-brand-ink">Exp. All</b> (6º ginásio) dá metade ao time todo. O level cap vale para todos.
            </p>
            <p>
              <b className="text-brand-ink">Itens e frutas:</b> vencer treinadores rende itens (os melhores aparecem com mais insígnias). No lobby, o botão "Item" dá
              um para o Pokémon segurar: reforço de tipo, Restos, Faixa do Foco, Ovo da Sorte... Frutas são comidas sozinhas na hora certa (HP baixo, veneno, sono).
            </p>
            <p>
              <b className="text-brand-ink">Evolução</b> por nível como nos jogos, por pedra na mochila, e as de troca ou amizade no nível {NIVEL_TROCA_AMIZADE}. Com 4 golpes, você
              escolhe qual esquecer para aprender o novo; no botão "Golpes" dá para trocar por qualquer golpe que ele já aprendeu.
            </p>
            <p>
              <b className="text-brand-ink">Jornada:</b> 5 regiões (Kanto, Johto, Hoenn, Sinnoh, Unova). Em cada uma, 8 ginásios em ordem (cada líder vale uma insígnia), depois
              a Liga: Elite dos 4 e o Campeão. Sendo Campeão, você viaja para a próxima região e escolhe um inicial de lá; o time antigo fica no PC. Na Zona Safári você
              escolhe a região e só aparecem selvagens; antes de responder, dá para trocar o selvagem por outro até {MAX_TROCAS} vezes (a questão é a mesma). Cada treinador
              vencido dá um item.
            </p>
            <p className="text-faint">Cada resposta conta na meta do dia, na ofensiva e reagenda a revisão espaçada.</p>
          </div>
        </div>
      </div>
    </div>
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
  const evo = dex.especies[m.id].e?.find(([para]) => para <= ate);
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
              ? `${regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)].lider} aceita o seu desafio: o Ginásio de ${regiaoDe(perfil.regiao).ginasios[insigniasDe(perfil)].cidade} está aberto!`
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
          <RotateCcw size={16} className="mr-2 inline" /> Nova jornada
        </button>
        <Link to="/revisar" className="flex-1 rounded-2xl border border-hair px-5 py-3 text-center font-display font-bold text-muted transition hover:text-brand-500">
          Ver a revisão espaçada
        </Link>
      </div>
    </div>
  );
}

