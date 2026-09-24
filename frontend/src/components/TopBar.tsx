import { Link, useNavigate } from "react-router-dom";
import { LogOut, Flame, Upload } from "lucide-react";
import { useAuth } from "../store/auth";
import { useConcurso } from "../store/concurso";
import { useMeta } from "../store/meta";
import { Logo } from "./Logo";
import { BotaoProximoTema } from "./SeletorTema";

export function TopBar() {
  const navigate = useNavigate();
  const { ativo } = useConcurso();
  const { logout, usuario } = useAuth();
  // A meta vem do provedor: é ele que recarrega quando uma resposta sincroniza, então a
  // ofensiva sobe durante o estudo em vez de esperar um F5.
  const { goal, celebrar } = useMeta();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const streak = goal?.streak ?? 0;

  return (
    <header className="topo-app sticky top-0 z-20 border-b border-hair">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        {/* Esquerda: marca (só no mobile) + concurso ativo.
            A marca vive na barra lateral; no desktop ela sairia repetida aqui em cima,
            duas vezes na mesma tela. Abaixo de lg não há barra lateral, então é aqui. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <Link to="/" aria-label="devconcursado — início" className="flex-shrink-0 lg:hidden">
            {/* Abaixo de sm só o selo: com o nome inteiro, a ofensiva em destaque passava
                por cima da marca no celular. */}
            <Logo tamanho={28} fonte={16} somenteSimbolo className="sm:hidden" />
            <Logo tamanho={28} fonte={16} className="hidden sm:inline-flex" />
          </Link>
          {ativo && (
            <span className="hidden truncate md:inline rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              {ativo.iniciais} · {ativo.banca}
            </span>
          )}
        </div>

        {/* Direita: a ofensiva é o que a barra existe para mostrar no desktop; importar e
            sair moram no rodapé da barra lateral, e a marca no topo dela. */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          {/* Clicar na ofensiva repete a comemoração do dia: o número é a recompensa,
              então ele também é o botão de rever a comemoração dela. Sem ofensiva não
              há o que mostrar, e aí o chip volta a ser só um rótulo. */}
          <button
            type="button"
            onClick={celebrar}
            disabled={streak === 0}
            className={`streak-chip streak-chip--grande ${
              streak > 0 ? "streak-chip--ativa streak-chip--botao" : "streak-chip--zerada"
            }`}
            title={
              streak > 0
                ? `Ofensiva: ${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"} — clique para rever a comemoração`
                : "Sem ofensiva. Responda uma questão hoje para começar."
            }
          >
            <Flame className="streak-chip__chama" size={22} strokeWidth={2.2} fill="currentColor" />
            <span className="streak-chip__numero tabular-nums">{streak}</span>
            <span className="streak-chip__rotulo">
              {streak > 0 ? (streak === 1 ? "dia de ofensiva" : "dias de ofensiva") : "comece hoje"}
            </span>
          </button>

          {/* Importar questões (mobile; no desktop fica no rodapé da barra lateral).
              Só o admin: um lote vale para todos os que seguem a trilha. */}
          {usuario?.admin && (
            <Link
              to="/importar"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted transition hover:text-brand-500 lg:hidden"
              aria-label="Importar questões"
              title="Importar questões"
            >
              <Upload size={18} strokeWidth={1.8} />
              <span className="hidden md:inline">Importar</span>
            </Link>
          )}

          {/* Sair (mobile; no desktop fica no rodapé da barra lateral) */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted transition hover:text-brand-500 lg:hidden"
            aria-label="Sair"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span className="hidden md:inline">Sair</span>
          </button>

          {/* Trocar de tema (no celular; no desktop fica na barra lateral) */}
          <BotaoProximoTema className="flex items-center rounded-lg px-2 py-1.5 text-muted hover:text-brand-500 transition lg:hidden" />
        </div>
      </div>
    </header>
  );
}
