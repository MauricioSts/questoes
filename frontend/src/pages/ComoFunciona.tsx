// Tela de explicação do app. Existe porque o produto tem muitos modos de estudo e a
// diferença entre eles não é óbvia pelo nome: sem isso, uma conta nova abre "Estudar",
// responde 30 questões soltas e nunca descobre a revisão espaçada nem o caderno.
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  ClipboardList,
  Flame,
  Layers,
  NotebookPen,
  RefreshCw,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { TituloVivo } from "../components/TituloVivo";

const PASSOS = [
  {
    titulo: "Escolha a trilha",
    texto:
      "A trilha define o concurso que você está perseguindo e o banco de questões que vem junto. Tudo no app passa a ser sobre ela.",
  },
  {
    titulo: "Responda com calma",
    texto:
      "Cada questão mostra o gabarito e a explicação logo depois que você marca. Errar aqui é barato: é para isso que serve.",
  },
  {
    titulo: "Deixe a revisão voltar até você",
    texto:
      "O que você errou não some. Volta em intervalos crescentes, quando está prestes a ser esquecido, até deixar de ser um ponto fraco.",
  },
];

const MODOS = [
  {
    icone: BookOpen,
    nome: "Estudar",
    texto: "Sessão livre. Você filtra por matéria, assunto e dificuldade e responde no seu ritmo.",
  },
  {
    icone: RefreshCw,
    nome: "Revisão espaçada",
    texto:
      "A fila do dia, montada pelo próprio app: questões que você errou e que chegaram na hora de voltar.",
  },
  {
    icone: Zap,
    nome: "Flash",
    texto: "Rodada rápida, sem filtro e sem cerimônia, para quando sobram dez minutos.",
  },
  {
    icone: Layers,
    nome: "Tópico",
    texto: "Um assunto só, do começo ao fim. Serve para fechar um buraco específico.",
  },
  {
    icone: Timer,
    nome: "Simulado",
    texto: "Prova cronometrada, correção só no fim. É o ensaio mais parecido com o dia real.",
  },
];

const FERRAMENTAS = [
  { icone: Target, nome: "Meus erros", texto: "Tudo o que você errou, junto, para atacar de propósito." },
  { icone: Bookmark, nome: "Marcadas", texto: "As questões que você guardou para rever depois." },
  { icone: NotebookPen, nome: "Caderno", texto: "Suas anotações por matéria, escritas dentro do app." },
  { icone: BarChart3, nome: "Estatísticas", texto: "Acerto por matéria e por assunto, e o que está piorando." },
  { icone: ClipboardList, nome: "Provas e origens", texto: "De qual prova cada questão veio, e o que é adaptação." },
  { icone: Flame, nome: "Meta e ofensiva", texto: "Uma meta diária de questões e a contagem de dias seguidos." },
];

export function ComoFunciona() {
  return (
    <div className="fadeup mx-auto max-w-4xl space-y-12 pt-4 pb-14">
      <header className="sobre-fundo">
        <span className="text-[11px] font-bold uppercase tracking-[.2em] text-faint">
          Como funciona
        </span>
        <TituloVivo texto="Estudar por repetição" tamanho={40} className="mt-1 text-4xl font-bold" />
        <p className="text-muted mt-2 max-w-2xl leading-relaxed">
          O app não é um banco de questões com cronômetro. Ele é montado em volta de uma ideia
          só: você erra, ele guarda o erro, e devolve a questão no momento em que ela está
          prestes a escapar da sua memória.
        </p>
      </header>

      {/* Os três passos: a espinha do produto, numerada para deixar claro que há ordem. */}
      <section className="space-y-4">
        {PASSOS.map((p, i) => (
          <div
            key={p.titulo}
            className="card fadeup flex gap-5 p-6"
            style={{ animationDelay: `${60 + i * 70}ms` }}
          >
            <span
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border font-display text-lg font-bold tabular-nums"
              style={{
                background: "var(--accentBg)",
                borderColor: "var(--accentBd)",
                color: "var(--accentText)",
              }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-brand-ink">{p.titulo}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.texto}</p>
            </div>
          </div>
        ))}
      </section>

      <Secao titulo="Os modos de estudo" descricao="Mesma base de questões, cinco jeitos de atacar.">
        <div className="grid gap-3 sm:grid-cols-2">
          {MODOS.map((m) => (
            <Peca key={m.nome} {...m} />
          ))}
        </div>
      </Secao>

      <Secao titulo="O que mais tem" descricao="Ferramentas que acumulam com o uso.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => (
            <Peca key={f.nome} {...f} compacto />
          ))}
        </div>
      </Secao>

      <section className="card p-6 sm:p-7">
        <h2 className="font-display text-xl font-bold text-brand-ink">Uma coisa sobre o acervo</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          As questões vêm de provas oficiais da banca, de adaptações dessas provas e de questões
          escritas para reforçar os pontos que mais derrubam. Cada questão diz de onde veio, e
          você pode filtrar por isso em <strong className="text-brand-ink">Provas e origens</strong>.
          Quem mantém o acervo é a administração do site: você não precisa (nem consegue) importar
          questões, só estudar as que estão lá.
        </p>
      </section>

      <div className="text-center">
        <Link to="/trilhas" className="btn-primary inline-flex items-center gap-2 text-base">
          Escolher minha trilha <ArrowRight size={18} strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="sobre-fundo">
        <h2 className="font-display text-2xl font-bold text-brand-ink">{titulo}</h2>
        <p className="text-sm text-muted">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

function Peca({
  icone: Icone,
  nome,
  texto,
  compacto = false,
}: {
  icone: typeof BookOpen;
  nome: string;
  texto: string;
  compacto?: boolean;
}) {
  return (
    <div className={`card flex gap-3.5 ${compacto ? "p-4" : "p-5"}`}>
      <span
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl"
        style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        <Icone size={19} strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <h3 className="font-display font-bold leading-tight text-brand-ink">{nome}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{texto}</p>
      </div>
    </div>
  );
}
