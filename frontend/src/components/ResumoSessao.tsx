// Resumo curto ao terminar uma sessão com feedback (Estudo/Flash/Tópico).
import { Sparkles, TrendingUp } from "lucide-react";
import type { RespostaSessao } from "./SessionRunner";

export function ResumoSessao({
  respostas,
  onNovaSessao,
}: {
  respostas: RespostaSessao[];
  onNovaSessao: () => void;
}) {
  const respondidas = respostas.filter((r) => r.marcada);
  const acertos = respondidas.filter((r) => r.acertou).length;
  const taxa = respondidas.length ? Math.round((acertos / respondidas.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
        style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        {taxa >= 70 ? <Sparkles size={30} strokeWidth={2} /> : <TrendingUp size={30} strokeWidth={2} />}
      </div>
      <h1 className="text-2xl font-bold">Sessão concluída</h1>
      <div className="card space-y-1 p-6">
        <p className="text-4xl font-bold tabular-nums">
          {acertos}
          <span className="text-xl text-slate-400">/{respondidas.length}</span>
        </p>
        <p className="text-slate-400">{taxa}% de acerto</p>
      </div>
      <button onClick={onNovaSessao} className="btn-primary w-full">
        Nova sessão
      </button>
    </div>
  );
}
