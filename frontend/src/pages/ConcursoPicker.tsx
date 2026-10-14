// Tela seletora de concursos: grid de cartões (um por concurso) + cartão "Adicionar"
// (entrar numa trilha ou criar a própria).
// Trocar de concurso muda o escopo de todo o app.
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Compass } from "lucide-react";
import { useConcurso, type Concurso, type EstadoConcurso } from "../store/concurso";
import { TituloVivo } from "../components/TituloVivo";
import { Carregando } from "../components/Spinner";

const BADGE: Record<EstadoConcurso, { texto: string; cls: string }> = {
  EM_CURSO: { texto: "EM CURSO", cls: "border border-[color:var(--accentBd)] text-[color:var(--accentText)]" },
  PAUSADO: { texto: "PAUSADO", cls: "bg-brand-100 text-brand-700" },
  VAZIO: { texto: "VAZIO", cls: "bg-surface2 text-faint" },
};

export function ConcursoPicker() {
  const { concursos, activeId, setAtivo, loading } = useConcurso();
  const navigate = useNavigate();

  function escolher(c: Concurso) {
    setAtivo(c.id);
    navigate("/");
  }

  return (
    <div className="fadeup space-y-6 pt-4">
      <div className="sobre-fundo">
        <TituloVivo texto="Seus concursos" tamanho={36} className="text-4xl font-bold" />
        <p className="text-muted mt-1">Escolha o concurso que você vai estudar agora.</p>
      </div>

      {loading ? (
        <Carregando />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concursos.map((c) => (
            <button
              key={c.id}
              onClick={() => escolher(c)}
              className={`card p-5 text-left transition hover:-translate-y-0.5 ${
                c.id === activeId ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className="grid h-14 w-14 place-items-center rounded-full border font-brand text-sm font-bold"
                  style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
                >
                  {c.iniciais}
                </span>
                <span className={`meta-pill ${BADGE[c.estado].cls}`}>{BADGE[c.estado].texto}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-brand-ink leading-tight">{c.nome}</h2>
              <p className="text-sm text-faint">{c.cargo}</p>
              <div className="mt-4 flex items-center gap-5 text-sm">
                <Num n={c.respondidas} label="respondidas" />
                <Num n={c.noBanco} label="no banco" />
                <Num n={`${c.diasProva}d`} label="até a prova" />
              </div>
            </button>
          ))}

          {/* Último cartão: os dois caminhos para ter mais um concurso. Concurso solto,
              sem trilha, não existe mais: ele nascia vazio e o app o tratava como a
              Dataprev antiga (rodízio e simulado dela). */}
          <div className="card flex flex-col p-5">
            <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Adicionar</p>
            <p className="mt-1 font-display text-xl font-bold leading-tight text-brand-ink">Mais um concurso</p>
            <div className="mt-4 flex flex-1 flex-col gap-2.5">
              <Atalho
                onClick={() => navigate("/trilhas")}
                icone={<Compass size={20} strokeWidth={2} />}
                titulo="Entrar numa trilha"
                sub="Já vem com o banco de questões pronto."
              />
              <Atalho
                onClick={() => navigate("/trilhas/nova")}
                icone={<Plus size={20} strokeWidth={2} />}
                titulo="Criar minha trilha"
                sub="Monte com PDF, JSON ou uma a uma."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Atalho({
  onClick,
  icone,
  titulo,
  sub,
}: {
  onClick: () => void;
  icone: React.ReactNode;
  titulo: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-hair p-3 text-left transition hover:border-brand-300 hover:bg-brand-500/5"
    >
      <span
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border"
        style={{ background: "var(--accentBg)", borderColor: "var(--accentBd)", color: "var(--accentText)" }}
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-brand-ink">{titulo}</span>
        <span className="block text-xs text-faint">{sub}</span>
      </span>
      <ArrowRight size={18} strokeWidth={2} className="flex-shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </button>
  );
}

function Num({ n, label }: { n: number | string; label: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-display text-xl font-bold text-brand-ink">{n}</span>
      <span className="text-[10px] uppercase tracking-[.12em] text-faint">{label}</span>
    </span>
  );
}
