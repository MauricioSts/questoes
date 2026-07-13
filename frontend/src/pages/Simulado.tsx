import { useRef, useState } from "react";
import { FileText, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { SimuladosAnteriores } from "../components/SimuladosAnteriores";
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

  // Conteúdo da aba "Novo simulado": bloqueado fora de sábado, senão a tela de início.
  const conteudoNovo = !ehDiaDeSimulado() ? (
    <Card className="p-8 text-center space-y-3">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-success-soft flex items-center justify-center">
        <Lock size={26} className="text-success-from" strokeWidth={2} />
      </div>
      <h1 className="font-display text-2xl font-extrabold text-brand-ink">Simulado é aos sábados</h1>
      <p className="text-sm text-faint">
        O simulado completo fica disponível só aos sábados, no clima de prova real. Volte no
        sábado — enquanto isso, treine no modo Estudar, Flash ou Revisar. Você ainda pode revisar
        seus simulados anteriores na aba acima.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 font-display font-extrabold text-white transition hover:-translate-y-0.5"
      >
        Voltar ao início
      </Link>
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
            <p className="text-xs text-faint mt-3">Pausável — zera e finaliza sozinho</p>
          </Card>
        </div>
      </div>

      {/* Aviso */}
      {aviso && (
        <div className="rounded-xl bg-yellow-100 border border-yellow-300 p-4 text-sm text-yellow-800">
          {aviso}
        </div>
      )}

      {/* Botão */}
      <Button
        onClick={iniciar}
        disabled={carregando}
        fullWidth
        size="lg"
        variant="primary"
        className="bg-gradient-to-r from-success-from to-success-to"
      >
        {carregando ? "Montando simulado…" : "Iniciar simulado"}
      </Button>
    </>
  );

  return (
    <div className="mx-auto max-w-[620px] space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-success-soft flex items-center justify-center flex-shrink-0">
          <FileText size={24} className="text-success-from" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Simulado</h1>
          <p className="text-sm text-faint">70 questões na proporção real da prova — sem feedback até o fim</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 rounded-2xl bg-hair/50 p-1">
        {([
          ["novo", "Novo simulado"],
          ["anteriores", "Anteriores"],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAba(val)}
            className={`tap flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              aba === val ? "bg-surface text-brand-ink shadow-sm" : "text-faint hover:text-brand-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "novo" ? conteudoNovo : <SimuladosAnteriores />}
    </div>
  );
}
