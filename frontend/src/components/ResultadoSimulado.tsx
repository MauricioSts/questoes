// Tela de resultado do simulado: nota ponderada real, acertos por matéria, estimativa de
// aprovação e revisão questão a questão com explicações.
import { useMemo, useState } from "react";
import { Check, TrendingUp, Trophy, X } from "lucide-react";
import type { RespostaSessao } from "./SessionRunner";
import { formatarPeso, notaSimulado, type ConfigSimulado } from "../lib/simuladoConfig";
import { QuestaoView } from "./QuestaoView";

export function ResultadoSimulado({
  respostas,
  config,
  cortes,
  onSair,
}: {
  respostas: RespostaSessao[];
  config: ConfigSimulado;
  // Trilha com perfil de prova: cortes do edital (ampla e cotas) para a nota máxima.
  cortes?: (maximo: number) => { ampla: number; cotas: number | null };
  onSair: () => void;
}) {
  const [revisando, setRevisando] = useState(false);

  const nota = useMemo(
    () => notaSimulado(config, respostas.map((r) => ({ materia: r.questao.materia, acertou: r.acertou }))),
    [respostas, config]
  );
  const pesosDiferentes = new Set(config.itens.map((i) => i.peso)).size > 1;

  // acertos por matéria
  const porMateria = useMemo(() => {
    const map = new Map<string, { acertos: number; total: number }>();
    for (const r of respostas) {
      const cur = map.get(r.questao.materia) ?? { acertos: 0, total: 0 };
      cur.total++;
      if (r.acertou) cur.acertos++;
      map.set(r.questao.materia, cur);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [respostas]);

  if (revisando) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <button onClick={() => setRevisando(false)} className="text-sm text-brand">← Voltar ao resultado</button>
        {respostas.map((r, i) => (
          <div key={r.questao.id} className="border-b border-slate-200 pb-6 dark:border-slate-800">
            <p className="mb-2 text-xs text-slate-400">Questão {i + 1}</p>
            <QuestaoView questao={r.questao} selecionada={r.marcada} revelado metadados="origem" onSelecionar={() => {}} />
          </div>
        ))}
        <button onClick={onSair} className="btn-primary w-full">Concluir</button>
      </div>
    );
  }

  const corteEdital = cortes?.(nota.totalPontosPossivel);
  const pctNota = nota.totalPontosPossivel ? Math.round((nota.pontos / nota.totalPontosPossivel) * 100) : 0;

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
        style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        {nota.aprovadoEstimado ? <Trophy size={30} strokeWidth={2} /> : <TrendingUp size={30} strokeWidth={2} />}
      </div>
      <h1 className="text-2xl font-bold">Resultado do Simulado</h1>

      <div className="card space-y-1 p-6">
        <p className="text-sm text-slate-400">{pesosDiferentes ? "Nota ponderada pelos pesos do seu simulado" : "Nota"}</p>
        <p className="text-4xl font-bold tabular-nums">
          {nota.pontos.toFixed(1)}
          <span className="text-xl text-slate-400"> / {formatarPeso(nota.totalPontosPossivel)}</span>
        </p>
        <p className="text-slate-400">
          {nota.acertos}/{nota.total} acertos · {pctNota}%
        </p>
        <p className={`mt-2 flex items-center justify-center gap-1.5 font-semibold ${nota.aprovadoEstimado ? "text-acerto" : "text-erro"}`}>
          {nota.aprovadoEstimado ? <Check size={18} strokeWidth={2.6} /> : <X size={18} strokeWidth={2.6} />}
          {nota.aprovadoEstimado
            ? "Acima do corte estimado"
            : `Abaixo do corte (${formatarPeso(nota.corte)} pts, ${config.notaCortePct}%)`}
        </p>
      </div>

      {corteEdital && (
        <div className="card space-y-2 p-4 text-left">
          <p className="text-sm font-semibold">Corte do edital</p>
          <LinhaCorte rotulo="Ampla concorrência" corte={corteEdital.ampla} maximo={nota.totalPontosPossivel} pontos={nota.pontos} />
          {corteEdital.cotas != null && (
            <LinhaCorte rotulo="Cotas" corte={corteEdital.cotas} maximo={nota.totalPontosPossivel} pontos={nota.pontos} />
          )}
        </div>
      )}

      <div className="card p-4 text-left">
        <p className="mb-2 text-sm font-semibold">Acertos por matéria</p>
        <ul className="space-y-1 text-sm">
          {porMateria.map(([materia, v]) => {
            const pct = Math.round((v.acertos / v.total) * 100);
            return (
              <li key={materia} className="flex items-center gap-2">
                <span className="w-40 truncate text-slate-500">{materia}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full ${pct >= 50 ? "bg-acerto" : "bg-erro"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 text-right tabular-nums text-slate-400">
                  {v.acertos}/{v.total}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={() => setRevisando(true)} className="btn-primary w-full">
          Revisar questão a questão
        </button>
        <button onClick={onSair} className="tap rounded-xl px-4 py-2 text-slate-500">
          Sair
        </button>
      </div>
    </div>
  );
}

// Uma linha do corte do edital: "36 de 60" e se a nota passou dele.
function LinhaCorte({ rotulo, corte, maximo, pontos }: { rotulo: string; corte: number; maximo: number; pontos: number }) {
  const passou = pontos >= corte;
  return (
    <p className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{rotulo}</span>
      <span
        className="flex items-center gap-1.5 font-semibold tabular-nums"
        style={{ color: passou ? "var(--goodText)" : "var(--accentText)" }}
      >
        {passou ? <Check size={15} strokeWidth={2.6} /> : <X size={15} strokeWidth={2.6} />}
        {formatarPeso(corte)} de {formatarPeso(maximo)}
      </span>
    </p>
  );
}
