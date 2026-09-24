import { useEffect, useMemo, useState } from "react";
import { Check, X, History, Ban } from "lucide-react";
import type { Questao, Alternativa } from "../types/questao";
import { getTextoBase, getProva, origemDe, rotuloOrigem } from "../lib/questoesRepo";
import { ordemAlternativas } from "../lib/ordemAlternativas";
import { Card } from "./Card";
import { MetaPill } from "./MetaPill";
import { comRealce } from "./Realce";
import { ImagensQuestao } from "./ImagemQuestao";
import { EfeitoEliminar } from "./EfeitoEliminar";
import { useTheme } from "../store/theme";

// Histórico da questão ANTES desta tentativa: quantas vezes ela já foi respondida e
// quantas vezes eu errei. É o que transforma "de novo essa?" em informação útil.
export interface HistoricoNaQuestao {
  tentativas: number;
  erros: number;
}

interface Props {
  questao: Questao;
  selecionada?: Alternativa;
  revelado: boolean;
  mostrarTextoBase?: boolean;
  historico?: HistoricoNaQuestao;
  // "completo": módulo, matéria, dificuldade, procedência e reincidência.
  // "origem":   só a procedência. É o modo da prova: dificuldade e reincidência
  //             entregariam a questão antes de lê-la, coisa que a prova real não faz.
  metadados?: "completo" | "origem";
  onSelecionar: (alt: Alternativa) => void;
}

