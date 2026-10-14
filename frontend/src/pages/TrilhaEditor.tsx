// Criar e editar uma trilha da comunidade: dados da trilha, questões (uma a uma pelo
// formulário ou várias por JSON colado) e visibilidade. Só o dono chega aqui; o servidor
// confere de novo em cada escrita. O texto das questões é texto puro: o app nunca o
// injeta como HTML.
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, FileText, Globe, Lock, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { ApiError } from "../lib/api";
import {
  LETRAS,
  adicionarQuestoes,
  apagarTrilha,
  carregarEdicao,
  criarTrilha,
  editarQuestao,
  excluirQuestao,
  listarTrilhas,
  salvarTrilha,
  type DadosTrilha,
  type EdicaoTrilha,
  type Letra,
  type QuestaoEditavel,
} from "../lib/trilhas";
import { useConcurso } from "../store/concurso";
import { useQuestoes } from "../store/questoes";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Carregando } from "../components/Spinner";

const campo = "mt-1.5 block w-full rounded-xl border border-hair bg-surface px-3.5 py-2.5 text-brand-ink";
const rotulo = "block text-sm text-muted";

const erroDe = (err: unknown, padrao: string) => {
  if (err instanceof ApiError) {
    // Erro de validação do zod: mostra o primeiro detalhe, que diz o campo.
    const det = (err.body as { detalhes?: Record<string, string[]> } | undefined)?.detalhes;
    const primeiro = det && Object.values(det).flat()[0];
    return primeiro ? `${err.message}: ${primeiro}` : err.message;
  }
  return err instanceof Error ? err.message : padrao;
};

const TRILHA_VAZIA: DadosTrilha = {
  nome: "",
  cargo: "",
  banca: "",
  orgao: "",
  ano: new Date().getFullYear(),
  descricao: "",
  dataProva: null,
  visibilidade: "publica",
};

const QUESTAO_VAZIA: QuestaoEditavel = {
  materia: "",
  assunto: "",
  dificuldade: "media",
  enunciado: "",
  alternativas: { A: "", B: "", C: "", D: "", E: "" },
  gabarito: "A",
  explicacao: "",
};

// Alternativas vazias saem: dá para escrever questão de 2 a 5 alternativas no mesmo form.
function limparQuestao(q: QuestaoEditavel): QuestaoEditavel {
  const alternativas = Object.fromEntries(
    LETRAS.filter((l) => q.alternativas[l]?.trim()).map((l) => [l, q.alternativas[l]!.trim()])
  ) as Partial<Record<Letra, string>>;
  return { ...q, alternativas };
}

const EXEMPLO_JSON = `[
  {
    "materia": "Língua Portuguesa",
    "assunto": "Crase",
    "dificuldade": "media",
    "enunciado": "Assinale a alternativa em que o uso da crase está correto.",
    "alternativas": { "A": "Fui à pé.", "B": "Cheguei à uma hora.", "C": "Refiro-me à diretora." },
    "gabarito": "C",
    "explicacao": "Referir-se pede a preposição 'a' e diretora aceita artigo."
  }
]`;

function Bloco({ titulo, children, direita }: { titulo: string; children: ReactNode; direita?: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">{titulo}</h2>
        {direita}
      </div>
      {children}
    </section>
  );
}

function Mensagem({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`mt-3 text-sm font-semibold ${ok ? "text-brand-700" : "text-[color:rgb(var(--danger-from))]"}`}
    >
      {texto}
    </p>
  );
}

