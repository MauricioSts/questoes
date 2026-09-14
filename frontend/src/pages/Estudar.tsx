import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Questao, Modulo, Dificuldade, Origem } from "../types/questao";
import {
  filtrar,
  materias as listarMaterias,
  assuntos as listarAssuntos,
  getQuestoes,
  provasComContagem,
} from "../lib/questoesRepo";
import { shuffle } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import { FilterSelect } from "../components/FilterSelect";
import { PageHeader } from "../components/PageHeader";
import { getSessaoAtiva, salvarSessao, atualizarCursor, encerrarSessao } from "../lib/sessao";
import { carregarMetaMateria, ordemDeEstudo } from "../lib/metaMateria";
import { Carregando } from "../components/Spinner";

export function Estudar() {
  const progresso = useProgresso();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sessao, setSessao] = useState<Questao[] | null>(null);
  const [cursorInicial, setCursorInicial] = useState(0);
  const [resultado, setResultado] = useState<RespostaSessao[] | null>(null);
  const [carregandoRetomar, setCarregandoRetomar] = useState(false);

  const [modulo, setModulo] = useState<Modulo | "">("");
  const [materia, setMateria] = useState("");
  const [assunto, setAssunto] = useState("");
  const [dificuldade, setDificuldade] = useState<Dificuldade | "">("");
  // Procedência: estudar só as questões de uma prova ("as da AMAZUL/FGV") ou só de um tipo
  // (autorais, adaptadas, de prova, geradas). Vêm pré-preenchidos quando a tela é aberta
  // pelos cartões de /provas.
  const [prova, setProva] = useState(params.get("prova") ?? "");
  const [origem, setOrigem] = useState<Origem | "">((params.get("origem") as Origem | null) ?? "");
  const [soNaoRespondidas, setSoNaoRespondidas] = useState(false);
  const [soErradas, setSoErradas] = useState(false);
  const [priorizarErradas, setPriorizarErradas] = useState(false);
  const [quantidade, setQuantidade] = useState(10);

  const materiasDisp = useMemo(() => listarMaterias(modulo || undefined), [modulo]);
  const assuntosDisp = useMemo(() => listarAssuntos(materia || undefined), [materia]);
  const provasDisp = useMemo(() => provasComContagem(), []);

  // Retomar sessão ativa quando vier de "Continuar estudando" (?continuar=1).
  useEffect(() => {
    if (params.get("continuar") !== "1") return;
    setCarregandoRetomar(true);
    getSessaoAtiva()
      .then((s) => {
        if (s && s.contexto === "ESTUDO" && s.cursor < s.questaoIds.length) {
          const qs = getQuestoes(s.questaoIds); // reconstrói na ordem salva
          if (qs.length > 0) {
            setCursorInicial(Math.min(s.cursor, qs.length - 1));
            setSessao(qs);
          }
        }
      })
      .finally(() => {
        setCarregandoRetomar(false);
        // Limpa só o ?continuar: prova/origem vêm de /provas e precisam sobreviver.
        setParams(
          (atual) => {
            const proximo = new URLSearchParams(atual);
            proximo.delete("continuar");
            return proximo;
          },
          { replace: true }
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meta fixa do dia (?meta=dia, vindo do cartão da Home): a sessão já vem montada com as
  // 10 questões que o backend sorteou para a matéria de hoje, sem passar pelos filtros,
  // porque a graça da meta fixa é não escolher.
  useEffect(() => {
    if (params.get("meta") !== "dia") return;
    setCarregandoRetomar(true);
    carregarMetaMateria()
      .then((m) => {
        const qs = getQuestoes(ordemDeEstudo(m));
        if (qs.length > 0) {
          setCursorInicial(0);
          setSessao(qs);
          void salvarSessao("ESTUDO", qs.map((q) => q.id), 0);
        }
      })
      .catch(() => null)
      .finally(() => {
        setCarregandoRetomar(false);
        setParams(
          (atual) => {
            const proximo = new URLSearchParams(atual);
            proximo.delete("meta");
            return proximo;
          },
          { replace: true }
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pool = tudo que bate com os filtros atuais. Calculado aqui (e não só ao começar) para
  // a tela dizer ANTES quantas questões existem: pedir 20 e receber 3 sem aviso é o jeito
  // mais rápido de achar que o filtro está quebrado.
  const pool = useMemo(() => {
    let lista = filtrar({
      modulo: modulo || undefined,
      materia: materia || undefined,
      assunto: assunto || undefined,
      dificuldade: dificuldade || undefined,
      origem: origem || undefined,
      prova: prova || undefined,
    });
    if (soNaoRespondidas) lista = lista.filter((q) => !progresso.respondidas.has(q.id));
    if (soErradas) lista = lista.filter((q) => progresso.erradas.has(q.id));
    return lista;
  }, [modulo, materia, assunto, dificuldade, origem, prova, soNaoRespondidas, soErradas, progresso]);

  async function iniciar() {
    // "Priorizar as que errei mais": as erradas vêm primeiro na seleção.
    let sel: Questao[];
    if (priorizarErradas) {
      const err = shuffle(pool.filter((q) => progresso.erradas.has(q.id)));
      const resto = shuffle(pool.filter((q) => !progresso.erradas.has(q.id)));
      sel = [...err, ...resto].slice(0, quantidade);
    } else {
      sel = shuffle(pool).slice(0, quantidade);
    }
    setResultado(null);
    setCursorInicial(0);
    setSessao(sel);
    // Persiste a nova sessão no backend (permite retomar depois).
    if (sel.length > 0) void salvarSessao("ESTUDO", sel.map((q) => q.id), 0);
  }

  function finalizar(rs: RespostaSessao[]) {
    setResultado(rs);
    setSessao(null);
    void encerrarSessao(); // sessão concluída → some do "Continuar estudando"
    progresso.recarregar();
  }

  if (resultado) {
    return <ResumoSessao respostas={resultado} onNovaSessao={() => setResultado(null)} />;
  }

  if (carregandoRetomar) {
    return (
      <div className="mx-auto max-w-[560px] p-6 text-center">
        <Carregando texto="Retomando sua sessão…" />
      </div>
    );
  }

  if (sessao) {
    if (sessao.length === 0) {
      return (
        <div className="mx-auto max-w-[560px] p-6 text-center">
          <p className="text-faint mb-6">Nenhuma questão bate com esses filtros.</p>
          <Button onClick={() => setSessao(null)} fullWidth>
            Voltar
          </Button>
        </div>
      );
    }
    return (
      <SessionRunner
        questoes={sessao}
        contexto="ESTUDO"
        feedbackImediato
        permiteCaderno
        permiteMarcar
        initialIndex={cursorInicial}
        onCursorChange={(i) => void atualizarCursor(i)}
        onSair={() => navigate("/")}
        onFinalizar={finalizar}
        onProgresso={() => {}}
      />
    );
  }

  return (
    <div className="fadeup mx-auto max-w-[680px] pt-2">
      <PageHeader
        rotulo="Modo estudo"
        titulo="Montar sessão"
        subtitulo="Feedback imediato, explicação e anotações a cada questão."
      />

      {/* Filtros */}
      <Card className="p-6 space-y-4">
        <FilterSelect
          label="Módulo"
          value={modulo}
          onChange={(v) => {
            setModulo(v as Modulo | "");
            setMateria("");
            setAssunto("");
          }}
          options={[
            { value: "", label: "Todos" },
            { value: "I", label: "I · Gerais" },
            { value: "II", label: "II · Específicos" },
          ]}
        />
        <FilterSelect
          label="Matéria"
          value={materia}
          onChange={(v) => {
            setMateria(v as string);
            setAssunto("");
          }}
          options={[
            { value: "", label: "Todas" },
            ...materiasDisp.map((m) => ({ value: m, label: m })),
          ]}
        />
        <FilterSelect
          label="Assunto"
          value={assunto}
          onChange={(v) => setAssunto(v as string)}
          options={[
            { value: "", label: "Todos" },
            ...assuntosDisp.map((a) => ({ value: a, label: a })),
          ]}
        />

        {/* Procedência: de que prova / que tipo de questão. Fica junto porque as duas
            perguntas são a mesma — "quero treinar exatamente este material". */}
        <div className="grid gap-4 border-t border-hair pt-4 sm:grid-cols-2">
          <FilterSelect
            label="Prova"
            value={prova}
            onChange={(v) => setProva(v as string)}
            options={[
              { value: "", label: "Todas as provas" },
              ...provasDisp.map((p) => ({ value: p.chave, label: `${p.rotulo} (${p.total})` })),
            ]}
          />
          <FilterSelect
            label="Tipo de questão"
            value={origem}
            onChange={(v) => setOrigem(v as Origem | "")}
            options={[
              { value: "", label: "Qualquer origem" },
              { value: "oficial", label: "De prova oficial" },
              { value: "adaptada", label: "Adaptada de prova" },
              { value: "gerada", label: "Gerada para reforço" },
              { value: "autoral", label: "Autoral" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FilterSelect
            label="Dificuldade"
            value={dificuldade}
            onChange={(v) => setDificuldade(v as Dificuldade | "")}
            options={[
              { value: "", label: "Qualquer" },
              { value: "facil", label: "Fácil" },
              { value: "media", label: "Média" },
              { value: "dificil", label: "Difícil" },
            ]}
          />
          <div>
            <label className="filter-label">Quantidade</label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="filter-select"
            />
          </div>
        </div>

        <div className="border-t border-hair pt-4 space-y-3">
          <Toggle
            checked={soNaoRespondidas}
            onChange={setSoNaoRespondidas}
            label="Só não respondidas"
          />
          <Toggle
            checked={soErradas}
            onChange={setSoErradas}
            label="Só erradas anteriormente"
            ariaLabel="Filtrar apenas questões respondidas incorretamente"
          />
          <Toggle
            checked={priorizarErradas}
            onChange={setPriorizarErradas}
            label="Priorizar as que errei mais"
            ariaLabel="Colocar as questões erradas antes na sessão"
          />
        </div>
      </Card>

      {/* Quantas questões o filtro alcança, antes de começar */}
      <p className="mt-5 text-center text-sm text-muted" aria-live="polite">
        {pool.length === 0 ? (
          <span className="text-danger-from">Nenhuma questão bate com esses filtros.</span>
        ) : (
          <>
            <b className="text-brand-ink">{pool.length}</b>{" "}
            {pool.length === 1 ? "questão disponível" : "questões disponíveis"} · a sessão vai usar{" "}
            <b className="text-brand-ink">{Math.min(quantidade, pool.length)}</b>
          </>
        )}
      </p>

      {/* Botão */}
      <Button onClick={iniciar} fullWidth size="lg" className="mt-3" disabled={pool.length === 0}>
        {/* inline-flex no conteúdo: sem isso a seta quebra para a linha de baixo no
            botão de largura total, porque o texto é centralizado como texto corrido. */}
        <span className="inline-flex items-center justify-center gap-2">
          Começar sessão <ArrowRight size={20} strokeWidth={1.5} />
        </span>
      </Button>
    </div>
  );
}
