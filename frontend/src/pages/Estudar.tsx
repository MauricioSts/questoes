import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Questao, Modulo, Dificuldade } from "../types/questao";
import { filtrar, materias as listarMaterias, assuntos as listarAssuntos, getQuestoes } from "../lib/questoesRepo";
import { shuffle } from "../lib/sessionBuilder";
import { useProgresso } from "../hooks/useProgresso";
import { SessionRunner, type RespostaSessao } from "../components/SessionRunner";
import { ResumoSessao } from "../components/ResumoSessao";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import { FilterSelect } from "../components/FilterSelect";
import { getSessaoAtiva, salvarSessao, atualizarCursor, encerrarSessao } from "../lib/sessao";

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
  const [soNaoRespondidas, setSoNaoRespondidas] = useState(false);
  const [soErradas, setSoErradas] = useState(false);
  const [quantidade, setQuantidade] = useState(10);

  const materiasDisp = useMemo(() => listarMaterias(modulo || undefined), [modulo]);
  const assuntosDisp = useMemo(() => listarAssuntos(materia || undefined), [materia]);

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
        setParams({}, { replace: true }); // limpa o ?continuar da URL
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciar() {
    let pool = filtrar({
      modulo: modulo || undefined,
      materia: materia || undefined,
      assunto: assunto || undefined,
      dificuldade: dificuldade || undefined,
    });
    if (soNaoRespondidas) pool = pool.filter((q) => !progresso.respondidas.has(q.id));
    if (soErradas) pool = pool.filter((q) => progresso.erradas.has(q.id));
    const sel = shuffle(pool).slice(0, quantidade);
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
        <p className="text-faint">Retomando sua sessão…</p>
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
        permiteNota
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
    <div className="mx-auto max-w-[560px] space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <BookOpen size={24} className="text-brand-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-ink">Modo Estudo</h1>
          <p className="text-sm text-faint">Feedback imediato, explicação e anotações</p>
        </div>
      </div>

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
            { value: "I", label: "I — Gerais" },
            { value: "II", label: "II — Específicos" },
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
        </div>
      </Card>

      {/* Botão */}
      <Button onClick={iniciar} fullWidth size="lg">
        Começar sessão <ArrowRight size={20} strokeWidth={1.5} className="ml-2" />
      </Button>
    </div>
  );
}
