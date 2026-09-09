import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Home,
  BookOpen,
  RefreshCw,
  NotebookPen,
  Library,
  BarChart3,
  FileText,
  Target,
  Bookmark,
  ClipboardList,
  Flame,
  Sun,
  Upload,
  LogOut,
} from "lucide-react";
import { useTheme } from "../store/theme";
import { useAuth } from "../store/auth";
import { ConcursoSwitcher } from "./ConcursoSwitcher";
import { LineSidebar } from "./LineSidebar";
import { Logo } from "./Logo";

// Itens principais (mobile exibe 6 itens na barra inferior)
const navItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/estudar", label: "Estudar", icon: BookOpen },
  { to: "/revisar", label: "Revisão espaçada", labelCurto: "Revisão", icon: RefreshCw },
  { to: "/materias", label: "Matérias", icon: Library },
  { to: "/caderno", label: "Caderno", icon: NotebookPen },
  { to: "/stats", label: "Estatísticas", labelCurto: "Stats", icon: BarChart3 },
];

// Itens extras no desktop
const desktopExtra = [
  { to: "/marcadas", label: "Marcadas", icon: Bookmark },
  { to: "/provas", label: "Provas e origens", icon: ClipboardList },
  { to: "/simulado", label: "Simulado", icon: FileText },
  { to: "/erros", label: "Meus erros", icon: Target },
];

const allSidebarItems = [...navItems, ...desktopExtra];

// Cabeçalho da sidebar: marca e concurso ativo num bloco só. Eram dois cartões soltos
// empilhados — a marca solta em cima e o trocador com borda própria embaixo. Agora o
// trocador é a parte de baixo da mesma peça, dividido por um filete, então lê como
// "este produto, neste concurso" em vez de dois widgets.
function CabecalhoMarca() {
  return (
    <div className="px-3 pt-4 pb-3">
      <div className="overflow-hidden rounded-2xl border border-hair" style={{ background: "var(--surface2)" }}>
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3">
          <Logo tamanho={30} fonte={16} />
        </div>
        <div className="mx-3.5 border-t border-hair" />
        <ConcursoSwitcher />
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
                 lg:inset-y-0 lg:right-auto lg:w-[236px] lg:flex lg:flex-col lg:border-r lg:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Marca + concurso ativo (desktop) */}
      <div className="hidden lg:block">
        <CabecalhoMarca />
      </div>

      {/* Desktop: Novo LineSidebar interativo com linhas, escala por proximidade e índice */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:py-2">
        <LineSidebar
          items={allSidebarItems}
          accentColor={fantasy ? "#E4BC45" : "#E6007E"}
          textColor={fantasy ? "#B0A2CB" : "#5F55A8"}
          markerColor={fantasy ? "#4A3870" : "#D8CEFF"}
          markerLength={30}
          markerGap={8}
          itemGap={48}
          fillHeight
          maxShift={60}
          proximityRadius={55}
          smoothing={60}
          showIndex={false}
        />
      </div>

      {/* Mobile: Barra inferior de 6 itens */}
      <ul className="flex items-stretch justify-around lg:hidden">
        {navItems.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </ul>

      {/* Rodapé (desktop): trocar tema + importar + sair */}
      <div className="hidden lg:block px-3 pb-3 pt-2 border-t border-hair/50">
        <button
          onClick={alternar}
          className="mb-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold transition"
          style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}
          aria-label={fantasy ? "Mudar para Modo Cyberpunk" : "Mudar para Modo Fantasy"}
        >
          {fantasy ? <Flame size={16} strokeWidth={1.8} fill="currentColor" /> : <Sun size={16} strokeWidth={1.8} />}
          <span className="flex-1 text-left">{fantasy ? "Modo Fantasy" : "Modo Cyberpunk"}</span>
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)", animation: "flamewave 2s ease-in-out infinite" }} />
        </button>
        <Link to="/importar" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
          <Upload size={15} strokeWidth={1.8} /> Importar lote
        </Link>
        <button onClick={sair} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
          <LogOut size={15} strokeWidth={1.8} /> Sair
        </button>
      </div>
    </nav>
  );
}

function MobileNavItem({
  to,
  label,
  labelCurto,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  labelCurto?: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex min-h-[56px] flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition
           ${isActive ? "text-brand-500" : "text-faint hover:text-brand-ink"}`
        }
        aria-label={label}
        title={label}
      >
        {({ isActive }) => (
          <>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{labelCurto ?? label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
