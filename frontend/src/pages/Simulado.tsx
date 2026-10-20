import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Play } from "lucide-react";
import { SimuladosAnteriores } from "../components/SimuladosAnteriores";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { ehDiaDeSimulado } from "../lib/agenda";
import { todas, getQuestoes } from "../lib/questoesRepo";
import { montarSimulado, type SemanaItem, type HistoricoSimulado } from "../lib/sessionBuilder";
import { montarResultado } from "../lib/correcao";
import { enviarLote } from "../lib/answers";
import {
  carregarProva,
  salvarProva,
  descartarProva,
  type ProvaEmAndamento,
} from "../lib/provaEmAndamento";
import { configDoPerfil, configPadrao, cortesDoPerfil, formatarPeso, totalPontos, totalQuestoes, type ConfigSimulado } from "../lib/simuladoConfig";
import { atualizarConcurso } from "../lib/multiApi";
import { useConcurso } from "../store/concurso";
import { useQuestoes } from "../store/questoes";
import { EditorSimulado } from "../components/EditorSimulado";
import type { RespostaSessao } from "../components/SessionRunner";
import { ProvaCompleta, type ProvaCompletaHandle } from "../components/ProvaCompleta";
import { Cronometro } from "../components/Cronometro";
import { Carregando, Spinner } from "../components/Spinner";
import { ResultadoSimulado } from "../components/ResultadoSimulado";
import { SimuladoCE } from "../components/SimuladoCE";
import { ehPerfilCertoErrado, type PerfilProva } from "../lib/notaCE";
import { usePerfilProva } from "../hooks/usePerfilProva";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import type { Questao, Alternativa } from "../types/questao";

type Fase = "intro" | "rodando" | "resultado";
type Aba = "novo" | "anteriores";

// Trilha com perfil de prova certo/errado (CGU, Bacen) usa o simulado C/E; as demais,
// o de múltipla escolha configurável por matéria — com o padrão tirado do perfil quando
// a trilha tem um de múltipla escolha (TJPB).
export function Simulado() {
  const { ativo } = useConcurso();
  const perfil = usePerfilProva(); // offline: null, cai no simulado de sempre

  if (perfil === undefined) return <Carregando />;
  if (perfil && ativo && ehPerfilCertoErrado(perfil.dados)) {
    return <SimuladoCE perfil={perfil.dados} perfilId={perfil.id} concursoId={ativo.id} />;
  }
  return <SimuladoMultiplaEscolha perfil={perfil?.dados ?? null} />;
}

