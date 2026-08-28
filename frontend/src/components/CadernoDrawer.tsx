// Painel lateral do Caderno, aberto por cima da questão pelo botão flutuante do
// SessionRunner.
//
// Por que existe: antes só dava para anotar DEPOIS de responder (o editor de nota
// da questão), o que é tarde demais — a anotação nasce enquanto se lê o enunciado
// e se descarta alternativa. Aqui o caderno da matéria da questão fica aberto ao
// lado, com o mesmo editor rico do Caderno, sem sair da sessão.
//
// Ele já entra filtrado pela matéria da questão e cria a primeira página daquela
// matéria com um clique quando ainda não existe nenhuma.
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { useConcurso } from "../store/concurso";
import { materias as materiasDoRepo } from "../lib/questoesRepo";
import { EditorPagina } from "./EditorPagina";
import { listarPaginas, criarPagina, type PaginaCaderno } from "../lib/multiApi";

interface Props {
  materia: string;
  aberto: boolean;
  onFechar: () => void;
}

export function CadernoDrawer({ materia, aberto, onFechar }: Props) {
  const { activeId } = useConcurso();
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
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-hair sm:w-[min(560px,92vw)]"
      style={{ background: "var(--surface)", boxShadow: "-18px 0 48px rgba(0,0,0,.28)", animation: "pop .2s ease both" }}
      role="dialog"
      aria-label={`Caderno — ${materia}`}
    >
      <header className="flex items-center gap-2 border-b border-hair px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-faint">Caderno</p>
          <p className="truncate font-display font-bold text-brand-ink">{materia}</p>
        </div>
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
          <p className="text-faint">Carregando…</p>
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
