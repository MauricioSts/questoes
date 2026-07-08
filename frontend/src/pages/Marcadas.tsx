// "Minhas marcadas": lista de questões marcadas para revisar depois + sessão de revisão.
import { useState } from "react";
import { useMarcadas } from "../hooks/useMarcadas";
import { getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { exportarProgresso } from "../lib/export";
import type { Questao } from "../types/questao";

export function Marcadas() {
  const marcadas = useMarcadas();
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [exportando, setExportando] = useState(false);

  const questoes = getQuestoes([...marcadas.ids]);

  async function exportar() {
    setExportando(true);
    try {
      await exportarProgresso();
    } catch {
      alert("Não foi possível exportar (sem conexão?).");
    } finally {
      setExportando(false);
    }
  }

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => { setResultado(null); marcadas.recarregar(); }} />;
  }

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={(rs) => { setResultado(rs); setSessao(null); }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Minhas marcadas 🔖</h1>
        <button onClick={exportar} disabled={exportando} className="tap rounded-lg text-sm text-brand">
          {exportando ? "Exportando…" : "⬇ Exportar progresso"}
        </button>
      </header>

      {marcadas.carregando ? (
        <p className="text-slate-400">Carregando…</p>
      ) : questoes.length === 0 ? (
        <p className="card p-6 text-center text-slate-400">
          Nenhuma questão marcada. Use o ícone 📑 durante o estudo para marcar questões.
        </p>
      ) : (
        <>
          <button onClick={() => setSessao(questoes)} className="btn-primary w-full">
            Revisar {questoes.length} marcada{questoes.length > 1 ? "s" : ""}
          </button>
          <ul className="space-y-2">
            {questoes.map((q) => (
              <li key={q.id} className="card flex items-start gap-2 p-3 text-sm">
                <div className="flex-1">
                  <p className="text-xs text-slate-400">{q.materia} · {q.assunto}</p>
                  <p className="line-clamp-2">{q.enunciado}</p>
                </div>
                <button
                  onClick={() => marcadas.alternar(q.id)}
                  className="tap rounded-lg px-2 text-slate-400"
                  title="Desmarcar"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
