import { NavLink, Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, RefreshCw, NotebookPen, Library, BarChart3, FileText, Target, Flame, Sun, Upload, LogOut } from "lucide-react";
import { useTheme } from "../store/theme";
import { useAuth } from "../store/auth";
import { ConcursoSwitcher } from "./ConcursoSwitcher";

// Itens principais (barra inferior no mobile = 6 itens).
const navItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/estudar", label: "Estudar", icon: BookOpen },
  { to: "/revisar", label: "Revisar", icon: RefreshCw },
  { to: "/materias", label: "Matérias", icon: Library },
  { to: "/caderno", label: "Caderno", icon: NotebookPen },
  { to: "/stats", label: "Estatísticas", icon: BarChart3 },
];
// Extra só no desktop.
const desktopExtra = [
  { to: "/simulado", label: "Simulado", icon: FileText },
  { to: "/erros", label: "Meus erros", icon: Target },
];

// Logo por tema: eclipse dourado (Fantasy) / quadrado neon (Cyberpunk).
function Marca({ fantasy }: { fantasy: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      {fantasy ? (
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
          <circle cx="17" cy="17" r="15" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity=".8" />
          <path d="M17 4a13 13 0 100 26 10 10 0 010-26z" fill="var(--accent)" opacity=".9" />
          <circle cx="24" cy="10" r="1.6" fill="var(--accentHi)" />
        </svg>
      ) : (
        <div className="grid h-8 w-8 place-items-center rounded-[8px]" style={{ background: "#14103A" }}>
          <span className="font-brand text-lg font-bold" style={{ color: "var(--accent)" }}>A</span>
        </div>
      )}
      <div className="leading-tight">
        <span className="block font-brand text-[15px] font-bold text-brand-ink" style={{ letterSpacing: "var(--brandTrack)" }}>
          {fantasy ? "FANTASY" : "CYBERPUNK"}
        </span>
        <span className="block text-[10px] uppercase tracking-[.14em] text-faint">Banco de questões</span>
      </div>
    </div>
  );
}

export function BottomTab() {
  const { tema, alternar } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fantasy = tema === "fantasy";

  function sair() {
    logout();
    navigate("/login");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-surface/95 backdrop-blur
                 lg:inset-y-0 lg:right-auto lg:w-[218px] lg:flex lg:flex-col lg:border-r lg:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Marca (desktop) */}
      <div className="hidden lg:block">
        <Marca fantasy={fantasy} />
      </div>

      {/* Trocador de concurso (desktop) */}
      <div className="hidden lg:block">
        <ConcursoSwitcher />
      </div>

      <ul className="flex items-stretch justify-around lg:mt-3 lg:flex-1 lg:flex-col lg:justify-start lg:gap-0.5 lg:px-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {desktopExtra.map((item) => (
          <li key={item.to} className="hidden lg:block">
            <NavItem {...item} />
          </li>
        ))}
      </ul>

      {/* Rodapé (desktop): trocar tema + importar + sair */}
      <div className="hidden lg:block px-2 pb-3">
        <button
          onClick={alternar}
          className="mb-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition"
          style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}
          aria-label={fantasy ? "Mudar para Modo Cyberpunk" : "Mudar para Modo Fantasy"}
        >
          {fantasy ? <Flame size={17} strokeWidth={1.8} fill="currentColor" /> : <Sun size={17} strokeWidth={1.8} />}
          <span className="flex-1 text-left">{fantasy ? "Modo Fantasy" : "Modo Cyberpunk"}</span>
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)", animation: "flamewave 2s ease-in-out infinite" }} />
        </button>
        <Link to="/importar" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:text-brand-ink">
          <Upload size={17} strokeWidth={1.8} /> Importar lote
        </Link>
        <button onClick={sair} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:text-brand-ink">
          <LogOut size={17} strokeWidth={1.8} /> Sair
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Home; end?: boolean }) {
  return (
    <li className="flex-1 lg:flex-none">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition
           lg:flex-row lg:justify-start lg:gap-3 lg:rounded-lg lg:border-l-2 lg:px-3 lg:py-2.5 lg:text-sm
           ${isActive
             ? "text-brand-500 lg:border-brand-500 lg:bg-brand-500/10"
             : "text-faint hover:text-brand-ink lg:border-transparent"}`
        }
        aria-label={label}
        title={label}
      >
        {({ isActive }) => (
          <>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} className="lg:h-[19px] lg:w-[19px]" />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