export function QuestaoView({
  questao,
  selecionada,
  revelado,
  mostrarTextoBase = true,
  historico,
  metadados = "completo",
  onSelecionar,
}: Props) {
  const soOrigem = metadados === "origem";
  const { tema } = useTheme();

  // Ordem de exibição: embaralhada a cada repetição da questão (ver lib/ordemAlternativas).
  // A letra de cada alternativa NÃO muda, só a posição, então gabarito, explicação e
  // histórico continuam falando da mesma alternativa.
  const ordem = useMemo(
    () => ordemAlternativas(questao, historico?.tentativas ?? 0),
    [questao, historico?.tentativas]
  );

  // Alternativas eliminadas "no rascunho": riscadas para afunilar a escolha. Vive só nesta
  // tentativa: some ao trocar de questão e não vai para o backend.
  const [eliminadas, setEliminadas] = useState<Set<Alternativa>>(new Set());
  useEffect(() => setEliminadas(new Set()), [questao.id]);

  function alternarEliminada(letra: Alternativa) {
    setEliminadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(letra)) proximo.delete(letra);
      else proximo.add(letra);
      return proximo;
    });
  }

  // Marcar uma alternativa riscada desfaz o risco: marcar e eliminar são opostos.
  function selecionar(letra: Alternativa) {
    if (eliminadas.has(letra)) {
      setEliminadas((atual) => {
        const proximo = new Set(atual);
        proximo.delete(letra);
        return proximo;
      });
    }
    onSelecionar(letra);
  }
  const textoBase = getTextoBase(questao.texto_base);
  const acertou = revelado && selecionada === questao.gabarito;

  // Procedência: de que prova a questão veio, ou que ela é adaptada/gerada/autoral.
  const origem = origemDe(questao);
  const prova = getProva(questao.prova);
  const selo = (
    <MetaPill
      type={`origem-${origem}` as const}
      label={rotuloOrigem(questao)}
      title={
        prova
          ? [prova.cargo, prova.tipo ? `Caderno ${prova.tipo}` : null].filter(Boolean).join(" · ") || undefined
          : origem === "gerada"
            ? `Gerada a partir de ${questao.geradaDe?.length ?? 0} questão(ões) que eu errei`
            : undefined
      }
    />
  );

  return (
    <article
      className="space-y-4"
      style={revelado && !acertou ? { animation: "shakeX .4s ease" } : undefined}
    >
      {/* Texto base */}
      {textoBase && mostrarTextoBase && (
        <Card className="border-l-4 border-brand-500 p-4">
          <p className="text-xs font-bold uppercase text-brand-600 tracking-widest mb-2">Texto base</p>
          <p className="text-sm text-brand-ink leading-relaxed whitespace-pre-wrap">{comRealce(textoBase)}</p>
        </Card>
      )}

      {/* Metadados */}
      <div className="flex flex-wrap gap-2">
        {!soOrigem && (
          <>
            <MetaPill type="modulo" label={`Módulo ${questao.modulo}`} />
            <MetaPill type="materia" label={questao.materia} />
            <MetaPill
              type={questao.dificuldade === "facil" ? "dificuldade-facil" : questao.dificuldade === "media" ? "dificuldade-media" : "dificuldade-dificil"}
              label={questao.dificuldade === "facil" ? "Fácil" : questao.dificuldade === "media" ? "Média" : "Difícil"}
            />
          </>
        )}
        {/* O selo vira link quando a prova de origem tem PDF oficial. */}
        {prova?.url ? (
          <a href={prova.url} target="_blank" rel="noreferrer" className="tap">
            {selo}
          </a>
        ) : (
          selo
        )}

        {/* Reincidência: nº de vezes que já refiz esta questão e quantas vezes errei.
            Aparece só quando existe histórico (primeira vez não tem nada a dizer). */}
        {!soOrigem && historico && historico.tentativas > 0 && (
          <span
            className="meta-pill border border-hair bg-surface2 text-muted"
            title={
              historico.erros > 0
                ? `Você já respondeu esta questão ${historico.tentativas}× e errou ${historico.erros}×`
                : `Você já respondeu esta questão ${historico.tentativas}× e nunca errou`
            }
          >
            <History size={13} strokeWidth={2} />
            {historico.tentativas + 1}ª vez
            {historico.erros > 0 && (
              <b style={{ color: "var(--accentText)" }}>· errou {historico.erros}×</b>
            )}
          </span>
        )}
      </div>

      {/* Enunciado */}
      <h2 className="font-semibold leading-relaxed text-brand-ink whitespace-pre-wrap" style={{ fontSize: "16.5px" }}>
        {comRealce(questao.enunciado)}
      </h2>

      {/* Imagens do enunciado (antes do código, que costuma ser o "modelo a seguir") */}
      <ImagensQuestao imagens={questao.imagens} posicao="enunciado" />

      {/* Código (se houver) */}
      {questao.codigo && (
        <div className="overflow-hidden rounded-xl border border-hair">
          {questao.linguagem && (
            <div className="border-b border-hair bg-brand-100 px-4 py-2 text-xs font-mono font-bold text-brand-700">
              {questao.linguagem}
            </div>
          )}
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed font-mono text-brand-ink" style={{ background: "var(--surface2)" }}>
            <code>{questao.codigo}</code>
          </pre>
        </div>
      )}

      {/* Imagens que pertencem às alternativas */}
      <ImagensQuestao imagens={questao.imagens} posicao="alternativas" />

      {/* Alternativas. A ordem é sorteada por tentativa; a letra é a do lote. */}
      <ul className="space-y-3" role="radiogroup" aria-label="Alternativas">
        {ordem.map((letra) => {
          const isCorreta = revelado && questao.gabarito === letra;
          const isMarcadaErrada = revelado && selecionada === letra && questao.gabarito !== letra;
          const isSelected = selecionada === letra;
          const isEliminada = !revelado && eliminadas.has(letra);

          let borderClass = "border-hair hover:border-brand-400";
          let bgClass = "bg-surface hover:bg-brand-50";
          let badgeClass = "bg-hair text-brand-ink";

          if (isCorreta) {
            borderClass = "border-success-from";
            bgClass = "bg-success-soft";
            badgeClass = "bg-success-from text-white";
          } else if (isMarcadaErrada) {
            borderClass = "border-danger-from";
            bgClass = "bg-danger-soft";
            badgeClass = "bg-danger-from text-white";
          } else if (isSelected && !revelado) {
            borderClass = "border-brand-500";
            bgClass = "bg-brand-50";
            badgeClass = "bg-brand-500 text-white";
          }

          return (
            <li key={letra} className={`relative flex items-stretch gap-2 ${isEliminada ? "alt-eliminada" : ""}`}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={revelado}
                onClick={() => selecionar(letra)}
                className={`tap relative w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition ${borderClass} ${bgClass} ${
                  revelado ? "cursor-default" : ""
                }`}
                style={isEliminada ? { opacity: 0.45 } : undefined}
              >
                {/* Badge de letra */}
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${badgeClass}`}
                >
                  {isCorreta ? (
                    <Check size={20} strokeWidth={3} />
                  ) : isMarcadaErrada ? (
                    <X size={20} strokeWidth={3} />
                  ) : (
                    letra
                  )}
                </div>

                {/* Texto da alternativa */}
                <span
                  className="alt-texto whitespace-pre-wrap pt-1 text-sm"
                  style={isEliminada ? { textDecoration: "line-through" } : undefined}
                >
                  {comRealce(questao.alternativas[letra]!)}
                </span>

              </button>

              {/* Marca da eliminação, com a animação do tema (teia, gosma, laser…) */}
              {isEliminada && <EfeitoEliminar key={tema} tema={tema} />}

              {/* Eliminar: risca a alternativa para afunilar a escolha. Só antes de
                  responder; depois do gabarito não há mais o que eliminar. */}
              {!revelado && (
                <button
                  type="button"
                  onClick={() => alternarEliminada(letra)}
                  aria-pressed={isEliminada}
                  aria-label={isEliminada ? `Desfazer eliminação da alternativa ${letra}` : `Eliminar alternativa ${letra}`}
                  title={isEliminada ? "Desfazer o risco" : "Eliminar esta alternativa"}
                  className={`tap flex w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition ${
                    isEliminada
                      ? "border-hair bg-surface2 text-brand-ink"
                      : "border-hair bg-surface text-faint hover:text-brand-500"
                  }`}
                >
                  <Ban size={17} strokeWidth={1.9} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Feedback (acerto/erro) */}
      {revelado && (
        <Card
          className={`p-6 space-y-3 ${
            acertou
              ? "bg-success-soft border-success-from"
              : "bg-danger-soft border-danger-from"
          }`}
        >
          <p
            className={`font-display font-extrabold text-lg flex items-center gap-2 ${
              acertou ? "text-success-from" : "text-danger-from"
            }`}
          >
            {acertou ? (
              <>
                <Check size={24} strokeWidth={3} /> Você acertou!
              </>
            ) : (
              <>
                <X size={24} strokeWidth={3} /> Resposta correta: {questao.gabarito}
              </>
            )}
          </p>

          {/* Explicação */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-brand-ink">
            {comRealce(questao.explicacao)}
          </div>

        </Card>
      )}
    </article>
  );
}
