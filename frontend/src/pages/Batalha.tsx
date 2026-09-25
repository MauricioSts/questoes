// BATALHA: a revisão espaçada como roguelite de monstrinho. As regras (e o porquê de cada
// uma, sempre a favor do aprendizado) estão no motor, lib/batalha.ts. Esta tela monta a
// partida, grava cada resposta como estudo de verdade (contexto BATALHA, que conta na meta
// do dia e na ofensiva) e anima o que o motor devolve.
//
// A partida em andamento fica no localStorage: fechar a aba e voltar retoma do mesmo ponto.
// O perfil (XP do parceiro, vitórias, capturas) também, por aparelho.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Flag,
  Flame,
  FlaskConical,
  Focus,
  NotebookPen,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import type { Alternativa, Questao } from "../types/questao";
import { getQuestao, todas } from "../lib/questoesRepo";
import { carregarRevisao } from "../lib/revisao";
import { api } from "../lib/api";
import { enviarResposta } from "../lib/answers";
import { montarResultado } from "../lib/correcao";
import { criarPagina, salvarPagina } from "../lib/multiApi";
import {
  MIN_LICAO,
  avancar,
  escolherItem,
  fugir,
  montarPartida,
  nivelDoXp,
  registrarLicao,
  responder,
  resumir,
  usarPocao,
  type Candidata,
  type Confianca,
  type Evento,
  type ItemId,
  type Partida,
} from "../lib/batalha";
import { useTheme } from "../store/theme";
import { useConcurso } from "../store/concurso";
import { useMeta } from "../store/meta";
import { usePausarFundo } from "../store/fundo";
import { QuestaoView } from "../components/QuestaoView";
import { PageHeader } from "../components/PageHeader";
import { Carregando } from "../components/Spinner";
import { Arena, type AnimInimigo, type AnimParceiro } from "../components/batalha/Arena";
import { PARCEIROS, SpriteParceiro, tipoDaMateria } from "../components/batalha/sprites";

// ---------- persistência ----------

const CHAVE_PARTIDA = "q_batalha_partida";
const CHAVE_PERFIL = "q_batalha_perfil";

interface Perfil {
  xp: number;
  partidas: number;
  vitorias: number;
  melhorAndar: number;
  capturadas: number[];
  ultimaContada?: string; // iniciadaEm da última partida já somada (evita somar duas vezes)
}
const PERFIL_ZERO: Perfil = { xp: 0, partidas: 0, vitorias: 0, melhorAndar: 0, capturadas: [] };

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
    /* sem armazenamento: a partida vale só enquanto a aba estiver aberta */
  }
}

// ---------- itens ----------

const ITENS: Record<ItemId, { nome: string; texto: string; icone: typeof Shield }> = {
  pocao: { nome: "Poção", texto: "Vai para a mochila: +35 HP na hora que você quiser.", icone: FlaskConical },
  baga: { nome: "Baga Escudo", texto: "O próximo erro não tira HP. (Ele continua contando para a revisão.)", icone: Shield },
  elixir: { nome: "Elixir", texto: "+50 HP agora.", icone: Sparkles },
  lente: { nome: "Lente de Foco", texto: "Até o fim da partida: acertar com certeza cura 5 HP.", icone: Focus },
  amuleto: { nome: "Amuleto do Combo", texto: "Até o fim da partida: 3 acertos seguidos curam 20 HP em vez de 10.", icone: Flame },
  tomo: { nome: "Tomo do Sábio", texto: "Até o fim da partida: escrever a lição de um erro cura 20 HP em vez de 10.", icone: BookOpen },
};

// ---------- montagem da partida ----------

interface HistoricoQ {
  questaoId: number;
  tentativas: number;
  acertos: number;
  erros: number;
}