function SimuladoMultiplaEscolha({ perfil }: { perfil: PerfilProva | null }) {
  const [fase, setFase] = useState<Fase>("intro");
  const [aba, setAba] = useState<Aba>("novo");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [resultado, setResultado] = useState<RespostaSessao[]>([]);
  const [usarCronometro, setUsarCronometro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const provaRef = useRef<ProvaCompletaHandle>(null);
  // Configuração do simulado deste concurso (a do usuário ou o padrão da trilha).
  const { ativo, refresh: recarregarConcursos } = useConcurso();
  const { total: totalBanco } = useQuestoes();
  const padrao = useMemo(
    () => (perfil ? configDoPerfil(perfil) : configPadrao(ativo?.trilhaId, todas())),
    [perfil, ativo?.trilhaId, totalBanco] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const config: ConfigSimulado = ativo?.simuladoConfig ?? padrao;
  const disponivelPorMateria = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of todas()) m.set(q.materia, (m.get(q.materia) ?? 0) + 1);
    return m;
  }, [totalBanco]); // eslint-disable-line react-hooks/exhaustive-deps
  const nQuestoes = totalQuestoes(config);

  async function salvarConfig(c: ConfigSimulado | null) {
    if (!ativo) return;
    await atualizarConcurso(ativo.id, { simuladoConfig: c });
    await recarregarConcursos();
  }
  // Prova guardada de uma sessão anterior (saiu no meio, deu F5, fechou a aba).
  const [emAndamento, setEmAndamento] = useState<ProvaEmAndamento | null>(null);
  const [retomada, setRetomada] = useState<ProvaEmAndamento | null>(null);
  // Relógio da prova em curso, guardado junto com as marcações.
  const estadoRef = useRef<{
    marcadas: [number, Alternativa][];
    tempos: [number, number][];
    restante: number | null;
    iniciadaEm: number;
  }>({ marcadas: [], tempos: [], restante: null, iniciadaEm: Date.now() });

  useEffect(() => {
    setEmAndamento(carregarProva());
  }, []);

  // Grava a prova inteira (questões + marcações + relógio) no armazenamento local.
  function guardar(ids: number[]) {
    const e = estadoRef.current;
    salvarProva({
      questaoIds: ids,
      marcadas: e.marcadas,
      tempos: e.tempos,
      restanteSegundos: e.restante,
      iniciadaEm: e.iniciadaEm,
    });
  }

  async function iniciar() {
    setCarregando(true);
    setAviso(null);
    let semana: SemanaItem[] = [];
    let historico: HistoricoSimulado | undefined;
    try {
      const [r, ids] = await Promise.all([
        api<{ questoes: SemanaItem[] }>("/answers/week"),
        api<{ erradas: number[]; ultima?: Record<string, number> }>("/answers/ids"),
      ]);
      semana = r.questoes;
      historico = {
        erradas: new Set(ids.erradas),
        ultima: new Map(Object.entries(ids.ultima ?? {}).map(([id, t]) => [Number(id), t])),
      };
    } catch {
      setAviso("Sem conexão. Montando o simulado sem histórico da semana.");
    }
    const sim = montarSimulado({ semana, todas: todas(), historico, config });
    if (sim.length < nQuestoes) {
      setAviso(
        `Só foi possível montar ${sim.length}/${nQuestoes} questões: o banco não tem o suficiente de alguma matéria.`
      );
    }
    setQuestoes(sim);
    estadoRef.current = {
      marcadas: [],
      tempos: [],
      restante: usarCronometro ? config.duracaoMin * 60 : null,
      iniciadaEm: Date.now(),
    };
    setRetomada(null);
    setEmAndamento(null);
    guardar(sim.map((q) => q.id));
    setFase("rodando");
    setCarregando(false);
  }

  // Retoma a prova guardada: as mesmas questões, na mesma ordem, com o que já foi
  // marcado. Se alguma questão sumiu do banco (reimportação), a prova não serve mais.
  function retomar(p: ProvaEmAndamento) {
    const qs = getQuestoes(p.questaoIds);
    if (qs.length !== p.questaoIds.length) {
      setAviso("A prova guardada não bate mais com o banco de questões atual. Comece uma nova.");
      descartarProva();
      setEmAndamento(null);
      return;
    }
    estadoRef.current = {
      marcadas: p.marcadas,
      tempos: p.tempos,
      restante: p.restanteSegundos,
      iniciadaEm: p.iniciadaEm,
    };
    setQuestoes(qs);
    setRetomada(p);
    setUsarCronometro(p.restanteSegundos != null);
    setFase("rodando");
  }

  function descartar() {
    descartarProva();
    setEmAndamento(null);
  }

  async function finalizar(rs: RespostaSessao[]) {
    descartarProva(); // prova encerrada: não há mais o que retomar
    setEmAndamento(null);
    setRetomada(null);
    setResultado(rs);
    setFase("resultado");
    const lote = rs
      .filter((r) => r.marcada)
      .map((r) => montarResultado(r.questao, r.marcada!, "SIMULADO", r.tempoSegundos));
    if (lote.length) await enviarLote(lote);
  }

  if (fase === "resultado") {
    return (
      <ResultadoSimulado
        respostas={resultado}
        config={config}
        cortes={perfil ? (maximo) => cortesDoPerfil(perfil, maximo) : undefined}
        onSair={() => setFase("intro")}
      />
    );
  }

  if (fase === "rodando") {
    return (
      <ProvaCompleta
        ref={provaRef}
        questoes={questoes}
        marcadasIniciais={retomada?.marcadas}
        temposIniciais={retomada?.tempos}
        onMudar={(marcadas, tempos) => {
          estadoRef.current.marcadas = marcadas;
          estadoRef.current.tempos = tempos;
          guardar(questoes.map((q) => q.id));
        }}
        onFinalizar={finalizar}
        onSair={() => {
          setEmAndamento(carregarProva());
          setFase("intro");
        }}
        cabecalho={
          usarCronometro ? (
            <Cronometro
              minutos={config.duracaoMin}
              segundosIniciais={retomada?.restanteSegundos ?? undefined}
              onTick={(restante) => {
                estadoRef.current.restante = restante;
              }}
              onFim={() => provaRef.current?.finalizar()}
            />
          ) : null
        }
      />
    );
  }

  // Prova guardada: aparece antes de tudo, inclusive fora de sábado — quem começou no
  // sábado e saiu no meio tem direito de terminar.
  const respondidasGuardadas = emAndamento?.marcadas.length ?? 0;
  const cartaoRetomar = emAndamento && (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Play size={20} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} strokeWidth={2.2} />
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-brand-ink">Prova em andamento</h2>
          <p className="mt-1 text-sm text-muted">
            {respondidasGuardadas} de {emAndamento.questaoIds.length} respondidas
            {emAndamento.restanteSegundos != null &&
              ` · ${Math.floor(emAndamento.restanteSegundos / 60)} min de cronômetro`}
            . Guardada em {new Date(emAndamento.salvaEm).toLocaleString("pt-BR")}.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retomar(emAndamento)}>Retomar prova</Button>
        <button
          onClick={descartar}
          className="tap rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:text-brand-500"
        >
          Descartar
        </button>
      </div>
    </Card>
  );

  const duracao = config.duracaoMin >= 60
    ? `${Math.floor(config.duracaoMin / 60)}h${config.duracaoMin % 60 ? String(config.duracaoMin % 60).padStart(2, "0") : ""}`
    : `${config.duracaoMin} min`;
  const bloqueado = config.soSabado && !ehDiaDeSimulado();

  // Aba "Novo simulado": o editor sempre aparece (é nele que se desliga o "só sábado");
  // o botão de começar dá lugar ao aviso quando hoje não é dia.
  const conteudoNovo = (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
        <EditorSimulado
          key={JSON.stringify(config)}
          config={config}
          personalizado={!!ativo?.simuladoConfig}
          disponivelPorMateria={disponivelPorMateria}
          onSalvar={salvarConfig}
          onRestaurar={() => salvarConfig(null)}
        />
        <div className="space-y-4">
          <Card className="space-y-3 p-6">
            <StatSimulado n={String(nQuestoes)} label="questões" />
            <StatSimulado n={duracao} label="cronômetro" />
            <StatSimulado n={formatarPeso(totalPontos(config))} label="pontos" />
          </Card>
          <Card className="p-6">
            <Toggle
              checked={usarCronometro}
              onChange={setUsarCronometro}
              label={`Cronômetro de ${duracao}`}
              ariaLabel="Ativar cronômetro para simular o tempo da prova"
            />
            <p className="mt-3 text-xs text-faint">Pausável, zera e finaliza sozinho</p>
          </Card>
        </div>
      </div>

      {aviso && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}>
          {aviso}
        </div>
      )}

      {bloqueado ? (
        <Card className="flex items-center gap-4 p-6">
          <Lock size={22} className="flex-shrink-0 text-faint" strokeWidth={2} />
          <p className="text-sm text-muted">
            Seu simulado está configurado para abrir só aos sábados. Para fazer hoje, desligue "Liberar só aos sábados" e salve.
          </p>
        </Card>
      ) : (
        <Button onClick={iniciar} disabled={carregando || nQuestoes === 0} fullWidth size="lg">
          {carregando ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner className="" />
              Montando simulado…
            </span>
          ) : (
            "Iniciar simulado"
          )}
        </Button>
      )}
    </>
  );

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Simulado"
        titulo="Prova completa"
        subtitulo={`${nQuestoes} questões na composição que você escolher. Folheie a prova inteira, marque e desmarque; a correção só vem no fim.`}
      />

      {/* Abas (underline) */}
      <div className="mb-5 flex items-center gap-6 border-b border-hair">
        {([
          ["novo", "Novo simulado"],
          ["anteriores", "Anteriores"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAba(val)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-display font-bold transition ${
              aba === val ? "border-brand-500 text-brand-ink" : "border-transparent text-faint hover:text-brand-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {aba === "novo" ? (
          <>
            {cartaoRetomar}
            {conteudoNovo}
          </>
        ) : (
          <SimuladosAnteriores config={config} />
        )}
      </div>
    </div>
  );
}

function StatSimulado({ n, label }: { n: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="font-display font-bold text-brand-ink" style={{ fontSize: 26 }}>{n}</span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-faint">{label}</span>
    </span>
  );
}
