// Executor de sessão reutilizável pelos modos Estudo, Flash, Tópico e Simulado.
// - feedbackImediato=true  → revela acerto/erro + explicação a cada resposta e já persiste.
// - feedbackImediato=false → modo prova (simulado): sem feedback; envia tudo no final.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, Bookmark } from "lucide-react";
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
  initialIndex?: number; // retomar a sessão a partir desta questão
  onCursorChange?: (idx: number) => void; // persiste o cursor no backend
  onSair?: () => void; // sair da sessão (mantém a sessão ativa para retomar depois)
}

export interface SessionRunnerHandle {
  finalizar: () => void;
}

// Timer mm:ss por questão (ou tempo total desde o início da sessão).
function Timer({ inicio }: { inicio: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [inicio]);
  const seg = Math.max(0, Math.round((Date.now() - inicio) / 1000));
  const mm = String(Math.floor(seg / 60)).padStart(2, "0");
  const ss = String(seg % 60).padStart(2, "0");
  return <span className="text-sm font-semibold text-faint tabular-nums">{mm}:{ss}</span>;
}

export const SessionRunner = forwardRef<SessionRunnerHandle, Props>(function SessionRunner(
  {
    questoes,
    contexto,
    feedbackImediato,
    permiteNota,
    permiteMarcar,
    onFinalizar,
    onProgresso,
    cabecalho,
    initialIndex = 0,
    onCursorChange,
    onSair,
  },
  ref
) {
  const [idx, setIdx] = useState(Math.min(initialIndex, Math.max(0, questoes.length - 1)));
  const [respostas, setRespostas] = useState<Map<number, RespostaSessao>>(new Map());
  const [selecionada, setSelecionada] = useState<Alternativa | undefined>();
  const [revelado, setRevelado] = useState(false);
  const [mostrarNota, setMostrarNota] = useState(false);
  const inicioRef = useRef<number>(Date.now());

  const marcadas = useMarcadas();
  const questao = questoes[idx];

  // Ao trocar de questão: restaura resposta anterior (voltar no simulado), reinicia o timer
  // e persiste o cursor no backend (para retomar depois).
  useEffect(() => {
    if (!questao) return;
    const r = respostas.get(questao.id);
    setSelecionada(r?.marcada);
    setRevelado(feedbackImediato && !!r);
    setMostrarNota(false);
    inicioRef.current = Date.now();
    onCursorChange?.(idx);
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
    const lista: RespostaSessao[] = questoes.map(
      (q) => respostas.get(q.id) ?? { questao: q, marcada: undefined, acertou: false, tempoSegundos: 0 }
    );
    onFinalizar(lista);
  }

  useImperativeHandle(ref, () => ({ finalizar }));

  const ultima = idx + 1 === questoes.length;
  const podeAvancar = feedbackImediato ? revelado : true;
  const progresso = ((idx + 1) / questoes.length) * 100;

  return (
    <div className="mx-auto max-w-[620px] space-y-4 py-4" style={{ animation: "pop .35s ease both" }}>
      {cabecalho}

      {/* Topo: voltar + "Questão X de N" + timer + barra de progresso */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {onSair && (
            <button
              onClick={onSair}
              className="h-[38px] w-[38px] rounded-xl border border-hair bg-white flex items-center justify-center text-muted hover:text-brand-500 transition flex-shrink-0"
              aria-label="Sair da sessão"
              title="Sair (você pode continuar depois)"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <span className="text-sm font-semibold text-muted">
            Questão {idx + 1} de {questoes.length}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {permiteMarcar && (
              <button
                onClick={() => marcadas.alternar(questao.id)}
                className={`h-[38px] w-[38px] rounded-xl border flex items-center justify-center transition ${
                  marcadas.ids.has(questao.id)
                    ? "border-brand-500 bg-brand-50 text-brand-500"
                    : "border-hair bg-white text-faint hover:text-brand-500"
                }`}
                aria-pressed={marcadas.ids.has(questao.id)}
                aria-label="Marcar para revisar depois"
                title="Marcar para revisar depois"
              >
                <Bookmark size={18} strokeWidth={1.8} fill={marcadas.ids.has(questao.id) ? "currentColor" : "none"} />
              </button>
            )}
            {!cabecalho && <Timer inicio={inicioRef.current} />}
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-hair overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-[#7C6FF6] transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Cartão da questão */}
      <div className="card p-6">
        <QuestaoView
          questao={questao}
          selecionada={selecionada}
          revelado={revelado}
          mostrarTextoBase={!ehCompartilhado(idx)}
          onSelecionar={selecionar}
          onAnotar={permiteNota && revelado ? () => setMostrarNota((v) => !v) : undefined}
          onMarcar={permiteMarcar && revelado ? () => marcadas.alternar(questao.id) : undefined}
        />
      </div>

      {/* Editor de anotação (aparece ao clicar "Anotar"; simulado não usa) */}
      {permiteNota && (mostrarNota || (!feedbackImediato && false)) && <NotaEditor questaoId={questao.id} />}

      {/* Navegação inferior */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {!feedbackImediato ? (
          <button
            onClick={voltar}
            disabled={idx === 0}
            className="rounded-2xl px-5 py-3 font-display font-bold text-muted disabled:opacity-30 hover:text-brand-500 transition"
          >
            ← Anterior
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={avancar}
          disabled={!podeAvancar}
          className="tap flex-1 max-w-xs ml-auto rounded-2xl bg-gradient-to-r from-brand-500 to-[#7C6FF6] px-6 py-3 font-display text-base font-extrabold text-white transition hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40"
          style={{ boxShadow: "0 16px 30px -14px rgba(91,79,224,.8)" }}
        >
          {ultima ? "Finalizar" : "Próxima questão"}
        </button>
      </div>
    </div>
  );
});
