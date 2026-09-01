// "Matérias": escolha uma matéria (Português, Legislação, Leis…) e faça todas as
// suas questões numa rodada. Aceita deep-link ?materia=... para já abrir uma matéria.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { materias as listarMaterias, filtrar } from "../lib/questoesRepo";
import { useProgresso } from "../hooks/useProgresso";
import type { Questao } from "../types/questao";

// Cor da barra de acerto (spec §7): verde ≥75%, muted 55 a 74%, accent <55%.
function corAcerto(pct: number | null): string {
  if (pct == null) return "var(--track)";
  if (pct >= 75) return "var(--good)";
  if (pct >= 55) return "rgb(var(--muted))";
  return "var(--accent)";
}

export function Materias() {
  const [params, setParams] = useSearchParams();
  const progresso = useProgresso();

  const [materiaSel, setMateriaSel] = useState<string>(params.get("materia") ?? "");
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  // Mantém a seleção sincronizada com a URL (deep-link da Home, botão voltar…).
  useEffect(() => {
    setMateriaSel(params.get("materia") ?? "");
  }, [params]);

  // Lista de matérias com contagem + % de acerto (último resultado por questão).
  const lista = useMemo(
    () =>
      listarMaterias()
        .map((m) => {
          const qs = filtrar({ materia: m });
          const respondidas = qs.filter((q) => progresso.respondidas.has(q.id)).length;
          const erradas = qs.filter((q) => progresso.erradas.has(q.id)).length;
          const acerto = respondidas > 0 ? Math.round(((respondidas - erradas) / respondidas) * 100) : null;
          return { materia: m, total: qs.length, acerto };
        })
        .filter((x) => x.total > 0),
    [progresso.respondidas, progresso.erradas]
  );

  const questoesDaMateria = useMemo(
    () => (materiaSel ? filtrar({ materia: materiaSel }) : []),
    [materiaSel]
  );

  function abrir(materia: string) {
    setParams(materia ? { materia } : {});
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    progresso.recarregar();
  }

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;
  }

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="TOPICO"
        feedbackImediato
        permiteCaderno
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  // --- Detalhe de uma matéria: lista as questões + botão para fazer todas ---
  if (materiaSel) {
    return (
      <div className="fadeup mx-auto max-w-[820px] pt-2">
        <button
          onClick={() => abrir("")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-500"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Todas as matérias
        </button>

        <PageHeader
          rotulo="Estudo dirigido"
          titulo={materiaSel}
          subtitulo={`${questoesDaMateria.length} ${questoesDaMateria.length === 1 ? "questão" : "questões"} no banco`}
        />

        {questoesDaMateria.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-display text-xl font-bold text-brand-ink">Nenhuma questão dessa matéria</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => setSessao(questoesDaMateria)} fullWidth size="lg">
              Fazer {questoesDaMateria.length} {questoesDaMateria.length === 1 ? "questão" : "questões"} de {materiaSel}
            </Button>

            <div className="space-y-2.5">
              {questoesDaMateria.map((q) => (
                <Card key={q.id} className="flex items-center gap-4 overflow-hidden p-4">
                  <div className="h-12 w-[3px] flex-shrink-0 rounded-full" style={{ background: "var(--accentText)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold text-brand-ink">{q.assunto}</p>
                    <p className="text-xs text-faint">Mód. {q.modulo} · {q.materia}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Lista de matérias ---
  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Estudo dirigido"
        titulo="Matérias"
        subtitulo="Escolha uma matéria para montar uma sessão dirigida."
      />

      {lista.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold text-brand-ink">Nenhuma questão no banco</p>
          <p className="text-sm text-faint mt-2">Importe questões para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {lista.map(({ materia, total, acerto }) => (
            <button key={materia} onClick={() => abrir(materia)} className="w-full text-left">
              <Card className="flex items-center gap-5 p-4 transition hover:-translate-y-0.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-brand-ink">{materia}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
                      <div className="h-full rounded-full" style={{ width: `${acerto ?? 0}%`, background: corAcerto(acerto) }} />
                    </div>
                    <span className="w-12 text-right text-xs font-semibold text-muted">
                      {acerto == null ? "n/d" : `${acerto}%`}
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs text-faint">{total} {total === 1 ? "questão" : "questões"}</span>
                <ChevronRight size={20} className="flex-shrink-0 text-faint" strokeWidth={2} />
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
