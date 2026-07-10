// "Matérias": escolha uma matéria (Português, Legislação, Leis…) e faça todas as
// suas questões numa rodada. Aceita deep-link ?materia=... para já abrir uma matéria.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Library, ArrowLeft, ChevronRight } from "lucide-react";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { materias as listarMaterias, filtrar } from "../lib/questoesRepo";
import { useProgresso } from "../hooks/useProgresso";
import type { Questao } from "../types/questao";

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

  // Lista de matérias com a contagem de questões de cada uma.
  const lista = useMemo(
    () =>
      listarMaterias()
        .map((m) => ({ materia: m, total: filtrar({ materia: m }).length }))
        .filter((x) => x.total > 0),
    []
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
        permiteNota
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  // --- Detalhe de uma matéria: lista as questões + botão para fazer todas ---
  if (materiaSel) {
    return (
      <div className="mx-auto max-w-[620px] space-y-6 px-1 py-6">
        <button
          onClick={() => abrir("")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-500"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Todas as matérias
        </button>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Library size={24} className="text-brand-600" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-brand-ink">{materiaSel}</h1>
            <p className="text-sm text-faint">
              {questoesDaMateria.length} {questoesDaMateria.length === 1 ? "questão" : "questões"} no banco
            </p>
          </div>
        </div>

        {questoesDaMateria.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-semibold text-brand-ink">Nenhuma questão dessa matéria</p>
          </Card>
        ) : (
          <>
            <Button onClick={() => setSessao(questoesDaMateria)} fullWidth size="lg">
              Fazer {questoesDaMateria.length}{" "}
              {questoesDaMateria.length === 1 ? "questão" : "questões"} de {materiaSel}
            </Button>

            <div className="space-y-2">
              {questoesDaMateria.map((q) => (
                <Card key={q.id} className="flex items-center gap-3 p-4 overflow-hidden">
                  <div className="h-14 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-ink text-sm truncate">{q.assunto}</p>
                    <p className="text-xs text-faint">Mód. {q.modulo} · {q.materia}</p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Lista de matérias ---
  return (
    <div className="mx-auto max-w-[620px] space-y-6 px-1 py-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Library size={24} className="text-brand-600" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Matérias</h1>
          <p className="text-sm text-faint">Escolha uma matéria e faça todas as questões dela.</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="font-semibold text-brand-ink">Nenhuma questão no banco</p>
          <p className="text-sm text-faint mt-2">Importe questões para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {lista.map(({ materia, total }) => (
            <button key={materia} onClick={() => abrir(materia)} className="w-full text-left">
              <Card className="flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <div className="h-12 w-12 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Library size={20} className="text-brand-600" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-ink truncate">{materia}</p>
                  <p className="text-xs text-faint">
                    {total} {total === 1 ? "questão" : "questões"}
                  </p>
                </div>
                <ChevronRight size={20} className="text-faint flex-shrink-0" strokeWidth={2} />
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
