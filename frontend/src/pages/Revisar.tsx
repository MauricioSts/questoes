import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import type { Questao } from "../types/questao";

interface ErradaMeta {
  questaoId: number;
  modulo: string;
  materia: string;
  assunto: string;
  dificuldade: string;
  erros: number;
  tentativas: number;
}

export function Revisar() {
  const [metas, setMetas] = useState<ErradaMeta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    api<{ questoes: ErradaMeta[] }>("/answers/erradas")
      .then((d) => setMetas(d.questoes))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  const questoes = getQuestoes(metas.map((m) => m.questaoId));

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

  return (
    <div className="mx-auto max-w-[560px] space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-danger-soft flex items-center justify-center flex-shrink-0">
          <RefreshCw size={24} className="text-danger-from" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Revisar</h1>
          <p className="text-sm text-faint">Assim que acertar, elas somem daqui</p>
        </div>
      </div>

      {carregando ? (
        <Card className="p-6 text-center">
          <p className="text-faint">Carregando…</p>
        </Card>
      ) : erro ? (
        <Card className="p-6 text-center">
          <p className="text-danger-from font-medium">Não foi possível carregar</p>
          <p className="text-sm text-faint mt-1">Verifique sua conexão.</p>
        </Card>
      ) : questoes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-3">🎉</p>
          <p className="font-semibold text-brand-ink">Nenhuma questão errada pendente</p>
          <p className="text-sm text-faint mt-2">Continue estudando para melhorar!</p>
        </Card>
      ) : (
        <>
          <Button onClick={() => setSessao(questoes)} fullWidth size="lg">
            Revisar {questoes.length} questão{questoes.length !== 1 ? "s" : ""}
          </Button>

          <div className="space-y-2">
            {metas
              .filter((m) => questoes.some((q) => q.id === m.questaoId))
              .map((m) => (
                <Card key={m.questaoId} className="flex items-center gap-3 p-4 overflow-hidden">
                  {/* Barra colorida à esquerda */}
                  <div className="h-14 w-1.5 rounded-full bg-danger-from flex-shrink-0" />

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-ink text-sm truncate">{m.assunto}</p>
                    <p className="text-xs text-faint">
                      Mód. {m.modulo} · {m.materia}
                    </p>
                  </div>

                  {/* Badge de erros */}
                  <div className="flex-shrink-0 rounded-full bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger-from">
                    {m.erros}× errou
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
