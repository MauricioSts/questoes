// Revisão espaçada (SRS). Esta tela é SÓ o agendamento espaçado: a fila do que ficou
// errado e o diagnóstico por matéria moraram aqui um tempo, mas viraram uma tela própria
// ("Meus erros"), e misturar as duas coisas fazia a revisão do dia parecer opcional.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Target, RotateCcw, CalendarClock } from "lucide-react";
import { getQuestoes } from "../lib/questoesRepo";
import { carregarRevisao, resetarRevisao, INTERVALOS_DIAS, type ItemRevisao } from "../lib/revisao";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { InfoPopover } from "../components/InfoPopover";
import { Revelar } from "../components/Movimento";
import type { Questao } from "../types/questao";

// Nível = acertos consecutivos. Nível 0 é a questão que acabou de ser errada.
function rotuloNivel(streak = 0): string {
  return streak === 0 ? "reforçar" : `nível ${streak}`;
}

// Quantos dias a questão ficou esperando além da data em que ficou pronta.
function atraso(dueDate?: string): number {
  if (!dueDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 864e5));
}

export function Revisar() {
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [total, setTotal] = useState(0);
  const [resetadoEm, setResetadoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [resetando, setResetando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    carregarRevisao()
      .then((d) => {
        setItens(d.questoes);
        setTotal(d.total);
        setResetadoEm(d.resetadoEm ?? null);
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  const questoes = getQuestoes(itens.map((m) => m.questaoId));

  async function reiniciar() {
    setResetando(true);
    try {
      const r = await resetarRevisao();
      setResetadoEm(r.resetadoEm);
      setConfirmandoReset(false);
      carregar();
    } catch {
      setErro(true);
    } finally {
      setResetando(false);
    }
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
        rotulo="Revisão espaçada"
        titulo="Revisão do dia"
        subtitulo="Cada questão volta no dia em que você está prestes a esquecê-la."
        right={
          <InfoPopover titulo="Como funciona a revisão espaçada">
            <p>
              Toda questão que você responde entra numa fila com data marcada. Ela reaparece
              aqui só no dia em que a memória começa a falhar — nem antes (perda de tempo),
              nem depois (já esqueceu).
            </p>
            <p>
              O intervalo cresce a cada acerto seguido:{" "}
              <b className="text-brand-ink">{INTERVALOS_DIAS.join(", ")} dias</b>. Errar zera o
              nível e a questão volta no dia seguinte.
            </p>
            <p>
              Por isso a lista pode estar vazia: não é falta de conteúdo, é a fila dizendo que
              hoje nada precisa ser revisado. Nesse caso, estude questões novas em{" "}
              <b className="text-brand-ink">Estudar</b>.
            </p>
            <p className="text-faint">
              Reiniciar a fila só apaga o agendamento. Suas respostas, ofensiva, estatísticas e
              histórico de erros continuam intactos.
            </p>
          </InfoPopover>
        }
      />

      {/* Barra de estado: total pendente + atalhos (erros por matéria, reiniciar fila) */}
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-hair pb-3">
        <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-brand-ink">
          <CalendarClock size={16} strokeWidth={2} style={{ color: "var(--accentText)" }} />
          {total} {total === 1 ? "questão pronta" : "questões prontas"} para hoje
        </span>

        <Link
          to="/erros"
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-display font-bold text-faint transition hover:text-brand-ink"
        >
          <Target size={15} strokeWidth={2} />
          Meus erros por matéria
        </Link>

        {confirmandoReset ? (
          <span className="flex items-center gap-2">
            <button
              onClick={reiniciar}
              disabled={resetando}
              className="tap rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50"
              style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}
            >
              {resetando ? "Reiniciando…" : "Confirmar reinício"}
            </button>
            <button
              onClick={() => setConfirmandoReset(false)}
              className="tap rounded-xl px-2 text-xs font-bold text-muted transition hover:text-brand-ink"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmandoReset(true)}
            className="tap inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-faint transition hover:text-brand-ink"
            title="Zera o agendamento da revisão espaçada (não apaga respostas)"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Reiniciar fila
          </button>
        )}
      </div>

      {confirmandoReset && (
        <Card className="mb-5 p-4 text-sm leading-relaxed text-muted">
          Reiniciar zera <b className="text-brand-ink">apenas o agendamento da revisão espaçada</b>: a
          fila volta a ficar vazia e cada questão é reagendada na próxima vez que você responder a
          ela. Nenhuma resposta é apagada — estatísticas, ofensiva, marcadas e "meus erros" ficam
          como estão.
        </Card>
      )}

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
      ) : erro ? (
        <Card className="p-6 text-center">
          <p className="font-medium text-danger-from">Não foi possível carregar</p>
          <p className="mt-1 text-sm text-faint">Verifique sua conexão.</p>
        </Card>
      ) : questoes.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold text-brand-ink">Nada para revisar hoje</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm text-faint">
            {resetadoEm
              ? "A fila foi reiniciada: as questões voltam a ser agendadas conforme você as responde de novo."
              : "A fila está em dia. Responda questões novas e elas voltam aqui na hora certa."}
          </p>
          <Link to="/estudar" className="btn-primary mt-6 inline-flex items-center gap-2 text-base">
            Estudar questões novas
            <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSessao(questoes)}
            className="btn-primary flex w-full items-center justify-center gap-2 text-lg"
          >
            Revisar {questoes.length} {questoes.length !== 1 ? "questões" : "questão"}
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>

          <ul className="space-y-2.5">
            {itens
              .filter((m) => questoes.some((q) => q.id === m.questaoId))
              .map((m, i) => {
                const dias = atraso(m.dueDate);
                return (
                  <Revelar key={m.questaoId} atraso={Math.min(i, 6) * 0.03}>
                    <li>
                      <Card className="flex items-center gap-4 overflow-hidden p-4">
                        <div
                          className="h-12 w-[3px] flex-shrink-0 rounded-full"
                          style={{ background: dias >= 3 ? "var(--accent)" : "var(--accentText)" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display font-bold text-brand-ink">{m.assunto}</p>
                          <p className="text-xs text-faint">
                            Mód. {m.modulo} · {m.materia}
                            {m.tentativas ? ` · ${m.tentativas}ª vez` : ""}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-right">
                          <span className="block text-xs font-bold" style={{ color: "var(--accentText)" }}>
                            {rotuloNivel(m.streak)}
                          </span>
                          {dias > 0 && (
                            <span className="block text-[11px] text-faint">
                              {dias === 1 ? "1 dia de atraso" : `${dias} dias de atraso`}
                            </span>
                          )}
                        </span>
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
