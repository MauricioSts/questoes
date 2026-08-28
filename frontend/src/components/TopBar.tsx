import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Flame, Upload, Sun } from "lucide-react";
import { useAuth } from "../store/auth";
import { useTheme } from "../store/theme";
import { useConcurso } from "../store/concurso";
import { api } from "../lib/api";

interface GoalToday {
  streak: number;
}

export function TopBar() {
  const navigate = useNavigate();
  const { tema, alternar } = useTheme();
  const { ativo } = useConcurso();
  const { logout } = useAuth();
  const [goal, setGoal] = useState<GoalToday | null>(null);
  const fantasy = tema === "fantasy";

  useEffect(() => {
    api<GoalToday>("/goals/today").then(setGoal).catch(() => null);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const streak = goal?.streak ?? 0;

  return (
    <header className="sticky top-0 z-20 border-b border-hair bg-brand-50/82 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        {/* Esquerda: título + badge */}
        <div className="flex items-center gap-3">
          <span className="font-brand text-xl font-bold text-brand-ink" style={{ letterSpacing: "var(--brandTrack)" }}>
            {fantasy ? "Fantasy" : "CYBERPUNK"}
          </span>
          {ativo && (
            <span className="hidden sm:inline rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              {ativo.iniciais} · {ativo.banca}
            </span>
          )}
        </div>

        {/* Direita: streak + sair */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak chip */}
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFE8D6] to-[#FFDCE4] px-3 py-1.5">
            <Flame size={16} className="text-flame-text" strokeWidth={2.2} fill="currentColor" />
            <span className="text-sm font-extrabold text-flame-text">{streak}</span>
          </div>

          {/* Importar questões */}
          <Link
            to="/importar"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-brand-500 transition"
            aria-label="Importar questões"
            title="Importar questões"
          >
            <Upload size={18} strokeWidth={1.8} />
            <span className="hidden sm:inline">Importar</span>
          </Link>

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-brand-500 transition"
            aria-label="Sair"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span className="hidden sm:inline">Sair</span>
          </button>

          {/* Alternar tema Fantasy/Cyberpunk (ícone no header no mobile) */}
          <button
            onClick={alternar}
            className="flex items-center rounded-lg px-2 py-1.5 text-muted hover:text-brand-500 transition lg:hidden"
            aria-label={fantasy ? "Mudar para Modo Cyberpunk" : "Mudar para Modo Fantasy"}
            title={fantasy ? "Modo Cyberpunk" : "Modo Fantasy"}
          >
            {fantasy ? <Flame size={18} strokeWidth={1.8} fill="currentColor" /> : <Sun size={18} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
    </header>
  );
}
