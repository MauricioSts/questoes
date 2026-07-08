// Renderização de uma questão: texto_base (opcional), enunciado e alternativas acessíveis.
// Feedback de acerto/erro por COR + ÍCONE (não só cor).
import type { Questao, Alternativa } from "../types/questao";
import { getTextoBase } from "../lib/questoesRepo";

const LETRAS: Alternativa[] = ["A", "B", "C", "D", "E"];

interface Props {
  questao: Questao;
  selecionada?: Alternativa;
  revelado: boolean; // true = mostra gabarito/explicação (modos com feedback imediato)
  mostrarTextoBase?: boolean; // dedupe: só o 1º da sequência que compartilha o texto
  onSelecionar: (alt: Alternativa) => void;
}

export function QuestaoView({ questao, selecionada, revelado, mostrarTextoBase = true, onSelecionar }: Props) {
  const textoBase = getTextoBase(questao.texto_base);

  return (
    <article className="space-y-4">
      {textoBase && mostrarTextoBase && (
        <div className="card border-l-4 border-brand/60 p-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">Texto base</p>
          {textoBase}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded bg-slate-200 px-2 py-0.5 dark:bg-slate-800">Módulo {questao.modulo}</span>
        <span>{questao.materia}</span>
        <span>·</span>
        <span>{questao.assunto}</span>
        <span className="ml-auto capitalize">{questao.dificuldade}</span>
      </div>

      <h2 className="whitespace-pre-wrap text-base font-medium leading-relaxed">{questao.enunciado}</h2>

      {questao.codigo && (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {questao.linguagem && (
            <div className="border-b border-slate-200 bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              {questao.linguagem}
            </div>
          )}
          <pre className="overflow-x-auto bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-900">
            <code className="font-mono">{questao.codigo}</code>
          </pre>
        </div>
      )}

      <ul className="space-y-2" role="radiogroup" aria-label="Alternativas">
        {LETRAS.filter((l) => questao.alternativas[l] != null).map((letra) => {
          const correta = revelado && questao.gabarito === letra;
          const marcadaErrada = revelado && selecionada === letra && questao.gabarito !== letra;
          const selec = selecionada === letra;

          const base =
            "tap flex w-full items-start gap-3 rounded-xl border p-3 text-left transition";
          let cls =
            "border-slate-200 hover:border-brand/60 dark:border-slate-700 dark:hover:border-brand/60";
          if (correta) cls = "border-acerto bg-acerto/10 text-acerto";
          else if (marcadaErrada) cls = "border-erro bg-erro/10 text-erro";
          else if (selec && !revelado) cls = "border-brand bg-brand/10";

          return (
            <li key={letra}>
              <button
                type="button"
                role="radio"
                aria-checked={selec}
                disabled={revelado}
                onClick={() => onSelecionar(letra)}
                className={`${base} ${cls}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                  {correta ? "✓" : marcadaErrada ? "✗" : letra}
                </span>
                <span className="whitespace-pre-wrap pt-0.5">{questao.alternativas[letra]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {revelado && (
        <div className="card space-y-1 p-4 text-sm">
          <p className="font-semibold">
            {selecionada === questao.gabarito ? (
              <span className="text-acerto">✓ Você acertou!</span>
            ) : (
              <span className="text-erro">✗ Resposta correta: {questao.gabarito}</span>
            )}
          </p>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">{questao.explicacao}</p>
        </div>
      )}
    </article>
  );
}
