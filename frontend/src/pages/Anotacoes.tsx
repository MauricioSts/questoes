// "Questões com anotações": lista as questões em que você deixou uma anotação,
// mostra o texto da nota e permite refazê-las numa sessão de estudo.
import { useCallback, useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
import { api } from "../lib/api";
import { getQuestao, getQuestoes } from "../lib/questoesRepo";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import type { Questao } from "../types/questao";
import { comRealce } from "../components/Realce";

interface Nota {
  questaoId: number;
  texto: string;
  updatedAt: string;
}

export function Anotacoes() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    api<{ notas: Nota[] }>("/notes")
      .then((d) => setNotas(d.notas))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(carregar, [carregar]);

  // Só notas cujas questões existem no banco local (ignora órfãs).
  const comQuestao = notas.filter((n) => getQuestao(n.questaoId));
  const questoes = getQuestoes(comQuestao.map((n) => n.questaoId));

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => { setResultado(null); carregar(); }} />;
  }

  if (sessao) {
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteNota
        permiteMarcar
        onFinalizar={(rs) => { setResultado(rs); setSessao(null); }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[620px] space-y-6 px-1 py-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
          <NotebookPen size={24} className="text-[#4A57E0]" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Anotações</h1>
          <p className="text-sm text-faint">Questões em que você deixou uma nota</p>
        </div>
      </div>

      {carregando ? (
        <Card className="p-6 text-center"><p className="text-faint">Carregando…</p></Card>
      ) : erro ? (
        <Card className="p-6 text-center">
          <p className="text-danger-from font-medium">Não foi possível carregar</p>
          <p className="text-sm text-faint mt-1">Verifique sua conexão.</p>
        </Card>
      ) : comQuestao.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-3xl mb-3">📝</p>
          <p className="font-semibold text-brand-ink">Nenhuma anotação ainda</p>
          <p className="text-sm text-faint mt-2">
            Durante o estudo, clique em “Anotar” após responder para guardar uma nota.
          </p>
        </Card>
      ) : (
        <>
          <Button onClick={() => setSessao(questoes)} fullWidth size="lg">
            Refazer {questoes.length} questão{questoes.length !== 1 ? "s" : ""} anotada{questoes.length !== 1 ? "s" : ""}
          </Button>

          <div className="space-y-3">
            {comQuestao.map((n) => {
              const q = getQuestao(n.questaoId)!;
              return (
                <Card key={n.questaoId} className="p-4 space-y-2 overflow-hidden">
                  <p className="text-xs font-semibold text-faint">
                    Mód. {q.modulo} · {q.materia} · {q.assunto}
                  </p>
                  <p className="text-sm text-brand-ink line-clamp-2">{comRealce(q.enunciado)}</p>
                  <div className="rounded-xl bg-brand-50 border border-hair p-3">
                    <p className="text-sm whitespace-pre-wrap text-brand-ink">{n.texto}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
