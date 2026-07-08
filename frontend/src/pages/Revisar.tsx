// Aba "Revisar": questões cujo último resultado foi ERRO (vem do backend /answers/erradas).
// Permite revisar todas numa sessão com feedback; ao acertar, a questão sai da lista.
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import type { Questao } from "../types/questao";

interface ErradaMeta {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade: string;
  erros: number;
  tentativas: number;
}

export function Revisar() {
  const [metas, setMetas] = useState<ErradaMeta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    api<{ questoes: ErradaMeta[] }>("/answers/erradas")
      .then((d) => setMetas(d.questoes))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  // só as que ainda existem no banco de questões carregado
  const questoes = getQuestoes(metas.map((m) => m.questaoId));

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    carregar(); // atualiza a lista (acertadas saem)
  }

  if (resultado) return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">Revisar 🔁</h1>
        <p className="text-sm text-slate-400">Questões que você errou (último resultado).</p>
      </header>

      {carregando ? (
        <p className="text-slate-400">Carregando…</p>
      ) : erro ? (
        <p className="card p-6 text-center text-slate-400">Não foi possível carregar (sem conexão?).</p>
      ) : questoes.length === 0 ? (
        <p className="card p-6 text-center text-slate-400">
          🎉 Nenhuma questão errada pendente. Continue estudando!
        </p>
      ) : (
        <>
          <button onClick={() => setSessao(questoes)} className="btn-primary w-full">
            Revisar {questoes.length} questõe{questoes.length > 1 ? "s" : ""}
          </button>
          <ul className="space-y-2">
            {metas
              .filter((m) => questoes.some((q) => q.id === m.questaoId))
              .map((m) => (
                <li key={m.questaoId} className="card flex items-center gap-2 p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{m.assunto}</p>
                    <p className="text-xs text-slate-400">
                      Mód. {m.modulo} · {m.materia}
                    </p>
                  </div>
                  <span
                    className="rounded-full bg-erro/10 px-2 py-0.5 text-xs font-medium text-erro"
                    title={`${m.erros} erro(s) em ${m.tentativas} tentativa(s)`}
                  >
                    {m.erros}× errou
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
