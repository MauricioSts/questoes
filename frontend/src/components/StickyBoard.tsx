// Mural de post-its arrastáveis (Home). Drag com Pointer Events, clamp obrigatório
// (montagem, resize e retorno à Home), persistência por concurso com debounce.
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, Maximize2, Minimize2 } from "lucide-react";
import { useConcurso } from "../store/concurso";
import {
  listarPostits,
  criarPostit,
  salvarPostit,
  excluirPostit,
  type PostIt,
  type CorPostIt,
} from "../lib/multiApi";

const NOTE_W = 206;
const NOTE_H = 116;
const CORES: CorPostIt[] = ["amber", "sage", "rose", "slate"];
const COR_BG: Record<CorPostIt, string> = {
  amber: "#FCE7A6",
  sage: "#CDE9CE",
  rose: "#FAD1DE",
  slate: "#CFE0F0",
};

export function StickyBoard() {
  const { activeId } = useConcurso();
  const [notes, setNotes] = useState<PostIt[]>([]);
  const [expandido, setExpandido] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const clampAll = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const maxX = Math.max(0, el.clientWidth - NOTE_W - 8);
    const maxY = Math.max(0, el.clientHeight - NOTE_H - 8);
    setNotes((ns) =>
      ns.map((n) => {
        const x = Math.min(Math.max(0, n.x), maxX);
        const y = Math.min(Math.max(0, n.y), maxY);
        return x === n.x && y === n.y ? n : { ...n, x, y };
      })
    );
  }, []);

  useEffect(() => {
    if (!activeId) return;
    listarPostits(activeId).then((r) => setNotes(r.postits));
  }, [activeId]);

  // Clamp na montagem, no resize e ao expandir/recolher.
  useEffect(() => {
    clampAll();
    window.addEventListener("resize", clampAll);
    return () => window.removeEventListener("resize", clampAll);
  }, [clampAll, expandido, notes.length]);

  function persistir(id: string, patch: Partial<Pick<PostIt, "x" | "y" | "texto" | "cor">>) {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.set(
      id,
      setTimeout(() => void salvarPostit(id, patch), 500)
    );
  }

  function onPointerDown(e: React.PointerEvent, n: PostIt) {
    const board = boardRef.current!.getBoundingClientRect();
    drag.current = { id: n.id, dx: e.clientX - board.left - n.x, dy: e.clientY - board.top - n.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current;
      const el = boardRef.current;
      if (!d || !el) return;
      const board = el.getBoundingClientRect();
      const maxX = Math.max(0, el.clientWidth - NOTE_W - 8);
      const maxY = Math.max(0, el.clientHeight - NOTE_H - 8);
      const x = Math.min(Math.max(0, e.clientX - board.left - d.dx), maxX);
      const y = Math.min(Math.max(0, e.clientY - board.top - d.dy), maxY);
      setNotes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x, y } : n)));
    }
    function up() {
      const d = drag.current;
      if (d) {
        const n = notes.find((x) => x.id === d.id);
        if (n) persistir(n.id, { x: n.x, y: n.y });
      }
      drag.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [notes]);

  async function nova() {
    if (!activeId) return;
    const el = boardRef.current;
    const cols = el ? Math.max(1, Math.floor(el.clientWidth / (NOTE_W + 16))) : 1;
    const i = notes.length;
    const x = (i % cols) * (NOTE_W + 16) + 12;
    const y = Math.floor(i / cols) * (NOTE_H + 16) + 12;
    const cor = CORES[i % CORES.length];
    const { postit } = await criarPostit(activeId, { x, y, cor });
    setNotes((ns) => [...ns, postit]);
  }

  async function remover(id: string) {
    await excluirPostit(id);
    setNotes((ns) => ns.filter((n) => n.id !== id));
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-brand-ink">Mural</h2>
        <div className="flex items-center gap-2">
          <button onClick={nova} className="btn-secondary text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Plus size={16} strokeWidth={2} /> Nova nota
            </span>
          </button>
          <button
            onClick={() => setExpandido((v) => !v)}
            className="tap rounded-xl border border-hair px-3 text-muted transition hover:text-brand-ink"
            aria-label={expandido ? "Recolher mural" : "Expandir mural"}
          >
            {expandido ? <Minimize2 size={16} strokeWidth={1.8} /> : <Maximize2 size={16} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative overflow-hidden rounded-2xl border border-hair"
        style={{
          height: expandido ? 640 : 330,
          transition: "height .2s",
          background: "radial-gradient(var(--dot) 1px, transparent 1.2px)",
          backgroundSize: "20px 20px",
        }}
      >
        {notes.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-faint">
            Sem notas ainda — crie a primeira.
          </p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="absolute select-none"
            style={{
              left: n.x,
              top: n.y,
              width: NOTE_W,
              transform: drag.current?.id === n.id ? "scale(1.03)" : "none",
              zIndex: drag.current?.id === n.id ? 20 : 1,
              boxShadow:
                drag.current?.id === n.id
                  ? "0 18px 40px -12px rgba(0,0,0,.45)"
                  : "0 8px 18px -12px rgba(0,0,0,.35)",
              transition: "box-shadow .15s, transform .15s",
            }}
          >
            <div className="rounded-[6px]" style={{ background: COR_BG[n.cor] }}>
              <div
                className="flex cursor-grab items-center justify-between px-2 py-1.5 active:cursor-grabbing"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => onPointerDown(e, n)}
              >
                <span className="text-[#00000055]" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="1.4" /><circle cx="8" cy="12" r="1.4" /><circle cx="8" cy="18" r="1.4" />
                    <circle cx="15" cy="6" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="15" cy="18" r="1.4" />
                  </svg>
                </span>
                <button onClick={() => remover(n.id)} className="text-[#00000066] hover:text-[#000]" aria-label="Excluir nota">
                  <X size={15} strokeWidth={2.2} />
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                data-ph="Escreva…"
                onInput={(e) => persistir(n.id, { texto: e.currentTarget.textContent ?? "" })}
                className="min-h-[76px] px-3 pb-3 text-sm leading-snug text-[#2A2440] outline-none"
              >
                {n.texto}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
