// Modo ESTUDO: configura filtros de sessão e responde com feedback imediato + anotações.
import { useMemo, useState } from "react";
import type { Questao, Modulo, Dificuldade } from "../types/questao";
import { filtrar, materias as listarMaterias, assuntos as listarAssuntos } from "../lib/questoesRepo";
import { shuffle } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";

export function Estudar() {
  const progresso = useProgresso();
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  // filtros
  const [modulo, setModulo] = useState<Modulo | "">("");
  const [materia, setMateria] = useState("");
  const [assunto, setAssunto] = useState("");
  const [dificuldade, setDificuldade] = useState<Dificuldade | "">("");
  const [soNaoRespondidas, setSoNaoRespondidas] = useState(false);
  const [soErradas, setSoErradas] = useState(false);
  const [quantidade, setQuantidade] = useState(10);

  const materiasDisp = useMemo(() => listarMaterias(modulo || undefined), [modulo]);
  const assuntosDisp = useMemo(() => listarAssuntos(materia || undefined), [materia]);

  function iniciar() {
    let pool = filtrar({
      modulo: modulo || undefined,
      materia: materia || undefined,
      assunto: assunto || undefined,
      dificuldade: dificuldade || undefined,
    });
    if (soNaoRespondidas) pool = pool.filter((q) => !progresso.respondidas.has(q.id));
    if (soErradas) pool = pool.filter((q) => progresso.erradas.has(q.id));
    const sel = shuffle(pool).slice(0, quantidade);
    setResultado(null);
    setSessao(sel);
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    progresso.recarregar();
  }

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;
  }

  if (sessao) {
    if (sessao.length === 0) {
      return (
        <div className="mx-auto max-w-md p-6 text-center text-slate-400">
          Nenhuma questão bate com esses filtros.
          <button onClick={() => setSessao(null)} className="btn-primary mt-4 block w-full">
            Voltar
          </button>
        </div>
      );
    }
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={finalizar}
        onProgresso={() => {}}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">Modo Estudo 📖</h1>
        <p className="text-sm text-slate-400">Feedback imediato, explicação e anotações.</p>
      </header>

      <div className="card space-y-3 p-4">
        <Campo label="Módulo">
          <select value={modulo} onChange={(e) => { setModulo(e.target.value as Modulo | ""); setMateria(""); setAssunto(""); }} className="sel">
            <option value="">Todos</option>
            <option value="I">I — Gerais</option>
            <option value="II">II — Específicos</option>
          </select>
        </Campo>
        <Campo label="Matéria">
          <select value={materia} onChange={(e) => { setMateria(e.target.value); setAssunto(""); }} className="sel">
            <option value="">Todas</option>
            {materiasDisp.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Campo>
        <Campo label="Assunto">
          <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="sel">
            <option value="">Todos</option>
            {assuntosDisp.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Campo>
        <Campo label="Dificuldade">
          <select value={dificuldade} onChange={(e) => setDificuldade(e.target.value as Dificuldade | "")} className="sel">
            <option value="">Qualquer</option>
            <option value="facil">Fácil</option>
            <option value="media">Média</option>
            <option value="dificil">Difícil</option>
          </select>
        </Campo>
        <Campo label="Quantidade">
          <input type="number" min={1} max={100} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} className="sel" />
        </Campo>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soNaoRespondidas} onChange={(e) => setSoNaoRespondidas(e.target.checked)} />
          Só não respondidas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soErradas} onChange={(e) => setSoErradas(e.target.checked)} />
          Só erradas anteriormente
        </label>
      </div>

      <button onClick={iniciar} className="btn-primary w-full">Começar sessão</button>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="w-48">{children}</span>
    </label>
  );
}
