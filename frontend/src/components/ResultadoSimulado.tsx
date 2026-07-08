// Tela de resultado do simulado: nota ponderada real, acertos por matéria, estimativa de
// aprovação e revisão questão a questão com explicações.
import { useMemo, useState } from "react";
import type { RespostaSessao } from "./SessionRunner";
import { calcularNotaSimulado } from "../lib/sessionBuilder";
import { NOTA_CORTE_PONTOS, TOTAL_PONTOS } from "../config/prova";
import { QuestaoView } from "./QuestaoView";

export function ResultadoSimulado({
  respostas,
  onSair,
}: {
  respostas: RespostaSessao[];
  onSair: () => void;
}) {
  const [revisando, setRevisando] = useState(false);

  const nota = useMemo(
    () =>
      calcularNotaSimulado(
        respostas.map((r) => ({ modulo: r.questao.modulo, acertou: r.acertou }))
      ),
    [respostas]
  );

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
            <QuestaoView questao={r.questao} selecionada={r.marcada} revelado onSelecionar={() => {}} />
          </div>
        ))}
        <button onClick={onSair} className="btn-primary w-full">Concluir</button>
      </div>
    );
  }

  const pctNota = Math.round((nota.pontos / TOTAL_PONTOS) * 100);

  return (
    <div className="mx-auto max-w-md space-y-5 p-4 text-center">
      <div className="text-5xl">{nota.aprovadoEstimado ? "🏆" : "📈"}</div>
      <h1 className="text-2xl font-bold">Resultado do Simulado</h1>

      <div className="card space-y-1 p-6">
        <p className="text-sm text-slate-400">Nota ponderada (Mód. I ×1, Mód. II ×2,5)</p>
        <p className="text-4xl font-bold tabular-nums">
          {nota.pontos.toFixed(1)}
          <span className="text-xl text-slate-400"> / {TOTAL_PONTOS}</span>
        </p>
        <p className="text-slate-400">
          {nota.acertos}/{nota.total} acertos · {pctNota}%
        </p>
        <p className={`mt-2 font-semibold ${nota.aprovadoEstimado ? "text-acerto" : "text-erro"}`}>
          {nota.aprovadoEstimado
            ? "✓ Acima do corte estimado"
            : `✗ Abaixo do corte (${NOTA_CORTE_PONTOS} pts)`}
        </p>
      </div>

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
