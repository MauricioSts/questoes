import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Flame } from "lucide-react";
import { useAuth } from "../store/auth";
import { api } from "../lib/api";

interface GoalToday {
  streak: number;
  nivel?: number;
  xpAtual?: number;
  xpProximo?: number;
}

export function TopBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [goal, setGoal] = useState<GoalToday | null>(null);

  useEffect(() => {
    api<GoalToday>("/goals/today").then(setGoal).catch(() => null);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // TODO: nivel/xp virão do backend quando disponíveis; fallback abaixo.
  const streak = goal?.streak ?? 0;
  const nivel = goal?.nivel ?? 1;
  const xpAtual = goal?.xpAtual ?? 0;
  const xpProximo = goal?.xpProximo ?? 100;
  const xpPercent = Math.min((xpAtual / xpProximo) * 100, 100);

  return (
    <header className="sticky top-0 z-20 border-b border-hair bg-brand-50/82 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        {/* Esquerda: título + badge */}
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-extrabold text-brand-ink">Questões</span>
          <span className="hidden sm:inline rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            Dataprev · FGV
          </span>
        </div>

        {/* Direita: streak + nível + sair */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak chip */}
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFE8D6] to-[#FFDCE4] px-3 py-1.5">
            <Flame size={16} className="text-flame-text" strokeWidth={2.2} fill="currentColor" />
            <span className="text-sm font-extrabold text-flame-text">{streak}</span>
          </div>

          {/* Nível chip (desktop) */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-hair bg-white px-2 py-1.5 pr-3">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white text-xs font-extrabold">
              {nivel}
            </div>
            <div className="h-2 w-24 rounded-full bg-hair overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-[#7C6FF6]"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-muted tabular-nums">
              {xpAtual}/{xpProximo}
            </span>
          </div>

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-brand-500 transition"
            aria-label="Sair"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
