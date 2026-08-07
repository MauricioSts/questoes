// Caderno — anotações tipo Notion. Coluna esquerda: árvore de matérias/páginas.
// Coluna direita: editor contenteditable com salvamento por debounce (~800ms).
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useConcurso } from "../store/concurso";
import { materias as materiasDoRepo } from "../lib/questoesRepo";
import {
  listarPaginas,
  criarPagina,
  salvarPagina,
  excluirPagina,
  type PaginaCaderno,
} from "../lib/multiApi";

export function Caderno() {
  const { activeId } = useConcurso();
  const [paginas, setPaginas] = useState<PaginaCaderno[]>([]);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  // Matérias: as do concurso (repo) + as que já têm páginas.
  const materias = useMemo(() => {
    const set = new Set<string>(materiasDoRepo());
    for (const p of paginas) set.add(p.materia);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [paginas]);

  useEffect(() => {
    if (!activeId) return;
    setCarregando(true);
    listarPaginas(activeId)
      .then((r) => {
        setPaginas(r.paginas);
        setAtivaId((cur) => cur ?? r.paginas[0]?.id ?? null);
      })
      .finally(() => setCarregando(false));
  }, [activeId]);

  const ativa = paginas.find((p) => p.id === ativaId) ?? null;

  async function novaPagina(materia?: string) {
    if (!activeId) return;
    const alvo = materia ?? materias[0];
    if (!alvo) return;
    const { pagina } = await criarPagina(activeId, alvo);
    setPaginas((ps) => [pagina, ...ps]);
    setAbertos((s) => new Set(s).add(alvo));
    setAtivaId(pagina.id);
  }

  function toggle(materia: string) {
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(materia)) n.delete(materia);
      else n.add(materia);
      return n;
    });
  }

  function onSalvo(p: PaginaCaderno) {
    setPaginas((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  }

  async function remover(id: string) {
    await excluirPagina(id);
    setPaginas((ps) => ps.filter((p) => p.id !== id));
    setAtivaId((cur) => (cur === id ? null : cur));
  }

  return (
    <div className="fadeup pt-2">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-brand-ink">Caderno</h1>
        <button onClick={() => novaPagina()} className="btn-secondary text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Plus size={16} strokeWidth={2} /> Nova página
          </span>
        </button>
      </div>

      {carregando ? (
        <p className="text-faint">Carregando…</p>
      ) : paginas.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center">
          <div>
            <p className="font-display text-xl font-bold text-brand-ink">Caderno vazio</p>
            <p className="mt-1 text-faint">Crie sua primeira página de anotações.</p>
            <button onClick={() => novaPagina()} className="btn-primary mt-4 text-base">
              Criar página
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[272px_1fr]">
          {/* Árvore */}
          <aside className="card h-fit p-3">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-faint">Matérias</p>
            <ul className="space-y-0.5">
              {materias.map((m) => {
                const doGrupo = paginas.filter((p) => p.materia === m);
                const aberto = abertos.has(m);
                return (
                  <li key={m}>
                    <button
                      onClick={() => toggle(m)}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-ink transition hover:bg-surface2"
                    >
                      <ChevronRight
                        size={15}
                        strokeWidth={2}
                        className="text-faint transition-transform"
                        style={{ transform: aberto ? "rotate(90deg)" : "none" }}
                      />
                      <span className="flex-1 truncate text-left">{m}</span>
                      <span className="text-[11px] text-faint">{doGrupo.length}</span>
                    </button>
                    {aberto && (
                      <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-hair pl-2">
                        {doGrupo.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => setAtivaId(p.id)}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition"
                              style={
                                p.id === ativaId
                                  ? { background: "var(--accentBg)", color: "var(--accentText)" }
                                  : undefined
                              }
                            >
                              <FileText size={14} strokeWidth={1.8} className="flex-shrink-0 opacity-70" />
                              <span className="flex-1 truncate text-left">{p.titulo || "Sem título"}</span>
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            onClick={() => novaPagina(m)}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-faint transition hover:text-brand-500"
                          >
                            <Plus size={13} strokeWidth={2} /> Página
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Editor */}
          {ativa ? (
            <Editor key={ativa.id} pagina={ativa} onSalvo={onSalvo} onExcluir={() => remover(ativa.id)} />
          ) : (
            <div className="card grid place-items-center p-12 text-faint">Selecione uma página</div>
          )}
        </div>
      )}
    </div>
  );
}

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

function Editor({
  pagina,
  onSalvo,
  onExcluir,
}: {
  pagina: PaginaCaderno;
  onSalvo: (p: PaginaCaderno) => void;
  onExcluir: () => void;
}) {
  const [editadoEm, setEditadoEm] = useState(pagina.updatedAt);
  const tituloRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Popula o conteúdo inicial (uma vez por página).
  useEffect(() => {
    if (tituloRef.current) tituloRef.current.textContent = pagina.titulo;
    if (corpoRef.current) corpoRef.current.textContent = pagina.conteudo;
  }, [pagina.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function agendarSalvar() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { pagina: salva } = await salvarPagina(pagina.id, {
        titulo: tituloRef.current?.textContent ?? "",
        conteudo: corpoRef.current?.textContent ?? "",
      });
      setEditadoEm(salva.updatedAt);
      onSalvo(salva);
    }, 800);
  }

  return (
    <section className="card min-h-[60vh] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <span className="meta-pill bg-brand-100 text-brand-700">{pagina.materia}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">editada {tempoRelativo(editadoEm)}</span>
          <button
            onClick={onExcluir}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-danger-from"
            aria-label="Excluir página"
          >
            <Trash2 size={14} strokeWidth={1.8} /> Excluir
          </button>
        </div>
      </div>

      <div
        ref={tituloRef}
        contentEditable
        suppressContentEditableWarning
        data-ph="Sem título"
        onInput={agendarSalvar}
        className="ct-title mt-5 font-display text-brand-ink outline-none"
        style={{ fontSize: "34px", fontWeight: "var(--displayWeight)" as never }}
      />
      <div
        ref={corpoRef}
        contentEditable
        suppressContentEditableWarning
        data-ph="Comece a escrever…"
        onInput={agendarSalvar}
        className="ct-body mt-3 whitespace-pre-wrap text-brand-ink outline-none"
        style={{ fontSize: "14.5px", lineHeight: 1.85 }}
      />
    </section>
  );
}
