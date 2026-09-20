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
  ClipboardList,
  ArrowUpRight,
  Trophy,
  Flame,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { getSessaoAtiva } from "../lib/sessao";
import { ProgressRing } from "../components/ProgressRing";
import { BrilhoBorda } from "../components/BrilhoBorda";
import { Contador } from "../components/Contador";
import { StreakHeatmap } from "../components/StreakHeatmap";
import { StickyBoard } from "../components/StickyBoard";
import { MetaDoDia } from "../components/MetaDoDia";
import { carregarHeatmap, type DiaHeatmap, type PeriodoFerias } from "../lib/multiApi";
import { getConcursoId } from "../lib/concurso";
import { useConcurso } from "../store/concurso";
import { META_DIARIA_DEFAULT } from "../config/prova";
import { ehDiaDeSimulado } from "../lib/agenda";
import { useMarcadas } from "../hooks/useMarcadas";
import { Paralaxe, Revelar, Toque } from "../components/Movimento";
import { TituloVivo } from "../components/TituloVivo";
import { PainelMalha } from "../components/PainelMalha";
import { useTheme } from "../store/theme";
import { Spinner } from "../components/Spinner";

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
  const { tema } = useTheme();
  const { ativo, activeId, refresh: recarregarConcursos } = useConcurso();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalToday | null>(null);
  const [editandoData, setEditandoData] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [salvandoMeta, setSalvandoMeta] = useState(false);
  const marcadas = useMarcadas();
  const [heatmap, setHeatmap] = useState<DiaHeatmap[]>([]);
  const [periodosFerias, setPeriodosFerias] = useState<PeriodoFerias[]>([]);

  // Depende de activeId: na primeira carga o concurso ativo pode ainda não estar
  // resolvido (o provider busca /concursos de forma assíncrona), e sem isso o heatmap
  // ficava vazio para sempre — o efeito rodava uma vez só, com a lista ainda em branco.
  // Também faz o painel reagir à troca de concurso.
  useEffect(() => {
    api<GoalToday>("/goals/today").then(setGoal).catch(() => null);
  }, [activeId]);

  useEffect(() => {
    const cid = activeId ?? getConcursoId();
    if (!cid) return;
    // Data local, não UTC: o backend interpreta from/to como `${data}T00:00:00` no fuso
    // dele e filtra com `lte`, então mandar a data de hoje corta o dia inteiro de hoje —
    // era isso que zerava a sequência e comia as questões de hoje do total. Fechamos em
    // amanhã, que inclui todo o dia corrente.
    const diaLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - 371 * 864e5);
    const fim = new Date(hoje.getTime() + 864e5);
    carregarHeatmap(cid, diaLocal(inicio), diaLocal(fim))
      .then((r) => {
        setHeatmap(r.dias);
        setPeriodosFerias(r.periodos);
      })
      .catch(() => null);
  }, [activeId]);

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

  // A data vale para o concurso ativo (é dele que o dashboard lê a contagem e a barra
  // de tempo). Sem concursoId a edição gravaria só no usuário e não teria efeito.
  async function salvarData(valor: string) {
    if (!valor) return;
    setSalvandoData(true);
    try {
      await api("/goals/prova", {
        method: "PATCH",
        body: { dataProva: valor, concursoId: getConcursoId() ?? undefined },
      });
      const atualizado = await api<GoalToday>("/goals/today");
      setGoal(atualizado);
      await recarregarConcursos();
      setEditandoData(false);
    } finally {
      setSalvandoData(false);
    }
  }

  async function salvarMeta(valor: number) {
    if (!Number.isFinite(valor) || valor < 1 || valor > 500) return;
    setSalvandoMeta(true);
    try {
      const res = await api<{ metaDiaria: number }>("/goals/meta", {
        method: "PATCH",
        body: { metaDiaria: valor, concursoId: getConcursoId() ?? undefined },
      });
      setGoal((g) => (g ? { ...g, meta: res.metaDiaria } : g));
      await recarregarConcursos();
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
      {/* 1. Cabeçalho (com paralaxe leve: desliza um pouco mais devagar que a rolagem) */}
      <Paralaxe distancia={14}>
        <header className="sobre-fundo">
        <p className="legenda text-[11px] font-bold uppercase tracking-[.18em] text-faint">{dataFmt}</p>
        <TituloVivo texto={`${saudacao}, ${usuario?.nome ?? ""}`} tamanho={42} className="mt-1 leading-none" />
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
      </Paralaxe>

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
        <BrilhoBorda animated className="h-full" glowRadius={40}>
          {/* Abaixo de sm o anel sobe para cima do texto (mesmo desenho do cartão da
              matéria do dia): lado a lado, a coluna de texto ficava com ~145px e o título
              quebrava palavra a palavra. */}
          <div className="flex flex-1 flex-col items-center gap-6 p-6 text-center sm:flex-row sm:items-center sm:gap-7 sm:p-8 sm:text-left">
          {/* key: o anel remonta quando /goals/today chega. Assim ele desenha a partir do
              valor real e a referência da comemoração nasce com a meta já batida (ou não) —
              antes, todo F5 com a meta cumprida disparava a comemoração de novo. */}
          <ProgressRing key={goal ? "pronto" : "carregando"} valor={respondidas} meta={meta} size={148} />
          <div className="w-full min-w-0 flex-1 space-y-2.5">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Meta diária</p>
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
                {cumpriuHoje && (
                  <span className="selo-meta">
                    <Trophy size={13} strokeWidth={2.4} />
                    Meta do dia concluída
                  </span>
                )}
                <p className="font-display text-[24px] font-bold leading-[1.15] text-brand-ink sm:text-[28px]">
                  {cumpriuHoje ? "Meta batida" : `Faltam ${faltamMeta} ${faltamMeta === 1 ? "questão" : "questões"}`}
                </p>
                <p className="text-[15px] leading-relaxed text-muted">
                  {cumpriuHoje
                    ? `Você fez ${respondidas} de ${meta} hoje. Tudo daqui pra frente é vantagem.`
                    : "Cada questão te aproxima da ofensiva de hoje."}
                </p>

                {/* Fecha o dia: como foi, não só quanto. Sem isto o cartão ficava com
                    um título e um botão dentro de uma caixa alta e vazia. */}
                <div className="mt-1 flex flex-wrap items-stretch justify-center gap-x-6 gap-y-3 border-t border-hair pt-3 sm:justify-start">
                  <MiniDado rotulo="acertos" valor={acertosHoje} cor="var(--goodText)" />
                  <MiniDado rotulo="erros" valor={errosHoje} cor="var(--accentText)" />
                  <MiniDado
                    rotulo={streak === 1 ? "dia de ofensiva" : "dias de ofensiva"}
                    valor={streak}
                    icone={<Flame size={14} strokeWidth={2.4} />}
                  />
                </div>

                <button onClick={continuarEstudando} className="btn-primary mt-2 inline-flex items-center gap-2 text-base">
                  {cumpriuHoje ? "Seguir treinando" : "Continuar estudando"}
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </>
            )}
          </div>
          </div>
        </BrilhoBorda>

        {/* Coluna direita empilhada */}
        <div className="space-y-5">
          {/* Contagem para a prova (no Cyberpunk, painel com malha elástica) */}
          <Cartao malha={tema === "cyberpunk"} className="p-6">
            <div className="flex items-start justify-between">
              <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Contagem para a prova</p>
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
                    {diasProva == null ? "?" : <Contador valor={diasProva} fontSize={38} cor="var(--text)" fontWeight={700} />}
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
          </Cartao>

          {/* Progresso no banco */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <p className="legenda text-[11px] font-bold uppercase tracking-[.16em] text-faint">Seu progresso no banco</p>
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

      {/* 4. Meta fixa do dia (rodízio por matéria, seg→sex). Fica logo abaixo do anel:
             são as duas metas do dia, a livre e a dirigida. */}
      <MetaDoDia />

      {/* 5. Heatmap anual */}
      <StreakHeatmap
        dias={heatmap}
        periodos={periodosFerias}
        feriasAtivo={feriasAtivo}
        onToggleFerias={(v) => alternarFerias(v)}
        meta={meta}
        streakAtual={goal ? streak : undefined}
      />

      {/* 5. Banner de revisão pendente. Cartão OPACO como os demais blocos: com o fundo
             translúcido de antes (var(--accentBg)) o relevo/pixels do tema atravessavam a
             faixa inteira e ela lia como um borrão colorido logo acima do mural. */}
      {revisaoPendente > 0 && (
        <Link
          to="/revisar?modo=srs"
          className="card card-hover flex items-center gap-4 p-5"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--accent)" }}
        >
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl" style={{ background: "var(--accentBg)", color: "var(--accentText)" }}>
            <CalendarClock size={24} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-brand-ink">
              {revisaoPendente} {revisaoPendente === 1 ? "questão pronta" : "questões prontas"} para revisar
            </p>
            <p className="text-sm text-muted">Revisão espaçada: cada uma volta no dia em que você ia esquecer.</p>
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
          <ModoCard malha={tema === "cyberpunk"} to="/estudar" icon={BookOpen} titulo="Estudar" sub="Feedback imediato + anotações" />
          <ModoCard malha={tema === "cyberpunk"} to="/revisar" icon={RefreshCw} titulo="Revisão espaçada" sub="A questão certa, no dia certo" />
          <ModoCard malha={tema === "cyberpunk"} to="/caderno" icon={NotebookPen} titulo="Caderno" sub="Anotações por matéria" />
          <ModoCard
            malha={tema === "cyberpunk"}
            to="/simulado"
            icon={FileText}
            titulo="Simulado"
            sub={diaSimulado ? "70 questões, prova real" : "Disponível aos sábados"}
            locked={!diaSimulado}
          />
        </div>
      </div>

      {/* 8. Atalhos em destaque: a fila manual de marcadas e o painel por prova.
             As "questões com anotações" saíram — o Caderno assumiu esse papel e o botão
             só competia por atenção com as duas coisas que eu realmente abro daqui. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Revelar>
          <Toque className="h-full">
            <Link
              to="/marcadas"
              className="card flex h-full items-center gap-4 p-5"
              aria-label={`Marcadas para revisar: ${marcadas.ids.size} questões`}
            >
              <div
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl"
                style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
              >
                <Bookmark size={22} strokeWidth={2} fill="currentColor" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-brand-ink">Marcadas para revisar</p>
                <p className="text-sm text-muted">
                  {marcadas.carregando ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner tamanho={14} />
                      Carregando…
                    </span>
                  ) : marcadas.ids.size === 0
                    ? "Nada marcado — use o marcador durante o estudo"
                    : `${marcadas.ids.size} ${marcadas.ids.size === 1 ? "questão separada" : "questões separadas"} por você`}
                </p>
              </div>
              <ArrowUpRight size={18} strokeWidth={2.2} className="flex-shrink-0 text-faint" />
            </Link>
          </Toque>
        </Revelar>

        <Revelar atraso={0.06}>
          <Toque className="h-full">
            <Link to="/provas" className="card flex h-full items-center gap-4 p-5">
              <div
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl"
                style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
              >
                <ClipboardList size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-brand-ink">Provas e origens</p>
                <p className="text-sm text-muted">Acertos, erros e o que falta em cada prova</p>
              </div>
              <ArrowUpRight size={18} strokeWidth={2.2} className="flex-shrink-0 text-faint" />
            </Link>
          </Toque>
        </Revelar>

        {/* O acervo é compartilhado: dá para ver como você está indo perto de quem
            estuda a mesma trilha. */}
        <Revelar atraso={0.12}>
          <Toque className="h-full">
            <Link to="/ranking" className="card flex h-full items-center gap-4 p-5">
              <div
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl"
                style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
              >
                <Trophy size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-brand-ink">Ranking da trilha</p>
                <p className="text-sm text-muted">Quem mais acerta entre quem segue a trilha</p>
              </div>
              <ArrowUpRight size={18} strokeWidth={2.2} className="flex-shrink-0 text-faint" />
            </Link>
          </Toque>
        </Revelar>
      </div>
    </div>
  );
}

