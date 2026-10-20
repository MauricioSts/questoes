// Simulado das trilhas certo/errado: a prova sai do perfil da trilha (grupos, tamanho,
// tempo, pontuação), não da configuração por matéria do simulado de múltipla escolha.
// Usa a mesma prova folheável (ProvaCompleta): marcar de novo desmarca, e o que fica
// sem marca é branco.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, History, Play } from "lucide-react";
import { api } from "../lib/api";
import { todas, getQuestao, getQuestoes } from "../lib/questoesRepo";
import { montarResultado } from "../lib/correcao";
import { enviarLote } from "../lib/answers";
import { carregarProva, salvarProva, descartarProva, type ProvaEmAndamento } from "../lib/provaEmAndamento";
import {
  duracaoProporcional,
  formatarPontos,
  itensDaProva,
  itensDoGrupo,
  montarSimuladoCE,
  notaCE,
  type ComposicaoGrupo,
  type NotaCE,
  type NotaDisciplina,
  type NotaGrupo,
  type PerfilProva,
} from "../lib/notaCE";
import { useQuestoes } from "../store/questoes";
import type { RespostaSessao } from "./SessionRunner";
import { ProvaCompleta, type ProvaCompletaHandle } from "./ProvaCompleta";
import { Cronometro } from "./Cronometro";
import { ResultadoCE } from "./ResultadoCE";
import { PageHeader } from "./PageHeader";
import { Card } from "./Card";
import { Button } from "./Button";
import { Toggle } from "./Toggle";
import { Carregando } from "./Spinner";
import type { Alternativa, Questao } from "../types/questao";

type Fase = "intro" | "rodando" | "resultado";

interface ResultadoGuardado {
  id: string;
  createdAt: string;
  // resultados guardados antes do mínimo por disciplina não têm grupos[].disciplinas
  dados: Omit<NotaCE, "grupos"> & {
    grupos: (Omit<NotaGrupo, "disciplinas"> & { disciplinas?: NotaDisciplina[] })[];
    itens: { questaoId: number; marcada: "C" | "E" | null }[]; duracaoSegundos: number | null };
}

const formatarDuracao = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : `${min} min`;

