// Heatmap anual estilo GitHub: 53 semanas × 7 dias terminando hoje.
// 5 níveis por volume diário (0 / <8 / <18 / <32 / ≥32) → --heat0..--heat4.
import { useMemo } from "react";
import { Palmtree } from "lucide-react";
import type { DiaHeatmap, PeriodoFerias } from "../lib/multiApi";

const DIA_MS = 864e5;
// Geometria do grid. Ficam num só lugar porque quatro linhas diferentes (rótulos de mês,
// iniciais dos dias, células e a faixa de férias) precisam bater coluna a coluna.
const CELULA = 15;
const ESPACO = 4;
const ROTULO = 22; // largura da coluna com as iniciais dos dias
const PASSO = CELULA + ESPACO;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"]; // Dom..Sáb

function chave(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nivel(n: number): 0 | 1 | 2 | 3 | 4 {
  if (n <= 0) return 0;
  if (n < 8) return 1;
  if (n < 18) return 2;
  if (n < 32) return 3;
  return 4;
}
function fmtBR(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function StreakHeatmap({
  dias,
  periodos = [],
  feriasAtivo = false,
  onToggleFerias,
  meta,
  streakAtual,
}: {
  dias: DiaHeatmap[];
  periodos?: PeriodoFerias[];
  feriasAtivo?: boolean;
  onToggleFerias?: (v: boolean) => void;
  /** Meta diária: um dia só entra na ofensiva se bateu a meta. */
  meta: number;
  /** Ofensiva vinda do backend, que é a fonte da verdade. */
  streakAtual?: number;
}) {
  const { semanas, total, atual, maior, mesLabels, feriasWeeks } = useMemo(() => {
    const mapa = new Map(dias.map((d) => [d.dia, d.total]));
    const ehFerias = (k: string) => periodos.some((p) => k >= p.inicio && (p.fim ? k <= p.fim : true));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const domHoje = hoje.getDay(); // 0=domingo
    // Início = 52 semanas antes, no domingo daquela semana.
    const inicio = new Date(hoje.getTime() - (52 * 7 + domHoje) * DIA_MS);

    const semanas: { data: Date; total: number; futuro: boolean; ferias: boolean }[][] = [];
    const feriasWeeks = new Set<number>();
    let total = 0;
    for (let w = 0; w < 53; w++) {
      const col: { data: Date; total: number; futuro: boolean; ferias: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const data = new Date(inicio.getTime() + (w * 7 + d) * DIA_MS);
        const futuro = data.getTime() > hoje.getTime();
        const k = chave(data);
        const t = futuro ? 0 : mapa.get(k) ?? 0;
        const ferias = !futuro && ehFerias(k);
        if (ferias) feriasWeeks.add(w);
        if (!futuro) total += t;
        col.push({ data, total: t, futuro, ferias });
      }
      semanas.push(col);
    }

    // Rótulos de mês: primeira coluna de cada mês.
    const mesLabels: { col: number; label: string }[] = [];
    let ultimoMes = -1;
    semanas.forEach((col, i) => {
      const m = col[0].data.getMonth();
      if (m !== ultimoMes) {
        mesLabels.push({ col: i, label: MESES[m] });
        ultimoMes = m;
      }
    });

    // Sequência: as mesmas regras do backend (lib/streak.ts), senão os dois números
    // divergem na tela. Um dia entra na ofensiva quando BATEU A META — não basta ter
    // respondido alguma coisa. Fim de semana e dia de férias sem meta não contam, mas
    // também não quebram: são pulados. Só um dia útil sem meta quebra.
    const flat = semanas
      .flat()
      .filter((c) => !c.futuro)
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    const bateu = (c: { total: number }) => c.total >= meta;
    const ehDescanso = (c: { data: Date; ferias: boolean }) => {
      const wd = c.data.getDay(); // 0=domingo, 6=sábado
      return wd === 0 || wd === 6 || c.ferias;
    };

    // Hoje ainda está em aberto: se não é descanso e ainda não bateu, começa de ontem.
    let i = flat.length - 1;
    if (i >= 0 && !ehDescanso(flat[i]) && !bateu(flat[i])) i--;

    let atual = 0;
    for (; i >= 0; i--) {
      if (bateu(flat[i])) atual++;
      else if (ehDescanso(flat[i])) continue;
      else break;
    }

    let maior = 0;
    let run = 0;
    for (const c of flat) {
      if (bateu(c)) run++;
      else if (ehDescanso(c)) continue;
      else run = 0;
      if (run > maior) maior = run;
    }

    return { semanas, total, atual, maior, mesLabels, feriasWeeks };
  }, [dias, periodos, meta]);

  // O backend é a fonte da verdade da ofensiva (é ele que a navbar mostra). O cálculo
  // local existe só como fallback enquanto /goals/today não respondeu.
  const sequenciaAtual = streakAtual ?? atual;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display font-bold text-brand-ink">
            <span className="text-brand-500">{total}</span> questões nos últimos 12 meses
          </p>
          <p
            className="text-xs text-faint"
            title="Um dia entra na ofensiva quando você bate a meta. Fim de semana e dias de férias não quebram a sequência."
          >
            Sequência atual: <b className="text-brand-ink">{sequenciaAtual} {sequenciaAtual === 1 ? "dia" : "dias"}</b>
            {" · maior sequência: "}
            {maior} {maior === 1 ? "dia" : "dias"}
          </p>
        </div>
        {onToggleFerias && (
          <button
            onClick={() => onToggleFerias(!feriasAtivo)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              feriasAtivo ? "bg-brand-500/10 text-brand-500 border-brand-300" : "border-hair text-muted"
            }`}
            title="Ligue ao viajar para não perder a ofensiva"
          >
            <Palmtree size={14} strokeWidth={1.8} /> Modo férias
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <div style={{ minWidth: ROTULO + ESPACO + 53 * PASSO }}>
          {/* Rótulos de mês */}
          <div
            className="mb-1 grid"
            style={{ marginLeft: ROTULO + ESPACO, gridTemplateColumns: `repeat(53, ${CELULA}px)`, gap: ESPACO }}
          >
            {Array.from({ length: 53 }).map((_, i) => {
              const label = mesLabels.find((l) => l.col === i);
              return (
                <span key={i} className="text-[10px] text-faint" style={{ gridColumn: i + 1 }}>
                  {label?.label ?? ""}
                </span>
              );
            })}
          </div>
          <div className="flex" style={{ gap: ESPACO }}>
            {/* Iniciais dos dias */}
            <div className="grid" style={{ width: ROTULO, gridTemplateRows: `repeat(7, ${CELULA}px)`, gap: ESPACO }}>
              {INICIAIS.map((d, i) => (
                <span key={i} className="text-[10px] text-faint" style={{ lineHeight: `${CELULA}px` }}>
                  {i % 2 === 1 ? d : ""}
                </span>
              ))}
            </div>
            {/* Células */}
            <div
              className="grid"
              style={{ gridTemplateRows: `repeat(7, ${CELULA}px)`, gridAutoFlow: "column", gap: ESPACO }}
            >
              {semanas.map((col, wi) =>
                col.map((cel, di) => {
                  const lv = nivel(cel.total);
                  // Dia de férias sem atividade recebe um visual próprio (tracejado âmbar).
                  const feriasVazio = cel.ferias && lv === 0;
                  return (
                    <span
                      key={`${wi}-${di}`}
                      title={
                        cel.futuro
                          ? ""
                          : `${cel.total} questões em ${fmtBR(cel.data)}${cel.ferias ? " · modo férias" : ""}`
                      }
                      style={{
                        width: CELULA,
                        height: CELULA,
                        borderRadius: "var(--rSm)",
                        opacity: cel.futuro ? 0 : 1,
                        background: feriasVazio ? "var(--accentBg)" : `var(--heat${lv})`,
                        border: feriasVazio
                          ? "1px dashed var(--accent)"
                          : lv === 0
                          ? "1px solid var(--heat0bd)"
                          : "none",
                        boxShadow: cel.ferias && lv > 0 ? "0 0 0 1px var(--accent)" : "none",
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
          {/* Marcadores de férias: uma palmeira sob cada semana que teve modo férias */}
          <div
            className="mt-1 grid"
            style={{ marginLeft: ROTULO + ESPACO, gridTemplateColumns: `repeat(53, ${CELULA}px)`, gap: ESPACO }}
          >
            {Array.from({ length: 53 }).map((_, i) => (
              <span key={i} className="grid place-items-center" style={{ height: CELULA, gridColumn: i + 1 }}>
                {feriasWeeks.has(i) && (
                  <Palmtree size={12} strokeWidth={2} style={{ color: "var(--accent)" }} aria-label="Semana com modo férias" />
                )}
              </span>
            ))}
          </div>
          {/* Legenda */}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-faint" style={{ marginLeft: ROTULO + ESPACO }}>
            <span className="inline-flex items-center gap-1">
              <Palmtree size={12} strokeWidth={2} style={{ color: "var(--accent)" }} /> férias
            </span>
            <span className="opacity-40">·</span>
            <span>menos</span>
            {[0, 1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                style={{
                  width: CELULA,
                  height: CELULA,
                  borderRadius: "var(--rSm)",
                  background: `var(--heat${lv})`,
                  border: lv === 0 ? "1px solid var(--heat0bd)" : "none",
                }}
              />
            ))}
            <span>mais</span>
          </div>
        </div>
      </div>
    </div>
  );
}
