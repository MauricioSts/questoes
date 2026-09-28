// BATALHA POKÉMON: a revisão espaçada como jornada Pokémon. Treinadores lançam Pokémon, e
// cada Pokémon é uma questão; a resposta certa derruba, o golpe escolhido decide o resto.
// As regras (e o porquê de cada uma, sempre a favor do aprendizado) estão no motor,
// lib/poke/motor.ts; os dados da PokéAPI, em lib/poke/dex.ts. Esta tela monta a partida,
// grava cada resposta como estudo de verdade (contexto BATALHA: conta na meta do dia e na
// ofensiva) e anima os eventos que o motor devolve.
//
// Partida e perfil (coleção, time, mochila, insígnias) ficam no localStorage, por aparelho.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Backpack, Flag, Flame, NotebookPen, Pause, RotateCcw, Swords, Trophy, Users, X } from "lucide-react";
import type { Alternativa } from "../types/questao";
import { getQuestao } from "../lib/questoesRepo";
import { carregarFilaBatalha, novasPorFraqueza, type HistoricoQ } from "../lib/filaBatalha";
import { api } from "../lib/api";
import { enviarResposta } from "../lib/answers";
import { montarResultado } from "../lib/correcao";
import { salvarLicoesNoCaderno, textoCalibragem } from "../lib/licoes";
import { resumir, type Candidata, type Confianca } from "../lib/batalha";
import { tipoDaMateria } from "../components/batalha/tipos";
import {
  COR_TIPO,
  INICIAIS,
  NOME_TIPO,
  NIVEL_TROCA_AMIZADE,
  atributos,
  carregarDex,
  efetividade,
  spriteEstatico,
  spriteFrente,
  spriteItem,
  xpDoNivel,
  type Dex,
} from "../lib/poke/dex";
import {
  BOLAS,
  MAX_TIME,
  MIN_LICAO,
  avancarPoke,
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
  type Bola,
  type Encontro,
  type Evento,
  type Lutador,
  type Mon,
  type PartidaPoke,
  type PerfilPoke,
  type Status,
} from "../lib/poke/motor";
import { useConcurso } from "../store/concurso";
import { useMeta } from "../store/meta";
import { usePausarFundo } from "../store/fundo";
import { QuestaoView } from "../components/QuestaoView";
import { PageHeader } from "../components/PageHeader";
import { Carregando } from "../components/Spinner";
import { Arena, TipoChip, type BolaVis, type FxVis, type LadoVis, type TextoVis } from "../components/poke/Arena";

// ---------- persistência ----------

const CHAVE_PARTIDA = "q_poke_partida";
const CHAVE_PERFIL = "q_poke_perfil";

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

export const ITENS: Record<string, { nome: string; texto: string }> = {
  potion: { nome: "Poção", texto: "+20 HP em um Pokémon." },
  "super-potion": { nome: "Super Poção", texto: "+60 HP em um Pokémon." },
  "hyper-potion": { nome: "Hiper Poção", texto: "+200 HP em um Pokémon." },
  revive: { nome: "Reviver", texto: "Levanta um Pokémon desmaiado com metade do HP." },
  "full-heal": { nome: "Cura Total", texto: "Tira veneno, queimadura, paralisia, sono e congelamento." },
  "rare-candy": { nome: "Doce Raro", texto: "Sobe um nível na hora (e pode evoluir)." },
  "poke-ball": { nome: "Poké Bola", texto: "Captura um Pokémon selvagem, se a resposta estiver certa." },
  "great-ball": { nome: "Grande Bola", texto: "Captura com 1,5× mais chance." },
  "ultra-ball": { nome: "Ultra Bola", texto: "Captura com 2× mais chance." },
  "fire-stone": { nome: "Pedra de Fogo", texto: "Evolui certos Pokémon (ex.: Vulpix, Growlithe, Eevee)." },
  "water-stone": { nome: "Pedra d'Água", texto: "Evolui certos Pokémon (ex.: Poliwhirl, Staryu, Eevee)." },
  "thunder-stone": { nome: "Pedra do Trovão", texto: "Evolui certos Pokémon (ex.: Pikachu, Eevee)." },
  "leaf-stone": { nome: "Pedra da Folha", texto: "Evolui certos Pokémon (ex.: Gloom, Weepinbell)." },
  "moon-stone": { nome: "Pedra da Lua", texto: "Evolui certos Pokémon (ex.: Clefairy, Nidorina)." },
  "sun-stone": { nome: "Pedra do Sol", texto: "Evolui certos Pokémon (ex.: Gloom, Sunkern)." },
  "shiny-stone": { nome: "Pedra Brilhante", texto: "Evolui certos Pokémon (ex.: Togetic, Roselia)." },
  "dusk-stone": { nome: "Pedra do Crepúsculo", texto: "Evolui certos Pokémon (ex.: Murkrow, Misdreavus)." },
  "dawn-stone": { nome: "Pedra da Aurora", texto: "Evolui certos Pokémon (ex.: Kirlia ♂, Snorunt ♀)." },
  "ice-stone": { nome: "Pedra de Gelo", texto: "Evolui certos Pokémon." },
};
const nomeItem = (i: string) => ITENS[i]?.nome ?? i;

