// PROVA COMPLETA (modo simulado): a prova inteira numa página só, como o caderno de
// verdade. Diferente do SessionRunner (uma questão por vez, só avança respondendo):
// - as questões já estão todas em memória; a rolagem só revela mais um bloco de 4;
// - dá para folhear a prova inteira sem marcar nada;
// - marcar de novo a alternativa marcada DESMARCA (igual apagar a bolinha);
// - nada de gabarito/explicação até apertar "Finalizar prova".
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft } from "lucide-react";
import type { Questao, Alternativa } from "../types/questao";
import { corrigir } from "../lib/correcao";
import { QuestaoView } from "./QuestaoView";
import type { RespostaSessao } from "./SessionRunner";

// Quantas questões entram a cada rolada. É o "vira a folha" do caderno.
const BLOCO = 4;

interface Props {
  questoes: Questao[];
  onFinalizar: (respostas: RespostaSessao[]) => void;
  cabecalho?: ReactNode; // ex.: cronômetro do simulado
  onSair?: () => void;
}

// Handle para quem precisa encerrar a prova de fora (o cronômetro, ao zerar).
export interface ProvaCompletaHandle {
  finalizar: () => void;
}

export const ProvaCompleta = forwardRef<ProvaCompletaHandle, Props>(function ProvaCompleta(
  { questoes, onFinalizar, cabecalho, onSair },
  ref
) {
  const [marcadas, setMarcadas] = useState<Map<number, Alternativa>>(new Map());
  const [visiveis, setVisiveis] = useState(Math.min(BLOCO, questoes.length));
  const [confirmando, setConfirmando] = useState(false);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const itensRef = useRef<(HTMLElement | null)[]>([]);
  // Tempo por questão: o relógio de cada marcação é o intervalo desde a marcação
  // anterior. Folheando livremente não existe "tempo nesta questão" exato; este é o
  // trabalho feito desde a última resposta, que é o que alimenta a estatística.
  const inicioRef = useRef(Date.now());
  const ultimaMarcacaoRef = useRef(Date.now());
  // Tempo já creditado a cada questão, para não perdê-lo ao desmarcar e remarcar.
  const temposRef = useRef<Map<number, number>>(new Map());

  const total = questoes.length;
  const respondidas = marcadas.size;

  // Rolou até o fim do bloco: revela os próximos 4.
  useEffect(() => {
    const alvo = sentinelaRef.current;
    if (!alvo || visiveis >= total) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisiveis((v) => Math.min(v + BLOCO, total));
        }
      },
      { rootMargin: "600px 0px" } // revela antes de chegar, para a rolagem não travar
    );
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [visiveis, total]);

  // Folhear: pula para uma questão, revelando o que faltar até ela.
  const irPara = useCallback(
    (i: number) => {
      setVisiveis((v) => Math.max(v, Math.min(i + BLOCO, total)));
      // espera o bloco entrar no DOM antes de rolar
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          itensRef.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [total]
  );

  function alternar(questao: Questao, alt: Alternativa) {
    setMarcadas((prev) => {
      const proxima = new Map(prev);
      if (proxima.get(questao.id) === alt) {
        proxima.delete(questao.id); // clicou na marcada: desmarca
      } else {
        proxima.set(questao.id, alt);
        const agora = Date.now();
        if (!temposRef.current.has(questao.id)) {
          temposRef.current.set(
            questao.id,
            Math.max(0, Math.round((agora - ultimaMarcacaoRef.current) / 1000))
          );
        }
        ultimaMarcacaoRef.current = agora;
      }
      return proxima;
    });
  }

  const finalizar = useCallback(() => {
    const lista: RespostaSessao[] = questoes.map((q) => {
      const marcada = marcadas.get(q.id);
      return {
        questao: q,
        marcada,
        acertou: marcada ? corrigir(q, marcada) : false,
        tempoSegundos: marcada ? temposRef.current.get(q.id) ?? 0 : 0,
      };
    });
    onFinalizar(lista);
  }, [questoes, marcadas, onFinalizar]);

  useImperativeHandle(ref, () => ({ finalizar }), [finalizar]);

  // Índice da primeira questão em branco: o botão do aviso leva direto para ela.
  const primeiraEmBranco = useMemo(
    () => questoes.findIndex((q) => !marcadas.has(q.id)),
    [questoes, marcadas]
  );

  const pct = total ? (respondidas / total) * 100 : 0;
  const decorridoMin = Math.round((Date.now() - inicioRef.current) / 60000);

  return (
    <div className="mx-auto max-w-[820px] pb-24">
      {/* Barra da prova: fica colada no topo enquanto se rola o caderno. */}
      <div
        className="sticky top-14 z-20 -mx-5 mb-4 border-b border-hair px-5 py-3 backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          {onSair && (
            <button
              onClick={onSair}
              className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-hair bg-surface text-muted transition hover:text-brand-500"
              aria-label="Sair da prova"
              title="Sair da prova"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <span className="text-xs font-bold uppercase tracking-[.16em] text-muted">
            {respondidas} de {total} respondidas
          </span>
          <button
            onClick={() => setConfirmando(true)}
            className="btn-primary ml-auto h-[38px] px-5 py-0 text-sm"
          >
            Finalizar prova
          </button>
        </div>

        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
      </div>

      {cabecalho && <div className="mb-4">{cabecalho}</div>}

      {/* Folheador: grade com o número de cada questão; cheio = respondida. */}
      <div className="card mb-5 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-faint">Folhear</p>
        <div className="flex flex-wrap gap-1.5">
          {questoes.map((q, i) => {
            const feita = marcadas.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => irPara(i)}
                title={`Ir para a questão ${i + 1}`}
                className={`h-7 w-7 rounded-lg border text-[11px] font-bold tabular-nums transition ${
                  feita
                    ? "border-transparent text-white"
                    : "border-hair bg-surface text-muted hover:border-brand-400"
                }`}
                style={feita ? { background: "var(--accent)", color: "var(--onAccent)" } : undefined}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Caderno: as questões, em bloco de 4 por rolada. */}
      <div className="space-y-5">
        {questoes.slice(0, visiveis).map((questao, i) => {
          // Texto base compartilhado (inglês): só aparece na primeira questão do grupo.
          const compartilhado =
            i > 0 && !!questao.texto_base && questoes[i - 1]?.texto_base === questao.texto_base;
          return (
            <section
              key={questao.id}
              ref={(el) => {
                itensRef.current[i] = el;
              }}
              className="card scroll-mt-32 p-6"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-muted">
                Questão {i + 1} de {total}
              </p>
              <QuestaoView
                questao={questao}
                selecionada={marcadas.get(questao.id)}
                revelado={false}
                metadados="origem"
                mostrarTextoBase={!compartilhado}
                onSelecionar={(alt) => alternar(questao, alt)}
              />
            </section>
          );
        })}
      </div>

      {/* Sentinela: entrar em cena revela os próximos 4. */}
      {visiveis < total && (
        <div ref={sentinelaRef} className="py-10 text-center text-sm text-faint">
          Role para ver mais {Math.min(BLOCO, total - visiveis)} questões
          <span className="block text-xs">({visiveis} de {total})</span>
        </div>
      )}

      {visiveis >= total && (
        <div className="pt-8">
          <button onClick={() => setConfirmando(true)} className="btn-primary w-full">
            Finalizar prova
          </button>
        </div>
      )}

      {/* Confirmação: com questão em branco, diz quantas e oferece ir até a primeira. */}
      {confirmando && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-5"
          style={{ background: "rgba(0,0,0,.55)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Finalizar prova"
        >
          <div className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="font-display text-lg font-extrabold text-brand-ink">Finalizar prova?</h2>
            <p className="text-sm text-muted">
              {respondidas === total
                ? `Todas as ${total} questões respondidas${decorridoMin > 0 ? ` em ${decorridoMin} min` : ""}. O gabarito aparece na correção.`
                : `Faltam ${total - respondidas} questões em branco. Em branco conta como erro.`}
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={finalizar} className="btn-primary w-full">
                Finalizar e corrigir
              </button>
              {respondidas < total && primeiraEmBranco >= 0 && (
                <button
                  onClick={() => {
                    setConfirmando(false);
                    irPara(primeiraEmBranco);
                  }}
                  className="tap rounded-xl px-4 py-2 text-sm font-semibold text-brand-500"
                >
                  Ir para a questão {primeiraEmBranco + 1} (primeira em branco)
                </button>
              )}
              <button
                onClick={() => setConfirmando(false)}
                className="tap rounded-xl px-4 py-2 text-sm text-muted"
              >
                Continuar a prova
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
