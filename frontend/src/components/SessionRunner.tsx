// Executor de sessão reutilizável pelos modos Estudo, Flash, Tópico e Simulado.
// - feedbackImediato=true  → revela acerto/erro + explicação a cada resposta e já persiste.
// - feedbackImediato=false → modo prova (simulado): sem feedback; envia tudo no final.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import type { Questao, Alternativa, Contexto } from "../types/questao";
import { corrigir, montarResultado } from "../lib/correcao";
import { enviarResposta } from "../lib/answers";
import { QuestaoView } from "./QuestaoView";
import { NotaEditor } from "./NotaEditor";
import { useMarcadas } from "../hooks/useMarcadas";

export interface RespostaSessao {
  questao: Questao;
  marcada?: Alternativa;
  acertou: boolean;
  tempoSegundos: number;
}

interface Props {
  questoes: Questao[];
  contexto: Contexto;
  feedbackImediato: boolean;
  permiteNota: boolean;
  permiteMarcar: boolean;
  onFinalizar: (respostas: RespostaSessao[]) => void;
  onProgresso?: () => void; // chamado após cada resposta (ex.: atualizar meta)
  cabecalho?: ReactNode; // ex.: cronômetro do simulado
}

export interface SessionRunnerHandle {
  finalizar: () => void;
}

export const SessionRunner = forwardRef<SessionRunnerHandle, Props>(function SessionRunner(
  { questoes, contexto, feedbackImediato, permiteNota, permiteMarcar, onFinalizar, onProgresso, cabecalho },
  ref
) {
  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Map<number, RespostaSessao>>(new Map());
  const [selecionada, setSelecionada] = useState<Alternativa | undefined>();
  const [revelado, setRevelado] = useState(false);
  const inicioRef = useRef<number>(Date.now());

  const marcadas = useMarcadas();
  const questao = questoes[idx];

  // Ao trocar de questão: restaura resposta anterior (voltar no simulado) e reinicia o timer.
  useEffect(() => {
    if (!questao) return;
    const r = respostas.get(questao.id);
    setSelecionada(r?.marcada);
    setRevelado(feedbackImediato && !!r);
    inicioRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!questao) return null;

  const tempoDecorrido = () => Math.round((Date.now() - inicioRef.current) / 1000);
  const ehCompartilhado = (i: number) =>
    i > 0 && questoes[i].texto_base && questoes[i - 1]?.texto_base === questoes[i].texto_base;

  function selecionar(alt: Alternativa) {
    if (feedbackImediato && revelado) return; // já respondida
    setSelecionada(alt);

    if (feedbackImediato) {
      const tempo = tempoDecorrido();
      const acertou = corrigir(questao, alt);
      const resposta: RespostaSessao = { questao, marcada: alt, acertou, tempoSegundos: tempo };
      setRespostas((prev) => new Map(prev).set(questao.id, resposta));
      setRevelado(true);
      // persiste imediatamente (com fila offline)
      void enviarResposta(montarResultado(questao, alt, contexto, tempo));
      onProgresso?.();
    }
  }

  function registrarSimulado() {
    if (!selecionada) return;
    const resposta: RespostaSessao = {
      questao,
      marcada: selecionada,
      acertou: corrigir(questao, selecionada),
      tempoSegundos: tempoDecorrido(),
    };
    setRespostas((prev) => new Map(prev).set(questao.id, resposta));
  }

  function avancar() {
    if (!feedbackImediato) registrarSimulado();
    if (idx + 1 < questoes.length) {
      setIdx(idx + 1);
    } else {
      finalizar();
    }
  }

  function voltar() {
    if (!feedbackImediato) registrarSimulado();
    if (idx > 0) setIdx(idx - 1);
  }

  function finalizar() {
    // monta lista na ordem das questões; questões não respondidas contam como erro (em branco)
    const lista: RespostaSessao[] = questoes.map(
      (q) => respostas.get(q.id) ?? { questao: q, marcada: undefined, acertou: false, tempoSegundos: 0 }
    );
    onFinalizar(lista);
  }

  // expõe finalizar() para o pai (ex.: cronômetro do simulado zera → finaliza)
  useImperativeHandle(ref, () => ({ finalizar }));

  const ultima = idx + 1 === questoes.length;
  const podeAvancar = feedbackImediato ? revelado : true; // simulado deixa avançar mesmo em branco

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      {cabecalho}
      {/* progresso da sessão */}
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span>
          {idx + 1} / {questoes.length}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${((idx + 1) / questoes.length) * 100}%` }}
          />
        </div>
        {permiteMarcar && (
          <button
            onClick={() => marcadas.alternar(questao.id)}
            className="tap rounded-lg px-1"
            aria-pressed={marcadas.ids.has(questao.id)}
            title="Marcar para revisar depois"
          >
            {marcadas.ids.has(questao.id) ? "🔖" : "📑"}
          </button>
        )}
      </div>

      <QuestaoView
        questao={questao}
        selecionada={selecionada}
        revelado={revelado}
        mostrarTextoBase={!ehCompartilhado(idx)}
        onSelecionar={selecionar}
      />

      {/* anotação — indisponível no simulado */}
      {permiteNota && (revelado || !feedbackImediato) && <NotaEditor questaoId={questao.id} />}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          onClick={voltar}
          disabled={idx === 0}
          className="tap rounded-xl px-4 py-2 text-slate-500 disabled:opacity-30"
        >
          ← Anterior
        </button>
        <button onClick={avancar} disabled={!podeAvancar} className="btn-primary">
          {ultima ? "Finalizar" : "Próxima →"}
        </button>
      </div>
    </div>
  );
});