// Número pequeno com rótulo, para a linha de fechamento do cartão da meta.
function MiniDado({
  rotulo,
  valor,
  cor,
  icone,
}: {
  rotulo: string;
  valor: number;
  cor?: string;
  icone?: React.ReactNode;
}) {
  return (
    <div className="leading-none">
      <p
        className="flex items-center gap-1.5 font-display text-xl font-bold"
        style={{ color: cor ?? "var(--text)" }}
      >
        {icone}
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-faint">{rotulo}</p>
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
      <p className="legenda text-[10px] font-bold uppercase tracking-[.14em] text-faint">{rotulo}</p>
      <p className="mt-2 font-display font-bold leading-none" style={{ fontSize: 34 }}>
        <Contador valor={valor} fontSize={34} cor={cor ?? "var(--text)"} fontWeight={700} />
      </p>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

// Cartão comum ou, no Cyberpunk, com a malha elástica de fundo.
function Cartao({ malha, className, children }: { malha: boolean; className: string; children: React.ReactNode }) {
  if (malha) return <PainelMalha conteudoClassName={className}>{children}</PainelMalha>;
  return <div className={`card ${className}`}>{children}</div>;
}

function ModoCard({
  to,
  icon: Icon,
  titulo,
  sub,
  locked = false,
  malha = false,
}: {
  to: string;
  icon: typeof BookOpen;
  titulo: string;
  sub: string;
  locked?: boolean;
  malha?: boolean;
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
  const link = (
    <Link to={to} className="flex h-full flex-col p-5">
      {conteudo}
    </Link>
  );
  if (malha) return <PainelMalha className="h-full">{link}</PainelMalha>;
  return (
    <BrilhoBorda className="h-full" glowRadius={26} fillOpacity={0.38}>
      {link}
    </BrilhoBorda>
  );
}
