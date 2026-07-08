// Dashboard "onde estou errando": totais, evolução, acerto por matéria/assunto e pontos fracos.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  porDia: { dia: string; total: number; acertos: number }[];
  porMateria: TaxaItem[];
  porAssunto: TaxaItem[];
  pontosFracos: TaxaItem[];
}

type Periodo = "7d" | "30d" | "all";

export function Stats() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setErro(false);
    api<Stats>(`/answers/stats?period=${periodo}`)
      .then(setStats)
      .catch(() => setErro(true));
  }, [periodo]);

  if (erro) return <div className="p-6 text-center text-slate-400">Não foi possível carregar as estatísticas.</div>;
  if (!stats) return <div className="p-6 text-center text-slate-400">Carregando…</div>;

  // evolução da taxa de acerto acumulada ao longo dos dias
  let accT = 0, accA = 0;
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
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Estatísticas 📊</h1>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="sel w-28">
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="all">Tudo</option>
        </select>
      </header>

      {/* totais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Respondidas</p>
          <p className="text-3xl font-bold tabular-nums">{stats.totalRespondidas}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Taxa de acerto</p>
          <p className="text-3xl font-bold tabular-nums">{Math.round(stats.taxaGlobal * 100)}%</p>
        </div>
      </div>

      {stats.totalRespondidas === 0 ? (
        <p className="card p-6 text-center text-slate-400">
          Responda algumas questões para ver seus gráficos aqui.
        </p>
      ) : (
        <>
          {/* questões respondidas ao longo do tempo */}
          <Bloco titulo="Questões respondidas por dia">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={porDiaFmt}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="respondidas" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </Bloco>

          {/* evolução da taxa de acerto */}
          <Bloco titulo="Evolução da taxa de acerto (%)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="taxa" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Bloco>

          {/* acerto por matéria */}
          <Bloco titulo="Acerto por matéria (%)">
            <ResponsiveContainer width="100%" height={Math.max(160, materiaFmt.length * 34)}>
              <BarChart data={materiaFmt} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={11} />
                <YAxis type="category" dataKey="materia" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="acerto" fill="#4f46e5" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Bloco>

          {/* pontos fracos / revisão */}
          <Bloco titulo="Pontos de melhoria (menor acerto)">
            {stats.pontosFracos.length === 0 ? (
              <p className="text-sm text-slate-400">Responda ao menos 3 questões por assunto para ver aqui.</p>
            ) : (
              <ul className="space-y-2">
                {stats.pontosFracos.slice(0, 8).map((p) => (
                  <li key={p.chave} className="flex items-center gap-3 text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{p.assunto}</p>
                      <p className="text-xs text-slate-400">
                        {p.materia} · {p.acertos}/{p.total} · {Math.round(p.taxa * 100)}%
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        navigate(
                          `/topico?materia=${encodeURIComponent(p.materia)}&assunto=${encodeURIComponent(
                            p.assunto ?? ""
                          )}&prioriza=1`
                        )
                      }
                      className="btn-primary text-xs"
                    >
                      Treinar agora
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        </>
      )}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