export function TrilhaEditor() {
  const { id } = useParams<{ id: string }>();
  const nova = !id;
  const navigate = useNavigate();
  const { setAtivo, refresh: recarregarConcursos } = useConcurso();
  const { recarregar: recarregarQuestoes } = useQuestoes();

  const [edicao, setEdicao] = useState<EdicaoTrilha | null>(null);
  const [podePrivadaNova, setPodePrivadaNova] = useState(false);
  const [podeCriar, setPodeCriar] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<DadosTrilha>(TRILHA_VAZIA);
  const [msgDados, setMsgDados] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) {
      const { criacao } = await listarTrilhas();
      setPodePrivadaNova(criacao.podePrivada);
      setPodeCriar(criacao.podeCriar);
      return;
    }
    const e = await carregarEdicao(id);
    setEdicao(e);
    setDados({ ...e.trilha });
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    carregar()
      .catch(() => setMsgDados({ ok: false, texto: "Não foi possível carregar a trilha." }))
      .finally(() => setCarregando(false));
  }, [carregar]);

  const podePrivada = nova ? podePrivadaNova : !!edicao?.podePrivada;
  const set = <K extends keyof DadosTrilha>(k: K, v: DadosTrilha[K]) => setDados((d) => ({ ...d, [k]: v }));

  async function salvarDados(e: FormEvent) {
    e.preventDefault();
    setMsgDados(null);
    setSalvando(true);
    try {
      if (nova) {
        const r = await criarTrilha(dados);
        // Entra na trilha recém-criada: o concurso ativo precisa estar salvo antes do
        // refresh, senão a lista escolhe outro ativo sozinha (mesma regra de Trilhas).
        setAtivo(r.concurso.id);
        await recarregarConcursos();
        navigate(`/trilhas/${r.trilha.id}/editar`, { replace: true });
      } else {
        await salvarTrilha(id!, dados);
        await recarregarConcursos();
        setMsgDados({ ok: true, texto: "Dados salvos." });
      }
    } catch (err) {
      setMsgDados({ ok: false, texto: erroDe(err, "Não foi possível salvar") });
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!id || !window.confirm("Apagar a trilha e todas as questões dela? Não dá para desfazer.")) return;
    try {
      await apagarTrilha(id);
      await recarregarConcursos();
      navigate("/trilhas");
    } catch (err) {
      setMsgDados({ ok: false, texto: erroDe(err, "Não foi possível apagar") });
    }
  }

  // Depois de mexer nas questões: relê a edição e o acervo servido ao app.
  const aposMudarQuestoes = useCallback(async () => {
    await carregar();
    await recarregarQuestoes();
  }, [carregar, recarregarQuestoes]);

  if (carregando) return <Carregando className="h-full min-h-[50vh]" />;

  if (nova && !podeCriar) {
    return (
      <div className="fadeup mx-auto max-w-md pt-10">
        <div className="card p-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Crown size={22} strokeWidth={2} />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-brand-ink">Você já criou sua trilha</h2>
          <p className="mt-2 text-sm text-muted">
            No plano Free dá para criar 1 trilha pública. Com o Premium você cria quantas quiser, públicas ou privadas.
          </p>
          <Link
            to="/assinatura"
            className="botao-primario mt-5 inline-block rounded-2xl bg-brand-500 px-6 py-3 font-display font-extrabold text-[color:var(--onAccent)]"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fadeup mx-auto max-w-3xl space-y-5 pt-4 pb-14">
      <Link to="/trilhas" className="sobre-fundo inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand-ink">
        <ArrowLeft size={16} /> Trilhas
      </Link>
      <PageHeader
        rotulo={nova ? "Nova trilha" : "Sua trilha"}
        titulo={nova ? "Criar trilha" : dados.nome || "Trilha"}
        subtitulo={
          nova
            ? "Monte o banco de questões do seu concurso. Depois de criar, você adiciona as questões."
            : undefined
        }
      />

      <Bloco titulo="Dados da trilha">
        <form onSubmit={salvarDados} className="grid gap-4 sm:grid-cols-2">
          <label className={rotulo}>
            Concurso ou órgão
            <input required maxLength={60} placeholder="Banco do Brasil" value={dados.nome} onChange={(e) => set("nome", e.target.value)} className={campo} />
          </label>
          <label className={rotulo}>
            Cargo
            <input required maxLength={80} placeholder="Escriturário" value={dados.cargo} onChange={(e) => set("cargo", e.target.value)} className={campo} />
          </label>
          <label className={rotulo}>
            Banca
            <input maxLength={40} placeholder="Cesgranrio" value={dados.banca} onChange={(e) => set("banca", e.target.value)} className={campo} />
          </label>
          <label className={rotulo}>
            Órgão
            <input maxLength={80} value={dados.orgao} onChange={(e) => set("orgao", e.target.value)} className={campo} />
          </label>
          <label className={rotulo}>
            Ano
            <input type="number" min={2000} max={2100} value={dados.ano} onChange={(e) => set("ano", Number(e.target.value))} className={campo} />
          </label>
          <label className={rotulo}>
            Data da prova (se já saiu)
            <input type="date" value={dados.dataProva ?? ""} onChange={(e) => set("dataProva", e.target.value || null)} className={campo} />
          </label>
          <label className={`${rotulo} sm:col-span-2`}>
            Descrição
            <textarea maxLength={600} rows={3} value={dados.descricao} onChange={(e) => set("descricao", e.target.value)} className={campo} />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm text-muted">Quem pode ver</legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              <OpcaoVisibilidade
                ativa={dados.visibilidade === "publica"}
                onClick={() => set("visibilidade", "publica")}
                icone={<Globe size={18} />}
                titulo="Pública"
                texto="Aparece na lista de trilhas para todo mundo estudar."
              />
              <OpcaoVisibilidade
                ativa={dados.visibilidade === "privada"}
                onClick={() => podePrivada && set("visibilidade", "privada")}
                bloqueada={!podePrivada}
                icone={<Lock size={18} />}
                titulo="Privada"
                texto={podePrivada ? "Só você vê e estuda." : "Recurso Premium."}
              />
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" size="sm" disabled={salvando}>
              {salvando ? "Salvando…" : nova ? "Criar trilha" : "Salvar dados"}
            </Button>
            {!nova && (
              <button type="button" onClick={apagar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-[color:rgb(var(--danger-from))]">
                <Trash2 size={15} /> Apagar trilha
              </button>
            )}
          </div>
          {msgDados && <div className="sm:col-span-2"><Mensagem {...msgDados} /></div>}
        </form>
      </Bloco>

      {edicao && <Questoes trilhaId={edicao.trilha.id} edicao={edicao} aoMudar={aposMudarQuestoes} />}
    </div>
  );
}

function OpcaoVisibilidade({
  ativa,
  bloqueada,
  onClick,
  icone,
  titulo,
  texto,
}: {
  ativa: boolean;
  bloqueada?: boolean;
  onClick: () => void;
  icone: ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueada}
      aria-pressed={ativa}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
        ativa ? "border-brand-500 bg-brand-100/60" : "border-hair hover:border-brand-500/50"
      } ${bloqueada ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span className={ativa ? "text-brand-500" : "text-faint"}>{icone}</span>
      <span>
        <span className="flex items-center gap-1.5 font-bold text-brand-ink">
          {titulo} {bloqueada && <Crown size={13} className="text-brand-500" />}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{texto}</span>
      </span>
    </button>
  );
}

