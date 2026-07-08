// Modo por TÓPICO: estudo dirigido por matéria/assunto, configurável.
// Aceita deep-link do dashboard ("Treinar agora"): /topico?materia=..&assunto=..&prioriza=1
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Questao, Dificuldade } from "../types/questao";
import { materias as listarMaterias, assuntos as listarAssuntos, todas } from "../lib/questoesRepo";
import { montarTopico } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";

export function Topico() {
  const [params] = useSearchParams();
  const progresso = useProgresso();

  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  const [materia, setMateria] = useState(params.get("materia") ?? "");
  const [assunto, setAssunto] = useState(params.get("assunto") ?? "");
  const [dificuldade, setDificuldade] = useState<Dificuldade | "">("");
  const [quantidade, setQuantidade] = useState(15);
  const [incluirRespondidas, setIncluirRespondidas] = useState(true);
  const [priorizarErradas, setPriorizarErradas] = useState(params.get("prioriza") === "1");

  const materiasDisp = useMemo(() => listarMaterias(), []);
  const assuntosDisp = useMemo(() => listarAssuntos(materia || undefined), [materia]);

  // se veio de deep-link com assunto, foca em não-respondidas priorizando erradas
  useEffect(() => {
    if (params.get("prioriza") === "1") setIncluirRespondidas(true);
  }, [params]);

  function iniciar() {
    const sel = montarTopico({
      materia: materia || undefined,
      assunto: assunto || undefined,
      dificuldade: dificuldade || undefined,
      quantidade,
      incluirRespondidas,
      priorizarErradas,
      todas: todas(),
      respondidasIds: progresso.respondidas,
      erradasIds: progresso.erradas,
    });
    setResultado(null);
    setSessao(sel);
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    progresso.recarregar();
  }

  if (resultado) return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;

  if (sessao) {
    if (sessao.length === 0) {
      return (
        <div className="mx-auto max-w-md p-6 text-center text-slate-400">
          Nenhuma questão para esse tópico com os filtros escolhidos.
          <button onClick={() => setSessao(null)} className="btn-primary mt-4 block w-full">Voltar</button>
        </div>
      );
    }
    return (
      <SessionRunner
        questoes={sessao}
        contexto="TOPICO"
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
        <h1 className="text-xl font-bold">Por tópico 🎯</h1>
        <p className="text-sm text-slate-400">Reforce onde você quer trabalhar mais.</p>
      </header>

      <div className="card space-y-3 p-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Matéria</span>
          <select value={materia} onChange={(e) => { setMateria(e.target.value); setAssunto(""); }} className="sel w-48">
            <option value="">Todas</option>
            {materiasDisp.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Assunto</span>
          <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="sel w-48">
            <option value="">Todos</option>
            {assuntosDisp.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Dificuldade</span>
          <select value={dificuldade} onChange={(e) => setDificuldade(e.target.value as Dificuldade | "")} className="sel w-48">
            <option value="">Qualquer</option>
            <option value="facil">Fácil</option>
            <option value="media">Média</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Quantidade</span>
          <input type="number" min={1} max={100} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="sel w-48" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={incluirRespondidas} onChange={(e) => setIncluirRespondidas(e.target.checked)} />
          Incluir já respondidas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={priorizarErradas} onChange={(e) => setPriorizarErradas(e.target.checked)} />
          Priorizar as que errei
        </label>
      </div>

      <button onClick={iniciar} className="btn-primary w-full">Começar</button>
    </div>
  );
}
