// Resultado de uma execução no sandbox. Tudo o que vem do programa do usuário (stdout,
// stderr, saída de compilação) é dado não confiável: vai para a tela SEMPRE como texto
// dentro de <pre>, nunca injetado como HTML.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, EyeOff, XCircle } from "lucide-react";
import { formatarTempo, ROTULO_MOTIVO, type ResultadoExecucao, type TesteResultado } from "../../lib/execucao";

export function BlocoSaida({ rotulo, texto, tom = "normal" }: { rotulo: string; texto: string; tom?: "normal" | "erro" }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-faint">{rotulo}</p>
      <pre
        className={`max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-hair px-3 py-2 font-mono text-[12.5px] leading-relaxed ${
          tom === "erro" ? "text-danger-from" : "text-brand-ink"
        }`}
        style={{ background: "var(--surface2)" }}
      >
        {texto.length > 0 ? texto : <span className="italic text-faint">(vazio)</span>}
      </pre>
    </div>
  );
}

function LinhaTeste({ t, aberto: abertoInicial }: { t: TesteResultado; aberto: boolean }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const Icone = t.passou ? CheckCircle2 : XCircle;
  const cor = t.passou ? "text-success-from" : "text-danger-from";
  const cabecalho = (
    <>
      <Icone size={18} strokeWidth={2.2} className={`flex-shrink-0 ${cor}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-ink">{t.nome}</span>
      {t.oculto && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-faint">
          <EyeOff size={12} aria-hidden /> oculto
        </span>
      )}
      <span className={`hidden text-[11px] font-semibold sm:inline ${cor}`}>{ROTULO_MOTIVO[t.motivo] ?? t.motivo}</span>
      <span className="text-[11px] tabular-nums text-faint">{formatarTempo(t.tempoMs)}</span>
    </>
  );

  // Teste oculto: só passou/falhou, sem detalhes para abrir.
  if (t.oculto) {
    return (
      <li className="flex items-center gap-2.5 rounded-xl border border-hair px-3 py-2.5" data-teste="oculto">
        {cabecalho}
        <span className="sr-only">{t.passou ? "passou" : "falhou"}</span>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-hair" data-teste="visivel">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="tap flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        {cabecalho}
        <ChevronDown size={16} className={`flex-shrink-0 text-faint transition ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {aberto && (
        <div className="space-y-3 border-t border-hair px-3 pb-3 pt-3">
          {!t.passou && <p className={`text-xs font-semibold sm:hidden ${cor}`}>{ROTULO_MOTIVO[t.motivo] ?? t.motivo}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <BlocoSaida rotulo="Entrada" texto={t.entrada ?? ""} />
            <BlocoSaida rotulo="Esperado" texto={t.esperado ?? ""} />
          </div>
          <BlocoSaida rotulo="Sua saída (stdout)" texto={t.stdout ?? ""} />
          {(t.stderr ?? "").length > 0 && <BlocoSaida rotulo="Erros (stderr)" texto={t.stderr ?? ""} tom="erro" />}
          {t.cortado && <p className="text-xs text-faint">A saída foi cortada por ser grande demais.</p>}
        </div>
      )}
    </li>
  );
}

export function ResultadoExecucaoView({ resultado }: { resultado: ResultadoExecucao }) {
  const { compilacao, testes, passou, total, tempoMs } = resultado;
  const tudoCerto = total > 0 && passou === total;
  const falhouCompilacao = !!compilacao && !compilacao.ok;
  // Abre sozinho o primeiro visível que falhou: é o que a pessoa vai querer ver.
  const primeiroFalho = testes.findIndex((t) => !t.oculto && !t.passou);

  return (
    <div className="space-y-4" aria-live="polite">
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
        style={{
          borderColor: tudoCerto ? "var(--goodBd)" : "rgb(var(--danger-from) / .35)",
          background: tudoCerto ? "var(--goodBg)" : "rgb(var(--danger-soft))",
        }}
      >
        {tudoCerto ? (
          <CheckCircle2 size={22} strokeWidth={2.2} className="text-success-from" aria-hidden />
        ) : (
          <AlertTriangle size={22} strokeWidth={2.2} className="text-danger-from" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-brand-ink">
            {tudoCerto
              ? "Todos os testes passaram!"
              : falhouCompilacao
                ? "Não compilou"
                : `${passou} de ${total} ${total === 1 ? "teste passou" : "testes passaram"}`}
          </p>
          {!tudoCerto && !falhouCompilacao && (
            <p className="text-xs text-muted">Abra os testes visíveis que falharam para comparar a saída.</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-muted">
          <Clock size={13} aria-hidden /> {formatarTempo(tempoMs)}
        </span>
      </div>

      {falhouCompilacao && <BlocoSaida rotulo="Saída do compilador" texto={compilacao.stderr} tom="erro" />}

      {testes.length > 0 && (
        <ul className="space-y-2">
          {testes.map((t, i) => (
            <LinhaTeste key={`${i}-${t.nome}`} t={t} aberto={i === primeiroFalho && !falhouCompilacao} />
          ))}
        </ul>
      )}
    </div>
  );
}
