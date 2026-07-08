// Modo FLASH ⚡: 10 questões do Módulo II que o usuário já errou (backend prioriza os IDs).
import { useState } from "react";
import { api } from "../lib/api";
import { filtrar } from "../lib/questoesRepo";
import { montarFlash } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import type { Questao } from "../types/questao";

export function Flash() {
  const progresso = useProgresso();
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function iniciar() {
    setCarregando(true);
    setAviso(null);
    try {
      // backend devolve os IDs errados do Módulo II priorizados (mais errados / recentes)
      const { ids } = await api<{ ids: number[] }>("/answers/wrong?modulo=II&limit=10");
      const todasII = filtrar({ modulo: "II" });
      const r = montarFlash({
        idsErradosPriorizados: ids,
        todasModuloII: todasII,
        respondidasIds: progresso.respondidas,
        quantidade: 10,
      });
      if (r.completadoComNaoRespondidas) {
        setAviso("Você tem menos de 10 erradas no Módulo II — completamos com questões novas.");
      }
      setResultado(null);
      setSessao(r.questoes);
    } catch {
      // offline: monta só com o que temos localmente (erradas conhecidas via progresso)
      const todasII = filtrar({ modulo: "II" });
      const r = montarFlash({
        idsErradosPriorizados: [...progresso.erradas],
        todasModuloII: todasII,
        respondidasIds: progresso.respondidas,
        quantidade: 10,
      });
      setAviso("Sem conexão — montamos o Flash com os dados locais.");
      setSessao(r.questoes);
    } finally {
      setCarregando(false);
    }
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    progresso.recarregar();
  }

  if (resultado) return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="FLASH"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      <div className="text-5xl">⚡</div>
      <h1 className="text-2xl font-bold">Flash</h1>
      <p className="text-slate-400">
        10 questões do <strong>Módulo II</strong> que você já errou — revisão espaçada rápida.
      </p>
      {aviso && <p className="text-sm text-amber-500">{aviso}</p>}
      <button onClick={iniciar} disabled={carregando} className="btn-primary w-full">
        {carregando ? "Montando…" : "Começar Flash ⚡"}
      </button>
    </div>
  );
}