export function SimuladoCE({ perfil, perfilId, concursoId }: { perfil: PerfilProva; perfilId: string; concursoId: string }) {
  const [fase, setFase] = useState<Fase>("intro");
  const [aba, setAba] = useState<"novo" | "anteriores">("novo");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [resultado, setResultado] = useState<RespostaSessao[]>([]);
  const [usarCronometro, setUsarCronometro] = useState(true);
  const [emAndamento, setEmAndamento] = useState<ProvaEmAndamento | null>(null);
  const [retomada, setRetomada] = useState<ProvaEmAndamento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const provaRef = useRef<ProvaCompletaHandle>(null);
  const estadoRef = useRef<{ marcadas: [number, Alternativa][]; tempos: [number, number][]; restante: number | null; iniciadaEm: number }>(
    { marcadas: [], tempos: [], restante: null, iniciadaEm: Date.now() }
  );
  const { total: totalBanco } = useQuestoes();

  // Prévia do que o acervo consegue montar (o sorteio de verdade é no "Iniciar").
  const composicao: ComposicaoGrupo[] = useMemo(
    () => montarSimuladoCE(todas(), perfil, () => 0).composicao,
    [perfil, totalBanco] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const nItens = composicao.reduce((s, g) => s + g.obtido, 0);
  const duracao = duracaoProporcional(perfil, nItens);

  useEffect(() => {
    const p = carregarProva();
    // Só retoma prova desta trilha: as questões precisam ser todas certo/errado.
    if (p && getQuestoes(p.questaoIds).every((q) => q.formato === "CERTO_ERRADO")) setEmAndamento(p);
  }, []);

  function guardar(ids: number[]) {
    const e = estadoRef.current;
    salvarProva({ questaoIds: ids, marcadas: e.marcadas, tempos: e.tempos, restanteSegundos: e.restante, iniciadaEm: e.iniciadaEm });
  }

  function iniciar() {
    const { questoes: qs } = montarSimuladoCE(todas(), perfil);
    setAviso(null);
    setQuestoes(qs);
    estadoRef.current = { marcadas: [], tempos: [], restante: usarCronometro && duracao ? duracao * 60 : null, iniciadaEm: Date.now() };
    setRetomada(null);
    setEmAndamento(null);
    guardar(qs.map((q) => q.id));
    setFase("rodando");
  }

  function retomar(p: ProvaEmAndamento) {
    const qs = getQuestoes(p.questaoIds);
    if (qs.length !== p.questaoIds.length) {
      setAviso("A prova guardada não bate mais com o banco de questões atual. Comece uma nova.");
      descartarProva();
      setEmAndamento(null);
      return;
    }
    estadoRef.current = { marcadas: p.marcadas, tempos: p.tempos, restante: p.restanteSegundos, iniciadaEm: p.iniciadaEm };
    setQuestoes(qs);
    setRetomada(p);
    setUsarCronometro(p.restanteSegundos != null);
    setFase("rodando");
  }

  async function finalizar(rs: RespostaSessao[]) {
    descartarProva();
    setEmAndamento(null);
    setRetomada(null);
    setResultado(rs);
    setFase("resultado");
    const marcadas = rs.filter((r) => r.marcada);
    if (marcadas.length) await enviarLote(marcadas.map((r) => montarResultado(r.questao, r.marcada!, "SIMULADO", r.tempoSegundos)));
    const nota = notaCE(
      perfil,
      rs.map((r) => ({
        grupo: r.questao.comando?.grupo ?? "",
        disciplina: r.questao.materia,
        marcada: r.marcada as "C" | "E" | undefined,
        acertou: r.acertou,
      }))
    );
    try {
      await api("/provas/resultados", {
        method: "POST",
        body: {
          concursoId,
          perfilProvaId: perfilId,
          dados: {
            ...nota,
            // -Infinity (grupo sem mínimo) não vira JSON
            minimo: Number.isFinite(nota.minimo) ? nota.minimo : 0,
            grupos: nota.grupos.map(({ nome: _nome, ...g }) => ({ ...g, minimo: Number.isFinite(g.minimo) ? g.minimo : 0 })),
            itens: rs.map((r) => ({ questaoId: r.questao.id, marcada: (r.marcada as "C" | "E" | undefined) ?? null })),
            duracaoSegundos: Math.round((Date.now() - estadoRef.current.iniciadaEm) / 1000),
          },
        },
      });
    } catch {
      /* sem conexão: a nota aparece, só não entra no histórico */
    }
  }

  if (fase === "resultado") return <ResultadoCE respostas={resultado} perfil={perfil} onSair={() => setFase("intro")} />;

  if (fase === "rodando") {
    return (
      <ProvaCompleta
        ref={provaRef}
        questoes={questoes}
        marcadasIniciais={retomada?.marcadas}
        temposIniciais={retomada?.tempos}
        onMudar={(marcadas, tempos) => {
          estadoRef.current.marcadas = marcadas;
          estadoRef.current.tempos = tempos;
          guardar(questoes.map((q) => q.id));
        }}
        onFinalizar={finalizar}
        onSair={() => {
          setEmAndamento(carregarProva());
          setFase("intro");
        }}
        cabecalho={
          usarCronometro && duracao ? (
            <Cronometro
              minutos={duracao}
              segundosIniciais={retomada?.restanteSegundos ?? undefined}
              onTick={(restante) => {
                estadoRef.current.restante = restante;
              }}
              onFim={() => provaRef.current?.finalizar()}
            />
          ) : null
        }
      />
    );
  }

  const { acerto, erro, branco } = perfil.pontuacao;
  return (
    <div className="fadeup mx-auto max-w-[820px] pt-2">
      <PageHeader
        rotulo="Simulado"
        titulo="Prova certo/errado"
        subtitulo={`Itens julgados C ou E, nota por grupo e mínimos do edital${perfil.cargo ? ` (${perfil.cargo})` : ""}. A correção só vem no fim.`}
      />
      <div className="mb-5 flex items-center gap-6 border-b border-hair">
        {([["novo", "Novo simulado"], ["anteriores", "Anteriores"]] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAba(val)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-display font-bold transition ${
              aba === val ? "border-brand-500 text-brand-ink" : "border-transparent text-faint hover:text-brand-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "anteriores" ? (
        <Anteriores concursoId={concursoId} perfil={perfil} />
      ) : (
        <div className="space-y-6">
          {emAndamento && (
            <Card className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <Play size={20} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent)" }} strokeWidth={2.2} />
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-brand-ink">Prova em andamento</h2>
                  <p className="mt-1 text-sm text-muted">
                    {emAndamento.marcadas.length} de {emAndamento.questaoIds.length} marcados
                    {emAndamento.restanteSegundos != null && ` · ${Math.floor(emAndamento.restanteSegundos / 60)} min de cronômetro`}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => retomar(emAndamento)}>Retomar prova</Button>
                <button
                  onClick={() => {
                    descartarProva();
                    setEmAndamento(null);
                  }}
                  className="tap rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:text-brand-500"
                >
                  Descartar
                </button>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
            <Card className="space-y-4 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-faint">Composição</p>
              <ul className="space-y-2 text-sm">
                {perfil.grupos.map((g) => {
                  const c = composicao.find((x) => x.grupo === g.grupo);
                  return (
                    <li key={g.grupo} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-brand-ink">
                        <b>{g.grupo}</b> · {g.nome}
                        {g.peso !== 1 && <span className="text-faint"> · peso {formatarPontos(g.peso)}</span>}
                      </span>
                      <span className="flex-shrink-0 tabular-nums text-muted">
                        {c?.obtido ?? 0} / {itensDoGrupo(g)} itens
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-faint">
                Acerto vale {formatarPontos(acerto)}, erro {formatarPontos(erro)}, branco {formatarPontos(branco)} (vezes o peso do grupo).
                {nItens < itensDaProva(perfil) &&
                  ` O acervo ainda não tem a prova inteira: o simulado sai com ${nItens} itens, e os mínimos e o tempo encolhem na mesma proporção.`}
              </p>
            </Card>
            <div className="space-y-4">
              <Card className="space-y-3 p-6 text-center">
                <Stat n={String(nItens)} label="itens" />
                {duracao && <Stat n={formatarDuracao(duracao)} label="cronômetro" />}
              </Card>
              {duracao && (
                <Card className="p-6">
                  <Toggle
                    checked={usarCronometro}
                    onChange={setUsarCronometro}
                    label={`Cronômetro de ${formatarDuracao(duracao)}`}
                    ariaLabel="Ativar cronômetro para simular o tempo da prova"
                  />
                </Card>
              )}
            </div>
          </div>

          {aviso && (
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)", color: "var(--accentText)" }}>
              {aviso}
            </div>
          )}

          <Button onClick={iniciar} disabled={nItens === 0} fullWidth size="lg">
            Iniciar simulado
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="font-display font-bold text-brand-ink" style={{ fontSize: 26 }}>{n}</span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-faint">{label}</span>
    </span>
  );
}

// Histórico: os resultados guardados; abrir um refaz a tela de resultado com os itens.
function Anteriores({ concursoId, perfil }: { concursoId: string; perfil: PerfilProva }) {
  const [lista, setLista] = useState<ResultadoGuardado[] | null>(null);
  const [aberto, setAberto] = useState<RespostaSessao[] | null>(null);

  useEffect(() => {
    api<{ resultados: ResultadoGuardado[] }>(`/provas/resultados?concursoId=${encodeURIComponent(concursoId)}`)
      .then((r) => setLista(r.resultados))
      .catch(() => setLista([]));
  }, [concursoId]);

  if (aberto) return <ResultadoCE respostas={aberto} perfil={perfil} onSair={() => setAberto(null)} />;
  if (!lista) return <Carregando />;
  if (lista.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-6 text-sm text-muted">
        <History size={18} className="flex-shrink-0" /> Nenhum simulado certo/errado feito ainda.
      </Card>
    );
  }

  function abrir(r: ResultadoGuardado) {
    const rs: RespostaSessao[] = [];
    for (const it of r.dados.itens) {
      const q = getQuestao(it.questaoId);
      if (!q) continue; // item excluído do acervo depois da prova
      rs.push({ questao: q, marcada: it.marcada ?? undefined, acertou: !!it.marcada && it.marcada === q.gabarito, tempoSegundos: 0 });
    }
    setAberto(rs);
  }

  return (
    <ul className="space-y-3">
      {lista.map((r) => (
        <li key={r.id}>
          <button onClick={() => abrir(r)} className="card tap flex w-full items-center gap-4 p-4 text-left">
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-brand-ink">
                {formatarPontos(r.dados.pontos)} / {formatarPontos(r.dados.maximo)} pontos ·{" "}
                <span className={r.dados.aprovado ? "text-acerto" : "text-erro"}>{r.dados.aprovado ? "aprovado" : "eliminado"}</span>
              </p>
              <p className="text-xs text-faint">
                {new Date(r.createdAt).toLocaleString("pt-BR")} · {r.dados.itens.length} itens ·{" "}
                {r.dados.grupos.map((g) => `${g.grupo} ${formatarPontos(g.pontos)}`).join(" · ")}
              </p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0 text-faint" />
          </button>
        </li>
      ))}
    </ul>
  );
}
