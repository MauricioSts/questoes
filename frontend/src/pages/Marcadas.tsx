// "Marcadas para revisar": as questões que eu mesmo separei durante o estudo.
// É uma fila manual — nada entra ou sai daqui sozinho, ao contrário da revisão espaçada.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkX, Download } from "lucide-react";
import { useMarcadas } from "../hooks/useMarcadas";
import { useHistoricoQuestoes } from "../hooks/useHistoricoQuestoes";
import { getQuestoes, rotuloOrigem, origemDe } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { exportarProgresso } from "../lib/export";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { MetaPill } from "../components/MetaPill";
import { Revelar } from "../components/Movimento";
import { comRealce } from "../components/Realce";
import type { Questao } from "../types/questao";

export function Marcadas() {
  const marcadas = useMarcadas();
  const { mapa: historico } = useHistoricoQuestoes();
  // `inicio`: a questão clicada na lista. A sessão leva todas as marcadas, então dá para
  // ir e voltar entre elas a partir dali.
  const [sessao, setSessao] = useState<{ questoes: Questao[]; inicio: number } | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState(false);

  const questoes = getQuestoes([...marcadas.ids]);

  async function exportar() {
    setExportando(true);
    setErroExport(false);
    try {
      await exportarProgresso();
    } catch {
      setErroExport(true);
    } finally {
      setExportando(false);
    }
  }

  if (resultado) {
    return (
      <ResumoSessao
        respostas={resultado}
        onNovaSessao={() => {
          setResultado(null);
          marcadas.recarregar();
        }}
      />
    );
  }

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao.questoes}
        initialIndex={sessao.inicio}
        contexto="ESTUDO"
        feedbackImediato
        permiteCaderno
        permiteMarcar
        onFinalizar={(rs) => {
          setResultado(rs);
          setSessao(null);
        }}
        onSair={() => {
          setSessao(null);
          marcadas.recarregar();
        }}
      />
    );
  }

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Fila manual"
        titulo="Marcadas para revisar"
        subtitulo="As questões que você separou com o marcador durante o estudo. Clique em uma para abrir direto nela."
        right={
          <button
            onClick={exportar}
            disabled={exportando}
            className="tap inline-flex items-center gap-2 rounded-xl border border-hair bg-surface px-4 py-2.5
                       text-sm font-display font-bold text-muted transition hover:text-brand-500 disabled:opacity-50"
          >
            <Download size={16} strokeWidth={2} />
            {exportando ? "Exportando…" : "Exportar progresso"}
          </button>
        }
      />

      {erroExport && (
        <Card className="mb-4 p-4 text-sm text-danger-from">
          Não foi possível exportar agora. Verifique sua conexão e tente de novo.
        </Card>
      )}

      {marcadas.carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      ) : questoes.length === 0 ? (
        <Card className="p-10 text-center">
          <div
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
          >
            <Bookmark size={26} strokeWidth={2} />
          </div>
          <p className="font-display text-xl font-bold text-brand-ink">Nenhuma questão marcada</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-faint">
            Durante o estudo, use o marcador no topo da questão para guardá-la aqui. Serve para o
            que você quer reler com calma depois — pegadinha de enunciado, cálculo que travou,
            artigo de lei que ainda não decorou.
          </p>
          <Link to="/estudar" className="btn-primary mt-6 inline-flex items-center gap-2 text-base">
            Ir estudar
            <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSessao({ questoes, inicio: 0 })}
            className="btn-primary flex w-full items-center justify-center gap-2 text-lg"
          >
            Revisar {questoes.length} {questoes.length === 1 ? "marcada" : "marcadas"}
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>

          <ul className="space-y-2.5">
            {questoes.map((q, i) => {
              const h = historico.get(q.id);
              return (
                <Revelar key={q.id} atraso={Math.min(i, 6) * 0.03}>
                  <li>
                    <Card className="flex items-start gap-4 p-4 transition hover:border-brand-400">
                      <button
                        type="button"
                        onClick={() => setSessao({ questoes, inicio: i })}
                        className="tap min-w-0 flex-1 space-y-2 text-left"
                        aria-label={`Abrir questão ${i + 1}: ${q.materia}, ${q.assunto}`}
                      >
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-faint">
                          {q.materia} · {q.assunto}
                        </p>
                        <p className="line-clamp-2 text-sm leading-relaxed text-brand-ink">
                          {comRealce(q.enunciado)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <MetaPill type={`origem-${origemDe(q)}` as const} label={rotuloOrigem(q)} />
                          {h && (
                            <span className="text-[11px] font-semibold text-faint">
                              {h.tentativas}× respondida
                              {h.erros > 0 ? ` · errou ${h.erros}×` : " · sem erro"}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => marcadas.alternar(q.id)}
                        className="tap flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-hair
                                   text-faint transition hover:border-brand-300 hover:text-brand-500"
                        aria-label={`Desmarcar questão de ${q.assunto}`}
                        title="Desmarcar"
                      >
                        <BookmarkX size={18} strokeWidth={1.9} />
                      </button>
                    </Card>
                  </li>
                </Revelar>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
