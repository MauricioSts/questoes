// "Meus erros": diagnóstico por matéria/assunto das questões cujo ÚLTIMO resultado foi erro,
// com sessão de revisão dirigida e export em Markdown pronto para o Claude gerar questões
// novas sobre os pontos fracos (o JSON que ele devolve entra de volta pelo /importar).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Download, Check } from "lucide-react";
import { api } from "../lib/api";
import { getQuestao } from "../lib/questoesRepo";
import { useConcurso } from "../store/concurso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import {
  agruparPorMateria,
  baixarMarkdown,
  copiarTexto,
  montarMarkdownErros,
  type GrupoMateria,
  type ItemErro,
  type MetaErro,
  type TaxasPorChave,
} from "../lib/exportarErros";
import type { Questao } from "../types/questao";

interface TaxaItem {
  chave: string;
  materia: string;
  assunto?: string;
  total: number;
  acertos: number;
  taxa: number;
}

// Mesma escala de cor das outras telas: verde ≥75%, muted 55–74%, accent abaixo.
function corTaxa(taxa: number | null): string {
  if (taxa == null) return "var(--track)";
  const pct = taxa * 100;
  if (pct >= 75) return "var(--good)";
  if (pct >= 55) return "rgb(var(--muted))";
  return "var(--accent)";
}

function pct(taxa: number | null): string {
  return taxa == null ? "n/d" : `${Math.round(taxa * 100)}%`;
}

