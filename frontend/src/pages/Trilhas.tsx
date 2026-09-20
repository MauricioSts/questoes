// Primeiro passo de qualquer conta: escolher a trilha. Enquanto não há trilha escolhida
// o app não tem questões para servir, então esta tela é o portão de entrada — e por isso
// ela explica o que uma trilha é em vez de só listar cartões.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Layers, Lock, Sparkles } from "lucide-react";
import { listarTrilhas, entrarNaTrilha, type Trilha } from "../lib/trilhas";
import { useConcurso } from "../store/concurso";
import { TituloVivo } from "../components/TituloVivo";
import { Carregando } from "../components/Spinner";

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 864e5));
}

export function Trilhas() {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [entrando, setEntrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { setAtivo, refresh } = useConcurso();
  const navigate = useNavigate();

  useEffect(() => {
    listarTrilhas()
      .then(setTrilhas)
      .catch(() => setErro("Não foi possível carregar as trilhas. Recarregue a página."))
      .finally(() => setCarregando(false));
  }, []);

  async function escolher(t: Trilha) {
    setEntrando(t.id);
    setErro(null);
    try {
      const { concursoId } = await entrarNaTrilha(t.id);
      // A ordem importa: o concurso ativo precisa estar salvo antes de refresh(),
      // senão a lista recém-carregada escolhe outro ativo por conta própria.
      setAtivo(concursoId);
      await refresh();
      navigate("/");
    } catch {
      setErro("Não foi possível entrar nessa trilha. Tente de novo.");
      setEntrando(null);
    }
  }

  return (
    <div className="fadeup mx-auto max-w-4xl space-y-8 pt-4 pb-12">
      <header className="sobre-fundo">
        <span className="text-[11px] font-bold uppercase tracking-[.2em] text-faint">
          Primeiro passo
        </span>
        <TituloVivo texto="Escolha sua trilha" tamanho={40} className="mt-1 text-4xl font-bold" />
        <p className="text-muted mt-2 max-w-xl leading-relaxed">
          Uma trilha é o banco de questões de um concurso, junto com as matérias que ele cobra.
          Ao entrar em uma, todo o app passa a girar em torno dela: seu estudo, sua revisão,
          seus erros e suas estatísticas.
        </p>
      </header>

      {erro && (
        <p className="card border-danger-from/40 px-4 py-3 text-sm text-danger-from" role="alert">
          {erro}
        </p>
      )}

      {carregando ? (
        <Carregando />
      ) : (
        <div className="space-y-4">
          {trilhas.map((t, i) => (
            <CartaoTrilha
              key={t.id}
              trilha={t}
              indice={i}
              ocupado={entrando === t.id}
              desabilitado={entrando !== null}
              onEscolher={() => escolher(t)}
            />
          ))}
          <CartaoEmBreve />
        </div>
      )}

      <p className="sobre-fundo text-center text-sm text-muted">
        Quer entender como o site funciona antes de começar?{" "}
        <button
          onClick={() => navigate("/como-funciona")}
          className="font-semibold text-brand-500 underline-offset-4 hover:underline"
        >
          Ver o passo a passo
        </button>
      </p>
    </div>
  );
}

function CartaoTrilha({
  trilha,
  indice,
  ocupado,
  desabilitado,
  onEscolher,
}: {
  trilha: Trilha;
  indice: number;
  ocupado: boolean;
  desabilitado: boolean;
  onEscolher: () => void;
}) {
  const dias = diasAte(trilha.dataProva);
  const jaSegue = trilha.concursoId !== null;

  return (
    <article
      className="card fadeup overflow-hidden"
      style={{ animationDelay: `${80 + indice * 70}ms` }}
    >
      {/* Faixa de acento: dá ao cartão o peso de "capa de dossiê" sem pintar o fundo
          inteiro, que brigaria com os três temas. */}
      <div className="h-1.5 w-full" style={{ background: "var(--accentBd)" }} />

      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
        <div className="flex sm:block">
          <span
            className="grid h-20 w-20 place-items-center rounded-2xl border font-brand text-xl font-bold"
            style={{
              background: "var(--accentBg)",
              borderColor: "var(--accentBd)",
              color: "var(--accentText)",
            }}
          >
            {trilha.iniciais}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold leading-tight text-brand-ink">
              {trilha.nome}: {trilha.cargo}
            </h2>
            {jaSegue && (
              <span
                className="meta-pill border"
                style={{ borderColor: "var(--accentBd)", color: "var(--accentText)" }}
              >
                Você já segue
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-faint">
            {trilha.banca} · {trilha.orgao} · {trilha.ano}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-muted">{trilha.descricao}</p>

          <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
            <Dado icone={BookOpen} valor={trilha.questoes.toLocaleString("pt-BR")} rotulo="questões" />
            <Dado icone={Layers} valor={trilha.materias} rotulo="matérias" />
            {dias !== null && <Dado icone={CalendarDays} valor={dias} rotulo="dias até a prova" />}
          </dl>

          <button
            onClick={onEscolher}
            disabled={desabilitado}
            className="btn-primary mt-6 inline-flex items-center gap-2 text-base disabled:opacity-60"
          >
            {ocupado ? "Entrando…" : jaSegue ? "Continuar estudando" : "Começar esta trilha"}
            {!ocupado && <ArrowRight size={18} strokeWidth={2.4} />}
          </button>
        </div>
      </div>
    </article>
  );
}

function Dado({
  icone: Icone,
  valor,
  rotulo,
}: {
  icone: typeof BookOpen;
  valor: number | string;
  rotulo: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icone size={18} strokeWidth={1.8} className="text-faint" />
      <div className="leading-tight">
        <dd className="font-display text-xl font-bold tabular-nums text-brand-ink">{valor}</dd>
        <dt className="text-[10px] uppercase tracking-[.12em] text-faint">{rotulo}</dt>
      </div>
    </div>
  );
}

// Dito na cara: hoje existe uma trilha só. Some sozinho quando houver outras, porque
// aí a lista já explica a si mesma.
function CartaoEmBreve() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-hair bg-surface/70 px-6 py-5 backdrop-blur-sm">
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-surface2 text-faint">
        <Sparkles size={20} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="font-display font-bold text-brand-ink">Outras trilhas vêm por aí</p>
        <p className="mt-0.5 text-sm text-faint">
          Cada nova trilha é um acervo montado a partir das provas daquele concurso.
        </p>
      </div>
      <Lock size={16} strokeWidth={1.8} className="ml-auto hidden flex-shrink-0 text-faint sm:block" />
    </div>
  );
}
