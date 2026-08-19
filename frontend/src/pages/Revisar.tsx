import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import type { Questao } from "../types/questao";

// Cor da barra de gravidade por nº de erros (spec §7): 4×/3× accent, 2× accentText, 1× dim.
function corGravidade(erros = 0): string {
  if (erros >= 3) return "var(--accent)";
  if (erros === 2) return "var(--accentText)";
  return "var(--dim)";
}

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
  const [contagem, setContagem] = useState<{ erradas: number; srs: number }>({ erradas: 0, srs: 0 });

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

  // Contagem das duas abas (para os rótulos "Erradas pendentes · N").
  useEffect(() => {
    Promise.all([
      api<{ questoes: unknown[] }>("/answers/erradas").catch(() => ({ questoes: [] })),
      api<{ total: number }>("/answers/revisao").catch(() => ({ total: 0 })),
    ]).then(([e, s]) => setContagem({ erradas: e.questoes.length, srs: s.total }));
  }, [resultado]);

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
    ? "Volte amanhã. Vamos te lembrar na hora certa de cada questão."
    : "Continue estudando para melhorar!";

  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Revisão"
        titulo={srs ? "Revisão do dia" : "O que ficou pendente"}
        subtitulo={
          srs ? "A questão certa, no dia certo. Revisão espaçada." : "Assim que você acerta, a questão sai desta lista."
        }
      />

      {/* Abas com contagem (underline) */}
      <div className="mb-5 flex items-center gap-6 border-b border-hair">
        {([
          { id: "erradas", label: "Erradas pendentes", n: contagem.erradas },
          { id: "srs", label: "Revisão do dia", n: contagem.srs },
        ] as const).map((t) => {
          const ativo = (t.id === "srs") === srs;
          return (
            <button
              key={t.id}
              onClick={() => trocarModo(t.id)}
              className={`-mb-px border-b-2 pb-2.5 text-sm font-display font-bold transition ${
                ativo ? "border-brand-500 text-brand-ink" : "border-transparent text-faint hover:text-brand-ink"
              }`}
            >
              {t.label} · {t.n}
            </button>
          );
        })}
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
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold text-brand-ink">{vazioTitulo}</p>
          <p className="text-sm text-faint mt-2">{vazioSub}</p>
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

          <div className="space-y-2.5">
            {metas
              .filter((m) => questoes.some((q) => q.id === m.questaoId))
              .map((m) => (
                <Card key={m.questaoId} className="flex items-center gap-4 overflow-hidden p-4">
                  <div
                    className="h-12 w-[3px] flex-shrink-0 rounded-full"
                    style={{ background: srs ? "var(--accentText)" : corGravidade(m.erros) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-bold text-brand-ink">{m.assunto}</p>
                    <p className="text-xs text-faint">
                      Mód. {m.modulo} · {m.materia}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold" style={{ color: srs ? "var(--accentText)" : "var(--accentText)" }}>
                    {srs ? ((m.streak ?? 0) === 0 ? "reforçar" : `nível ${m.streak}`) : `${m.erros}× errou`}
                  </span>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
