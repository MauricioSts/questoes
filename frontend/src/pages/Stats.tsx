import { useEffect, useState } from "react";
import { BarChart3, Flame } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { FilterSelect } from "../components/FilterSelect";

interface TaxaItem {
  chave: string;
  materia: string;
  assunto?: string;
  total: number;
  acertos: number;
  taxa: number;
}
interface Stats {
  totalRespondidas: number;
  totalAcertos: number;
  taxaGlobal: number;
  streak: number;
  porDia: { dia: string; total: number; acertos: number }[];
  porMateria: TaxaItem[];
  porAssunto: TaxaItem[];
  pontosFracos: TaxaItem[];
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
        <p className="text-danger-from font-medium">Não foi possível carregar as estatísticas</p>
      </div>
    );
  if (!stats)
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-faint">Carregando…</p>
      </div>
    );

  let accT = 0,
    accA = 0;
  const evolucao = stats.porDia.map((d) => {
    accT += d.total;
    accA += d.acertos;
    return { dia: d.dia.slice(5), taxa: accT ? Math.round((accA / accT) * 100) : 0 };
  });
  const porDiaFmt = stats.porDia.map((d) => ({ dia: d.dia.slice(5), respondidas: d.total }));
  const materiaFmt = stats.porMateria.map((m) => ({
    materia: m.materia.length > 14 ? m.materia.slice(0, 13) + "…" : m.materia,
    acerto: Math.round(m.taxa * 100),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={24} className="text-brand-600" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Estatísticas</h1>
        </div>
        <FilterSelect
          label=""
          value={periodo}
          onChange={(v) => setPeriodo(v as Periodo)}
          options={[
            { value: "7d", label: "7 dias" },
            { value: "30d", label: "30 dias" },
            { value: "all", label: "Tudo" },
          ]}
          className="w-32"
        />
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {/* Respondidas */}
        <Card className="p-4 space-y-1">
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Respondidas</p>
          <p className="font-display text-3xl font-extrabold text-brand-ink">{stats.totalRespondidas}</p>
        </Card>

        {/* Taxa de acerto */}
        <Card className="p-4 space-y-1">
          <p className="text-xs font-bold text-success-from uppercase tracking-widest">Taxa de acerto</p>
          <div className="flex items-baseline gap-1">
            <p className="font-display text-3xl font-extrabold text-success-from">
              {Math.round(stats.taxaGlobal * 100)}%
            </p>
            <p className="text-xs text-success-from">↑</p>
          </div>
        </Card>

        {/* Ofensiva */}
        <Card className="p-4 space-y-1 bg-gradient-to-br from-flame-from to-flame-to text-white">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Ofensiva</p>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-3xl font-extrabold">{stats.streak || 0}</p>
            <Flame size={20} strokeWidth={2} />
          </div>
        </Card>
      </div>

      {stats.totalRespondidas === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-faint">Responda algumas questões para ver seus gráficos aqui.</p>
        </Card>
      ) : (
        <>
          {/* Gráficos grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Questões por dia */}
            <Card className="p-6 space-y-4">
              <h2 className="font-display font-extrabold text-brand-ink">Questões por dia</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={porDiaFmt}>
                  <defs>
                    <linearGradient id="colorRespondidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5B4FE0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5B4FE0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE7F7" />
                  <XAxis dataKey="dia" fontSize={11} stroke="#9C98B8" />
                  <YAxis fontSize={11} allowDecimals={false} stroke="#9C98B8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="respondidas"
                    stroke="#5B4FE0"
                    fillOpacity={1}
                    fill="url(#colorRespondidas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Evolução da taxa */}
            <Card className="p-6 space-y-4">
              <h2 className="font-display font-extrabold text-brand-ink">Evolução da taxa de acerto</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE7F7" />
                  <XAxis dataKey="dia" fontSize={11} stroke="#9C98B8" />
                  <YAxis domain={[0, 100]} fontSize={11} stroke="#9C98B8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="taxa"
                    stroke="#12995B"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Acerto por matéria */}
          <Card className="p-6 space-y-4">
            <h2 className="font-display font-extrabold text-brand-ink">Acerto por matéria</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, materiaFmt.length * 40)}>
              <BarChart data={materiaFmt} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={11} stroke="#9C98B8" />
                <YAxis type="category" dataKey="materia" width={95} fontSize={11} stroke="#9C98B8" />
                <Tooltip />
                <Bar dataKey="acerto" fill="#5B4FE0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
