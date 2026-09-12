// PROVA COMPLETA (modo simulado): a prova inteira numa página só, como o caderno de
// verdade. Diferente do SessionRunner (uma questão por vez, só avança respondendo):
// - as questões já estão todas em memória; a rolagem só revela mais um bloco de 4;
// - dá para folhear a prova inteira sem marcar nada;
// - marcar de novo a alternativa marcada DESMARCA (igual apagar a bolinha);
// - nada de gabarito/explicação até apertar "Finalizar prova".
import {
  forwardRef,
  Fragment,
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
import { usePausarFundo } from "../store/fundo";

// Quantas questões entram a cada rolada. É o "vira a folha" do caderno.
const BLOCO = 4;

interface Props {
  questoes: Questao[];
  onFinalizar: (respostas: RespostaSessao[]) => void;
  cabecalho?: ReactNode; // ex.: cronômetro do simulado
  onSair?: () => void;
  // Estado de uma prova retomada (ver lib/provaEmAndamento).
  marcadasIniciais?: [number, Alternativa][];
  temposIniciais?: [number, number][];
  // Chamado a cada marcação: quem guarda a prova é a página (Simulado).
  onMudar?: (marcadas: [number, Alternativa][], tempos: [number, number][]) => void;
}

// Handle para quem precisa encerrar a prova de fora (o cronômetro, ao zerar).
export interface ProvaCompletaHandle {
  finalizar: () => void;
}

export const ProvaCompleta = forwardRef<ProvaCompletaHandle, Props>(function ProvaCompleta(
  { questoes, onFinalizar, cabecalho, onSair, marcadasIniciais, temposIniciais, onMudar },
  ref
) {
  const [marcadas, setMarcadas] = useState<Map<number, Alternativa>>(
    () => new Map(marcadasIniciais ?? [])
  );
  const [visiveis, setVisiveis] = useState(Math.min(BLOCO, questoes.length));
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const sentinelaRef = useRef<HTMLDivElement>(null);
  const itensRef = useRef<(HTMLElement | null)[]>([]);
  // Tempo por questão: o relógio de cada marcação é o intervalo desde a marcação
  // anterior. Folheando livremente não existe "tempo nesta questão" exato; este é o
  // trabalho feito desde a última resposta, que é o que alimenta a estatística.
  const inicioRef = useRef(Date.now());
  const ultimaMarcacaoRef = useRef(Date.now());
  // Tempo já creditado a cada questão, para não perdê-lo ao desmarcar e remarcar.
  const temposRef = useRef<Map<number, number>>(new Map(temposIniciais ?? []));

  const total = questoes.length;
  const respondidas = marcadas.size;

  // Prova em andamento: o relevo animado do fundo congela. Movimento no canto do olho
  // atrapalha a leitura, e numa prova de 70 questões atrapalha por horas.
  usePausarFundo();

  // Toda marcação vai para o armazenamento na hora: é o que salva a prova de um
  // "saí sem querer". Roda depois do render, então nunca segura o clique.
  const onMudarRef = useRef(onMudar);
  onMudarRef.current = onMudar;
  useEffect(() => {
    onMudarRef.current?.([...marcadas], [...temposRef.current]);
  }, [marcadas]);

  // Fechar a aba/recarregar no meio da prova pede confirmação do navegador.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, []);

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

  // Blocos por disciplina: trechos seguidos da mesma matéria, como as partes do
  // caderno. O sorteio já entrega as questões agrupadas (ver montarSimulado).
  const blocos = useMemo(() => {
    const out: { materia: string; modulo: string; inicio: number; fim: number }[] = [];
    questoes.forEach((q, i) => {
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.materia === q.materia) ultimo.fim = i;
      else out.push({ materia: q.materia, modulo: q.modulo, inicio: i, fim: i });
    });
    return out;
  }, [questoes]);

  // Bloco que começa em cada índice, para cravar o cabeçalho antes da questão.
  const blocoQueComeca = useMemo(
    () => new Map(blocos.map((b) => [b.inicio, b])),
    [blocos]
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
              onClick={() => setConfirmandoSaida(true)}
              className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-hair bg-surface text-muted transition hover:text-brand-500"
              aria-label="Sair da prova"
              title="Sair da prova (a prova fica guardada)"
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

      {/* Folheador: um grupo de números por disciplina; cheio = respondida. */}
      <div className="card mb-5 space-y-3 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Folhear</p>
        {blocos.map((bloco) => {
          const feitasNoBloco = questoes
            .slice(bloco.inicio, bloco.fim + 1)
            .filter((q) => marcadas.has(q.id)).length;
          const totalNoBloco = bloco.fim - bloco.inicio + 1;
          return (
            <div key={`${bloco.materia}-${bloco.inicio}`}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <button
                  onClick={() => irPara(bloco.inicio)}
                  className="truncate text-left text-xs font-bold text-brand-ink transition hover:text-brand-500"
                  title={`Ir para ${bloco.materia}`}
                >
                  {bloco.materia}
                </button>
                <span className="flex-shrink-0 text-[11px] tabular-nums text-faint">
                  {feitasNoBloco}/{totalNoBloco}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {questoes.slice(bloco.inicio, bloco.fim + 1).map((q, j) => {
                  const i = bloco.inicio + j;
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
          );
        })}
      </div>

      {/* Caderno: as questões, em bloco de 4 por rolada. */}
      <div className="space-y-5">
        {questoes.slice(0, visiveis).map((questao, i) => {
          // Texto base compartilhado (inglês): só aparece na primeira questão do grupo.
          const compartilhado =
            i > 0 && !!questao.texto_base && questoes[i - 1]?.texto_base === questao.texto_base;
          const bloco = blocoQueComeca.get(i);
          return (
            <Fragment key={questao.id}>
              {/* Abertura do bloco da disciplina, como a folha de rosto da parte. */}
              {bloco && (
                <header className="scroll-mt-32 pt-3 first:pt-0">
                  <div className="flex items-baseline justify-between gap-3 border-b-2 border-hair pb-2">
                    <h2 className="font-display text-lg font-extrabold text-brand-ink">
                      {bloco.materia}
                    </h2>
                    <span className="flex-shrink-0 text-[11px] font-bold uppercase tracking-[.14em] text-faint">
                      Módulo {bloco.modulo} · questões {bloco.inicio + 1}–{bloco.fim + 1}
                    </span>
                  </div>
                </header>
              )}
                <section
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
            </Fragment>
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

      {/* Sair no meio: a prova fica guardada, então isto é aviso, não despedida. */}
      {confirmandoSaida && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-5"
          style={{ background: "rgba(0,0,0,.55)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Sair da prova"
        >
          <div className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="font-display text-lg font-extrabold text-brand-ink">Sair da prova?</h2>
            <p className="text-sm text-muted">
              Suas {respondidas} {respondidas === 1 ? "resposta fica guardada" : "respostas ficam guardadas"} neste
              aparelho. Ao voltar em Simulado, você retoma de onde parou.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setConfirmandoSaida(false);
                  onSair?.();
                }}
                className="btn-primary w-full"
              >
                Sair e guardar
              </button>
              <button
                onClick={() => setConfirmandoSaida(false)}
                className="tap rounded-xl px-4 py-2 text-sm text-muted"
              >
                Continuar a prova
              </button>
            </div>
          </div>
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
