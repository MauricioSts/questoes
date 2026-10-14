// Primeiro passo de qualquer conta: escolher a trilha. Enquanto não há trilha escolhida
// o app não tem questões para servir, então esta tela é o portão de entrada — e por isso
// ela explica o que uma trilha é em vez de só listar cartões.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Crown, Layers, Lock, Pencil, Plus, Users } from "lucide-react";
import { TIPOS, listarTrilhas, entrarNaTrilha, nomeCompleto, type RegrasCriacao, type Trilha } from "../lib/trilhas";
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
  const [criacao, setCriacao] = useState<RegrasCriacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [entrando, setEntrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { setAtivo, refresh } = useConcurso();
  const navigate = useNavigate();

  useEffect(() => {
    listarTrilhas()
      .then((r) => {
        setTrilhas(r.trilhas);
        setCriacao(r.criacao);
      })
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
        <>
          {[
            { titulo: "Trilhas oficiais", lista: trilhas.filter((t) => t.oficial) },
            { titulo: "Da comunidade", lista: trilhas.filter((t) => !t.oficial) },
          ]
            .filter((g) => g.lista.length > 0)
            .map((g) => (
              <section key={g.titulo} className="space-y-4">
                <h2 className="sobre-fundo text-[11px] font-bold uppercase tracking-[.2em] text-faint">{g.titulo}</h2>
                {g.lista.map((t, i) => (
                  <CartaoTrilha
                    key={t.id}
                    trilha={t}
                    indice={i}
                    ocupado={entrando === t.id}
                    desabilitado={entrando !== null}
                    onEscolher={() => escolher(t)}
                  />
                ))}
              </section>
            ))}
          {criacao && <CartaoCriar criacao={criacao} />}
        </>
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
              {nomeCompleto(trilha)}
            </h2>
            {!trilha.oficial && (
              <span className="meta-pill border border-hair text-faint">
                {trilha.visibilidade === "privada" ? "Privada" : "Comunidade"}
              </span>
            )}
            {trilha.tipo !== "concurso" && (
              <span className="meta-pill border border-hair text-faint">{TIPOS[trilha.tipo]?.selo ?? trilha.tipo}
              </span>
            )}
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
            {[trilha.banca, trilha.orgao, trilha.ano].filter(Boolean).join(" · ")}
            {trilha.autor && <> · por {trilha.souDono ? "você" : trilha.autor}</>}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-muted">{trilha.descricao}</p>

          <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
            <Dado icone={BookOpen} valor={trilha.questoes.toLocaleString("pt-BR")} rotulo="questões" />
            <Dado icone={Layers} valor={trilha.materias} rotulo="matérias" />
            {dias !== null && <Dado icone={CalendarDays} valor={dias} rotulo="dias até a prova" />}
            {!trilha.oficial && <Dado icone={Users} valor={trilha.seguidores} rotulo="estudando" />}
          </dl>

          <button
            onClick={onEscolher}
            disabled={desabilitado}
            className="btn-primary mt-6 inline-flex items-center gap-2 text-base disabled:opacity-60"
          >
            {ocupado ? "Entrando…" : jaSegue ? "Continuar estudando" : "Começar esta trilha"}
            {!ocupado && <ArrowRight size={18} strokeWidth={2.4} />}
          </button>
          {trilha.souDono && (
            <Link
              to={`/trilhas/${trilha.id}/editar`}
              className="ml-4 mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-ink"
            >
              <Pencil size={15} /> Editar trilha
            </Link>
          )}
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

// Convite para criar a própria trilha. Free cria 1 (pública); quem já usou a dele vê o
// motivo e o caminho para o Premium em vez de um botão que só falharia.
function CartaoCriar({ criacao }: { criacao: RegrasCriacao }) {
  const pode = criacao.podeCriar;
  return (
    <Link
      to={pode ? "/trilhas/nova" : "/assinatura"}
      className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-hair bg-surface/70 px-6 py-5 backdrop-blur-sm transition hover:border-brand-500/60"
    >
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-surface2 text-brand-500">
        {pode ? <Plus size={20} strokeWidth={2} /> : <Crown size={20} strokeWidth={1.8} />}
      </span>
      <div className="min-w-0">
        <p className="font-display font-bold text-brand-ink">
          {pode ? "Criar minha trilha" : "Quer criar mais trilhas?"}
        </p>
        <p className="mt-0.5 text-sm text-faint">
          {pode
            ? criacao.premium
              ? "Monte o banco de questões do seu concurso, da escola ou do que estiver estudando."
              : `Concurso, escola, vestibular ou o que estiver estudando. No Free você cria ${criacao.limiteFree} trilha pública.`
            : `Você já criou ${criacao.minhas} ${criacao.minhas === 1 ? "trilha" : "trilhas"}. Com o Premium cria quantas quiser, inclusive privadas.`}
        </p>
      </div>
      {pode ? (
        <ArrowRight size={18} strokeWidth={2} className="ml-auto hidden flex-shrink-0 text-faint sm:block" />
      ) : (
        <Lock size={16} strokeWidth={1.8} className="ml-auto hidden flex-shrink-0 text-faint sm:block" />
      )}
    </Link>
  );
}
