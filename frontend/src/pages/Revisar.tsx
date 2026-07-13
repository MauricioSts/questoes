import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, CalendarClock } from "lucide-react";
import { api } from "../lib/api";
import { getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import type { Questao } from "../types/questao";

type Modo = "erradas" | "srs";

// Item unificado para a lista (erradas ou revisão espaçada).
interface ItemMeta {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  erros?: number; // modo erradas
  streak?: number; // modo srs (acertos consecutivos)
  dueDate?: string; // modo srs
}

export function Revisar() {
  const [params, setParams] = useSearchParams();
  const modo: Modo = params.get("modo") === "srs" ? "srs" : "erradas";
  const [metas, setMetas] = useState<ItemMeta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    const rota = modo === "srs" ? "/answers/revisao" : "/answers/erradas";
    api<{ questoes: ItemMeta[] }>(rota)
      .then((d) => setMetas(d.questoes))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [modo]);

  useEffect(carregar, [carregar]);

  const questoes = getQuestoes(metas.map((m) => m.questaoId));

  function trocarModo(novo: Modo) {
    setParams(novo === "srs" ? { modo: "srs" } : {});
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
        permiteNota
        permiteMarcar
        onFinalizar={finalizar}
      />
    );
  }

  const srs = modo === "srs";
  const vazioTitulo = srs ? "Nada para revisar hoje" : "Nenhuma questão errada pendente";
  const vazioSub = srs
    ? "Volte amanhã — vamos te lembrar na hora certa de cada questão."
    : "Continue estudando para melhorar!";

  return (
    <div className="mx-auto max-w-[560px] space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            srs ? "bg-brand-100" : "bg-danger-soft"
          }`}
        >
          {srs ? (
            <CalendarClock size={24} className="text-brand-600" strokeWidth={1.5} />
          ) : (
            <RefreshCw size={24} className="text-danger-from" strokeWidth={1.5} />
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Revisar</h1>
          <p className="text-sm text-faint">
            {srs ? "Revisão espaçada: a questão certa, no dia certo" : "Assim que acertar, elas somem daqui"}
          </p>
        </div>
      </div>

      {/* Alternância de modo */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-brand-50 p-1">
        <button
          onClick={() => trocarModo("erradas")}
          className={`rounded-xl py-2.5 text-sm font-display font-bold transition ${
            !srs ? "bg-surface text-brand-ink shadow-sm" : "text-faint hover:text-brand-ink"
          }`}
        >
          Erradas pendentes
        </button>
        <button
          onClick={() => trocarModo("srs")}
          className={`rounded-xl py-2.5 text-sm font-display font-bold transition ${
            srs ? "bg-surface text-brand-ink shadow-sm" : "text-faint hover:text-brand-ink"
          }`}
        >
          Revisão do dia
        </button>
      </div>

      {carregando ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
      ) : erro ? (
        <Card className="p-6 text-center">
          <p className="text-danger-from font-medium">Não foi possível carregar</p>
          <p className="text-sm text-faint mt-1">Verifique sua conexão.</p>
        </Card>
      ) : questoes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-3">🎉</p>
          <p className="font-semibold text-brand-ink">{vazioTitulo}</p>
          <p className="text-sm text-faint mt-2">{vazioSub}</p>
        </Card>
      ) : (
        <>
          <Button onClick={() => setSessao(questoes)} fullWidth size="lg">
            {srs ? "Revisar" : "Revisar"} {questoes.length} questão{questoes.length !== 1 ? "s" : ""}
          </Button>

          <div className="space-y-2">
            {metas
              .filter((m) => questoes.some((q) => q.id === m.questaoId))
              .map((m) => (
                <Card key={m.questaoId} className="flex items-center gap-3 p-4 overflow-hidden">
                  {/* Barra colorida à esquerda */}
                  <div
                    className={`h-14 w-1.5 rounded-full flex-shrink-0 ${
                      srs ? "bg-brand-400" : "bg-danger-from"
                    }`}
                  />

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-ink text-sm truncate">{m.assunto}</p>
                    <p className="text-xs text-faint">
                      Mód. {m.modulo} · {m.materia}
                    </p>
                  </div>

                  {/* Badge: erros (erradas) ou nível de memória (srs) */}
                  {srs ? (
                    <div className="flex-shrink-0 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-600">
                      {(m.streak ?? 0) === 0 ? "reforçar" : `nível ${m.streak}`}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 rounded-full bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger-from">
                      {m.erros}× errou
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