function Questoes({ trilhaId, edicao, aoMudar }: { trilhaId: string; edicao: EdicaoTrilha; aoMudar: () => Promise<void> }) {
  const [editando, setEditando] = useState<number | "nova" | null>(edicao.questoes.length === 0 ? "nova" : null);
  const [modo, setModo] = useState<"lista" | "json">("lista");
  const total = edicao.questoes.length;
  const faltamVitrine = Math.max(0, edicao.minQuestoesVitrine - total);
  const materias = useMemo(() => [...new Set(edicao.questoes.map((q) => q.materia))].sort(), [edicao.questoes]);

  async function excluir(qid: number) {
    if (!window.confirm("Excluir esta questão? As respostas dadas a ela também somem.")) return;
    await excluirQuestao(trilhaId, qid);
    await aoMudar();
  }

  return (
    <Bloco
      titulo={`Questões · ${total}`}
      direita={
        <div className="flex gap-1 rounded-xl border border-hair p-0.5 text-xs font-bold">
          <button type="button" onClick={() => setModo("lista")} className={`rounded-lg px-2.5 py-1 ${modo === "lista" ? "bg-brand-500 text-[color:var(--onAccent)]" : "text-muted"}`}>
            Uma a uma
          </button>
          <button type="button" onClick={() => setModo("json")} className={`rounded-lg px-2.5 py-1 ${modo === "json" ? "bg-brand-500 text-[color:var(--onAccent)]" : "text-muted"}`}>
            Colar JSON
          </button>
        </div>
      }
    >
      {edicao.trilha.visibilidade === "publica" && faltamVitrine > 0 && (
        <p className="mb-4 rounded-xl bg-brand-100/60 px-3.5 py-2.5 text-sm text-brand-700">
          Faltam {faltamVitrine} {faltamVitrine === 1 ? "questão" : "questões"} para a trilha aparecer na lista pública.
          Até lá, só você a vê.
        </p>
      )}

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-hair px-3.5 py-3 text-sm text-faint">
        <FileText size={18} className="flex-shrink-0" />
        <span>
          <strong className="text-muted">Importar prova em PDF com IA</strong> — em breve. Você manda o PDF da prova e do
          gabarito, e as questões entram aqui sozinhas.
        </span>
      </div>

      {modo === "json" ? (
        <ImportarJson trilhaId={trilhaId} aoMudar={aoMudar} />
      ) : (
        <>
          {editando === "nova" ? (
            <FormQuestao
              materias={materias}
              onCancelar={total > 0 ? () => setEditando(null) : undefined}
              onSalvar={async (q) => {
                await adicionarQuestoes(trilhaId, [q]);
                await aoMudar();
              }}
              manterAberto
            />
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditando("nova")}>
              <span className="inline-flex items-center gap-1.5"><Plus size={16} /> Adicionar questão</span>
            </Button>
          )}

          <ol className="mt-5 space-y-2">
            {edicao.questoes
              .slice()
              .reverse()
              .map((q, i) =>
                editando === q.id ? (
                  <li key={q.id}>
                    <FormQuestao
                      inicial={q}
                      materias={materias}
                      onCancelar={() => setEditando(null)}
                      onSalvar={async (nova) => {
                        await editarQuestao(trilhaId, q.id, nova);
                        await aoMudar();
                        setEditando(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={q.id} className="flex items-start gap-3 rounded-xl border border-hair px-3.5 py-3">
                    <span className="mt-0.5 w-7 flex-shrink-0 text-xs font-bold tabular-nums text-faint">{total - i}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
                        {q.materia} · {q.assunto} · gabarito {q.gabarito}
                      </p>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-brand-ink">{q.enunciado}</p>
                    </div>
                    <button type="button" aria-label="Editar questão" onClick={() => setEditando(q.id)} className="p-1 text-faint hover:text-brand-500">
                      <Pencil size={16} />
                    </button>
                    <button type="button" aria-label="Excluir questão" onClick={() => excluir(q.id)} className="p-1 text-faint hover:text-[color:rgb(var(--danger-from))]">
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              )}
          </ol>
        </>
      )}
    </Bloco>
  );
}

function FormQuestao({
  inicial,
  materias,
  onSalvar,
  onCancelar,
  manterAberto,
}: {
  inicial?: QuestaoEditavel;
  materias: string[];
  onSalvar: (q: QuestaoEditavel) => Promise<void>;
  onCancelar?: () => void;
  manterAberto?: boolean; // ao adicionar: limpa e segue no form para a próxima questão
}) {
  const [q, setQ] = useState<QuestaoEditavel>(() =>
    inicial ? { ...inicial, alternativas: { ...QUESTAO_VAZIA.alternativas, ...inicial.alternativas } } : QUESTAO_VAZIA
  );
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const set = <K extends keyof QuestaoEditavel>(k: K, v: QuestaoEditavel[K]) => setQ((x) => ({ ...x, [k]: v }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpa = limparQuestao(q);
    if (Object.keys(limpa.alternativas).length < 2) return setMsg({ ok: false, texto: "Preencha pelo menos 2 alternativas." });
    if (!limpa.alternativas[limpa.gabarito]) return setMsg({ ok: false, texto: "O gabarito marcado está sem texto." });
    setMsg(null);
    setOcupado(true);
    try {
      await onSalvar(limpa);
      if (manterAberto) {
        // Mantém matéria e assunto: quem cadastra uma prova costuma fazer várias seguidas.
        setQ({ ...QUESTAO_VAZIA, materia: q.materia, assunto: q.assunto, dificuldade: q.dificuldade });
        setMsg({ ok: true, texto: "Questão adicionada. Pode escrever a próxima." });
      }
    } catch (err) {
      setMsg({ ok: false, texto: erroDe(err, "Não foi possível salvar a questão") });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-xl border border-hair p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={rotulo}>
          Matéria
          <input required maxLength={80} list="materias-trilha" value={q.materia} onChange={(e) => set("materia", e.target.value)} className={campo} />
          <datalist id="materias-trilha">
            {materias.map((m) => <option key={m} value={m} />)}
          </datalist>
        </label>
        <label className={rotulo}>
          Assunto
          <input maxLength={120} value={q.assunto} onChange={(e) => set("assunto", e.target.value)} className={campo} />
        </label>
        <label className={rotulo}>
          Dificuldade
          <select value={q.dificuldade} onChange={(e) => set("dificuldade", e.target.value as QuestaoEditavel["dificuldade"])} className={campo}>
            <option value="facil">Fácil</option>
            <option value="media">Média</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>
      </div>
      <label className={rotulo}>
        Enunciado
        <textarea required maxLength={6000} rows={4} value={q.enunciado} onChange={(e) => set("enunciado", e.target.value)} className={campo} />
      </label>
      <fieldset>
        <legend className="text-sm text-muted">Alternativas (marque a certa; deixe em branco as que não existem)</legend>
        <div className="mt-1.5 space-y-2">
          {LETRAS.map((l) => (
            <div key={l} className="flex items-center gap-2">
              <label className="flex flex-shrink-0 items-center gap-1.5 text-sm font-bold text-brand-ink">
                <input type="radio" name="gabarito" checked={q.gabarito === l} onChange={() => set("gabarito", l)} className="accent-[color:var(--accent)]" />
                {l}
              </label>
              <input
                maxLength={1500}
                aria-label={`Alternativa ${l}`}
                value={q.alternativas[l] ?? ""}
                onChange={(e) => set("alternativas", { ...q.alternativas, [l]: e.target.value })}
                className="block w-full rounded-xl border border-hair bg-surface px-3.5 py-2 text-brand-ink"
              />
            </div>
          ))}
        </div>
      </fieldset>
      <label className={rotulo}>
        Explicação (opcional)
        <textarea maxLength={6000} rows={2} value={q.explicacao} onChange={(e) => set("explicacao", e.target.value)} className={campo} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={ocupado}>
          {ocupado ? "Salvando…" : inicial ? "Salvar questão" : "Adicionar questão"}
        </Button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="text-sm font-semibold text-muted hover:text-brand-ink">
            Cancelar
          </button>
        )}
      </div>
      {msg && <Mensagem {...msg} />}
    </form>
  );
}

function ImportarJson({ trilhaId, aoMudar }: { trilhaId: string; aoMudar: () => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function importar() {
    setMsg(null);
    let lista: unknown;
    try {
      lista = JSON.parse(texto);
    } catch {
      return setMsg({ ok: false, texto: "Isso não é um JSON válido. Confira vírgulas e aspas." });
    }
    // Aceita a lista direto ou o formato { "questoes": [...] } do importador.
    const questoes = Array.isArray(lista) ? lista : (lista as { questoes?: unknown })?.questoes;
    if (!Array.isArray(questoes) || questoes.length === 0) {
      return setMsg({ ok: false, texto: "Esperava uma lista de questões, como no exemplo." });
    }
    if (questoes.length > 200) return setMsg({ ok: false, texto: "Mande no máximo 200 questões por vez." });
    setOcupado(true);
    try {
      const r = await adicionarQuestoes(trilhaId, questoes as QuestaoEditavel[]);
      await aoMudar();
      setTexto("");
      setMsg({ ok: true, texto: `${r.adicionadas} questões adicionadas.` });
    } catch (err) {
      setMsg({ ok: false, texto: erroDe(err, "Não foi possível importar") });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Cole uma lista de questões no formato abaixo (até 200 por vez). Campos obrigatórios: <code>materia</code>,{" "}
        <code>enunciado</code>, <code>alternativas</code> (de 2 a 5, letras A a E) e <code>gabarito</code>.
      </p>
      <details className="rounded-xl border border-hair px-3.5 py-2.5 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-ink">Ver exemplo</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre text-xs text-muted">{EXEMPLO_JSON}</pre>
      </details>
      <textarea
        rows={10}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="[ { &quot;materia&quot;: …, &quot;enunciado&quot;: … } ]"
        className={`${campo} font-mono text-xs`}
        spellCheck={false}
      />
      <Button size="sm" onClick={importar} disabled={ocupado || !texto.trim()}>
        <span className="inline-flex items-center gap-1.5"><Upload size={16} /> {ocupado ? "Importando…" : "Importar questões"}</span>
      </Button>
      {msg && <Mensagem {...msg} />}
    </div>
  );
}
