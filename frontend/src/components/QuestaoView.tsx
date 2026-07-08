import { Check, X, PencilIcon, Bookmark } from "lucide-react";
import type { Questao, Alternativa } from "../types/questao";
import { getTextoBase } from "../lib/questoesRepo";
import { Card } from "./Card";
import { MetaPill } from "./MetaPill";

const LETRAS: Alternativa[] = ["A", "B", "C", "D", "E"];

interface Props {
  questao: Questao;
  selecionada?: Alternativa;
  revelado: boolean;
  mostrarTextoBase?: boolean;
  onSelecionar: (alt: Alternativa) => void;
  onAnotar?: () => void;
  onMarcar?: () => void;
}

export function QuestaoView({
  questao,
  selecionada,
  revelado,
  mostrarTextoBase = true,
  onSelecionar,
  onAnotar,
  onMarcar,
}: Props) {
  const textoBase = getTextoBase(questao.texto_base);
  const acertou = revelado && selecionada === questao.gabarito;

  return (
    <article className="space-y-4">
      {/* Texto base */}
      {textoBase && mostrarTextoBase && (
        <Card className="border-l-4 border-brand-500 p-4">
          <p className="text-xs font-bold uppercase text-brand-600 tracking-widest mb-2">Texto base</p>
          <p className="text-sm text-brand-ink leading-relaxed whitespace-pre-wrap">{textoBase}</p>
        </Card>
      )}

      {/* Metadados */}
      <div className="flex flex-wrap gap-2">
        <MetaPill type="modulo" label={`Módulo ${questao.modulo}`} />
        <MetaPill type="materia" label={questao.materia} />
        <MetaPill
          type={questao.dificuldade === "facil" ? "dificuldade-facil" : questao.dificuldade === "media" ? "dificuldade-media" : "dificuldade-dificil"}
          label={questao.dificuldade === "facil" ? "Fácil" : questao.dificuldade === "media" ? "Média" : "Difícil"}
        />
      </div>

      {/* Enunciado */}
      <h2 className="font-semibold text-base leading-relaxed text-brand-ink whitespace-pre-wrap">
        {questao.enunciado}
      </h2>

      {/* Código (se houver) */}
      {questao.codigo && (
        <div className="overflow-hidden rounded-xl border border-hair">
          {questao.linguagem && (
            <div className="border-b border-hair bg-brand-100 px-4 py-2 text-xs font-mono font-bold text-brand-700">
              {questao.linguagem}
            </div>
          )}
          <pre className="overflow-x-auto bg-[#F7F6FD] p-4 text-sm leading-relaxed font-mono text-brand-ink">
            <code>{questao.codigo}</code>
          </pre>
        </div>
      )}

      {/* Alternativas */}
      <ul className="space-y-3" role="radiogroup" aria-label="Alternativas">
        {LETRAS.filter((l) => questao.alternativas[l] != null).map((letra) => {
          const isCorreta = revelado && questao.gabarito === letra;
          const isMarcadaErrada = revelado && selecionada === letra && questao.gabarito !== letra;
          const isSelected = selecionada === letra;

          let borderClass = "border-hair hover:border-brand-400";
          let bgClass = "bg-white hover:bg-brand-50";
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
            <li key={letra}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={revelado}
                onClick={() => onSelecionar(letra)}
                className={`tap w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition ${borderClass} ${bgClass} ${
                  revelado ? "cursor-default" : ""
                }`}
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
                <span className="whitespace-pre-wrap pt-1 text-sm">{questao.alternativas[letra]}</span>
              </button>
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
            {questao.explicacao}
          </div>

          {/* Ações (anotar, marcar) */}
          {(onAnotar || onMarcar) && (
            <div className="flex gap-2 pt-2 border-t border-current border-opacity-20">
              {onAnotar && (
                <button
                  onClick={onAnotar}
                  className="tap flex items-center gap-2 text-xs font-semibold text-brand-500 hover:text-brand-600"
                  aria-label="Anotar"
                >
                  <PencilIcon size={16} strokeWidth={1.5} />
                  Anotar
                </button>
              )}
              {onMarcar && (
                <button
                  onClick={onMarcar}
                  className="tap flex items-center gap-2 text-xs font-semibold text-brand-500 hover:text-brand-600"
                  aria-label="Marcar para revisar"
                >
                  <Bookmark size={16} strokeWidth={1.5} />
                  Marcar
                </button>
              )}
            </div>
          )}
        </Card>
      )}
    </article>
  );
}
