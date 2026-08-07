// Heatmap anual estilo GitHub: 53 semanas × 7 dias terminando hoje.
// 5 níveis por volume diário (0 / <8 / <18 / <32 / ≥32) → --heat0..--heat4.
import { useMemo } from "react";
import { Palmtree } from "lucide-react";
import type { DiaHeatmap } from "../lib/multiApi";

const DIA_MS = 864e5;
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
  feriasAtivo = false,
  onToggleFerias,
}: {
  dias: DiaHeatmap[];
  feriasAtivo?: boolean;
  onToggleFerias?: (v: boolean) => void;
}) {
  const { semanas, total, atual, maior, mesLabels } = useMemo(() => {
    const mapa = new Map(dias.map((d) => [d.dia, d.total]));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const domHoje = hoje.getDay(); // 0=domingo
    // Início = 52 semanas antes, no domingo daquela semana.
    const inicio = new Date(hoje.getTime() - (52 * 7 + domHoje) * DIA_MS);

    const semanas: { data: Date; total: number; futuro: boolean }[][] = [];
    let total = 0;
    for (let w = 0; w < 53; w++) {
      const col: { data: Date; total: number; futuro: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const data = new Date(inicio.getTime() + (w * 7 + d) * DIA_MS);
        const futuro = data.getTime() > hoje.getTime();
        const t = futuro ? 0 : mapa.get(chave(data)) ?? 0;
        if (!futuro) total += t;
        col.push({ data, total: t, futuro });
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

    // Sequência atual (dias consecutivos com atividade até hoje) e maior sequência.
    const flat: { data: Date; total: number; futuro: boolean }[] = semanas.flat().filter((c) => !c.futuro);
    flat.sort((a, b) => a.data.getTime() - b.data.getTime());
    let atual = 0;
    for (let i = flat.length - 1; i >= 0; i--) {
      if (flat[i].total > 0) atual++;
      else break;
    }
    let maior = 0;
    let run = 0;
    for (const c of flat) {
      if (c.total > 0) run++;
      else run = 0;
      if (run > maior) maior = run;
    }

    return { semanas, total, atual, maior, mesLabels };
  }, [dias]);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display font-bold text-brand-ink">
            <span className="text-brand-500">{total}</span> questões nos últimos 12 meses
          </p>
          <p className="text-xs text-faint">
            Sequência atual: <b className="text-brand-ink">{atual} dias</b> · maior sequência: {maior} dias
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
        <div style={{ minWidth: 700 }}>
          {/* Rótulos de mês */}
          <div className="mb-1 ml-[18px] grid" style={{ gridTemplateColumns: `repeat(53, 12px)`, gap: 3 }}>
            {Array.from({ length: 53 }).map((_, i) => {
              const label = mesLabels.find((l) => l.col === i);
              return (
                <span key={i} className="text-[10px] text-faint" style={{ gridColumn: i + 1 }}>
                  {label?.label ?? ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            {/* Iniciais dos dias */}
            <div className="grid" style={{ gridTemplateRows: `repeat(7, 12px)`, gap: 3 }}>
              {INICIAIS.map((d, i) => (
                <span key={i} className="text-[9px] leading-[12px] text-faint">
                  {i % 2 === 1 ? d : ""}
                </span>
              ))}
            </div>
            {/* Células */}
            <div className="grid" style={{ gridTemplateRows: `repeat(7, 12px)`, gridAutoFlow: "column", gap: 3 }}>
              {semanas.map((col, wi) =>
                col.map((cel, di) => {
                  const lv = nivel(cel.total);
                  return (
                    <span
                      key={`${wi}-${di}`}
                      title={cel.futuro ? "" : `${cel.total} questões em ${fmtBR(cel.data)}`}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "var(--rSm)",
                        opacity: cel.futuro ? 0 : 1,
                        background: `var(--heat${lv})`,
                        border: lv === 0 ? "1px solid var(--heat0bd)" : "none",
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
          {/* Legenda */}
          <div className="mt-2 ml-[18px] flex items-center gap-1.5 text-[10px] text-faint">
            <span>menos</span>
            {[0, 1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                style={{
                  width: 12,
                  height: 12,
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
