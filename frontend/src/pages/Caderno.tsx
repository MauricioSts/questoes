// Caderno: as anotações de teoria, no formato de documento. Coluna esquerda com a
// árvore de matérias/páginas; coluna direita com o editor da página (EditorPagina,
// compartilhado com o painel lateral que abre por cima da questão).
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Plus, Search } from "lucide-react";
import { useConcurso } from "../store/concurso";
import { materias as materiasDoRepo } from "../lib/questoesRepo";
import { EditorPagina } from "../components/EditorPagina";
import { htmlParaTexto } from "../lib/sanitizeHtml";
import {
  listarPaginas,
  criarPagina,
  excluirPagina,
  type PaginaCaderno,
} from "../lib/multiApi";

export function Caderno() {
  const { activeId, ativo } = useConcurso();
  const [paginas, setPaginas] = useState<PaginaCaderno[]>([]);
  const [ativaId, setAtivaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [menuNova, setMenuNova] = useState(false);

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
        // Já abre a matéria da página selecionada.
        const primeira = r.paginas[0];
        if (primeira) setAbertos((s) => new Set(s).add(primeira.materia));
      })
      .finally(() => setCarregando(false));
  }, [activeId]);

  const ativa = paginas.find((p) => p.id === ativaId) ?? null;

  // Trecho do texto para a prévia na lista (recalculado só quando as páginas mudam).
  const trechos = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of paginas) {
      const txt = (p.formato === "texto" ? p.conteudo : htmlParaTexto(p.conteudo)).replace(/\s+/g, " ").trim();
      m.set(p.id, txt.slice(0, 70));
    }
    return m;
  }, [paginas]);

  const filtro = busca.trim().toLowerCase();
  const visiveis = useMemo(() => {
    if (!filtro) return paginas;
    return paginas.filter(
      (p) =>
        p.titulo.toLowerCase().includes(filtro) ||
        p.materia.toLowerCase().includes(filtro) ||
        (trechos.get(p.id) ?? "").toLowerCase().includes(filtro)
    );
  }, [paginas, filtro, trechos]);

  // Ordem estável dentro da matéria: por criação. (A lista do servidor vem por
  // updatedAt, o que faria as páginas pularem de lugar a cada tecla digitada.)
  const porMateria = useCallback(
    (m: string) =>
      visiveis
        .filter((p) => p.materia === m)
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [visiveis]
  );

  async function novaPagina(materia?: string) {
    if (!activeId) return;
    const alvo = materia ?? ativa?.materia ?? materias[0];
    if (!alvo) return;
    const { pagina } = await criarPagina(activeId, alvo);
    setPaginas((ps) => [...ps, pagina]);
    setAbertos((s) => new Set(s).add(alvo));
    setAtivaId(pagina.id);
    setBusca("");
  }

  function toggle(materia: string) {
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(materia)) n.delete(materia);
      else n.add(materia);
      return n;
    });
  }

  const onSalvo = useCallback((p: PaginaCaderno) => {
    setPaginas((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  }, []);

  async function remover(id: string) {
    const p = paginas.find((x) => x.id === id);
    const nome = p?.titulo?.trim() || "Sem título";
    if (!window.confirm(`Excluir a página “${nome}”? Isso não pode ser desfeito.`)) return;
    await excluirPagina(id);
    setPaginas((ps) => ps.filter((x) => x.id !== id));
    setAtivaId((cur) => (cur === id ? null : cur));
  }

  // Com filtro ativo, mostra só as matérias que têm resultado (e já expandidas).
  const materiasNaArvore = filtro
    ? materias.filter((m) => porMateria(m).length > 0)
    : materias;

  return (
    <div className="fadeup pt-2">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-faint">Caderno · {ativo?.nome ?? ""}</p>
          <h1 className="mt-1 font-display font-bold text-brand-ink" style={{ fontSize: 40, fontWeight: "var(--displayWeight)" as never }}>
            Suas anotações
          </h1>
          <p className="mt-1 text-muted">Páginas de teoria e resumo, organizadas por matéria.</p>
        </div>

        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuNova((v) => !v)} className="btn-primary text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Plus size={16} strokeWidth={2} /> Nova página
            </span>
          </button>
          {menuNova && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuNova(false)} />
              <div className="doc-menu-lista z-40" style={{ width: 230, left: "auto", right: 0 }}>
                <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-faint">
                  Criar em qual matéria?
                </p>
                {materias.map((m) => (
                  <button
                    key={m}
                    className="doc-menu-item"
                    onClick={() => { setMenuNova(false); void novaPagina(m); }}
                  >
                    <span className="flex-1 truncate text-left">{m}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nas páginas…"
                className="w-full rounded-lg border border-hair bg-surface2 py-1.5 pl-8 pr-2 text-sm text-brand-ink outline-none focus:border-brand-500"
              />
            </div>
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-faint">Matérias</p>
            <ul className="space-y-0.5">
              {materiasNaArvore.map((m) => {
                const doGrupo = porMateria(m);
                const aberto = abertos.has(m) || !!filtro;
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
                              className="flex w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-sm transition"
                              style={
                                p.id === ativaId
                                  ? { background: "var(--accentBg)", color: "var(--accentText)" }
                                  : undefined
                              }
                            >
                              <FileText size={14} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 opacity-70" />
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate">{p.titulo || "Sem título"}</span>
                                {trechos.get(p.id) && (
                                  <span className="block truncate doc-preview">{trechos.get(p.id)}</span>
                                )}
                              </span>
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
            <EditorPagina
              key={ativa.id}
              pagina={ativa}
              materias={materias}
              onSalvo={onSalvo}
              onExcluir={() => remover(ativa.id)}
            />
          ) : (
            <div className="card grid place-items-center p-12 text-faint">Selecione uma página</div>
          )}
        </div>
      )}
    </div>
  );
}
