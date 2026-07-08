// Modo SIMULADO (sábado): 70 questões na proporção da prova, ênfase nas erradas da semana.
// Sem feedback imediato; anotações ocultas; cronômetro opcional de 4h; resultado ponderado.
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { todas } from "../lib/questoesRepo";
import { montarSimulado, type SemanaItem } from "../lib/sessionBuilder";
import { montarResultado } from "../lib/correcao";
import { enviarLote } from "../lib/answers";
import { SIMULADO_DURACAO_MIN, TOTAL_SIMULADO } from "../config/prova";
import { SessionRunner, type RespostaSessao, type SessionRunnerHandle } from "../components/SessionRunner";
import { Cronometro } from "../components/Cronometro";
import { ResultadoSimulado } from "../components/ResultadoSimulado";
import type { Questao } from "../types/questao";

type Fase = "intro" | "rodando" | "resultado";

export function Simulado() {
  const [fase, setFase] = useState<Fase>("intro");
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
      setAviso("Sem conexão — montando o simulado sem histórico da semana.");
    }
    const sim = montarSimulado({ semana, todas: todas() });
    if (sim.length < TOTAL_SIMULADO) {
      setAviso(
        `Só foi possível montar ${sim.length}/${TOTAL_SIMULADO} questões — adicione mais questões ao banco para fechar a proporção.`
      );
    }
    setQuestoes(sim);
    setFase("rodando");
    setCarregando(false);
  }

  async function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setFase("resultado");
    // envia em lote só as efetivamente respondidas
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
        permiteNota={false}
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

  return (
    <div className="mx-auto max-w-md space-y-5 p-6 text-center">
      <div className="text-5xl">📝</div>
      <h1 className="text-2xl font-bold">Simulado</h1>
      <p className="text-slate-400">
        70 questões mantendo a proporção da prova (Módulo I = 40, Módulo II = 30), sorteadas das
        que você respondeu na semana — com ênfase nas que errou. Sem feedback até o final.
      </p>
      <label className="card flex items-center justify-between gap-2 p-4 text-left text-sm">
        <span>
          Cronômetro de 4h (opcional)
          <span className="block text-xs text-slate-400">Simula o tempo real da prova, pausável.</span>
        </span>
        <input type="checkbox" checked={usarCronometro} onChange={(e) => setUsarCronometro(e.target.checked)} />
      </label>
      {aviso && <p className="text-sm text-amber-500">{aviso}</p>}
      <button onClick={iniciar} disabled={carregando} className="btn-primary w-full">
        {carregando ? "Montando simulado…" : "Iniciar simulado"}
      </button>
    </div>
  );
}
