// Painel do Caderno que abre ao lado da questão, pela aba do SessionRunner.
//
// Por que existe: antes só dava para anotar DEPOIS de responder (o editor de nota
// da questão), o que é tarde demais — a anotação nasce enquanto se lê o enunciado
// e se descarta alternativa. Aqui o caderno da matéria da questão fica aberto ao
// lado, com o mesmo editor rico do Caderno, sem sair da sessão.
//
// Ele já entra filtrado pela matéria da questão e cria a primeira página daquela
// matéria com um clique quando ainda não existe nenhuma. "Citar questão" cola na
// página o enunciado (resumido) com o número da questão, para a anotação não perder
// de onde veio. No desktop a largura é ajustável pela borda esquerda e fica guardada.
//
// Layout: a partir de md ele é um elemento EM FLUXO (coluna ao lado da questão,
// sticky), não uma camada por cima — foi o erro da primeira versão, que usava
// `fixed` e só abria espaço a partir de xl, então em qualquer tela menor o painel
// tapava a questão inteira. Em md já cabem as duas colunas (a barra lateral do app
// só existe a partir de lg, então sobra largura). Abaixo de md vira uma folha
// ancorada embaixo com 58vh, altura medida para o enunciado continuar visível
// acima dela; as alternativas ficam cobertas, o que num celular não tem escapatória
// — daí o painel fechar com um toque.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PointerEventReact } from "react";
import { FileText, Plus, Quote, X } from "lucide-react";
import type { Questao } from "../types/questao";
import { useConcurso } from "../store/concurso";
import { materias as materiasDoRepo } from "../lib/questoesRepo";
import { EditorPagina } from "./EditorPagina";
import { Carregando } from "./Spinner";
import { listarPaginas, criarPagina, type PaginaCaderno } from "../lib/multiApi";

interface Props {
  questao: Questao;
  aberto: boolean;
  onFechar: () => void;
}

const LARGURA_MIN = 320;
const LARGURA_MAX = 760;
const CHAVE_LARGURA = "q_caderno_largura";

function larguraSalva() {
  try {
    const n = Number(localStorage.getItem(CHAVE_LARGURA));
    if (n >= LARGURA_MIN && n <= LARGURA_MAX) return n;
  } catch {
    /* sem armazenamento */
  }
  return 440;
}

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Bloco de citação: número + matéria e o enunciado cortado numa frase legível.
function citacao(q: Questao) {
  const texto = q.enunciado.replace(/\s+/g, " ").trim();
  const curto = texto.length > 280 ? `${texto.slice(0, 277).replace(/\s+\S*$/, "")}…` : texto;
  return `<blockquote><p><strong>Questão ${q.id} · ${escapar(q.materia)}</strong></p><p>${escapar(curto)}</p></blockquote><p><br></p>`;
}