const TXT_STATUS: Record<Exclude<Status, "">, [string, string, string]> = {
  // [pegou, tique/impede, curou]
  poison: ["foi envenenado", "sofreu com o veneno", "se curou do veneno"],
  burn: ["se queimou", "sofreu com a queimadura", "se curou da queimadura"],
  paralysis: ["ficou paralisado", "está paralisado", "não está mais paralisado"],
  sleep: ["adormeceu", "está dormindo", "acordou"],
  freeze: ["congelou", "está congelado", "descongelou"],
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fase = "lobby" | "entrada" | "pergunta" | "golpe" | "resultado" | "troca" | "recompensa" | "fim";

interface Desfecho {
  acertou: boolean;
  confianca: Confianca;
  questaoId: number;
  marcada: Alternativa;
}

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

  const [perfil, setPerfilEstado] = useState<PerfilPoke | null>(() => {
    const p = ler<PerfilPoke>(CHAVE_PERFIL);
    return p && p.versao === 1 && p.colecao.length ? p : null;
  });
  const setPerfil = useCallback((p: PerfilPoke) => {
    setPerfilEstado(p);
    gravar(CHAVE_PERFIL, p);
  }, []);
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  const [partida, setPartidaEstado] = useState<PartidaPoke | null>(() => {
    const p = ler<PartidaPoke>(CHAVE_PARTIDA);
    return p && p.versao === 2 && p.concursoId === (activeId ?? null) ? p : null;
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
    const hp = atributos(dex.especies[e.especie], e.nivel).hp;
    return { id: e.especie, nome: nomeDe(e.especie), nivel: e.nivel, hp, hpMax: hp, status: "", anim, chave: n(), selvagem: e.tipo === "selvagem", capturavel };
  };
  const anim = (lado: "meu" | "inimigo", a: LadoVis["anim"], extra: Partial<LadoVis> = {}) => {
    const set = lado === "meu" ? setMeuVis : setInimigoVis;
    set((v) => (v ? { ...v, ...extra, anim: a, chave: n() } : v));
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

  function comecar() {
    if (!pendentes || !perfil) return;
    const time = perfil.time.map((uid) => perfil.colecao.find((m) => m.uid === uid)).filter((m): m is Mon => !!m);
    const p = montarPartidaPoke({ dex, time, mochila: perfil.mochila, pendentes, novas, concursoId: activeId ?? null });
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

  useEffect(() => {
    if (fase !== "entrada" || !partida || !encontro) return;
    if (!questao) {
      // questão sumiu do acervo: pula sem gravar nada
      setPartida(avancarPoke({ ...partida, atual: null }, dex));
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
        setMeuVis(visDoLutador(eu, "entra"));
        if (!(await passo(750))) return;
      }
      setInimigoVis(null);
      if (t && ultimoTreinador.current !== encontro.treinador) {
        setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false });
        setMensagem(t.lider ? `${t.nome} te desafia! É a questão que mais te derrubou.` : `${t.nome} quer batalhar!`);
        if (!(await passo(1500))) return;
        setTreinadorVis((v) => (v ? { ...v, sai: true } : v));
        if (!(await passo(350))) return;
        setTreinadorVis(null);
        setMensagem(`${t.nome} enviou ${nomeDe(encontro.especie)}!`);
      } else if (t) {
        setTreinadorVis(null);
        setMensagem(`${t.nome} vai enviar ${nomeDe(encontro.especie)}!`);
      } else {
        setTreinadorVis(null);
        setMensagem(
          encontro.retorno
            ? `O ${nomeDe(encontro.especie)} que fugiu voltou selvagem! (questão #${encontro.questaoId})`
            : `Um ${nomeDe(encontro.especie)} selvagem apareceu! Essa questão já te derrubou antes.`
        );
      }
      setInimigoVis(visDoEncontro(encontro, "entra", capturavel));
      ultimoTreinador.current = encontro.treinador;
      if (!(await passo(1100))) return;
      setMensagem(`O que ${nomeDe(eu.id)} vai fazer?`);
      setFase("pergunta");
      inicioQuestao.current = Date.now();
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, encontro?.questaoId, encontro?.retorno]);

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
    const evos: { de: number; para: number }[] = [];
    for (const ev of eventos) {
      if (!ok()) return;
      switch (ev.tipo) {
        case "impedido":
          setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status || "paralysis"][1]}! O golpe sai sem efeito extra.`);
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
          setMensagem(`${nomeMeu()} usou ${g?.[0] ?? "Investida"}!`);
          anim("meu", "ataca");
          await esperar(220);
          setFx({ n: n(), de: "meu", cor: COR_TIPO[g?.[1] ?? 0], forte: ev.critico });
          await esperar(420);
          anim("inimigo", "dano", { hp: 0 });
          if (ev.critico) texto("inimigo", "CRÍTICO!", "#FFC857");
          await esperar(650);
          if (ev.semEfeito) setMensagem("Não afetou... mas a resposta certa derrubou mesmo assim!");
          else if (ev.efetividade >= 2) setMensagem("É super efetivo! (+50% XP)");
          else if (ev.efetividade < 1) setMensagem("Não é muito efetivo...");
          else if (ev.critico) setMensagem("Um golpe crítico! (+50% XP)");
          if (ev.semEfeito || ev.efetividade !== 1 || ev.critico) await esperar(1000);
          break;
        }
        case "bola": {
          setMensagem(`Você lançou uma ${nomeItem(ev.bola)}!`);
          setBolaVis({ n: n(), bola: ev.bola, balancos: ev.balancos, sucesso: ev.sucesso });
          await esperar(450);
          anim("inimigo", "bola");
          await esperar(700 + ev.balancos * 500 + 500);
          if (ev.sucesso) {
            setMensagem(`Pegou! ${nomeIni} foi capturado!${ev.paraPc ? " O time está cheio: ele foi para o PC." : ""}`);
            texto("inimigo", "CAPTURADO!", "#FFE066");
            await esperar(1500);
          } else {
            setBolaVis(null);
            anim("inimigo", "entra");
            setMensagem("Ah, não! Ele escapou da bola!");
            await esperar(1100);
          }
          break;
        }
        case "desmaiouInimigo":
          anim("inimigo", "desmaia", { hp: 0 });
          setMensagem(`${nomeIni} desmaiou!`);
          await esperar(1000);
          break;
        case "xp": {
          const l = doMeu(ev.uid);
          setMensagem(`${nomeMeu()} ganhou ${ev.valor} pontos de XP!`);
          texto("meu", `+${ev.valor} XP`, "#8EC5FF");
          if (l) setMeuVis(visDoLutador({ ...l, hp: hpMeu }, "", idVis));
          await esperar(1000);
          break;
        }
        case "nivel":
          setMensagem(`${nomeMeu()} subiu para o nível ${ev.nivel}!`);
          texto("meu", `Nv ${ev.nivel}!`, "#FFE066");
          await esperar(1000);
          break;
        case "aprendeu":
          setMensagem(
            ev.esqueceu !== null
              ? `${nomeMeu()} esqueceu ${nomeGolpe(ev.esqueceu)} e aprendeu ${nomeGolpe(ev.golpe)}!`
              : `${nomeMeu()} aprendeu ${nomeGolpe(ev.golpe)}!`
          );
          await esperar(1300);
          break;
        case "evolui":
          evos.push({ de: ev.de, para: ev.para });
          break;
        case "cura": {
          hpMeu = Math.min(hpMeu + ev.valor, 9999);
          setMeuVis((v) => (v ? { ...v, hp: Math.min(v.hpMax, v.hp + ev.valor) } : v));
          texto("meu", `+${ev.valor} HP`, "#3BC46B");
          setMensagem(
            ev.motivo === "dreno"
              ? `${nomeMeu()} drenou a energia de ${nomeIni}! +${ev.valor} HP`
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
          setMensagem(`${nomeIni} contra-atacou com ${g?.[0] ?? "Investida"}!`);
          anim("inimigo", "ataca");
          await esperar(220);
          setFx({ n: n(), de: "inimigo", cor: COR_TIPO[g?.[1] ?? 0], forte: ev.critico });
          await esperar(420);
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
          if (ev.status) setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status][0]}!`);
          anim("meu", "status", { status: ev.status });
          await esperar(1000);
          break;
        case "tique":
          hpMeu = Math.max(0, hpMeu - ev.dano);
          if (ev.status) setMensagem(`${nomeMeu()} ${TXT_STATUS[ev.status][1]}! −${ev.dano} HP`);
          anim("meu", "dano", { hp: hpMeu });
          await esperar(900);
          break;
        case "desmaiou":
          anim("meu", "desmaia", { hp: 0, status: "" });
          setMensagem(`${nomeMeu()} desmaiou!`);
          await esperar(1100);
          break;
        case "fuga":
          anim("inimigo", "foge");
          setMensagem(ev.volta ? `${nomeIni} fugiu! A questão volta daqui a pouco, selvagem, para a revanche.` : `${nomeIni} fugiu. Amanhã ela volta na revisão espaçada.`);
          await esperar(1300);
          break;
        case "treinadorVencido": {
          const t = depois.treinadores[ev.treinador];
          setTreinadorVis({ sprite: t.sprite, chave: n(), sai: false });
          setMensagem(ev.lider ? `Você venceu ${t.nome}! Ganhou uma insígnia!` : `Você venceu ${t.nome}!`);
          await esperar(1600);
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
      idVis = e.para;
      setMensagem(`Parabéns! ${nomeDe(e.de)} evoluiu para ${nomeDe(e.para)}!`);
    }
    // estado final do meu lado
    const eu = depois.time[depois.ativo];
    if (eu) setMeuVis((v) => ({ ...visDoLutador(eu, v?.anim === "desmaia" ? "some" : ""), chave: v?.chave ?? n() }));
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
    setDesfecho({ acertou, confianca, questaoId: questao.id, marcada: selecionada });
    if (!window.matchMedia("(min-width: 1024px)").matches) painelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    await animar(eventos, partida, nova, "golpe" in acao ? acao.golpe : null);
    if (!vivo.current) return;
    setFase("resultado");
    setTimeout(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
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
    setMeuVis(visDoLutador(novo, "entra"));
    await esperar(800);
    if (!vivo.current) return;
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
        : item === "revive"
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

  function novaPartida() {
    setPartida(null);
    setDesfecho(null);
    setFase("lobby");
  }

  // ---------- telas ----------

  const telaEvolucao = evolucao && createPortal(<EvolucaoPoke de={evolucao.de} para={evolucao.para} nome={nomeDe} onFim={evolucao.fim} />, document.body);

  if (!perfil) {
    return (
      <EscolhaInicial
        dex={dex}
        alternar={alternar}
        onEscolher={(id) => {
          setPerfil(perfilInicial(dex, id));
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
        alternar={alternar}
      />
    );
  }

  if (fase === "fim") {
    return <Fim dex={dex} partida={partida} perfil={perfil} activeId={activeId ?? null} onNova={novaPartida} />;
  }

  const eu = partida.time[partida.ativo];
  const selvagem = encontro?.tipo === "selvagem";
  const inimigoEsp = encontro ? dex.especies[encontro.especie] : null;
  const bolasTenho = BOLAS.filter((b) => (partida.mochila[b] ?? 0) > 0);
  const itensUsaveis = Object.entries(partida.mochila).filter(([i, q]) => q > 0 && !BOLAS.includes(i as Bola));
  const licaoAnterior = desfecho ? partida.licoes[desfecho.questaoId] : undefined;
  const hist1 = questao && hist?.get(questao.id);
  const historicoView = questao && hist1 ? { tentativas: hist1.tentativas + (encontro?.retorno ? 1 : 0), erros: hist1.erros + (encontro?.retorno ? 1 : 0) } : undefined;
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
      <div className="jg__palco">
        <Arena
          inimigo={fase === "recompensa" || fase === "troca" ? null : inimigoVis}
          meu={meuVis}
          treinador={treinadorVis}
          mensagem={mensagem}
          fx={fx}
          textos={textos}
          bola={bolaVis}
          cor={corBioma}
          aguardando={fase === "pergunta" || fase === "resultado"}
          topo={
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip title="Treinadores vencidos">
                  <Swords size={12} /> {vencidos}/{partida.treinadores.length}
                </Chip>
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
        {fase === "recompensa" && partida.oferta && (
          <div className="space-y-3 p-4 sm:p-6">
            <p className="font-display text-xl font-bold text-brand-ink">Escolha uma recompensa</p>
            <p className="text-sm text-muted">Vai para a mochila e fica com você nas próximas partidas.</p>
            <div className="grid gap-3">
              {partida.oferta.map((id, i) => (
                <button key={id} className="bt-item flex-row items-center" style={{ animationDelay: `${i * 90}ms` }} onClick={() => escolherRecompensa(id)}>
                  <img src={spriteItem(id)} alt="" className="pk-mini h-10 w-10 shrink-0" />
                  <span>
                    <span className="block font-bold">
                      {nomeItem(id)} <span className="text-xs font-normal opacity-70">(tem {partida.mochila[id] ?? 0})</span>
                    </span>
                    <span className="block text-sm leading-snug opacity-80">{ITENS[id]?.texto}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {fase === "troca" && (
          <div className="space-y-3 p-4 sm:p-6">
            <p className="font-display text-xl font-bold text-brand-ink">Escolha o próximo Pokémon</p>
            {listaTime((i) => void trocarPara(i), (l) => l.hp <= 0)}
            {(partida.mochila.revive ?? 0) > 0 && (
              <p className="text-xs text-faint">Dica: dá para usar Reviver depois, na mochila, durante a luta.</p>
            )}
          </div>
        )}

        {(fase === "entrada" || fase === "pergunta" || fase === "golpe" || fase === "resultado") && questao && eu && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-6">
              <div key={`${questao.id}-${encontro?.retorno ? "r" : "a"}`} className="bt-carta-questao" style={fase === "entrada" ? { opacity: 0.35 } : undefined}>
                <QuestaoView
                  key={`${questao.id}-${encontro?.retorno ? "r" : "a"}`}
                  questao={questao}
                  selecionada={fase === "resultado" || fase === "golpe" ? desfecho?.marcada : selecionada}
                  revelado={fase === "resultado"}
                  historico={historicoView}
                  onSelecionar={(a) => fase === "pergunta" && setSelecionada(a)}
                />
              </div>

              {fase === "resultado" && desfecho && (
                <div ref={resultadoRef} className={`card bt-painel-resultado scroll-mb-40 space-y-3 p-5 ${desfecho.acertou ? "bt-painel-resultado--acerto" : "bt-painel-resultado--erro"}`}>
                  {desfecho.acertou ? (
                    <>
                      <p className="font-display text-lg font-bold text-brand-ink">{desfecho.confianca === "certeza" ? "Certeza confirmada." : "Acertou na dúvida."}</p>
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
                              Em uma frase, com suas palavras: por que a <b className="text-brand-ink">{questao.gabarito}</b> é a certa
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
                    {partida.fim ? "Ver resultado" : precisaTrocar(partida) ? "Escolher o próximo Pokémon ▶" : "Continuar ▶"}
                  </button>
                </div>
              )}
            </div>

            {fase === "pergunta" && (
              <div className={`bt-barra-golpes jg__golpes ${selecionada ? "bt-barra-golpes--pronta" : ""}`}>
                {painel === "mochila" && (
                  <Gaveta titulo={alvoItem ? `${nomeItem(alvoItem)}: em quem?` : "Mochila"} onFechar={() => (alvoItem ? setAlvoItem(null) : setPainel(null))}>
                    {alvoItem ? (
                      listaTime((i) => void aplicarItem(alvoItem, i), (l) => !podeUsar(dex, l, alvoItem))
                    ) : itensUsaveis.length ? (
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {itensUsaveis.map(([i, q]) => (
                          <button
                            key={i}
                            onClick={() => setAlvoItem(i)}
                            disabled={!partida.time.some((l) => podeUsar(dex, l, i))}
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
                      {BOLAS.map((b) => (
                        <button
                          key={b}
                          disabled={!selecionada || (partida.mochila[b] ?? 0) <= 0}
                          onClick={() => void atacar({ bola: b })}
                          className="flex flex-col items-center gap-1 rounded-xl border border-hair bg-surface p-2 text-xs font-bold text-brand-ink transition hover:border-brand-500 disabled:opacity-40"
                        >
                          <img src={spriteItem(b)} alt="" className="pk-mini h-8 w-8" />
                          {nomeItem(b)} ×{partida.mochila[b] ?? 0}
                        </button>
                      ))}
                    </div>
                    {!selecionada && <p className="mt-2 text-xs text-faint">Escolha a alternativa antes.</p>}
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
                    const ef = m[2] > 0 && m[3] !== 2 && inimigoEsp ? efetividade(m[1], inimigoEsp.t) : 1;
                    const efeito = m[3] === 2 ? (m[5] > 0 ? "cura" : "guarda") : m[4] > 0 ? "dreno" : `${m[2]} poder`;
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
                    <BotaoMini onClick={() => setPainel(painel === "mochila" ? null : "mochila")}>
                      <Backpack size={14} /> Mochila
                    </BotaoMini>
                    <BotaoMini onClick={() => setPainel(painel === "pokemon" ? null : "pokemon")} disabled={partida.time.filter((l) => l.hp > 0).length < 2}>
                      <Users size={14} /> Pokémon
                    </BotaoMini>
                    {selvagem && (
                      <BotaoMini onClick={() => setPainel(painel === "bolas" ? null : "bolas")} disabled={!bolasTenho.length} destaque>
                        <img src={spriteItem("poke-ball")} alt="" className="pk-mini h-4 w-4" /> Capturar
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
                    <BotaoMini onClick={() => setConfirmarFuga(true)}>
                      <Flag size={14} /> Fugir
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

function BotaoMini({ children, onClick, disabled, destaque }: { children: ReactNode; onClick: () => void; disabled?: boolean; destaque?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
      className={`flex flex-col items-center rounded-2xl border p-2 text-center transition ${marcado ? "border-brand-500 bg-surface" : "border-hair bg-surface2 hover:border-brand-500"}`}
    >
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

function EscolhaInicial({ dex, onEscolher, alternar }: { dex: Dex; onEscolher: (id: number) => void; alternar?: ReactNode }) {
  const [id, setId] = useState<number | null>(null);
  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo="Escolha seu primeiro Pokémon" subtitulo="Ele começa no nível 5 e cresce com cada questão que você acertar." />
      {alternar}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {INICIAIS.map((i) => (
          <MonCard key={i} dex={dex} m={{ uid: String(i), id: i, xp: xpDoNivel(5), golpes: [] }} marcado={id === i} onClick={() => setId(i)} />
        ))}
      </div>
      <div className="sticky bottom-20 mt-4 flex justify-center">
        <button disabled={!id} onClick={() => id && onEscolher(id)} className="btn-primary disabled:opacity-40">
          {id ? `Escolher ${dex.especies[id].n}` : "Toque em um Pokémon"}
        </button>
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
  alternar,
}: {
  dex: Dex;
  perfil: PerfilPoke;
  setPerfil: (p: PerfilPoke) => void;
  pendentes: Candidata[] | null;
  novas: number;
  erro: boolean;
  onTentar: () => void;
  onComecar: () => void;
  emAndamento: PartidaPoke | null;
  onRetomar: () => void;
  alternar?: ReactNode;
}) {
  const time = perfil.time.map((u) => perfil.colecao.find((m) => m.uid === u)).filter((m): m is Mon => !!m);
  const pc = perfil.colecao.filter((m) => !perfil.time.includes(m.uid));
  const revisoes = pendentes ? Math.min(pendentes.length, 12) : 0;
  const completa = pendentes ? Math.min(novas, Math.max(0, 11 - revisoes)) : 0;
  const mochila = Object.entries(perfil.mochila).filter(([, q]) => q > 0);
  const podeMexer = !emAndamento;
  const alternarTime = (uid: string) => {
    if (!podeMexer) return;
    if (perfil.time.includes(uid)) {
      if (perfil.time.length <= 1) return;
      setPerfil({ ...perfil, time: perfil.time.filter((u) => u !== uid) });
    } else if (perfil.time.length < MAX_TIME) setPerfil({ ...perfil, time: [...perfil.time, uid] });
  };

  return (
    <div className="fadeup mx-auto max-w-[980px] pt-2 pb-24">
      <PageHeader rotulo="Batalha" titulo="Jornada Pokémon" subtitulo="Treinadores lançam questões. Acertar derruba o Pokémon; errar leva contra-ataque." />
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
                <MonCard
                  key={m.uid}
                  dex={dex}
                  m={m}
                  marcado
                  onClick={() => alternarTime(m.uid)}
                  rodape={<Evolui dex={dex} m={m} />}
                />
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="font-display text-lg font-bold text-brand-ink">PC ({pc.length})</p>
              <p className="text-xs text-faint">capture Pokémon selvagens para escolher quem vai na jornada</p>
            </div>
            {pc.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {pc.map((m) => (
                  <MonCard key={m.uid} dex={dex} m={m} onClick={() => alternarTime(m.uid)} rodape={m.questaoId ? <span className="text-[10px] text-faint">questão #{m.questaoId}</span> : null} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Vazio. Questão que te derrubou aparece selvagem: acerte e lance uma Poké Bola.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
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
                <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Rota de hoje</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-ink">{revisoes + completa} questões</p>
                <p className="mt-1 text-sm text-muted">
                  {revisoes > 0 ? (
                    <>
                      <b className="text-brand-ink">{revisoes}</b> da revisão espaçada{completa > 0 ? <> e <b className="text-brand-ink">{completa}</b> novas das matérias em que você mais erra</> : null}. No fim, o Líder de Ginásio é a questão que mais te derrubou.
                    </>
                  ) : (
                    <>Sem revisão pendente: a rota usa questões novas das matérias em que você mais erra.</>
                  )}
                </p>
                <p className="mt-2 text-xs text-faint">Pokémon inimigos por volta do nível {nivelMedio(time)}.</p>
                {!emAndamento && (
                  <button onClick={onComecar} className="btn-primary mt-4 w-full">
                    <Swords size={18} className="mr-2 inline" /> Começar jornada
                  </button>
                )}
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Numero valor={perfil.insignias} rotulo="insígnias" />
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
          </div>

          <div className="card space-y-2.5 p-5 text-sm text-muted">
            <p className="font-display text-base font-bold text-brand-ink">Como se joga (e por que ajuda)</p>
            <p>
              <b className="text-brand-ink">Escolha a alternativa e o golpe.</b> Acertou, o Pokémon cai. O golpe decide o bônus: tipo super efetivo rende mais XP, dreno e cura
              recuperam HP, golpe de status deixa em guarda. Marcar "tenho certeza" vira crítico, mas o erro dói 1,5×: treina saber o que você sabe.
            </p>
            <p>
              <b className="text-brand-ink">Errou? Contra-ataque</b> (com veneno, sono, paralisia...) e a questão foge. Ela volta selvagem logo depois, com as alternativas em outra
              ordem: acerte e lance uma Poké Bola para capturá-la. Escrever por que o gabarito está certo cura 25% do HP.
            </p>
            <p>
              <b className="text-brand-ink">Evolução</b> por nível como nos jogos, por pedra na mochila, e as de troca ou amizade no nível {NIVEL_TROCA_AMIZADE}. Cada treinador
              vencido dá um item; o Líder dá insígnia.
            </p>
            <p className="text-faint">Cada resposta conta na meta do dia, na ofensiva e reagenda a revisão espaçada.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Evolui({ dex, m }: { dex: Dex; m: Mon }) {
  const evo = dex.especies[m.id].e?.[0];
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

function Fim({ dex, partida, perfil, activeId, onNova }: { dex: Dex; partida: PartidaPoke; perfil: PerfilPoke; activeId: string | null; onNova: () => void }) {
  const r = resumir(partida);
  const [salvando, setSalvando] = useState<"nao" | "salvando" | "salvo" | "erro">("nao");
  const licoes = Object.entries(partida.licoes);
  const titulo = partida.fim === "vitoria" ? "Vitória!" : partida.fim === "derrota" ? "Seu time desmaiou" : "Você fugiu da rota";
  const capturados = [...partida.time, ...partida.novos].filter((m) => m.capturadoEm === partida.iniciadaEm);

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
        <p className="mt-2 font-display text-3xl font-bold text-brand-ink">{titulo}</p>
        <p className="mt-1 text-muted">
          {partida.vencidos.length}/{partida.treinadores.length} treinadores · {r.acertos}/{r.respondidas} acertos · +{partida.xp} XP
        </p>
        <p className="mt-1 text-xs text-faint">
          {r.respondidas} respostas contaram na meta do dia e na ofensiva. Insígnias: {perfil.insignias}.
        </p>
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

