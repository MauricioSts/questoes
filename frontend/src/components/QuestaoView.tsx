import { useEffect, useMemo, useState } from "react";
import { Check, X, History, Ban, Minus, TriangleAlert } from "lucide-react";
import type { Questao, Alternativa } from "../types/questao";
import { getTextoBase, getProva, origemDe, rotuloOrigem, temModulos } from "../lib/questoesRepo";
import { ordemAlternativas } from "../lib/ordemAlternativas";
import { Card } from "./Card";
import { MetaPill } from "./MetaPill";
import { comRealce, questaoEmModoCodigo } from "./Realce";
import { useTrilhaAtiva } from "../store/concurso";
import { ImagensQuestao } from "./ImagemQuestao";
import { EfeitoEliminar } from "./EfeitoEliminar";
import { BlocoCodigo } from "./CodigoRealcado";
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
  // Certo/errado: "Deixar em branco" (sem prop, sem botão). emBranco = o item foi deixado
  // em branco e está revelado sem resposta.
  onBranco?: () => void;
  emBranco?: boolean;
  // Certo/errado: o comando aparece só no primeiro item dele (igual ao texto base).
  mostrarComando?: boolean;
}

const ROTULO_CE: Record<string, string> = { C: "Certo", E: "Errado" };

export function QuestaoView({
  questao,
  selecionada,
  revelado,
  mostrarTextoBase = true,
  historico,
  metadados = "completo",
  onSelecionar,
  onBranco,
  emBranco = false,
  mostrarComando = true,
}: Props) {
  const ehCE = questao.formato === "CERTO_ERRADO";
  const soOrigem = metadados === "origem";
  const { tema } = useTheme();
  // Questão de programação: colchetes de código ("[1, 2, 3]", "arr[0]") ficam literais
  // no enunciado e nas alternativas. Explicação e comando do CE ficam SEMPRE no modo
  // padrão: o formato dos lotes (docs/formato-lote-ce.md) marca destaques em prosa ali.
  const trilhaAtiva = useTrilhaAtiva();
  const realce = { codigo: questaoEmModoCodigo(questao, trilhaAtiva) };

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
  const acertou = revelado && !emBranco && selecionada === questao.gabarito;

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
      style={revelado && !acertou && !emBranco ? { animation: "shakeX .4s ease" } : undefined}
    >
      {/* Comando do certo/errado: o texto comum aos itens, com o código dele */}
      {ehCE && questao.comando && mostrarComando && (
        <Card className="space-y-3 border-l-4 border-brand-500 p-4">
          <p className="text-sm text-brand-ink leading-relaxed whitespace-pre-wrap">{comRealce(questao.comando.texto)}</p>
          <ImagensQuestao imagens={questao.comando.imagens} posicao="enunciado" />
          {questao.comando.codigo && <BlocoCodigo codigo={questao.comando.codigo} linguagem={questao.comando.linguagem} />}
        </Card>
      )}

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
            {temModulos() && <MetaPill type="modulo" label={`Módulo ${questao.modulo}`} />}
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
        {comRealce(questao.enunciado, realce)}
      </h2>

      {/* Imagens do enunciado (antes do código, que costuma ser o "modelo a seguir") */}
      <ImagensQuestao imagens={questao.imagens} posicao="enunciado" />

      {/* Código (se houver) */}
      {questao.codigo && <BlocoCodigo codigo={questao.codigo} linguagem={questao.linguagem} />}

      {/* Imagens que pertencem às alternativas */}
      <ImagensQuestao imagens={questao.imagens} posicao="alternativas" />

      {/* Certo/errado: dois botões fixos (sem embaralhar nem eliminar) e o branco */}
      {ehCE && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Julgamento do item">
            {(["C", "E"] as const).map((letra) => {
              const isCorreta = revelado && questao.gabarito === letra;
              const isMarcadaErrada = revelado && !emBranco && selecionada === letra && questao.gabarito !== letra;
              const isSelected = !emBranco && selecionada === letra;
              let cls = "border-hair bg-surface hover:border-brand-400 hover:bg-brand-50";
              if (isCorreta) cls = "border-success-from bg-success-soft";
              else if (isMarcadaErrada) cls = "border-danger-from bg-danger-soft";
              else if (isSelected && !revelado) cls = "border-brand-500 bg-brand-50";
              return (
                <button
                  key={letra}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={revelado}
                  onClick={() => onSelecionar(letra)}
                  className={`tap flex items-center justify-center gap-2 rounded-2xl border p-4 font-display text-base font-bold text-brand-ink transition ${cls} ${revelado ? "cursor-default" : ""}`}
                >
                  {isCorreta ? <Check size={20} strokeWidth={3} /> : isMarcadaErrada ? <X size={20} strokeWidth={3} /> : null}
                  {ROTULO_CE[letra]}
                </button>
              );
            })}
          </div>
          {onBranco && !revelado && (
            <button
              type="button"
              onClick={onBranco}
              className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-hair p-3 text-sm font-semibold text-muted transition hover:text-brand-500"
              title="Na prova, item em branco não soma nem desconta"
            >
              <Minus size={16} strokeWidth={2} /> Deixar em branco
            </button>
          )}
        </div>
      )}

      {/* Alternativas. A ordem é sorteada por tentativa; a letra é a do lote. */}
      {!ehCE && (
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
                  {comRealce(questao.alternativas[letra]!, realce)}
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
      )}

      {/* Feedback (acerto/erro) */}
      {revelado && (
        <Card
          className={`p-6 space-y-3 ${
            emBranco
              ? "bg-surface2 border-hair"
              : acertou
              ? "bg-success-soft border-success-from"
              : "bg-danger-soft border-danger-from"
          }`}
        >
          <p
            className={`font-display font-extrabold text-lg flex items-center gap-2 ${
              acertou ? "text-success-from" : "text-danger-from"
            }`}
          >
            {emBranco ? (
              <span className="text-brand-ink">Em branco · Gabarito: {ROTULO_CE[questao.gabarito ?? ""] ?? questao.gabarito}</span>
            ) : acertou ? (
              <>
                <Check size={24} strokeWidth={3} /> Você acertou!
              </>
            ) : (
              <>
                <X size={24} strokeWidth={3} /> {ehCE ? `Gabarito: ${ROTULO_CE[questao.gabarito ?? ""] ?? questao.gabarito}` : `Resposta correta: ${questao.gabarito}`}
              </>
            )}
          </p>

          {/* Gabarito que não veio da banca, ou que alguém marcou como duvidoso */}
          {(prova?.gabarito_fonte === "resolucao_propria" || questao.gabarito_conferir) && (
            <div className="flex flex-wrap gap-2">
              {prova?.gabarito_fonte === "resolucao_propria" && (
                <span className="meta-pill border border-hair bg-surface2 text-muted" title="Gabarito resolvido por quem montou o lote, não o definitivo da banca">
                  Gabarito não oficial
                </span>
              )}
              {questao.gabarito_conferir && (
                <span className="meta-pill border border-hair bg-surface2 text-muted" title="Há dúvida sobre este gabarito">
                  <TriangleAlert size={13} strokeWidth={2} /> Gabarito a conferir
                </span>
              )}
            </div>
          )}

          {/* Explicação */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-brand-ink">
            {comRealce(questao.explicacao)}
          </div>

        </Card>
      )}
    </article>
  );
}
