import { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
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
  Swords,
  Crown,
  FolderCog,
  UserRound,
  Zap,
  Menu,
  X,
  Compass,
  Code2,
} from "lucide-react";
import { useTheme, type Tema } from "../store/theme";
import { useAuth } from "../store/auth";
import { useAssinatura } from "../store/assinatura";
import { useConcurso } from "../store/concurso";
import { useExercicios } from "../hooks/useExercicios";
import { TagPlano } from "./TagPlano";
import { ConcursoSwitcher } from "./ConcursoSwitcher";
import { LineSidebar } from "./LineSidebar";
import { Logo } from "./Logo";
import { SeletorTema } from "./SeletorTema";

// Cores da barra lateral (o LineSidebar recebe hex, não lê os tokens).
const CORES_LINHA: Record<Tema, { destaque: string; texto: string; marcador: string }> = {
  fantasy: { destaque: "#B9ADFF", texto: "#A4A0CE", marcador: "#2C2866" },
  rose: { destaque: "#1B3E8B", texto: "#4A5B7A", marcador: "#DBE4F1" },
  cyberpunk: { destaque: "#FCEE0A", texto: "#8EA0B8", marcador: "#2A2940" },
};

interface ItemNav {
  to: string;
  label: string;
  labelCurto?: string;
  icon: typeof Home;
  end?: boolean;
}

// Itens principais
const navItems: ItemNav[] = [
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
  { to: "/flash", label: "Flash", icon: Zap },
];

// Exercícios de código: só aparece quando a trilha ativa tem algum (trilhas dev).
const itemExercicios: ItemNav = { to: "/exercicios", label: "Exercícios", icon: Code2 };

// Batalha: no desktop logo abaixo da Revisão (é a mesma fila, jogada).
const itemBatalha = { to: "/batalha", label: "Batalha", icon: Swords };

// Celular: a barra inferior tem espaço para 5. Ficam os 4 de uso diário (a Batalha é a
// porta de entrada de quem chega pelo vídeo) e o resto da barra lateral vai para "Mais",
// para o celular alcançar exatamente as mesmas telas que o computador.
const itensCelular: ItemNav[] = [navItems[0], navItems[1], navItems[2], itemBatalha];

