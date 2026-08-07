import { NavLink } from "react-router-dom";
import { Home, BookOpen, RefreshCw, NotebookPen, Library, BarChart3, FileText, Flame, Sun } from "lucide-react";
import { useTheme } from "../store/theme";
import { ConcursoSwitcher } from "./ConcursoSwitcher";

// Itens principais (barra inferior no mobile = 6 itens).
const navItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/estudar", label: "Estudar", icon: BookOpen },
  { to: "/revisar", label: "Revisar", icon: RefreshCw },
  { to: "/caderno", label: "Caderno", icon: NotebookPen },
  { to: "/materias", label: "Matérias", icon: Library },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

// Itens extras só no desktop (a sidebar cabe mais).
const desktopExtra = [{ to: "/simulado", label: "Simulado", icon: FileText }];

export function BottomTab() {
  const { tema, alternar } = useTheme();
  const grimorio = tema === "grimorio";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-surface/95 backdrop-blur
                 lg:inset-y-0 lg:right-auto lg:w-[218px] lg:flex lg:flex-col lg:border-r lg:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Marca (desktop) */}
      <div className="hidden lg:block px-4 pt-5 pb-3">
        <span className="font-brand text-lg font-bold text-brand-ink" style={{ letterSpacing: "var(--brandTrack)" }}>
          {grimorio ? "Grimório" : "NEON//VGL"}
        </span>
      </div>

      {/* Trocador de concurso (desktop) */}
      <div className="hidden lg:block">
        <ConcursoSwitcher />
      </div>

      <ul className="flex items-stretch justify-around lg:mt-3 lg:flex-1 lg:flex-col lg:justify-start lg:gap-1 lg:px-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {desktopExtra.map((item) => (
          <li key={item.to} className="hidden lg:block">
            <NavItem {...item} />
          </li>
        ))}
      </ul>

      {/* Rodapé (desktop): trocar tema */}
      <div className="hidden lg:block border-t border-hair p-2">
        <button
          onClick={alternar}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface2 hover:text-brand-ink"
          aria-label={grimorio ? "Mudar para Modo Neon" : "Mudar para Modo Grimório"}
        >
          {grimorio ? (
            <Flame size={18} strokeWidth={1.8} fill="currentColor" />
          ) : (
            <Sun size={18} strokeWidth={1.8} />
          )}
          <span className="flex-1 text-left">{grimorio ? "Modo Grimório" : "Modo Neon"}</span>
          <span className="h-2 w-2 rounded-full bg-brand-500" style={{ animation: "flamewave 2s ease-in-out infinite" }} />
        </button>
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <li className="flex-1 lg:flex-none">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition
           lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm
           ${isActive ? "text-brand-500 lg:bg-brand-500/10" : "text-faint hover:text-brand-ink"}`
        }
        aria-label={label}
        title={label}
      >
        {({ isActive }) => (
          <>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} className="lg:h-[20px] lg:w-[20px]" />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
