import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  RefreshCw,
  ArrowRight,
  CalendarDays,
  Bookmark,
  Pencil,
  NotebookPen,
  Lock,
  CalendarClock,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { getSessaoAtiva } from "../lib/sessao";
import { ProgressRing } from "../components/ProgressRing";
import { StreakHeatmap } from "../components/StreakHeatmap";
import { StickyBoard } from "../components/StickyBoard";
import { carregarHeatmap, type DiaHeatmap, type PeriodoFerias } from "../lib/multiApi";
import { getConcursoId } from "../lib/concurso";
import { useConcurso } from "../store/concurso";
import { META_DIARIA_DEFAULT } from "../config/prova";
import { ehDiaDeSimulado } from "../lib/agenda";

interface GoalToday {
  meta: number;
  respondidasHoje: number;
  acertosHoje?: number;
  cumpriuHoje: boolean;
  streak: number;
  feriasAtivo?: boolean;
  dataProva?: string | null;
  progressoPlano?: number;
  progressoTempo?: number | null;
  totalQuestoes?: number;
  respondidasTotal?: number;
  respondidasSempre?: number;
  revisaoPendente?: number;
}

export function Home() {
  const { usuario } = useAuth();
  const { ativo } = useConcurso();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalToday | null>(null);
  const [editandoData, setEditandoData] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [salvandoMeta, setSalvandoMeta] = useState(false);
  const [heatmap, setHeatmap] = useState<DiaHeatmap[]>([]);
  const [periodosFerias, setPeriodosFerias] = useState<PeriodoFerias[]>([]);

  useEffect(() => {
    api<GoalToday>("/goals/today").then(setGoal).catch(() => null);
    const cid = getConcursoId();
    if (cid) {
      const to = new Date();
      const from = new Date(to.getTime() - 371 * 864e5);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      carregarHeatmap(cid, fmt(from), fmt(to))
        .then((r) => {
          setHeatmap(r.dias);
          setPeriodosFerias(r.periodos);
        })
        .catch(() => null);
    }
  }, []);

  const meta = goal?.meta ?? ativo?.metaDiaria ?? META_DIARIA_DEFAULT;
  const respondidas = goal?.respondidasHoje ?? 0;
  const acertosHoje = goal?.acertosHoje ?? 0;
  const errosHoje = Math.max(0, respondidas - acertosHoje);
  const faltamMeta = Math.max(0, meta - respondidas);
  const cumpriuHoje = goal?.cumpriuHoje ?? false;
  const streak = goal?.streak ?? 0;
  const feriasAtivo = goal?.feriasAtivo ?? false;
  const totalAcumulado = goal?.respondidasSempre ?? 0;

  const totalQuestoes = goal?.totalQuestoes ?? 0;
  const respondidasTotal = goal?.respondidasTotal ?? 0;
  const progressoPlano = goal?.progressoPlano ?? 0;
  const faltamBanco = Math.max(0, totalQuestoes - respondidasTotal);

  const dataProva = goal?.dataProva ? new Date(goal.dataProva) : null;
  const diasProva = dataProva ? Math.max(0, Math.ceil((dataProva.getTime() - Date.now()) / 86400000)) : null;
  const progressoTempo = goal?.progressoTempo ?? null;
  const revisaoPendente = goal?.revisaoPendente ?? 0;
  const diaSimulado = ehDiaDeSimulado();

  // Data e saudação por horário.
  const agora = new Date();
  const dataFmt = agora
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();
  const h = agora.getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  async function continuarEstudando() {
    const sessao = await getSessaoAtiva();
    if (sessao && sessao.contexto === "ESTUDO" && sessao.cursor < sessao.questaoIds.length) {
      navigate("/estudar?continuar=1");
    } else {
      navigate("/estudar");
    }
  }

  async function salvarData(valor: string) {
    if (!valor) return;
    setSalvandoData(true);
    try {
      await api("/goals/prova", { method: "PATCH", body: { dataProva: valor } });
      setGoal((g) => (g ? { ...g, dataProva: new Date(valor + "T00:00:00").toISOString() } : g));
      setEditandoData(false);
    } finally {
      setSalvandoData(false);
    }
  }

  async function salvarMeta(valor: number) {
    if (!Number.isFinite(valor) || valor < 1 || valor > 500) return;
    setSalvandoMeta(true);
    try {
      const res = await api<{ metaDiaria: number }>("/goals/meta", { method: "PATCH", body: { metaDiaria: valor } });
      setGoal((g) => (g ? { ...g, meta: res.metaDiaria } : g));
      setEditandoMeta(false);
    } finally {
      setSalvandoMeta(false);
    }
  }

  async function alternarFerias(valor: boolean) {
    try {
      const res = await api<{ feriasAtivo: boolean }>("/goals/ferias", { method: "PATCH", body: { ativo: valor } });
      setGoal((g) => (g ? { ...g, feriasAtivo: res.feriasAtivo } : g));
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="fadeup space-y-6 pt-2">
      {/* 1. Cabeçalho */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-faint">{dataFmt}</p>
        <h1 className="mt-1 font-display leading-none text-brand-ink" style={{ fontSize: 42, fontWeight: "var(--displayWeight)" as never }}>
          {saudacao}, {usuario?.nome}
        </h1>
        <p className="mt-2 text-muted">
          {diasProva != null ? (
            <>
              Faltam <b className="text-brand-ink">{diasProva} dias</b> para a prova da {ativo?.banca ?? ""}. Continue de onde parou.
            </>
          ) : (
            <>Defina a data da sua prova para acompanhar a contagem regressiva.</>
          )}
        </p>
      </header>

      {/* 2. Faixa de 4 KPIs (um cartão dividido por border-right) */}
      <div className="card grid grid-cols-2 sm:grid-cols-4 divide-hair">
        <Kpi rotulo="Realizadas hoje" valor={respondidas} sub={`de ${meta} na meta`} />
        <Kpi rotulo="Acertos" valor={acertosHoje} sub="nesta jornada" cor="var(--goodText)" borda />
        <Kpi rotulo="Erros" valor={errosHoje} sub="vão para revisão" cor="var(--accentText)" borda />
        <Kpi rotulo="Total acumulado" valor={totalAcumulado} sub="desde o início" borda />
      </div>

      {/* 3. Meta diária + coluna direita (contagem + progresso no banco) */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Meta diária (anel) */}
        <div className="card flex items-center gap-6 p-7">
          <ProgressRing valor={respondidas} meta={meta} size={116} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Meta diária</p>
              {!editandoMeta && (
                <button onClick={() => setEditandoMeta(true)} className="text-faint transition hover:text-brand-500" aria-label="Alterar meta diária">
                  <Pencil size={13} strokeWidth={2} />
                </button>
              )}
            </div>
            {editandoMeta ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  salvarMeta(Number(new FormData(e.currentTarget).get("meta")));
                }}
                className="space-y-2"
              >
                <input name="meta" type="number" min={1} max={500} defaultValue={meta} autoFocus disabled={salvandoMeta} className="filter-select w-28" />
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={salvandoMeta} className="btn-primary text-sm">
                    {salvandoMeta ? "Salvando…" : "Salvar"}
                  </button>
                  <button type="button" onClick={() => setEditandoMeta(false)} className="text-xs text-muted hover:text-brand-ink">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="font-display text-2xl font-bold leading-tight text-brand-ink">
                  {cumpriuHoje ? "Meta batida" : `Faltam ${faltamMeta} ${faltamMeta === 1 ? "questão" : "questões"}`}
                </p>
                <p className="text-sm text-muted">
                  {cumpriuHoje
                    ? `${respondidas} de ${meta} hoje · ofensiva de ${streak} ${streak === 1 ? "dia" : "dias"}.`
                    : "Cada questão te aproxima da ofensiva de hoje."}
                </p>
                <button onClick={continuarEstudando} className="btn-primary mt-1 inline-flex items-center gap-2 text-base">
                  {cumpriuHoje ? "Seguir treinando" : "Continuar estudando"}
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Coluna direita empilhada */}
        <div className="space-y-5">
          {/* Contagem para a prova */}
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Contagem para a prova</p>
              {!editandoData && (
                <button onClick={() => setEditandoData(true)} className="text-faint transition hover:text-brand-500" aria-label="Alterar data da prova">
                  {dataProva ? <Pencil size={14} strokeWidth={1.8} /> : <CalendarDays size={16} strokeWidth={1.8} />}
                </button>
              )}
            </div>
            {editandoData ? (
              <div className="mt-3 space-y-2">
                <input
                  type="date"
                  defaultValue={dataProva ? dataProva.toISOString().slice(0, 10) : ""}
                  onChange={(e) => salvarData(e.target.value)}
                  disabled={salvandoData}
                  className="filter-select w-auto"
                />
                <button onClick={() => setEditandoData(false)} className="block text-xs text-muted hover:text-brand-ink">
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 flex items-end gap-2">
                  <span className="font-display font-bold leading-none text-brand-ink" style={{ fontSize: 38 }}>
                    {diasProva ?? "—"}
                  </span>
                  <span className="pb-1 text-sm text-muted">dias restantes</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {dataProva
                    ? `Prova: ${dataProva.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Defina a data da prova"}
                </p>
                {dataProva && progressoTempo != null && (
                  <>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
                      <div className="h-full rounded-full" style={{ width: `${progressoTempo}%`, background: "var(--accent)" }} />
                    </div>
                    <p className="mt-2 text-xs text-faint">{progressoTempo}% do tempo até a prova percorrido</p>
                  </>
                )}
              </>
            )}
          </div>

          {/* Progresso no banco */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Seu progresso no banco</p>
              <span className="font-display font-bold text-brand-ink">{progressoPlano}%</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              <b className="text-brand-ink">{respondidasTotal}</b> de {totalQuestoes} respondidas
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
              <div className="h-full rounded-full" style={{ width: `${progressoPlano}%`, background: "var(--accent)" }} />
            </div>
            <p className="mt-2 text-xs text-faint">
              {faltamBanco > 0 ? `Faltam ${faltamBanco} questões para ver todas` : totalQuestoes > 0 ? "Você já viu todas as questões!" : "Importe questões para começar"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Heatmap anual */}
      <StreakHeatmap dias={heatmap} periodos={periodosFerias} feriasAtivo={feriasAtivo} onToggleFerias={(v) => alternarFerias(v)} />

      {/* 5. Banner de revisão pendente */}
      {revisaoPendente > 0 && (
        <Link
          to="/revisar?modo=srs"
          className="flex items-center gap-4 rounded-2xl border-l-4 p-5 transition hover:-translate-y-0.5"
          style={{ borderColor: "var(--accent)", background: "var(--accentBg)" }}
        >
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl" style={{ background: "var(--accentBg)", color: "var(--accentText)" }}>
            <CalendarClock size={24} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-brand-ink">
              {revisaoPendente} {revisaoPendente === 1 ? "questão pronta" : "questões prontas"} para revisar
            </p>
            <p className="text-sm text-muted">Revisão espaçada: reveja agora enquanto está fresco na memória.</p>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} className="flex-shrink-0 text-faint" />
        </Link>
      )}

      {/* 6. Mural de post-its */}
      <StickyBoard />

      {/* 7. Modos de estudo */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold text-brand-ink">Modos de estudo</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ModoCard to="/estudar" icon={BookOpen} titulo="Estudar" sub="Feedback imediato + anotações" />
          <ModoCard to="/revisar" icon={RefreshCw} titulo="Revisar" sub="Suas erradas em fila" />
          <ModoCard to="/caderno" icon={NotebookPen} titulo="Caderno" sub="Anotações por matéria" />
          <ModoCard
            to="/simulado"
            icon={FileText}
            titulo="Simulado"
            sub={diaSimulado ? "70 questões, prova real" : "Disponível aos sábados"}
            locked={!diaSimulado}
          />
        </div>
      </div>

      {/* 8. Atalhos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/anotacoes" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hair py-4 font-display font-bold text-muted transition hover:border-brand-300 hover:text-brand-500">
          <NotebookPen size={18} strokeWidth={1.8} /> Questões com anotações
        </Link>
        <Link to="/marcadas" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hair py-4 font-display font-bold text-muted transition hover:border-brand-300 hover:text-brand-500">
          <Bookmark size={18} strokeWidth={1.8} /> Marcadas para revisar
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  sub,
  cor,
  borda,
}: {
  rotulo: string;
  valor: number;
  sub: string;
  cor?: string;
  borda?: boolean;
}) {
  return (
    <div className={`px-5 py-5 ${borda ? "sm:border-l border-hair" : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-faint">{rotulo}</p>
      <p className="mt-2 font-display font-bold leading-none" style={{ fontSize: 34, color: cor ?? "var(--text)" }}>
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

function ModoCard({
  to,
  icon: Icon,
  titulo,
  sub,
  locked = false,
}: {
  to: string;
  icon: typeof BookOpen;
  titulo: string;
  sub: string;
  locked?: boolean;
}) {
  const conteudo = (
    <>
      <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--accentBg)", color: "var(--accentText)" }}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="mt-3 flex items-center gap-1.5 font-display font-bold text-brand-ink">
        {titulo}
        {locked && <Lock size={14} className="text-faint" strokeWidth={2} />}
      </h3>
      <p className="mt-0.5 text-sm text-faint">{sub}</p>
    </>
  );
  if (locked) {
    return (
      <div className="card p-5 opacity-60" aria-disabled title="Disponível aos sábados">
        {conteudo}
      </div>
    );
  }
  return (
    <Link to={to} className="card p-5 transition hover:-translate-y-0.5">
      {conteudo}
    </Link>
  );
}