export function CadernoDrawer({ questao, aberto, onFechar }: Props) {
  const materia = questao.materia;
  const { activeId } = useConcurso();
  const painel = useRef<HTMLElement>(null);
  const [largura, setLargura] = useState(larguraSalva);
  const [paginas, setPaginas] = useState<PaginaCaderno[]>([]);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [carregado, setCarregado] = useState(false);

  // Carrega só na primeira abertura: o painel é montado junto da questão e não
  // deve gastar requisição enquanto ninguém o abriu.
  useEffect(() => {
    if (!aberto || carregado || !activeId) return;
    setCarregando(true);
    listarPaginas(activeId)
      .then((r) => {
        setPaginas(r.paginas);
        setCarregado(true);
      })
      .catch(() => setCarregado(true))
      .finally(() => setCarregando(false));
  }, [aberto, carregado, activeId]);

  // Páginas da matéria da questão, em ordem estável (a lista do servidor vem por
  // updatedAt, o que faria as páginas pularem de lugar a cada tecla digitada).
  const daMateria = useMemo(
    () =>
      paginas
        .filter((p) => p.materia === materia)
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [paginas, materia]
  );

  // Ao trocar de questão (e portanto de matéria), reaponta para a página daquela matéria.
  useEffect(() => {
    setAtivaId((cur) => (cur && daMateria.some((p) => p.id === cur) ? cur : daMateria[0]?.id ?? null));
  }, [daMateria]);

  const materias = useMemo(() => {
    const set = new Set<string>(materiasDoRepo());
    for (const p of paginas) set.add(p.materia);
    set.add(materia);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [paginas, materia]);

  const ativa = daMateria.find((p) => p.id === ativaId) ?? null;

  const onSalvo = useCallback((p: PaginaCaderno) => {
    setPaginas((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  }, []);

  async function nova() {
    if (!activeId || criando) return;
    setCriando(true);
    try {
      const { pagina } = await criarPagina(activeId, materia);
      setPaginas((ps) => [...ps, pagina]);
      setAtivaId(pagina.id);
    } finally {
      setCriando(false);
    }
  }

  // Cola a citação como bloco logo depois do parágrafo onde está o cursor (sem cursor
  // no editor, no fim da página). Montada no DOM e não por insertHTML, que fundia a
  // primeira linha da citação no parágrafo do cursor. O botão não rouba o foco
  // (preventDefault no mousedown), então a posição do cursor sobrevive ao clique.
  function citar() {
    const doc = painel.current?.querySelector<HTMLElement>(".doc");
    if (!doc) return;
    const sel = window.getSelection();
    let bloco: Node | null = sel && sel.rangeCount && doc.contains(sel.anchorNode) ? sel.anchorNode : null;
    while (bloco && bloco.parentNode !== doc) bloco = bloco.parentNode;

    const molde = document.createElement("template");
    molde.innerHTML = citacao(questao);
    const depois = molde.content.lastChild!;
    doc.insertBefore(molde.content, bloco ? bloco.nextSibling : null);

    // Cursor no parágrafo vazio que vem depois da citação, pronto para anotar.
    doc.focus();
    const r = document.createRange();
    r.setStart(depois, 0);
    r.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(r);
    doc.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Arrastar a borda esquerda muda a largura (o painel está à direita da questão).
  function redimensionar(e: PointerEventReact<HTMLDivElement>) {
    e.preventDefault();
    const x0 = e.clientX;
    const l0 = largura;
    let atual = l0;
    const mover = (ev: PointerEvent) => {
      atual = Math.min(LARGURA_MAX, Math.max(LARGURA_MIN, l0 + x0 - ev.clientX));
      setLargura(atual);
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      document.body.style.cursor = "";
      try {
        localStorage.setItem(CHAVE_LARGURA, String(atual));
      } catch {
        /* sem armazenamento */
      }
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  // Esc fecha o painel — menos quando o foco está no editor, onde Esc é do editor.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest(".doc") || alvo?.tagName === "INPUT") return;
      onFechar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    // Sem fundo escurecendo a tela: a questão precisa continuar legível ao lado.
    <aside
      ref={painel}
      className="
        fixed inset-x-0 bottom-[64px] z-40 flex h-[58vh] flex-col rounded-t-2xl border-t border-hair bg-surface
        md:sticky md:top-4 md:bottom-auto md:inset-x-auto md:z-10 md:h-[calc(100vh-2rem)]
        md:w-[var(--largura)] md:min-w-[320px] md:max-w-[50vw] md:flex-shrink-0
        md:rounded-2xl md:border
      "
      // bg-surface (classe) e não `background: var(--surface)`: o token é uma tripla
      // de canais RGB para o Tailwind, então usá-lo direto vira CSS inválido e o
      // painel fica sem fundo nenhum, com a questão aparecendo através dele.
      style={
        {
          "--largura": `${largura}px`,
          boxShadow: "0 -18px 48px rgba(0,0,0,.28)",
          animation: "pop .2s ease both",
        } as CSSProperties
      }
      role="dialog"
      aria-label={`Caderno — ${materia}`}
    >
      {/* Alça de largura (desktop) */}
      <div
        onPointerDown={redimensionar}
        className="group absolute inset-y-4 -left-1.5 z-10 hidden w-3 cursor-col-resize md:block"
        role="separator"
        aria-orientation="vertical"
        aria-label="Ajustar largura do caderno"
        title="Arraste para ajustar a largura"
      >
        <span className="mx-auto block h-full w-[3px] rounded-full opacity-0 transition group-hover:opacity-100" style={{ background: "var(--accent)" }} />
      </div>
      <header className="flex items-center gap-2 border-b border-hair px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-faint">Caderno</p>
          <p className="truncate font-display font-bold text-brand-ink">{materia}</p>
        </div>
        {ativa && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={citar}
            className="inline-flex items-center gap-1 rounded-xl border border-hair px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-500"
            title="Colar o enunciado desta questão na página"
          >
            <Quote size={13} strokeWidth={2} /> Citar
          </button>
        )}
        <button
          onClick={() => void nova()}
          disabled={criando}
          className="inline-flex items-center gap-1 rounded-xl border border-hair px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-brand-500 disabled:opacity-50"
          title="Nova página nesta matéria"
        >
          <Plus size={14} strokeWidth={2} /> Página
        </button>
        <button
          onClick={onFechar}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-xl border border-hair text-muted transition hover:text-brand-500"
          aria-label="Fechar caderno"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </header>

      {/* Abas das páginas da matéria (só quando há mais de uma) */}
      {daMateria.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-hair px-3 py-2">
          {daMateria.map((p) => (
            <button
              key={p.id}
              onClick={() => setAtivaId(p.id)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition"
              style={
                p.id === ativaId
                  ? { background: "var(--accentBg)", color: "var(--accentText)" }
                  : undefined
              }
            >
              <FileText size={12} strokeWidth={1.8} className="opacity-70" />
              <span className="max-w-[140px] truncate">{p.titulo || "Sem título"}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        {carregando ? (
          <Carregando />
        ) : ativa ? (
          <EditorPagina
            key={ativa.id}
            compacto
            pagina={ativa}
            materias={materias}
            onSalvo={onSalvo}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <p className="font-display font-bold text-brand-ink">Sem página de {materia}</p>
              <p className="mt-1 text-sm text-faint">Crie uma para anotar enquanto resolve.</p>
              <button onClick={() => void nova()} disabled={criando} className="btn-primary mt-4 text-sm disabled:opacity-50">
                {criando ? "Criando…" : "Criar página"}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
