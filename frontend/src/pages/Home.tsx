import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Zap,
  FileText,
  RefreshCw,
  ArrowRight,
  Flame,
  CalendarDays,
  Check,
  Bookmark,
  Layers,
  Pencil,
  Scale,
  NotebookPen,
  Lock,
  Moon,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { getSessaoAtiva } from "../lib/sessao";
import { ProgressRing } from "../components/ProgressRing";
import { META_DIARIA_DEFAULT } from "../config/prova";
import { ehDiaDeLegislacao } from "../lib/legislacao";
import { ehDiaDeSimulado } from "../lib/agenda";

interface GoalToday {
  meta: number;
  respondidasHoje: number;
  cumpriuHoje: boolean;
  streak: number;
  semana?: boolean[]; // seg→dom da semana atual bateram a meta
  hojeIdx?: number; // índice de hoje (0=seg … 6=dom)
  dataProva?: string | null;
  progressoPlano?: number;
  progressoTempo?: number | null; // % do tempo até a prova decorrido
  totalQuestoes?: number;
  respondidasTotal?: number;
  legislacaoTotal?: number;
  legislacaoFeitasHoje?: number;
}

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function Home() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalToday | null>(null);
  const [editandoData, setEditandoData] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  useEffect(() => {
    api<GoalToday>("/goals/today").then(setGoal).catch(() => null);
  }, []);

  const meta = goal?.meta ?? usuario?.metaDiaria ?? META_DIARIA_DEFAULT;
  const respondidas = goal?.respondidasHoje ?? 0;
  const faltam = Math.max(0, meta - respondidas);
  const cumpriuHoje = goal?.cumpriuHoje ?? false;
  const streak = goal?.streak ?? 0;

  // Questões no sistema x respondidas (total)
  const totalQuestoes = goal?.totalQuestoes ?? 0;
  const respondidasTotal = goal?.respondidasTotal ?? 0;
  const progressoPlano = goal?.progressoPlano ?? 0;

  // Prova
  const dataProva = goal?.dataProva ? new Date(goal.dataProva) : null;
  const diasProva = dataProva
    ? Math.max(0, Math.ceil((dataProva.getTime() - Date.now()) / 86400000))
    : null;
  const progressoTempo = goal?.progressoTempo ?? null;

  // Calendário semanal — os dias reais em que bateu a meta vêm do backend (fuso
  // do usuário). Fallback local só enquanto a resposta não chega.
  const hojeIdx = goal?.hojeIdx ?? (new Date().getDay() + 6) % 7; // seg=0 ... dom=6
  const diasConcluidos = goal?.semana ?? DIAS.map(() => false);

  // Ciclo de legislação (dia sim, dia não) + progresso de hoje
  const diaLegislacao = ehDiaDeLegislacao();
  const legislacaoTotal = goal?.legislacaoTotal ?? 0;
  const legislacaoFeitasHoje = goal?.legislacaoFeitasHoje ?? 0;
  const legislacaoConcluida = legislacaoTotal > 0 && legislacaoFeitasHoje >= legislacaoTotal;

  // Simulado só aos sábados
  const diaSimulado = ehDiaDeSimulado();

  // "Continuar estudando": retoma sessão ativa ou abre o modo estudo para uma nova.
  async function continuarEstudando() {
    const sessao = await getSessaoAtiva();
    if (sessao && sessao.contexto === "ESTUDO" && sessao.cursor < sessao.questaoIds.length) {
      navigate("/estudar?continuar=1");
    } else {
      navigate("/estudar");
    }
  }

  // Salva a nova data da prova (input type=date → "YYYY-MM-DD").
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

  // Salva a nova meta diária (1–500 questões).
  async function salvarMeta(valor: number) {
    if (!Number.isFinite(valor) || valor < 1 || valor > 500) return;
    setSalvandoMeta(true);
    try {
      const res = await api<{ metaDiaria: number }>("/goals/meta", {
        method: "PATCH",
        body: { metaDiaria: valor },
      });
      setGoal((g) => (g ? { ...g, meta: res.metaDiaria } : g));
      setEditandoMeta(false);
    } finally {
      setSalvandoMeta(false);
    }
  }

  return (
    <div className="space-y-6" style={{ animation: "pop .35s ease both" }}>
      {/* Saudação */}
      <div className="pt-2">
        <h1 className="font-display text-3xl font-extrabold text-brand-ink">Olá, {usuario?.nome}</h1>
        <p className="text-muted mt-1">Bora manter a ofensiva de hoje.</p>
      </div>

      {/* Grid principal 2 colunas */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* a) Meta diária (hero escuro) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2C2260] via-[#4A3DB0] to-[#6B5CE8] p-7 text-white">
          <div className="absolute -top-6 right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" style={{ animation: "floaty 7s ease-in-out infinite" }} />
          <div className="absolute bottom-2 right-24 h-24 w-24 rounded-full bg-white/5 blur-xl" style={{ animation: "floaty 9s ease-in-out infinite" }} />
          <div className="relative flex items-center gap-6">
            <ProgressRing valor={respondidas} meta={meta} size={148} />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-from">Meta diária</p>
                {!editandoMeta && (
                  <button
                    onClick={() => setEditandoMeta(true)}
                    className="text-white/60 transition hover:text-white"
                    aria-label="Alterar meta diária"
                    title="Alterar meta diária"
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                )}
              </div>

              {editandoMeta ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = Number(new FormData(e.currentTarget).get("meta"));
                    salvarMeta(val);
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      name="meta"
                      type="number"
                      min={1}
                      max={500}
                      defaultValue={meta}
                      autoFocus
                      disabled={salvandoMeta}
                      className="w-24 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-lg font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-cyan-from/50"
                    />
                    <span className="text-sm opacity-80">questões/dia</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={salvandoMeta}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-display font-extrabold text-brand-600 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {salvandoMeta ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoMeta(false)}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : cumpriuHoje ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl leading-none">🎉</span>
                    <p className="font-display text-2xl font-extrabold leading-tight">
                      Meta batida!
                    </p>
                  </div>
                  <p className="text-sm text-white/85">
                    {respondidas} de {meta} questões hoje · ofensiva de {streak} {streak === 1 ? "dia" : "dias"} 🔥
                  </p>
                  <button
                    onClick={continuarEstudando}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 font-display font-extrabold text-white transition hover:bg-white/25"
                  >
                    Seguir treinando
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl font-extrabold leading-tight">
                    Faltam {faltam} {faltam === 1 ? "questão" : "questões"}
                  </p>
                  <button
                    onClick={continuarEstudando}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-display font-extrabold text-brand-600 transition hover:-translate-y-0.5"
                  >
                    Continuar estudando
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* b) Ofensiva */}
        <div className="card p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-3xl font-extrabold text-brand-ink">{streak} dias</p>
              <p className="text-muted mt-1">de ofensiva. Não quebre!</p>
            </div>
            <div
              className="h-16 w-16 rounded-2xl bg-gradient-to-br from-flame-from to-flame-to flex items-center justify-center shadow-lg shadow-flame-to/40"
              style={{ animation: "flamewave 2.5s ease-in-out infinite" }}
            >
              <Flame size={30} className="text-white" strokeWidth={2} fill="currentColor" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {DIAS.map((d, i) => {
              const feito = diasConcluidos[i];
              const hoje = i === hojeIdx;
              const descanso = i === 6 && !feito; // domingo = descanso (não quebra a ofensiva)
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-11 w-full rounded-xl flex items-center justify-center ${
                      feito
                        ? "bg-gradient-to-br from-flame-from to-flame-to"
                        : hoje
                        ? "border-2 border-dashed border-flame-from bg-white"
                        : descanso
                        ? "bg-brand-50 border border-dashed border-hair"
                        : "bg-brand-100"
                    }`}
                    title={descanso ? "Domingo é dia de descanso — não quebra a ofensiva" : undefined}
                  >
                    {feito ? (
                      <Check size={18} className="text-white" strokeWidth={3} />
                    ) : descanso ? (
                      <Moon size={16} className="text-faint" strokeWidth={2} />
                    ) : null}
                  </div>
                  <span className="text-xs font-bold text-faint">{d}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* c) Questões no sistema x respondidas (substitui o card de Nível) */}
        <div className="card p-7">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center flex-shrink-0">
              <Layers size={22} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-display font-extrabold text-brand-ink">Questões</p>
              <p className="text-sm text-faint">Seu progresso no banco</p>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-6">
            <div>
              <p className="font-display text-3xl font-extrabold text-brand-500">{respondidasTotal}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Respondidas</p>
            </div>
            <div className="h-10 w-px bg-hair" />
            <div>
              <p className="font-display text-3xl font-extrabold text-brand-ink">{totalQuestoes}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">No sistema</p>
            </div>
          </div>

          <div className="mt-5 h-2.5 w-full rounded-full bg-hair overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-[#7C6FF6]"
              style={{
                width: `${progressoPlano}%`,
                backgroundSize: "200% 100%",
                animation: "shimmer 2.5s linear infinite",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-faint">
            {totalQuestoes - respondidasTotal > 0
              ? `Faltam ${totalQuestoes - respondidasTotal} questões para você ver todas`
              : totalQuestoes > 0
              ? "Você já viu todas as questões do banco!"
              : "Importe questões para começar"}
          </p>
        </div>

        {/* d) Contagem para a prova (escuro) — com edição de data */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1840] to-[#332A6E] p-7 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-extrabold uppercase tracking-widest text-cyan-from/80">
                Contagem para a prova
              </p>

              {editandoData ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="date"
                    defaultValue={dataProva ? dataProva.toISOString().slice(0, 10) : ""}
                    onChange={(e) => salvarData(e.target.value)}
                    disabled={salvandoData}
                    className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-cyan-from/50"
                  />
                  <button
                    onClick={() => setEditandoData(false)}
                    className="block text-xs text-white/60 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="font-display text-5xl font-extrabold leading-none">
                      {diasProva ?? "—"}
                    </span>
                    <span className="pb-1 text-sm opacity-80">dias restantes</span>
                  </div>
                  <p className="mt-2 text-sm opacity-80">
                    {dataProva
                      ? `Prova: ${dataProva.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`
                      : "Defina a data da prova"}
                  </p>
                </>
              )}
            </div>

            {!editandoData && (
              <button
                onClick={() => setEditandoData(true)}
                className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                aria-label="Alterar data da prova"
                title="Alterar data da prova"
              >
                {dataProva ? <Pencil size={18} strokeWidth={1.8} /> : <CalendarDays size={20} strokeWidth={1.8} />}
              </button>
            )}
          </div>

          {!editandoData && dataProva && progressoTempo != null && (
            <>
              <div className="mt-5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-from to-cyan-to"
                  style={{ width: `${progressoTempo}%` }}
                />
              </div>
              <p className="mt-2 text-xs opacity-70">
                {progressoTempo}% do tempo até a prova · faltam {diasProva} dias
              </p>
            </>
          )}
        </div>
      </div>

      {/* e) Modos de estudo */}
      <div>
        <h2 className="font-display text-xl font-extrabold text-brand-ink mb-4">Modos de estudo</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ModoCard to="/estudar" icon={BookOpen} titulo="Estudar" sub="Feedback imediato + anotações" bg="bg-[#EEF0FF]" cor="text-[#4A57E0]" />
          <ModoCard to="/flash" icon={Zap} titulo="Flash" sub="10 erradas do Módulo II" bg="bg-[#FFF0E8]" cor="text-[#F5722B]" fill />
          <ModoCard
            to="/simulado"
            icon={FileText}
            titulo="Simulado"
            sub={diaSimulado ? "70 questões, prova real" : "Disponível aos sábados"}
            bg="bg-[#E8F7EF]"
            cor="text-[#12995B]"
            locked={!diaSimulado}
          />
          <ModoCard to="/revisar" icon={RefreshCw} titulo="Revisar" sub="Suas erradas em fila" bg="bg-[#FDECEF]" cor="text-[#E14A5F]" />
        </div>
      </div>

      {/* f) Legislação — destaque quando é "dia de legislação" (ciclo de 2 dias).
             Ao concluir todas as questões de hoje, vira um feedback de conclusão. */}
      {diaLegislacao && (
        legislacaoConcluida ? (
          <Link
            to="/legislacao"
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E7A48] to-[#0A5E38] p-5 text-white transition hover:-translate-y-0.5"
          >
            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/20 flex items-center justify-center">
              <Check size={26} strokeWidth={3} />
            </div>
            <div className="flex-1">
              <p className="font-display font-extrabold">Dia de legislação concluído! 🎉</p>
              <p className="text-sm text-white/85">
                Você fez as {legislacaoTotal} questões de legislação de hoje. Mandou bem!
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to="/legislacao"
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#12995B] to-[#0E7A48] p-5 text-white transition hover:-translate-y-0.5"
          >
            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/15 flex items-center justify-center">
              <Scale size={24} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-display font-extrabold">Hoje é dia de Legislação 📜</p>
              <p className="text-sm text-white/85">
                {legislacaoFeitasHoje > 0
                  ? `${legislacaoFeitasHoje} de ${legislacaoTotal} feitas hoje — continue!`
                  : "Faça todas as questões de legislação de hoje."}
              </p>
            </div>
            <ArrowRight size={20} strokeWidth={2.4} className="flex-shrink-0" />
          </Link>
        )
      )}

      {/* f2) Simulado — destaque no sábado (dia de simulado) */}
      {diaSimulado && (
        <Link
          to="/simulado"
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4A3DB0] to-[#6B5CE8] p-5 text-white transition hover:-translate-y-0.5"
        >
          <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/15 flex items-center justify-center">
            <FileText size={24} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-display font-extrabold">Sábado é dia de Simulado 📝</p>
            <p className="text-sm text-white/85">Encare as 70 questões no clima de prova real.</p>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} className="flex-shrink-0" />
        </Link>
      )}

      {/* g) Atalhos: anotações + marcadas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/anotacoes"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hair bg-white/50 py-4 font-display font-bold text-muted transition hover:border-brand-300 hover:text-brand-500"
        >
          <NotebookPen size={18} strokeWidth={1.8} />
          Questões com anotações
        </Link>
        <Link
          to="/marcadas"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hair bg-white/50 py-4 font-display font-bold text-muted transition hover:border-brand-300 hover:text-brand-500"
        >
          <Bookmark size={18} strokeWidth={1.8} />
          Marcadas para revisar
        </Link>
      </div>
    </div>
  );
}

function ModoCard({
  to,
  icon: Icon,
  titulo,
  sub,
  bg,
  cor,
  fill = false,
  locked = false,
}: {
  to: string;
  icon: typeof BookOpen;
  titulo: string;
  sub: string;
  bg: string;
  cor: string;
  fill?: boolean;
  locked?: boolean;
}) {
  const conteudo = (
    <>
      <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon size={22} className={cor} strokeWidth={2} fill={fill ? "currentColor" : "none"} />
      </div>
      <h3 className="mt-3 font-display font-extrabold text-brand-ink flex items-center gap-1.5">
        {titulo}
        {locked && <Lock size={14} className="text-faint" strokeWidth={2} />}
      </h3>
      <p className="text-sm text-faint mt-0.5">{sub}</p>
    </>
  );

  // Bloqueado (ex.: simulado fora do sábado): não navega, visual esmaecido.
  if (locked) {
    return (
      <div className="card p-5 opacity-60 cursor-not-allowed" aria-disabled title="Disponível aos sábados">
        {conteudo}
      </div>
    );
  }

  return (
    <Link to={to} className="card p-5 transition hover:-translate-y-0.5 cursor-pointer">
      {conteudo}
    </Link>
  );
}