export function Erros() {
  const { ativo } = useConcurso();
  const [metas, setMetas] = useState<MetaErro[]>([]);
  const [taxas, setTaxas] = useState<TaxasPorChave>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    Promise.all([
      api<{ questoes: MetaErro[] }>("/answers/erradas"),
      api<{ porMateria: TaxaItem[]; porAssunto: TaxaItem[] }>("/answers/stats?period=all").catch(() => ({
        porMateria: [] as TaxaItem[],
        porAssunto: [] as TaxaItem[],
      })),
    ])
      .then(([e, s]) => {
        setMetas(e.questoes);
        const mapa: TaxasPorChave = {};
        for (const m of s.porMateria) mapa[m.materia] = m.taxa;
        for (const a of s.porAssunto) mapa[a.chave] = a.taxa;
        setTaxas(mapa);
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  // Só entram as questões que ainda existem no banco local (lote excluído sai da lista).
  const itens: ItemErro[] = useMemo(
    () =>
      metas
        .map((meta) => {
          const questao = getQuestao(meta.questaoId);
          return questao ? { meta, questao } : null;
        })
        .filter((x): x is ItemErro => x !== null),
    [metas]
  );

  const grupos = useMemo(() => agruparPorMateria(itens, taxas), [itens, taxas]);
  const totalErros = useMemo(() => itens.reduce((s, i) => s + i.meta.erros, 0), [itens]);
  const piorAssunto = useMemo(() => {
    const todos = grupos.flatMap((g) => g.assuntos.map((a) => ({ ...a, materia: g.materia })));
    return todos.sort((a, b) => b.itens.length - a.itens.length)[0] ?? null;
  }, [grupos]);

  function exportar(alvo: GrupoMateria | null, modo: "baixar" | "copiar") {
    const lista = alvo ? alvo.itens : itens;
    const md = montarMarkdownErros(lista, { concurso: ativo?.nome, materia: alvo?.materia });
    if (modo === "baixar") {
      baixarMarkdown(md, alvo?.materia);
      return;
    }
    const chave = alvo?.materia ?? "tudo";
    copiarTexto(md).then((ok) => {
      setCopiado(ok ? chave : null);
      if (ok) setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000);
      else alert("Não foi possível copiar. Use o botão de baixar .md.");
    });
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    carregar();
  }

  if (resultado) return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteCaderno
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Diagnóstico"
        titulo="Meus erros"
        subtitulo="Onde você está errando, por matéria e assunto — e o material para o Claude gerar questões novas em cima disso."
      />

      {/* Ações do export: linha própria (no slot do PageHeader elas espremem o título em tela estreita). */}
      {!carregando && !erro && itens.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 sm:justify-end">
          <Button variant="secondary" size="sm" onClick={() => exportar(null, "copiar")}>
            <span className="inline-flex items-center gap-1.5">
              {copiado === "tudo" ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2} />}
              {copiado === "tudo" ? "Copiado" : "Copiar tudo p/ Claude"}
            </span>
          </Button>
          <Button size="sm" onClick={() => exportar(null, "baixar")}>
            <span className="inline-flex items-center gap-1.5">
              <Download size={15} strokeWidth={2} />
              Exportar .md
            </span>
          </Button>
        </div>
      )}

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : erro ? (
        <Card className="p-6 text-center">
          <p className="text-danger-from font-medium">Não foi possível carregar</p>
          <p className="mt-1 text-sm text-faint">Verifique sua conexão.</p>
        </Card>
      ) : itens.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold text-brand-ink">Nenhum erro pendente</p>
          <p className="mt-2 text-sm text-faint">
            Assim que você errar uma questão e não recuperar, ela aparece aqui agrupada por matéria.
          </p>
        </Card>
      ) : (
        <>
          {/* Panorama */}
          <div className="card mb-6 grid grid-cols-2 sm:grid-cols-3">
            <Kpi rotulo="Erradas pendentes" valor={String(itens.length)} sub={`${totalErros} erros no total`} />
            <Kpi rotulo="Matérias afetadas" valor={String(grupos.length)} sub="com erro pendente" borda />
            <Kpi
              rotulo="Assunto mais crítico"
              valor={piorAssunto ? String(piorAssunto.itens.length) : "—"}
              sub={piorAssunto ? `${piorAssunto.assunto}` : "sem dados"}
              cor="var(--accentText)"
              borda
            />
          </div>

          <div className="space-y-2.5">
            {grupos.map((g) => {
              const aberto = aberta === g.materia;
              return (
                <Card key={g.materia} className="overflow-hidden p-0">
                  <button
                    onClick={() => setAberta(aberto ? null : g.materia)}
                    className="flex w-full items-center gap-5 p-4 text-left"
                    aria-expanded={aberto}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold text-brand-ink">{g.materia}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(g.taxa ?? 0) * 100}%`, background: corTaxa(g.taxa) }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-semibold text-muted">{pct(g.taxa)}</span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold" style={{ color: "var(--accentText)" }}>
                      {g.itens.length} pendente{g.itens.length === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      size={20}
                      strokeWidth={2}
                      className={`flex-shrink-0 text-faint transition-transform ${aberto ? "rotate-180" : ""}`}
                    />
                  </button>

                  {aberto && (
                    <div className="border-t border-hair px-4 pb-4 pt-3">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setSessao(g.itens.map((i) => i.questao))}>
                          Revisar {g.itens.length}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => exportar(g, "copiar")}>
                          <span className="inline-flex items-center gap-1.5">
                            {copiado === g.materia ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2} />}
                            {copiado === g.materia ? "Copiado" : "Copiar p/ Claude"}
                          </span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportar(g, "baixar")}>
                          <span className="inline-flex items-center gap-1.5">
                            <Download size={15} strokeWidth={2} />
                            .md
                          </span>
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {g.assuntos.map((a) => (
                          <div key={a.assunto}>
                            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                              <p className="truncate text-sm font-display font-bold text-brand-ink">{a.assunto}</p>
                              <span className="flex-shrink-0 text-xs text-faint">
                                {a.itens.length} pendente{a.itens.length === 1 ? "" : "s"} · acerto {pct(a.taxa)}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {a.itens.map(({ meta, questao }) => (
                                <div
                                  key={meta.questaoId}
                                  className="flex items-start gap-3 rounded-xl border border-hair px-3 py-2"
                                >
                                  <span className="mt-0.5 flex-shrink-0 text-[11px] font-bold text-faint tabular-nums">
                                    #{questao.id}
                                  </span>
                                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted line-clamp-2">
                                    {questao.enunciado}
                                  </p>
                                  <span className="flex-shrink-0 text-[11px] font-bold" style={{ color: "var(--accentText)" }}>
                                    {meta.erros}× errou
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs text-faint">
            O arquivo exportado já vem com o pedido pronto: cole no Claude, ele devolve um JSON de questões novas
            que você importa em “Importar lote”.
          </p>
        </>
      )}
    </div>
  );
}

// Bloco de número do painel de panorama (mesmo formato dos KPIs de Estatísticas).
function Kpi({
  rotulo,
  valor,
  sub,
  cor,
  borda = false,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  cor?: string;
  borda?: boolean;
}) {
  return (
    <div className={`px-4 py-4 ${borda ? "border-l border-hair" : ""}`}>
      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">{rotulo}</p>
      <p className="mt-1 font-display text-2xl font-bold text-brand-ink" style={cor ? { color: cor } : undefined}>
        {valor}
      </p>
      <p className="mt-0.5 truncate text-xs text-faint">{sub}</p>
    </div>
  );
}
