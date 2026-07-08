import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { useQuestoes } from "../store/questoes";
import { ProgressRing } from "../components/ProgressRing";
import { META_DIARIA_DEFAULT } from "../config/prova";

interface GoalToday {
  meta: number;
  respondidasHoje: number;
  cumpriuHoje: boolean;
  streak: number;
}

export function Home() {
  const { usuario } = useAuth();
  const { total } = useQuestoes();
  const [goal, setGoal] = useState<GoalToday | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api<GoalToday>("/goals/today")
      .then(setGoal)
      .catch(() => setErro(true));
  }, []);

  const meta = goal?.meta ?? usuario?.metaDiaria ?? META_DIARIA_DEFAULT;
  const respondidas = goal?.respondidasHoje ?? 0;

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <header>
        <h1 className="text-xl font-bold">Olá, {usuario?.nome} 👋</h1>
        <p className="text-sm text-slate-400">Sua meta diária de estudos</p>
      </header>

      {total === 0 && (
        <Link to="/importar" className="card block border border-brand/40 p-4 text-sm">
          <span className="font-semibold text-brand">📥 Nenhuma questão ainda</span>
          <p className="text-slate-400">Importe seu primeiro lote de questões para começar a estudar.</p>
        </Link>
      )}

      <section className="card flex flex-col items-center gap-4 p-6">
        <ProgressRing valor={respondidas} meta={meta} />
        {goal && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-brand/10 px-3 py-1 font-medium text-brand">
              🔥 {goal.streak} {goal.streak === 1 ? "dia" : "dias"} de streak
            </span>
          </div>
        )}
        {erro && <p className="text-xs text-slate-400">Sem conexão com a API — mostrando 0.</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/estudar" className="card tap flex flex-col gap-1 p-4">
          <span className="text-2xl">📖</span>
          <span className="font-semibold">Estudar</span>
          <span className="text-xs text-slate-400">Feedback imediato + anotações</span>
        </Link>
        <Link to="/flash" className="card tap flex flex-col gap-1 p-4">
          <span className="text-2xl">⚡</span>
          <span className="font-semibold">Flash</span>
          <span className="text-xs text-slate-400">10 erradas do Módulo II</span>
        </Link>
        <Link to="/topico" className="card tap flex flex-col gap-1 p-4">
          <span className="text-2xl">🎯</span>
          <span className="font-semibold">Por tópico</span>
          <span className="text-xs text-slate-400">Estudo dirigido</span>
        </Link>
        <Link to="/simulado" className="card tap flex flex-col gap-1 p-4">
          <span className="text-2xl">📝</span>
          <span className="font-semibold">Simulado</span>
          <span className="text-xs text-slate-400">70 questões, prova real</span>
        </Link>
      </section>

      <section className="flex justify-center">
        <Link to="/marcadas" className="tap text-sm text-brand">
          🔖 Minhas marcadas
        </Link>
      </section>
    </div>
  );
}
