// Layout autenticado: header com tema/logout + área de conteúdo + bottom tab.
import { Outlet, Link } from "react-router-dom";
import { BottomTab } from "./BottomTab";
import { useTheme } from "../store/theme";
import { useAuth } from "../store/auth";

export function AppLayout() {
  const { tema, alternar } = useTheme();
  const { logout } = useAuth();

  return (
    <div className="min-h-full sm:pl-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <span className="font-semibold text-brand">Questões</span>
        <div className="flex items-center gap-1">
          <Link to="/importar" className="tap rounded-lg px-2" aria-label="Importar questões" title="Importar questões">
            📥
          </Link>
          <button onClick={alternar} className="tap rounded-lg px-2" aria-label="Alternar tema">
            {tema === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={logout} className="tap rounded-lg px-2 text-sm text-slate-500" aria-label="Sair">
            Sair
          </button>
        </div>
      </header>
      <main className="pb-20 sm:pb-6">
        <Outlet />
      </main>
      <BottomTab />
    </div>
  );
}
