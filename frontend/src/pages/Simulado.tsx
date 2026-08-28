import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { SimuladosAnteriores } from "../components/SimuladosAnteriores";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { ehDiaDeSimulado } from "../lib/agenda";
import { todas } from "../lib/questoesRepo";
import { montarSimulado, type SemanaItem } from "../lib/sessionBuilder";
import { montarResultado } from "../lib/correcao";
import { enviarLote } from "../lib/answers";
import { SIMULADO_DURACAO_MIN, TOTAL_SIMULADO } from "../config/prova";
import { SessionRunner, type RespostaSessao, type SessionRunnerHandle } from "../components/SessionRunner";
import { Cronometro } from "../components/Cronometro";
import { ResultadoSimulado } from "../components/ResultadoSimulado";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import type { Questao } from "../types/questao";

type Fase = "intro" | "rodando" | "resultado";
type Aba = "novo" | "anteriores";

const COMPOSICAO = [
  { nome: "Português", mod: "I", qtd: 12, cor: "brand" },
  { nome: "Inglês", mod: "I", qtd: 12, cor: "brand" },
  { nome: "RLM", mod: "I", qtd: 5, cor: "brand" },
  { nome: "Atualidades + IA", mod: "I", qtd: 6, cor: "brand" },
  { nome: "Legislação", mod: "I", qtd: 5, cor: "brand" },
  { nome: "Módulo II", mod: "II", qtd: 30, cor: "success" },
];

export function Simulado() {
  const [fase, setFase] = useState<Fase>("intro");
  const [aba, setAba] = useState<Aba>("novo");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [resultado, setResultado] = useState<RespostaSessao[]>([]);
  const [usarCronometro, setUsarCronometro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const runnerRef = useRef<SessionRunnerHandle>(null);

  async function iniciar() {
    setCarregando(true);
    setAviso(null);
    let semana: SemanaItem[] = [];
    try {
      const r = await api<{ questoes: SemanaItem[] }>("/answers/week");
      semana = r.questoes;
    } catch {
      setAviso("Sem conexão. Montando o simulado sem histórico da semana.");
    }
    const sim = montarSimulado({ semana, todas: todas() });
    if (sim.length < TOTAL_SIMULADO) {
      setAviso(
        `Só foi possível montar ${sim.length}/${TOTAL_SIMULADO} questões. Adicione mais questões ao banco para fechar a proporção.`
      );
    }
    setQuestoes(sim);
    setFase("rodando");
    setCarregando(false);
  }

  async function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setFase("resultado");
    const lote = rs
      .filter((r) => r.marcada)
      .map((r) => montarResultado(r.questao, r.marcada!, "SIMULADO", r.tempoSegundos));
    if (lote.length) await enviarLote(lote);
  }

  if (fase === "resultado") {
    return <ResultadoSimulado respostas={resultado} onSair={() => setFase("intro")} />;
  }

  if (fase === "rodando") {
    return (
      <SessionRunner
        ref={runnerRef}
        questoes={questoes}
        contexto="SIMULADO"
        feedbackImediato={false}
        permiteCaderno={false}
        permiteMarcar={false}
        onFinalizar={finalizar}
        cabecalho={
          usarCronometro ? (
            <Cronometro minutos={SIMULADO_DURACAO_MIN} onFim={() => runnerRef.current?.finalizar()} />
          ) : null
        }
      />
    );
  }

  // Conteúdo da aba "Novo simulado": bloqueado fora de sábado, senão a tela de início.
  const conteudoNovo = !ehDiaDeSimulado() ? (
    <Card className="p-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-hair" style={{ background: "var(--surface2)" }}>
        <Lock size={26} className="text-faint" strokeWidth={2} />
      </div>
      <h2 className="mt-5 font-display font-bold text-brand-ink" style={{ fontSize: 30, fontWeight: "var(--displayWeight)" as never }}>
        Abre no sábado
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        O simulado completo libera aos sábados, sorteado a partir do que você respondeu na semana,
        com ênfase nas erradas. Nota ponderada de até 115 pontos (Módulo I peso 1, Módulo II peso 2,5).
      </p>
      <div className="mx-auto mt-8 flex max-w-sm items-start justify-center gap-10">
        <StatSimulado n="70" label="questões" />
        <StatSimulado n="4h" label="cronômetro" />
        <StatSimulado n="115" label="pontos" />
      </div>
    </Card>
  ) : (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Composição */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display font-extrabold text-brand-ink">Composição</h2>

          {COMPOSICAO.map((item) => {
            const barWidth = (item.qtd / TOTAL_SIMULADO) * 100;
            return (
              <div key={item.nome} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-brand-ink">{item.nome}</span>
                  <span className="text-xs text-faint font-semibold">{item.qtd}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-hair overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.cor === "brand"
                        ? "bg-brand-400"
                        : "bg-gradient-to-r from-success-from to-success-to"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Pontuação e Cronômetro */}
        <div className="space-y-4">
          {/* Pontuação máxima */}
          <Card className="bg-gradient-to-br from-brand-900 to-brand-800 text-white p-6 space-y-2">
            <p className="text-xs font-bold uppercase text-cyan-from opacity-80 tracking-widest">
              Pontuação Máxima
            </p>
            <p className="font-display text-3xl font-extrabold">115 pts</p>
            <p className="text-xs opacity-80">
              Mód. I (peso 1) + Mód. II (peso 2,5)
            </p>
          </Card>

          {/* Cronômetro */}
          <Card className="p-6">
            <Toggle
              checked={usarCronometro}
              onChange={setUsarCronometro}
              label="Cronômetro de 4h"
              ariaLabel="Ativar cronômetro para simular tempo real da prova"
            />
            <p className="text-xs text-faint mt-3">Pausável, zera e finaliza sozinho</p>
          </Card>
        </div>
      </div>

      {/* Aviso */}
      {aviso && (
        <div className="rounded-xl bg-yellow-100 border border-yellow-300 p-4 text-sm text-yellow-800">
          {aviso}
        </div>
      )}

      {/* Aviso */}
      {aviso && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}>
          {aviso}
        </div>
      )}

      {/* Botão */}
      <Button onClick={iniciar} disabled={carregando} fullWidth size="lg">
        {carregando ? "Montando simulado…" : "Iniciar simulado"}
      </Button>
    </>
  );

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Simulado"
        titulo="Prova completa"
        subtitulo="70 questões na proporção real, sem feedback até o fim."
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

      <div className="space-y-6">{aba === "novo" ? conteudoNovo : <SimuladosAnteriores />}</div>
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
