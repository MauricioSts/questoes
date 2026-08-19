import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import type { TooltipProps } from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { FilterSelect } from "../components/FilterSelect";
import { PageHeader } from "../components/PageHeader";

// Tooltip dos gráficos alinhado ao design (usa tokens → funciona nos dois temas).
function ChartTooltip({ active, payload, label, suffix = "" }: TooltipProps<number, string> & { suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-hair bg-surface px-3 py-2 shadow-lg">
      {label != null && <p className="mb-0.5 text-xs font-bold text-muted">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="font-display text-sm font-bold text-brand-ink">
          {p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

interface TaxaItem {
  chave: string;
  materia: string;
  total: number;
  acertos: number;
  taxa: number;
}
interface Stats {
  totalRespondidas: number;
  totalAcertos: number;
  taxaGlobal: number;
  tempoMedioSegundos: number | null;
  streak: number;
  porDia: { dia: string; total: number; acertos: number }[];
  porMateria: TaxaItem[];
}

function fmtTempo(seg: number | null | undefined): string {
  if (seg == null || seg <= 0) return "n/d";
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}

type Periodo = "7d" | "30d" | "all";

export function Stats() {
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setErro(false);
    api<Stats>(`/answers/stats?period=${periodo}`)
      .then(setStats)
      .catch(() => setErro(true));
  }, [periodo]);

  if (erro)
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="font-medium text-danger-from">Não foi possível carregar as estatísticas</p>
      </div>
    );
  if (!stats)
    return (
      <div className="mx-auto max-w-[900px] space-y-6 pt-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );

  let accT = 0,
    accA = 0;
  const evolucao = stats.porDia.map((d) => {
    accT += d.total;
    accA += d.acertos;
    return { dia: d.dia.slice(5), taxa: accT ? Math.round((accA / accT) * 100) : 0 };
  });
  const porDiaFmt = stats.porDia.slice(-14).map((d) => ({ dia: d.dia.slice(5), respondidas: d.total }));
  const materiaFmt = stats.porMateria.map((m) => ({
    materia: m.materia.length > 16 ? m.materia.slice(0, 15) + "…" : m.materia,
    acerto: Math.round(m.taxa * 100),
  }));

  const AXIS = "rgb(var(--faint))";
  const GRID = "rgb(var(--hair))";

  return (
    <div className="fadeup mx-auto max-w-[900px] pt-2">
      <PageHeader
        rotulo="Desempenho"
        titulo="Estatísticas"
        right={
          <FilterSelect
            label=""
            value={periodo}
            onChange={(v) => setPeriodo(v as Periodo)}
            options={[
              { value: "7d", label: "7 dias" },
              { value: "30d", label: "30 dias" },
              { value: "all", label: "Tudo" },
            ]}
            className="w-36"
          />
        }
      />

      {/* Faixa de 4 KPIs */}
      <div className="card mb-6 grid grid-cols-2 sm:grid-cols-4">
        <Kpi rotulo="Respondidas" valor={String(stats.totalRespondidas)} sub="no total" />
        <Kpi rotulo="Taxa de acerto" valor={`${Math.round(stats.taxaGlobal * 100)}%`} sub={`${stats.totalAcertos} acertos`} cor="var(--goodText)" borda />
        <Kpi rotulo="Tempo médio" valor={fmtTempo(stats.tempoMedioSegundos)} sub="por questão" borda />
        <Kpi rotulo="Sequência" valor={`${stats.streak || 0}d`} sub="dias seguidos" borda />
      </div>

      {stats.totalRespondidas === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-faint">Responda algumas questões para ver seus gráficos aqui.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Questões por dia */}
            <Card className="space-y-4 p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Questões por dia</h2>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={porDiaFmt}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="dia" fontSize={10} stroke={AXIS} tickLine={false} />
                  <YAxis fontSize={10} allowDecimals={false} stroke={AXIS} tickLine={false} width={24} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(var(--hair))" }} />
                  <Bar dataKey="respondidas" radius={[3, 3, 0, 0]}>
                    {porDiaFmt.map((_, i) => (
                      <Cell key={i} fill={i === porDiaFmt.length - 1 ? "var(--accent)" : "var(--bar)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Evolução da taxa */}
            <Card className="space-y-4 p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Evolução da taxa de acerto</h2>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="dia" fontSize={10} stroke={AXIS} tickLine={false} />
                  <YAxis domain={[0, 100]} fontSize={10} stroke={AXIS} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ stroke: "rgb(var(--hair))" }} />
                  <Line type="monotone" dataKey="taxa" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Acerto por matéria */}
          <Card className="space-y-4 p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Acerto por matéria</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, materiaFmt.length * 40)}>
              <BarChart data={materiaFmt} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={10} stroke={AXIS} tickLine={false} />
                <YAxis type="category" dataKey="materia" width={95} fontSize={10} stroke={AXIS} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: "rgb(var(--hair))" }} />
                <Bar dataKey="acerto" fill="var(--accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ rotulo, valor, sub, cor, borda }: { rotulo: string; valor: string; sub: string; cor?: string; borda?: boolean }) {
  return (
    <div className={`px-5 py-5 ${borda ? "sm:border-l border-hair" : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-faint">{rotulo}</p>
      <p className="mt-2 font-display font-bold leading-none" style={{ fontSize: 32, color: cor ?? "var(--text)" }}>
        {valor}
      </p>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </div>
  );
}
