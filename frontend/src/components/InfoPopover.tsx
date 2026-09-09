// Botão "?" com explicação em popover. Usado para explicar mecânicas que não cabem num
// subtítulo (revisão espaçada, por exemplo) sem mandar o usuário para outra tela.
//
// Acessibilidade: o gatilho tem alvo de 44px, diz o estado (aria-expanded) e aponta para o
// painel (aria-controls); ESC fecha e devolve o foco; clique fora fecha; o painel é um
// diálogo não-modal (a página continua utilizável, que é o ponto de um popover de ajuda).
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";

export function InfoPopover({
  titulo,
  children,
  rotulo = "Como funciona",
  alinhamento = "direita",
}: {
  titulo: string;
  children: ReactNode;
  rotulo?: string;
  alinhamento?: "direita" | "esquerda";
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        gatilhoRef.current?.focus();
      }
    };
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (painelRef.current?.contains(alvo) || gatilhoRef.current?.contains(alvo)) return;
      setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicar);
    };
  }, [aberto]);

  return (
    <div className="relative inline-flex">
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={`${rotulo}: ${titulo}`}
        title={rotulo}
        className="tap flex h-11 w-11 items-center justify-center rounded-xl border border-hair bg-surface text-muted
                   transition hover:text-brand-500 hover:border-brand-300"
      >
        <HelpCircle size={19} strokeWidth={1.9} />
      </button>

      {aberto && (
        <div
          ref={painelRef}
          id={id}
          role="dialog"
          aria-label={titulo}
          className={`absolute top-[52px] z-40 w-[min(92vw,380px)] rounded-2xl border border-hair bg-surface p-5
                      text-left shadow-2xl ${alinhamento === "direita" ? "right-0" : "left-0"}`}
          style={{ animation: "pop .18s ease both" }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-bold leading-tight text-brand-ink">{titulo}</h2>
            <button
              type="button"
              onClick={() => {
                setAberto(false);
                gatilhoRef.current?.focus();
              }}
              className="tap -mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-faint transition hover:text-brand-ink"
              aria-label="Fechar explicação"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>
          <div className="space-y-2.5 text-sm leading-relaxed text-muted">{children}</div>
        </div>
      )}
    </div>
  );
}
