// "Provas e procedência": desempenho separado por prova de origem e por tipo de questão.
// Responde as perguntas que o dashboard geral não responde — quantas eu acertei da prova da
// AMAZUL/FGV, quantas dela ainda faltam, quantas estão erradas e quantas eu marquei — e leva
// direto para uma sessão só com aquelas questões.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Bookmark } from "lucide-react";
import { carregarProcedencia, type GrupoProcedencia, type ResumoProcedencia } from "../lib/procedencia";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { InfoPopover } from "../components/InfoPopover";
import { Revelar } from "../components/Movimento";

// Mesma escala das outras telas: verde ≥75%, muted 55–74%, acento abaixo disso.
function corTaxa(taxa: number | null): string {
  if (taxa == null) return "var(--track)";
  const pct = taxa * 100;
  if (pct >= 75) return "var(--good)";
  if (pct >= 55) return "rgb(var(--muted))";
  return "var(--accent)";
}

function pct(taxa: number | null): string {
  return taxa == null ? "—" : `${Math.round(taxa * 100)}%`;
}

// Barra de composição: quanto do total está certo, errado e ainda não respondido.
function BarraComposicao({ g }: { g: GrupoProcedencia }) {
  const total = Math.max(1, g.total);
  const partes = [
    { chave: "certas", n: g.certas, cor: "var(--good)", rotulo: "certas" },
    { chave: "erradas", n: g.erradas, cor: "var(--accent)", rotulo: "erradas" },
    { chave: "faltam", n: g.faltam, cor: "var(--track)", rotulo: "não respondidas" },
  ];
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full"
      style={{ background: "var(--track)" }}
      role="img"
      aria-label={partes.map((p) => `${p.n} ${p.rotulo}`).join(", ")}
    >
      {partes.map((p) => (
        <span
          key={p.chave}
          style={{ width: `${(p.n / total) * 100}%`, background: p.cor }}
          className="h-full first:rounded-l-full last:rounded-r-full"
        />
      ))}
    </div>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div>
      <p className="font-display text-xl font-bold leading-none" style={{ color: cor ?? "var(--text)" }}>
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-faint">{rotulo}</p>
    </div>
  );
}

