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
  Trophy,
  Upload,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { useTheme, type Tema } from "../store/theme";
import { useAuth } from "../store/auth";
import { ConcursoSwitcher } from "./ConcursoSwitcher";
import { LineSidebar } from "./LineSidebar";
import { Logo } from "./Logo";

// Cores da barra lateral (o LineSidebar recebe hex, não lê os tokens).
const CORES_LINHA: Record<Tema, { destaque: string; texto: string; marcador: string }> = {
  fantasy: { destaque: "#B9ADFF", texto: "#A4A0CE", marcador: "#2C2866" },
  rose: { destaque: "#1B3E8B", texto: "#4A5B7A", marcador: "#DBE4F1" },
  cyberpunk: { destaque: "#FCEE0A", texto: "#8EA0B8", marcador: "#2A2940" },
  // Aranha: a barra é o azul das laterais do uniforme; destaque no amarelo de balão.
  aranha: { destaque: "#FFD23F", texto: "#D2DDF5", marcador: "#3C66BD" },
  venom: { destaque: "#FFFFFF", texto: "#8C93AC", marcador: "#1E2130" },
};

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
  { to: "/ranking", label: "Ranking da trilha", icon: Trophy },
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
  const { tema } = useTheme();
  const { logout, usuario } = useAuth();
  const navigate = useNavigate();
  const linha = CORES_LINHA[tema];

  function sair() {
    logout();
    navigate("/login");
  }

  return (
    <nav
      className="nav-app fixed inset-x-0 bottom-0 z-30 border-t border-hair
                 lg:inset-y-0 lg:right-auto lg:w-[236px] lg:flex lg:flex-col lg:border-r lg:border-t-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Marca + concurso ativo (desktop) */}
      <div className="hidden lg:block">
        <CabecalhoMarca />
      </div>

      {/* Desktop: sidebar com traços à esquerda e destaque de hover/rota ativa */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:py-2">
        <LineSidebar
          items={allSidebarItems}
          accentColor={linha.destaque}
          textColor={linha.texto}
          markerColor={linha.marcador}
          markerLength={30}
          markerGap={8}
          itemGap={48}
          fillHeight
          showIndex={false}
        />
      </div>

      {/* Mobile: Barra inferior de 6 itens */}
      <ul className="flex items-stretch justify-around lg:hidden">
        {navItems.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </ul>

      {/* Rodapé (desktop): ajuda + importar + sair (o tema fica no dock, SeletorTema) */}
      <div className="hidden lg:block px-3 pb-3 pt-2 border-t border-hair/50">
        <Link to="/como-funciona" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
          <HelpCircle size={15} strokeWidth={1.8} /> Como funciona
        </Link>
        {/* Importar altera o acervo de todo mundo que segue a trilha: só o admin vê. */}
        {usuario?.admin && (
          <Link to="/importar" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
            <Upload size={15} strokeWidth={1.8} /> Importar lote
          </Link>
        )}
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