function embaralhar<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Questões nunca respondidas, começando pelas matérias em que mais erro, em rodízio (uma
// de cada matéria por vez) para a partida não virar um bloco de uma matéria só.
function novasPorFraqueza(hist: Map<number, HistoricoQ>): Candidata[] {
  const taxa = new Map<string, { a: number; t: number }>();
  const porMateria = new Map<string, Questao[]>();
  for (const q of todas()) {
    const h = hist.get(q.id);
    if (h) {
      const m = taxa.get(q.materia) ?? { a: 0, t: 0 };
      m.a += h.acertos;
      m.t += h.tentativas;
      taxa.set(q.materia, m);
    } else {
      porMateria.set(q.materia, [...(porMateria.get(q.materia) ?? []), q]);
    }
  }
  const acerto = (m: string) => {
    const x = taxa.get(m);
    return x && x.t > 0 ? x.a / x.t : 0.5;
  };
  const filas = [...porMateria.entries()]
    .sort((a, b) => acerto(a[0]) - acerto(b[0]))
    .map(([, qs]) => embaralhar(qs));
  const saida: Candidata[] = [];
  while (filas.some((f) => f.length)) {
    for (const f of filas) {
      const q = f.shift();
      if (q) saida.push({ questaoId: q.id, materia: q.materia, nivel: 0, erros: 0, dificuldade: q.dificuldade });
    }
  }
  return saida;
}

type Fase = "lobby" | "entrada" | "pergunta" | "golpe" | "resultado" | "recompensa" | "fim";

interface Desfecho {
  acertou: boolean;
  confianca: Confianca;
  eventos: Evento[];
  questaoId: number;
  marcada: Alternativa;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function Batalha() {
  usePausarFundo();
  const { tema } = useTheme();
  const { activeId } = useConcurso();
  const { goal } = useMeta();
  const parceiro = PARCEIROS[tema];

  const [perfil, setPerfil] = useState<Perfil>(() => ler<Perfil>(CHAVE_PERFIL) ?? PERFIL_ZERO);
  const [partida, setPartidaEstado] = useState<Partida | null>(() => {
    const p = ler<Partida>(CHAVE_PARTIDA);
    return p && p.versao === 1 && p.concursoId === (activeId ?? null) ? p : null;
  });
  const [fase, setFase] = useState<Fase>(() => {
    if (!partida) return "lobby";
    if (partida.fim) return "fim";
    if (partida.oferta) return "recompensa";
    return "entrada";
  });

  // Dados do lobby
  const [hist, setHist] = useState<Map<number, HistoricoQ> | null>(null);
  const [pendentes, setPendentes] = useState<Candidata[] | null>(null);
  const [erroCarga, setErroCarga] = useState(false);

  // Luta
  const [selecionada, setSelecionada] = useState<Alternativa | undefined>();
  const [animP, setAnimP] = useState<AnimParceiro>("parado");
  const [animI, setAnimI] = useState<AnimInimigo>("entra");
  const [hpVis, setHpVis] = useState(partida?.hp ?? 100);
  const [hpInimigo, setHpInimigo] = useState(100);
  const [mensagem, setMensagem] = useState(() => (partida?.oferta ? "Andar vencido! Escolha uma recompensa." : ""));
  const [desfecho, setDesfecho] = useState<Desfecho | null>(null);
  const [licao, setLicao] = useState("");
  const [confirmarFuga, setConfirmarFuga] = useState(false);
  const inicioQuestao = useRef(Date.now());
  const arenaRef = useRef<HTMLDivElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const vivo = useRef(true);
  // Religa na montagem: o StrictMode desmonta e remonta uma vez em desenvolvimento.
  useEffect(() => {
    vivo.current = true;
    return () => void (vivo.current = false);
  }, []);

  const setPartida = useCallback((p: Partida | null) => {
    setPartidaEstado(p);
    gravar(CHAVE_PARTIDA, p);
  }, []);

  // ----- lobby: fila da revisão + histórico -----
  const carregarLobby = useCallback(() => {
    setErroCarga(false);
    setPendentes(null);
    Promise.all([carregarRevisao(), api<{ questoes: HistoricoQ[] }>("/answers/por-questao")])
      .then(([fila, h]) => {
        const mapa = new Map(h.questoes.map((x) => [x.questaoId, x]));
        setHist(mapa);
        setPendentes(
          fila.questoes
            .map((i): Candidata | null => {
              const q = getQuestao(i.questaoId);
              if (!q) return null;
              return {
                questaoId: q.id,
                materia: q.materia,
                nivel: i.streak ?? 0,
                erros: mapa.get(q.id)?.erros ?? 0,
                dificuldade: q.dificuldade,
              };
            })
            .filter((c): c is Candidata => c !== null)
        );
      })
      .catch(() => setErroCarga(true));
  }, []);

  useEffect(() => {
    if (fase === "lobby") carregarLobby();
  }, [fase, carregarLobby]);

  // Histórico também serve à luta (selo "3ª vez" e ordem das alternativas).
  useEffect(() => {
    if (fase !== "lobby" && !hist) {
      api<{ questoes: HistoricoQ[] }>("/answers/por-questao")
        .then((h) => setHist(new Map(h.questoes.map((x) => [x.questaoId, x]))))
        .catch(() => setHist(new Map()));
    }
  }, [fase, hist]);

  const novas = useMemo(() => (hist ? novasPorFraqueza(hist) : []), [hist]);

  function comecar() {
    if (!pendentes) return;
    const p = montarPartida({ pendentes, novas, concursoId: activeId ?? null });
    if (!p) return;
    setPartida(p);
    setHpVis(p.hp);
    setFase("entrada");
  }

  // ----- entrada de cada questão -----
  const encontro = partida?.atual ?? null;
  const questao = encontro ? getQuestao(encontro.questaoId) : undefined;
  const tipo = questao ? tipoDaMateria(questao.materia) : null;

  useEffect(() => {
    if (fase !== "entrada" || !encontro || !questao || !tipo) return;
    setSelecionada(undefined);
    setDesfecho(null);
    setLicao("");
    setConfirmarFuga(false);
    setHpInimigo(100);
    setAnimP("parado");
    setAnimI("entra");
    setMensagem(
      encontro.tipo === "chefe"
        ? encontro.retorno
          ? "O CHEFE se levantou! Última chance."
          : "O CHEFE apareceu: a questão que mais te derrubou!"
        : encontro.retorno
          ? `A questão #${questao.id} voltou para a revanche!`
          : `Uma questão selvagem de ${tipo.nome} apareceu!`
    );
    const t = setTimeout(() => {
      setAnimI("parado");
      setMensagem(`O que ${parceiro.nome} vai fazer?`);
      setFase("pergunta");
      inicioQuestao.current = Date.now();
    }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, encontro?.questaoId, encontro?.retorno]);

  // Ao terminar, soma a partida no perfil (uma vez só).
  useEffect(() => {
    if (fase !== "fim" || !partida?.fim || perfil.ultimaContada === partida.iniciadaEm) return;
    const r = resumir(partida);
    const novo: Perfil = {
      xp: perfil.xp + partida.xp,
      partidas: perfil.partidas + 1,
      vitorias: perfil.vitorias + (partida.fim === "vitoria" ? 1 : 0),
      melhorAndar: Math.max(perfil.melhorAndar, partida.andar),
      capturadas: [...new Set([...perfil.capturadas, ...r.capturadas])],
      ultimaContada: partida.iniciadaEm,
    };
    setPerfil(novo);
    gravar(CHAVE_PERFIL, novo);
  }, [fase, partida, perfil]);

  const noCelular = () => !window.matchMedia("(min-width: 1024px)").matches;

  // ----- golpe -----
  async function golpe(confianca: Confianca) {
    if (!partida || !questao || !selecionada || fase !== "pergunta") return;
    setFase("golpe");
    const acertou = selecionada === questao.gabarito;
    const tempo = Math.round((Date.now() - inicioQuestao.current) / 1000);
    void enviarResposta(montarResultado(questao, selecionada, "BATALHA", tempo));
    const { partida: nova, eventos } = responder(partida, acertou, confianca, questao.dificuldade);
    setPartida(nova);
    setDesfecho({ acertou, confianca, eventos, questaoId: questao.id, marcada: selecionada });

    if (noCelular()) arenaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const nomeGolpe = confianca === "certeza" ? parceiro.golpeCerteza : parceiro.golpeDuvida;
    const cura = eventos.filter((e): e is Extract<Evento, { tipo: "cura" }> => e.tipo === "cura");

    setAnimP("ataca");
    if (acertou) {
      const ev = eventos.find((e) => e.tipo === "acerto") as Extract<Evento, { tipo: "acerto" }>;
      setMensagem(`${parceiro.nome} usou ${nomeGolpe}!`);
      await esperar(450);
      if (!vivo.current) return;
      setAnimP("parado");
      setAnimI("dano");
      setHpInimigo(0);
      setMensagem(ev.critico ? "Foi super efetivo! Golpe crítico!" : "Acertou!");
      await esperar(900);
      if (!vivo.current) return;
      setAnimI("desmaia");
      setMensagem(
        ev.captura
          ? `Questão CAPTURADA! Você venceu uma que já tinha te derrubado. +${ev.xp} XP`
          : `A questão desmaiou! +${ev.xp} XP`
      );
      if (cura.length) {
        await esperar(900);
        if (!vivo.current) return;
        setHpVis(nova.hp);
        setMensagem(cura.map((c) => (c.motivo === "combo" ? `Combo de ${nova.combo}! +${c.valor} HP` : `Lente de Foco: +${c.valor} HP`)).join(" · "));
      }
    } else {
      const ev = eventos.find((e) => e.tipo === "erro") as Extract<Evento, { tipo: "erro" }>;
      setMensagem(`${parceiro.nome} usou ${nomeGolpe}... e errou!`);
      await esperar(450);
      if (!vivo.current) return;
      setAnimP("parado");
      setAnimI("ataca");
      await esperar(350);
      if (!vivo.current) return;
      setAnimP("dano");
      setHpVis(nova.hp);
      setMensagem(
        ev.bloqueado
          ? "A Baga Escudo segurou o contra-ataque!"
          : `A questão contra-atacou${confianca === "certeza" ? " com tudo" : ""}! −${ev.dano} HP`
      );
      await esperar(1000);
      if (!vivo.current) return;
      setAnimP("parado");
      if (nova.fim === "derrota") setMensagem(`${parceiro.nome} desmaiou...`);
      else if (ev.volta) {
        setAnimI("foge");
        setMensagem("A questão fugiu... mas vai voltar para a revanche.");
      } else setMensagem("Ela escapou. Amanhã ela volta na revisão espaçada.");
    }
    await esperar(700);
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
    const p = avancar(partida);
    setPartida(p);
    if (p.oferta) {
      setMensagem(`Andar ${p.andar - 1} vencido! Escolha uma recompensa.`);
      setFase("recompensa");
    } else if (p.fim) setFase("fim");
    else setFase("entrada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escolher(item: ItemId) {
    if (!partida) return;
    const p = escolherItem(partida, item);
    setPartida(p);
    setHpVis(p.hp);
    setFase(p.fim ? "fim" : "entrada");
  }

  function beberPocao() {
    if (!partida) return;
    const { partida: p, curou } = usarPocao(partida);
    if (!curou) return;
    setPartida(p);
    setHpVis(p.hp);
    setMensagem(`Você usou uma Poção! +${curou} HP`);
  }

  function anotarLicao() {
    if (!partida || !desfecho) return;
    const { partida: p, curou } = registrarLicao(partida, desfecho.questaoId, licao);
    if (p === partida) return;
    setPartida(p);
    setHpVis(p.hp);
    setMensagem(curou ? `Lição anotada! ${parceiro.nome} recuperou ${curou} HP.` : "Lição anotada!");
  }

  function desistir() {
    if (!partida) return;
    setPartida(fugir(partida));
    setFase("fim");
  }

  function novaPartida() {
    setPartida(null);
    setDesfecho(null);
    setFase("lobby");
  }

  // ---------- telas ----------

  const nivel = nivelDoXp(perfil.xp + (partida && fase !== "fim" ? partida.xp : 0));

  if (fase === "lobby") {
    return (
      <Lobby
        tema={tema}
        perfil={perfil}
        pendentes={pendentes}
        novas={novas.length}
        erro={erroCarga}
        onTentar={carregarLobby}
        onComecar={comecar}
      />
    );
  }

  if (!partida) return <Carregando />;

  if (fase === "fim") {
    return <Fim partida={partida} perfil={perfil} activeId={activeId ?? null} onNova={novaPartida} />;
  }

  const hist1 = questao && hist?.get(questao.id);
  const historicoView =
    questao && hist1
      ? {
          tentativas: hist1.tentativas + (encontro?.retorno ? 1 : 0),
          erros: hist1.erros + (encontro?.retorno ? 1 : 0),
        }
      : encontro?.retorno
        ? { tentativas: 1, erros: 1 }
        : undefined;
  const licaoAnterior = desfecho ? partida.licoes[desfecho.questaoId] : undefined;

  return (
    <div className="mx-auto max-w-[1100px] pb-28 pt-2 lg:pb-10">
      <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Palco + estado da partida */}
        <div ref={arenaRef} className="scroll-mt-20 space-y-3 lg:sticky lg:top-20">
          <Arena
            tema={tema}
            parceiro={{ nome: parceiro.nome, nivel: nivel.nivel, hp: hpVis, hpMax: partida.hpMax, xp: nivel.atual, xpProx: nivel.proximo }}
            inimigo={
              fase === "recompensa" || !questao || !tipo
                ? null
                : {
                    nome: `Questão #${questao.id}`,
                    nivel: encontro?.tipo === "nova" ? null : (encontro?.nivel ?? 0) + 1,
                    tipo,
                    chefe: encontro?.tipo === "chefe",
                    hp: hpInimigo,
                    retorno: !!encontro?.retorno,
                  }
            }
            animParceiro={animP}
            animInimigo={fase === "recompensa" ? "sumido" : animI}
            mensagem={mensagem}
            aguardando={fase === "pergunta" || fase === "resultado" || fase === "recompensa"}
          />
          <Hud partida={partida} metaFeita={goal?.respondidasHoje} meta={goal?.meta} />
        </div>

        {/* Questão, resultado ou recompensa */}
        <div className="min-w-0 space-y-4">
          {fase === "recompensa" && partida.oferta && (
            <div className="space-y-3">
              <p className="font-display text-xl font-bold text-brand-ink">Escolha uma recompensa</p>
              <p className="text-sm text-muted">
                Andar {partida.andar} a seguir
                {partida.fila.every((e) => e.tipo === "chefe") ? ": é o andar do CHEFE." : "."}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {partida.oferta.map((id, i) => {
                  const it = ITENS[id];
                  const Icone = it.icone;
                  return (
                    <button key={id} className="bt-item" style={{ animationDelay: `${i * 90}ms` }} onClick={() => escolher(id)}>
                      <Icone size={26} strokeWidth={1.8} />
                      <span className="font-bold">{it.nome}</span>
                      <span className="text-sm leading-snug opacity-80">{it.texto}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(fase === "entrada" || fase === "pergunta" || fase === "golpe" || fase === "resultado") && questao && (
            <>
              <div className="card p-5 sm:p-6" style={fase === "entrada" ? { opacity: 0.35 } : undefined}>
                <QuestaoView
                  key={`${questao.id}-${encontro?.retorno ? "r" : "a"}`}
                  questao={questao}
                  selecionada={fase === "resultado" || fase === "golpe" ? desfecho?.marcada : selecionada}
                  revelado={fase === "resultado"}
                  historico={historicoView}
                  onSelecionar={(a) => fase === "pergunta" && setSelecionada(a)}
                />
              </div>

              {/* Golpes: a aposta de confiança */}
              {fase === "pergunta" && (
                <div className="sticky bottom-[72px] z-10 space-y-2 rounded-2xl border border-hair bg-surface p-2 shadow-lg lg:bottom-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bt-golpe bt-golpe--forte" disabled={!selecionada} onClick={() => void golpe("certeza")}>
                      <span className="text-sm font-extrabold">{parceiro.golpeCerteza}</span>
                      <span className="text-[11px] opacity-75">Tenho certeza · crítico, mas errar dói mais</span>
                    </button>
                    <button className="bt-golpe" disabled={!selecionada} onClick={() => void golpe("duvida")}>
                      <span className="text-sm font-extrabold">{parceiro.golpeDuvida}</span>
                      <span className="text-[11px] opacity-75">Estou na dúvida · dano normal</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={beberPocao}
                      disabled={partida.pocoes === 0 || hpVis >= partida.hpMax}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-hair bg-surface px-3 py-1.5 font-semibold text-muted transition hover:text-brand-500 disabled:opacity-40"
                    >
                      <FlaskConical size={14} /> Poção ×{partida.pocoes}
                    </button>
                    {!selecionada && <span className="hidden text-faint sm:inline">Escolha uma alternativa para atacar</span>}
                    {confirmarFuga ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-faint">Encerrar a partida?</span>
                        <button onClick={desistir} className="font-bold text-danger-from">Sim</button>
                        <button onClick={() => setConfirmarFuga(false)} className="font-semibold text-muted">Não</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmarFuga(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-hair bg-surface px-3 py-1.5 font-semibold text-muted transition hover:text-brand-500"
                      >
                        <Flag size={14} /> Fugir
                      </button>
                    )}
                  </div>
                </div>
              )}

              {fase === "resultado" && desfecho && (
                <div ref={resultadoRef} className="card scroll-mb-28 space-y-3 p-5">
                  {desfecho.acertou ? (
                    <>
                      <p className="font-display text-lg font-bold text-brand-ink">
                        {desfecho.confianca === "certeza" ? "Certeza confirmada." : "Acertou na dúvida."}
                      </p>
                      {desfecho.confianca === "duvida" && (
                        <p className="text-sm text-muted">
                          Leia a explicação acima com calma: é ela que transforma o palpite em certeza para a próxima vez.
                        </p>
                      )}
                      {licaoAnterior && (
                        <p className="rounded-xl border border-hair bg-surface2 p-3 text-sm text-brand-ink">
                          <b>Sua lição:</b> {licaoAnterior}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display text-lg font-bold text-brand-ink">
                        {desfecho.confianca === "certeza"
                          ? "Errou com certeza: essa é a que mais ensina."
                          : "Errou. Bora entender por quê."}
                      </p>
                      {partida.fim !== "derrota" && (
                        <>
                          <label className="block text-sm text-muted" htmlFor="licao">
                            Em uma frase, com suas palavras: por que a <b className="text-brand-ink">{questao.gabarito}</b> é a certa
                            {desfecho.marcada ? <> e a {desfecho.marcada} não</> : null}? Escrever cura HP.
                          </label>
                          {licaoAnterior ? (
                            <p className="rounded-xl border border-hair bg-surface2 p-3 text-sm text-brand-ink">
                              <b>Lição anotada:</b> {licaoAnterior}
                            </p>
                          ) : (
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
                          )}
                        </>
                      )}
                    </>
                  )}
                  <button onClick={continuar} className="btn-primary w-full">
                    {partida.fim ? "Ver resultado" : "Continuar ▶"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- HUD ----------

function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 rounded-full border border-hair bg-surface px-2.5 py-1 text-xs font-semibold text-brand-ink">
      {children}
    </span>
  );
}

function Hud({ partida, metaFeita, meta }: { partida: Partida; metaFeita?: number; meta?: number }) {
  const feitas = partida.registros.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip title="Andar atual">Andar {partida.andar}</Chip>
      <Chip title="Lutas vencidas / total de lutas">
        <Swords size={12} /> {partida.registros.filter((r) => r.acertou).length}/{partida.totalEncontros}
      </Chip>
      {partida.combo >= 2 && (
        <Chip title="Acertos seguidos: a cada 3, cura HP">
          <Flame size={12} className="text-orange-500" /> Combo {partida.combo}
        </Chip>
      )}
      {partida.escudos > 0 && (
        <Chip title="Baga Escudo: o próximo erro não tira HP">
          <Shield size={12} /> ×{partida.escudos}
        </Chip>
      )}
      {partida.reliquias.map((r) => {
        const Icone = ITENS[r].icone;
        return (
          <Chip key={r} title={`${ITENS[r].nome}: ${ITENS[r].texto}`}>
            <Icone size={12} /> {ITENS[r].nome}
          </Chip>
        );
      })}
      {meta !== undefined && metaFeita !== undefined && (
        <Chip title="Cada resposta da batalha conta na meta do dia e na ofensiva">
          <Trophy size={12} /> Meta {Math.min(metaFeita, meta)}/{meta}
        </Chip>
      )}
      {feitas > 0 && <Chip title="XP desta partida">+{partida.xp} XP</Chip>}
    </div>
  );
}

// ---------- lobby ----------

function Lobby({
  tema,
  perfil,
  pendentes,
  novas,
  erro,
  onTentar,
  onComecar,
}: {
  tema: ReturnType<typeof useTheme>["tema"];
  perfil: Perfil;
  pendentes: Candidata[] | null;
  novas: number;
  erro: boolean;
  onTentar: () => void;
  onComecar: () => void;
}) {
  const p = PARCEIROS[tema];
  const nv = nivelDoXp(perfil.xp);
  const revisoes = pendentes ? Math.min(pendentes.length, 12) : 0;
  const completa = pendentes ? Math.min(novas, Math.max(0, 11 - revisoes)) : 0;
  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2 pb-24">
      <PageHeader
        rotulo="Batalha"
        titulo="Masmorra da revisão"
        subtitulo="Sua revisão espaçada do dia virou uma partida: cada acerto é um golpe, cada erro é um contra-ataque."
      />

      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <div className="card flex flex-col items-center p-5 text-center">
          <div className="bt-parceiro--parado h-40 w-40">
            <SpriteParceiro tema={tema} />
          </div>
          <p className="mt-2 font-display text-xl font-bold text-brand-ink">{p.nome}</p>
          <p className="text-xs text-faint">{p.especie} · muda com o tema</p>
          <p className="mt-3 text-sm font-bold text-brand-ink">Nível {nv.nivel}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
            <div className="h-full rounded-full" style={{ width: `${(nv.atual / nv.proximo) * 100}%`, background: "var(--accent)" }} />
          </div>
          <p className="mt-1 text-[11px] text-faint">
            {nv.atual}/{nv.proximo} XP
          </p>
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-display text-lg font-bold text-brand-ink">{perfil.vitorias}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">vitórias</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-brand-ink">{perfil.capturadas.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">capturas</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-brand-ink">{perfil.melhorAndar}</p>
              <p className="text-[10px] uppercase tracking-wider text-faint">melhor andar</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            {erro ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">Não consegui carregar a sua fila de revisão.</p>
                <button onClick={onTentar} className="btn-primary text-sm">
                  Tentar de novo
                </button>
              </div>
            ) : !pendentes ? (
              <Carregando texto="Montando a masmorra…" />
            ) : revisoes + completa === 0 ? (
              <p className="text-sm text-muted">Nenhuma questão disponível neste concurso ainda.</p>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-faint">Partida de hoje</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-ink">
                  {revisoes + completa > 1 ? `${revisoes + completa - 1} lutas + chefe` : "1 luta"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {revisoes > 0 ? (
                    <>
                      <b className="text-brand-ink">{revisoes}</b> da sua revisão espaçada (as mais atrasadas primeiro)
                      {completa > 0 ? <> e <b className="text-brand-ink">{completa}</b> questões novas das matérias em que você mais erra</> : null}.
                    </>
                  ) : (
                    <>Sem revisão pendente hoje: a partida usa questões novas das matérias em que você mais erra.</>
                  )}
                </p>
                <button onClick={onComecar} className="btn-primary mt-4 w-full sm:w-auto">
                  <Swords size={18} className="mr-2 inline" /> Começar partida
                </button>
              </>
            )}
          </div>

          <div className="card space-y-2.5 p-5 text-sm text-muted">
            <p className="font-display text-base font-bold text-brand-ink">Como se joga (e por que isso ajuda)</p>
            <p>
              <b className="text-brand-ink">Escolha a alternativa e o golpe.</b> O golpe forte é dizer "tenho certeza": acerto
              vira crítico, erro dói mais. Apostar a certeza treina saber o que você sabe, e erro com certeza é o que mais fica
              na memória depois de corrigido.
            </p>
            <p>
              <b className="text-brand-ink">Errou? A questão foge e volta</b> três lutas depois, com as alternativas em outra ordem.
              Antes, escreva em uma frase por que o gabarito está certo: isso cura HP e é a melhor forma de fixar.
            </p>
            <p>
              <b className="text-brand-ink">Vencer uma questão que já te derrubou é captura.</b> A cada 4 vitórias, escolha uma
              recompensa. No fim, o chefe é a questão em que você mais errou.
            </p>
            <p className="text-faint">
              Cada resposta é gravada como estudo de verdade: conta na meta do dia, na ofensiva e reagenda a revisão espaçada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- fim ----------

function Fim({ partida, perfil, activeId, onNova }: { partida: Partida; perfil: Perfil; activeId: string | null; onNova: () => void }) {
  const r = resumir(partida);
  const [salvando, setSalvando] = useState<"nao" | "salvando" | "salvo" | "erro">("nao");
  const licoes = Object.entries(partida.licoes);
  const pct = (x: { total: number; acertos: number }) => (x.total ? Math.round((x.acertos / x.total) * 100) : 0);

  const titulo =
    partida.fim === "vitoria" ? "Vitória!" : partida.fim === "derrota" ? "Seu parceiro desmaiou" : "Você fugiu da masmorra";
  const Icone = partida.fim === "vitoria" ? Trophy : partida.fim === "derrota" ? Skull : Flag;

  let calibragem = "Responda mais algumas com o golpe forte para medir a sua certeza.";
  if (r.certeza.total >= 3 && pct(r.certeza) < 70)
    calibragem = `Sua certeza anda otimista: ${pct(r.certeza)}% de acerto quando tinha certeza. Nessas matérias, desconfie do "óbvio" e releia o enunciado.`;
  else if (r.duvida.total >= 3 && pct(r.duvida) >= 80)
    calibragem = `Você sabe mais do que acha: ${pct(r.duvida)}% de acerto na dúvida. Pode arriscar o golpe forte.`;
  else if (r.certeza.total >= 3) calibragem = `Certeza bem calibrada: ${pct(r.certeza)}% de acerto quando tinha certeza.`;

  async function salvarLicoes() {
    if (!activeId || licoes.length === 0) return;
    setSalvando("salvando");
    try {
      const porMateria = new Map<string, string[]>();
      for (const [id, texto] of licoes) {
        const q = getQuestao(Number(id));
        if (!q) continue;
        const curto = q.enunciado.replace(/\s+/g, " ").trim().slice(0, 220);
        const bloco = `<h3>Questão ${q.id} · gabarito ${q.gabarito}</h3><blockquote><p>${escapar(curto)}${q.enunciado.length > 220 ? "…" : ""}</p></blockquote><p>${escapar(texto)}</p>`;
        porMateria.set(q.materia, [...(porMateria.get(q.materia) ?? []), bloco]);
      }
      const dia = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      for (const [materia, blocos] of porMateria) {
        const titulo = `Lições da batalha · ${dia}`;
        const { pagina } = await criarPagina(activeId, materia, titulo);
        await salvarPagina(pagina.id, { titulo, materia, formato: "html", conteudo: blocos.join("") });
      }
      setSalvando("salvo");
    } catch {
      setSalvando("erro");
    }
  }

  return (
    <div className="fadeup mx-auto max-w-[760px] space-y-4 pt-4 pb-24">
      <div className="card p-6 text-center">
        <Icone size={40} className="mx-auto text-brand-500" strokeWidth={1.6} />
        <p className="mt-2 font-display text-3xl font-bold text-brand-ink">{titulo}</p>
        <p className="mt-1 text-muted">
          Andar {partida.andar} · {r.acertos}/{r.respondidas} acertos · +{partida.xp} XP
        </p>
        <p className="mt-1 text-xs text-faint">
          {r.respondidas} respostas contaram na meta do dia e na ofensiva. Nível do parceiro: {nivelDoXp(perfil.xp).nivel}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Capturas</p>
          <p className={`mt-1 font-display text-2xl font-bold text-brand-ink ${r.capturadas.length ? "bt-captura" : ""}`}>{r.capturadas.length}</p>
          <p className="text-xs text-muted">questões que já tinham te derrubado</p>
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
        <p className="text-sm text-muted">{calibragem}</p>
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
            onClick={() => void salvarLicoes()}
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
          <RotateCcw size={16} className="mr-2 inline" /> Nova partida
        </button>
        <Link to="/revisar" className="flex-1 rounded-2xl border border-hair px-5 py-3 text-center font-display font-bold text-muted transition hover:text-brand-500">
          Ver a revisão espaçada
        </Link>
      </div>
    </div>
  );
}
