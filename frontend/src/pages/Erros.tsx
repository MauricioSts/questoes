// "Meus erros": histórico de erro por matéria/assunto, com recorte de tempo (7d/30d/tudo),
// sessão de revisão dirigida e export em Markdown pronto para o Claude gerar questões novas
// sobre os pontos fracos (o JSON que ele devolve entra de volta pelo /importar).
//
// A lista NÃO esvazia quando eu acerto: acertar uma vez não prova domínio, então a questão
// recuperada continua no histórico (marcada como tal) para servir de base de estudo. Quem
// quer só a fila do que falta recuperar usa o filtro "pendentes".
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, Download, Check } from "lucide-react";
import { api } from "../lib/api";
import { getQuestao, rotuloOrigem } from "../lib/questoesRepo";
import { useConcurso } from "../store/concurso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { FilterSelect } from "../components/FilterSelect";
import {
  agruparPorMateria,
  baixarMarkdown,
  copiarTexto,
  montarMarkdownErros,
  recuperada,
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

// Recorte de tempo do histórico de erros. O rótulo vai junto no .md exportado, para o
// Claude saber que "errei 4×" é de uma semana e não da vida inteira.
type Periodo = "7d" | "30d" | "all";
const PERIODOS: { valor: Periodo; rotulo: string; frase: string }[] = [
  { valor: "7d", rotulo: "7 dias", frase: "nos últimos 7 dias" },
  { valor: "30d", rotulo: "30 dias", frase: "nos últimos 30 dias" },
  { valor: "all", rotulo: "Tudo", frase: "desde sempre" },
];

type Estado = "todas" | "pendentes";
const CHAVE_PERIODO = "q_erros_periodo";
const CHAVE_ESTADO = "q_erros_estado";

function lerPreferencia<T extends string>(chave: string, valores: readonly T[], padrao: T): T {
  try {
    const v = localStorage.getItem(chave) as T | null;
    return v && valores.includes(v) ? v : padrao;
  } catch {
    return padrao;
  }
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
  const [periodo, setPeriodo] = useState<Periodo>(() =>
    lerPreferencia<Periodo>(CHAVE_PERIODO, ["7d", "30d", "all"], "all")
  );
  const [estado, setEstado] = useState<Estado>(() =>
    lerPreferencia<Estado>(CHAVE_ESTADO, ["todas", "pendentes"], "todas")
  );

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    Promise.all([
      api<{ questoes: MetaErro[] }>(`/answers/erradas?period=${periodo}&estado=${estado}`),
      api<{ porMateria: TaxaItem[]; porAssunto: TaxaItem[] }>(`/answers/stats?period=${periodo}`).catch(() => ({
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
  }, [periodo, estado]);

  useEffect(carregar, [carregar]);

  // Guarda o recorte escolhido: voltar para a tela deve reabrir no mesmo lugar.
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_PERIODO, periodo);
      localStorage.setItem(CHAVE_ESTADO, estado);
    } catch {
      // modo privado / storage bloqueado: a preferência só não persiste
    }
  }, [periodo, estado]);

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
  const pendentes = useMemo(() => itens.filter((i) => !recuperada(i.meta)).length, [itens]);
  const recuperadas = itens.length - pendentes;
  // Ranking por conteúdo: ordena assunto por ERROS (não por questões pendentes), que é o
  // que responde "onde eu mais erro" mesmo depois de eu recuperar as questões.
  const ranking = useMemo(
    () =>
      grupos
        .flatMap((g) => g.assuntos)
        .sort((a, b) => b.erros - a.erros || b.itens.length - a.itens.length)
        .slice(0, 8),
    [grupos]
  );
  const fraseperiodo = PERIODOS.find((p) => p.valor === periodo)!.frase;

  function exportar(alvo: GrupoMateria | null, modo: "baixar" | "copiar") {
    const lista = alvo ? alvo.itens : itens;
    const md = montarMarkdownErros(lista, {
      concurso: ativo?.nome,
      materia: alvo?.materia,
      periodo: fraseperiodo,
    });
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
        subtitulo="Todo erro fica registrado aqui, mesmo depois de você acertar a questão — é a sua base de estudo e o material para o Claude gerar questões novas em cima dela."
      />

      {/* Recorte: período + se as recuperadas entram. Fica acima de tudo porque muda o
          conteúdo inteiro da tela, inclusive o que vai no .md exportado. */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Período"
          value={periodo}
          onChange={(v) => setPeriodo(v as Periodo)}
          options={PERIODOS.map((p) => ({ value: p.valor, label: p.rotulo }))}
          className="w-32"
        />
        <FilterSelect
          label="Mostrar"
          value={estado}
          onChange={(v) => setEstado(v as Estado)}
          options={[
            { value: "todas", label: "Todas que errei" },
            { value: "pendentes", label: "Só pendentes" },
          ]}
          className="w-44"
        />
      </div>

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
          <p className="font-display text-xl font-bold text-brand-ink">
            {periodo === "all" ? "Nenhum erro registrado" : `Nenhum erro ${fraseperiodo}`}
          </p>
          <p className="mt-2 text-sm text-faint">
            {estado === "pendentes"
              ? "Nada pendente neste recorte. Mude para “Todas” para ver também as que você já recuperou."
              : "Assim que você errar uma questão, ela aparece aqui agrupada por matéria — e continua aqui depois de você acertar."}
          </p>
        </Card>
      ) : (
        <>
          {/* Panorama */}
          <div className="card mb-4 grid grid-cols-2 sm:grid-cols-4">
            <Kpi rotulo="Questões erradas" valor={String(itens.length)} sub={`${totalErros} erros ${fraseperiodo}`} />
            <Kpi rotulo="Pendentes" valor={String(pendentes)} sub="ainda não recuperei" borda />
            <Kpi rotulo="Recuperadas" valor={String(recuperadas)} sub="acertei depois de errar" borda />
            <Kpi
              rotulo="Matérias afetadas"
              valor={String(grupos.length)}
              sub="com erro no recorte"
              cor="var(--accentText)"
              borda
            />
          </div>

          {/* Ranking por conteúdo: a resposta direta de "o que eu mais errei". */}
          <Card className="mb-6 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-faint">
              Onde eu mais erro · {fraseperiodo}
            </p>
            <ol className="space-y-1.5">
              {ranking.map((a, i) => (
                <li key={`${a.materia}›${a.assunto}`} className="flex items-baseline gap-3">
                  <span className="w-4 flex-shrink-0 text-right text-[11px] font-bold text-faint tabular-nums">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-brand-ink">
                    <span className="text-faint">{a.materia} › </span>
                    <span className="font-semibold">{a.assunto}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-faint tabular-nums">
                    {a.itens.length} quest.
                  </span>
                  <span
                    className="w-16 flex-shrink-0 text-right text-xs font-bold tabular-nums"
                    style={{ color: "var(--accentText)" }}
                  >
                    {a.erros} erro{a.erros === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

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
                    <span className="flex-shrink-0 text-right text-xs font-bold" style={{ color: "var(--accentText)" }}>
                      {g.erros} erro{g.erros === 1 ? "" : "s"}
                      <span className="block font-normal text-faint">
                        {g.itens.length} quest.{g.recuperadas > 0 ? ` · ${g.pendentes} pend.` : ""}
                      </span>
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
                        {g.pendentes > 0 && (
                          <Button
                            size="sm"
                            onClick={() => setSessao(g.itens.filter((i) => !recuperada(i.meta)).map((i) => i.questao))}
                          >
                            Revisar {g.pendentes} pendente{g.pendentes === 1 ? "" : "s"}
                          </Button>
                        )}
                        {g.recuperadas > 0 && (
                          <Button
                            variant={g.pendentes > 0 ? "outline" : "primary"}
                            size="sm"
                            onClick={() => setSessao(g.itens.map((i) => i.questao))}
                          >
                            Revisar todas {g.itens.length}
                          </Button>
                        )}
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
                                {a.erros} erro{a.erros === 1 ? "" : "s"} em {a.itens.length} · acerto {pct(a.taxa)}
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
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs leading-relaxed text-muted line-clamp-2">{questao.enunciado}</p>
                                    {/* Procedência: distingue questão de prova real de reforço gerado. */}
                                    <p className="mt-0.5 truncate text-[10.5px] text-faint">{rotuloOrigem(questao)}</p>
                                  </div>
                                  <span className="flex-shrink-0 text-right">
                                    <span className="block text-[11px] font-bold" style={{ color: "var(--accentText)" }}>
                                      {meta.erros}× errou
                                    </span>
                                    {recuperada(meta) && (
                                      <span className="block text-[10.5px] font-semibold text-success-from">recuperada</span>
                                    )}
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