function montarItens(comExercicios: boolean) {
  const extra: ItemNav[] = comExercicios ? [...desktopExtra, itemExercicios] : desktopExtra;
  return {
    sidebar: [...navItems.slice(0, 3), itemBatalha, ...navItems.slice(3), ...extra],
    mais: [...navItems.slice(3), ...extra],
  };
}

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
  const { dados: assinatura } = useAssinatura();
  const { ativo } = useConcurso();
  const navigate = useNavigate();
  const { temExercicios } = useExercicios();
  const { sidebar: allSidebarItems, mais: itensMais } = useMemo(() => montarItens(temExercicios), [temExercicios]);
  const linha = CORES_LINHA[tema];
  const { pathname } = useLocation();
  const [maisAberto, setMaisAberto] = useState(false);
  // Fecha o menu ao navegar (inclusive pelo voltar do celular).
  useEffect(() => setMaisAberto(false), [pathname]);
  const rotaNoMais = !itensCelular.some((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));

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

      {/* Mobile: 4 atalhos + "Mais", que abre tudo o que a barra lateral do desktop tem. */}
      <ul className="flex items-stretch justify-around lg:hidden">
        {itensCelular.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => setMaisAberto((v) => !v)}
            aria-expanded={maisAberto}
            aria-controls="menu-mais"
            className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition ${
              maisAberto || rotaNoMais ? "text-brand-500" : "text-faint hover:text-brand-ink"
            }`}
          >
            {maisAberto ? <X size={22} strokeWidth={2.2} /> : <Menu size={22} strokeWidth={rotaNoMais ? 2.2 : 1.8} />}
            <span>Mais</span>
          </button>
        </li>
      </ul>
      {maisAberto && (
        <MenuMais
          onFechar={() => setMaisAberto(false)}
          onSair={sair}
          itens={itensMais}
          admin={!!usuario?.admin}
          assinar={assinatura?.pagamentosAtivos ? (assinatura.premium ? "Assinatura" : "Assinar") : null}
          minhaTrilha={ativo?.souDonoTrilha && ativo.trilhaId ? ativo.trilhaId : null}
          nome={usuario?.nome ?? "Perfil"}
        />
      )}

      {/* Rodapé (desktop): trocar tema + importar + sair */}
      <div className="hidden lg:block px-3 pb-3 pt-2 border-t border-hair/50">
        <Link to="/perfil" className="mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-brand-50">
          <UserRound size={15} strokeWidth={1.8} className="flex-shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-brand-ink">{usuario?.nome ?? "Perfil"}</span>
          <TagPlano />
        </Link>
        <SeletorTema />
        <Link to="/como-funciona" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
          <HelpCircle size={15} strokeWidth={1.8} /> Como funciona
        </Link>
        {assinatura?.pagamentosAtivos && (
          <Link to="/assinatura" className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
            <Crown size={15} strokeWidth={1.8} /> {assinatura.premium ? "Assinatura" : "Assinar"}
          </Link>
        )}
        {/* Trilha criada por este usuário: atalho para adicionar lotes e gerenciar. */}
        {ativo?.souDonoTrilha && ativo.trilhaId && (
          <Link to={`/trilhas/${ativo.trilhaId}/editar`} className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-ink">
            <FolderCog size={15} strokeWidth={1.8} /> Minha trilha
          </Link>
        )}
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

// Folha do "Mais" (só celular): trilha ativa, as telas que não cabem na barra inferior e
// o rodapé da barra lateral (perfil, tema, ajuda, assinatura, importar, sair).
function MenuMais({
  itens,
  onFechar,
  onSair,
  admin,
  assinar,
  minhaTrilha,
  nome,
}: {
  itens: ItemNav[];
  onFechar: () => void;
  onSair: () => void;
  admin: boolean;
  assinar: string | null;
  minhaTrilha: string | null;
  nome: string;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const extra = "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-brand-ink";
  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onFechar}
        className="fixed inset-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-[-1] bg-black/40 lg:hidden"
      />
      <div
        id="menu-mais"
        role="dialog"
        aria-label="Mais opções"
        className="nav-app absolute inset-x-0 bottom-full max-h-[calc(100dvh-140px)] overflow-y-auto rounded-t-2xl border-t border-hair px-3 pb-3 pt-2 lg:hidden"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-hair" aria-hidden />
        <div className="mb-3 overflow-hidden rounded-2xl border border-hair" style={{ background: "var(--surface2)" }}>
          <ConcursoSwitcher />
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {itens.map(({ to, label, labelCurto, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 text-center text-[11.5px] font-semibold leading-tight transition ${
                    isActive ? "border-brand-300 text-brand-500" : "border-hair text-muted hover:text-brand-ink"
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{labelCurto ?? label.replace(" da trilha", "")}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-hair pt-2">
          <Link to="/perfil" className={extra}>
            <UserRound size={17} strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate text-brand-ink">{nome}</span>
            <TagPlano />
          </Link>
          <Link to="/trilhas" className={extra}>
            <Compass size={17} strokeWidth={1.8} /> Explorar trilhas
          </Link>
          {minhaTrilha && (
            <Link to={`/trilhas/${minhaTrilha}/editar`} className={extra}>
              <FolderCog size={17} strokeWidth={1.8} /> Minha trilha
            </Link>
          )}
          {assinar && (
            <Link to="/assinatura" className={extra}>
              <Crown size={17} strokeWidth={1.8} /> {assinar}
            </Link>
          )}
          <Link to="/como-funciona" className={extra}>
            <HelpCircle size={17} strokeWidth={1.8} /> Como funciona
          </Link>
          {admin && (
            <Link to="/importar" className={extra}>
              <Upload size={17} strokeWidth={1.8} /> Importar lote
            </Link>
          )}
          <div className="px-1 pt-2">
            <SeletorTema />
          </div>
          <button onClick={onSair} className={`${extra} w-full`}>
            <LogOut size={17} strokeWidth={1.8} /> Sair
          </button>
        </div>
      </div>
    </>
  );
}