function CartaoGrupo({ g, href }: { g: GrupoProcedencia; href: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold text-brand-ink">{g.rotulo}</h3>
          <p className="mt-0.5 truncate text-xs text-faint">
            {[g.cargo, `${g.total} ${g.total === 1 ? "questão" : "questões"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-display text-2xl font-bold leading-none" style={{ color: corTaxa(g.taxa) }}>
            {pct(g.taxa)}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-faint">aproveitamento</p>
        </div>
      </div>

      <div className="mt-4">
        <BarraComposicao g={g} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <Numero rotulo="certas" valor={g.certas} cor="var(--goodText)" />
        <Numero rotulo="erradas" valor={g.erradas} cor="var(--accentText)" />
        <Numero rotulo="faltam" valor={g.faltam} />
        <Numero rotulo="marcadas" valor={g.marcadas} />
      </div>

      <p className="mt-3 text-xs text-faint">
        {g.tentativas > 0
          ? `${g.tentativas} ${g.tentativas === 1 ? "resposta registrada" : "respostas registradas"} · ${g.respondidas} de ${g.total} questões já vistas`
          : "Nenhuma questão respondida ainda"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 whitespace-nowrap">
        <Link
          to={href}
          className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-brand-500 transition hover:gap-2.5"
        >
          Estudar só estas
          <ArrowRight size={16} strokeWidth={2.4} />
        </Link>
        {g.marcadas > 0 && (
          <Link
            to="/marcadas"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-faint transition hover:text-brand-ink"
          >
            <Bookmark size={13} strokeWidth={2} />
            ver marcadas
          </Link>
        )}
        {g.url && (
          <a
            href={g.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-faint transition hover:text-brand-ink"
          >
            <ExternalLink size={13} strokeWidth={2} />
            PDF da prova
          </a>
        )}
      </div>
    </Card>
  );
}

export function Provas() {
  const [dados, setDados] = useState<ResumoProcedencia | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregarProcedencia()
      .then(setDados)
      .catch(() => setErro(true));
  }, []);

  if (erro)
    return (
      <div className="mx-auto max-w-[900px] p-6 text-center">
        <p className="font-medium text-danger-from">Não foi possível carregar o painel de provas</p>
        <p className="mt-1 text-sm text-faint">Verifique sua conexão.</p>
      </div>
    );

  if (!dados)
    return (
      <div className="mx-auto max-w-[900px] space-y-6 pt-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28" />
        <div className="grade-cartoes grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );

  const { geral, provas, origens } = dados;

  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2">
      <PageHeader
        rotulo="Procedência"
        titulo="Provas e origens"
        subtitulo="Seu desempenho separado por prova de concurso e por tipo de questão."
        right={
          <InfoPopover titulo="Como estes números são contados">
            <p>
              <b className="text-brand-ink">Certas</b> e <b className="text-brand-ink">erradas</b> contam
              questões pelo <i>último</i> resultado: acertar uma questão que você errava move ela de
              um lado para o outro.
            </p>
            <p>
              <b className="text-brand-ink">Aproveitamento</b> é diferente: usa todas as respostas
              registradas, inclusive as repetições da mesma questão.
            </p>
            <p>
              Uma questão entra na prova de onde o texto saiu. As questões autorais escritas junto
              com um lote entram na prova daquele lote — é assim que "estudar só a prova da FGV"
              inclui o reforço criado a partir dela.
            </p>
          </InfoPopover>
        }
      />

      {/* Faixa geral do concurso ativo */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Todo o banco</p>
            <p className="mt-1 font-display text-3xl font-bold leading-none text-brand-ink">
              {geral.respondidas} <span className="text-lg text-muted">de {geral.total} questões vistas</span>
            </p>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <Numero rotulo="certas" valor={geral.certas} cor="var(--goodText)" />
            <Numero rotulo="erradas" valor={geral.erradas} cor="var(--accentText)" />
            <Numero rotulo="faltam" valor={geral.faltam} />
            <Numero rotulo="marcadas" valor={geral.marcadas} />
          </div>
        </div>
        <div className="mt-4">
          <BarraComposicao g={geral} />
        </div>
      </Card>

      {/* Por prova */}
      <h2 className="mb-4 font-display text-xl font-bold text-brand-ink">Por prova</h2>
      {provas.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-display text-lg font-bold text-brand-ink">Nenhuma prova identificada</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm text-faint">
            As questões deste concurso não têm prova de origem. Ao importar um lote, informe a
            <code className="mx-1 rounded bg-surface2 px-1.5 py-0.5 text-[12px]">provaBase</code>
            para acompanhar o desempenho por prova aqui.
          </p>
        </Card>
      ) : (
        <div className="grade-cartoes grid gap-5 lg:grid-cols-2">
          {provas.map((g, i) => (
            <Revelar key={g.chave} atraso={Math.min(i, 6) * 0.04}>
              <CartaoGrupo g={g} href={`/estudar?prova=${encodeURIComponent(g.chave)}`} />
            </Revelar>
          ))}
        </div>
      )}

      {/* Por tipo de questão */}
      <h2 className="mb-4 mt-8 font-display text-xl font-bold text-brand-ink">Por tipo de questão</h2>
      <div className="grade-cartoes grid gap-5 lg:grid-cols-2">
        {origens.map((g, i) => (
          <Revelar key={g.chave} atraso={Math.min(i, 6) * 0.04}>
            <CartaoGrupo g={g} href={`/estudar?origem=${encodeURIComponent(g.chave)}`} />
          </Revelar>
        ))}
      </div>
    </div>
  );
}
